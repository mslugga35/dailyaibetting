-- DailyAI Founding Member seats.
--
-- STATUS: tested against a LOCAL Supabase only. Applying it to the shared project
-- needs the owner's approval. It only ADDS objects (one table, three functions), all
-- prefixed dailyai_, and does not touch user_subscriptions or any other app's tables.
-- Nothing reads these objects unless PRICING_MODE=founding is set (see
-- src/lib/pricing/), so the app runs unchanged whether or not this is applied.
--
-- One row per Founding Member seat claim. Life cycle:
--   reserved  -> a founding Checkout Session is open (hold_expires_at bounds it)
--   trialing  -> the subscription exists but nothing has been paid yet (trial / past_due)
--   converted -> first successful payment: a PAYING founding member
--   ended     -> a converted member's subscription ended (still counts in 'historical' mode)
--   released  -> never paid (checkout abandoned/expired, trial cancelled): seat freed
--
-- "Taken" seats = reserved (unexpired) + trialing + converted (+ ended in historical
-- mode). Holds count as taken so concurrent checkouts can never sell more than the cap.

create table if not exists public.dailyai_founding_seats (
  id bigint generated always as identity primary key,
  stripe_customer_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  checkout_session_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'reserved'
    check (status in ('reserved', 'trialing', 'converted', 'ended', 'released')),
  hold_expires_at timestamptz,
  reserved_at timestamptz not null default now(),
  converted_at timestamptz,
  ended_at timestamptz,
  released_at timestamptz,
  release_reason text,
  updated_at timestamptz not null default now()
);

-- Refund / dispute markers (recorded by the webhook; informational, they do not change status).
alter table public.dailyai_founding_seats add column if not exists refunded_cents int not null default 0;
alter table public.dailyai_founding_seats add column if not exists disputed_at timestamptz;

-- At most one open or paying seat per Stripe customer.
create unique index if not exists dailyai_founding_seats_one_open_per_customer
  on public.dailyai_founding_seats (stripe_customer_id)
  where status in ('reserved', 'trialing', 'converted');
create index if not exists dailyai_founding_seats_status_idx
  on public.dailyai_founding_seats (status);

-- Service role only: RLS on with no policies, and no grants to client roles. The
-- functions below are SECURITY INVOKER, so even if a blanket "grant execute on all
-- functions" ever reaches anon/authenticated, they still cannot touch this table.
alter table public.dailyai_founding_seats enable row level security;
revoke all on public.dailyai_founding_seats from public, anon, authenticated;
grant select, insert, update, delete on public.dailyai_founding_seats to service_role;
revoke all on sequence public.dailyai_founding_seats_id_seq from public, anon, authenticated;
grant usage, select on sequence public.dailyai_founding_seats_id_seq to service_role;

create or replace function public.dailyai_founding_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
drop trigger if exists dailyai_founding_seats_touch on public.dailyai_founding_seats;
create trigger dailyai_founding_seats_touch before update on public.dailyai_founding_seats
  for each row execute function public.dailyai_founding_touch();

-- Counts. Read-only; an expired hold is not counted even before it is swept.
create or replace function public.dailyai_founding_stats(p_count_ended boolean default true)
returns table (reserved int, trialing int, converted int, ended int, released int, taken int)
language sql stable security invoker set search_path = public as $$
  select
    count(*) filter (where status = 'reserved' and hold_expires_at >= now())::int,
    count(*) filter (where status = 'trialing')::int,
    count(*) filter (where status = 'converted')::int,
    count(*) filter (where status = 'ended')::int,
    count(*) filter (where status = 'released')::int,
    count(*) filter (where (status = 'reserved' and hold_expires_at >= now())
                        or status in ('trialing', 'converted')
                        or (p_count_ended and status = 'ended'))::int
  from public.dailyai_founding_seats;
$$;

-- Atomically claim a seat for a Stripe customer. All claims are serialized by one
-- transaction-scoped advisory lock, so the count check and the insert cannot interleave.
-- outcome: 'reserved' (new hold) | 'existing' (this customer's open hold/trial, refreshed)
--        | 'sold_out' | 'returning' (customer was already a paying founding member)
--        | 'busy' (p_max_holds open checkout holds already: bounds how many seats unpaid
--          checkouts can tie up at once, e.g. by scripted guest checkouts)
drop function if exists public.dailyai_founding_reserve(text, uuid, int, int, boolean, boolean);
create or replace function public.dailyai_founding_reserve(
  p_customer text,
  p_user uuid,
  p_cap int,
  p_hold_seconds int,
  p_count_ended boolean default true,
  p_allow_returning boolean default false,
  p_max_holds int default 20
) returns table (seat_id bigint, outcome text, taken int)
language plpgsql security invoker set search_path = public as $$
declare
  v_id bigint;
  v_taken int;
begin
  if coalesce(p_customer, '') = '' or p_cap is null or p_cap < 0
     or p_hold_seconds is null or p_hold_seconds < 60 or p_hold_seconds > 86400 then
    raise exception 'dailyai_founding_reserve: invalid arguments';
  end if;

  perform pg_advisory_xact_lock(hashtext('dailyai_founding_seats'));

  update public.dailyai_founding_seats
     set status = 'released', released_at = now(), release_reason = 'hold_expired'
   where status = 'reserved' and hold_expires_at < now();

  select s.id into v_id from public.dailyai_founding_seats s
   where s.stripe_customer_id = p_customer and s.status in ('reserved', 'trialing')
   limit 1;
  if v_id is not null then
    update public.dailyai_founding_seats
       set hold_expires_at = greatest(hold_expires_at, now() + make_interval(secs => p_hold_seconds)),
           user_id = coalesce(user_id, p_user)
     where id = v_id and status = 'reserved';
    select st.taken into v_taken from public.dailyai_founding_stats(p_count_ended) st;
    return query select v_id, 'existing'::text, v_taken;
    return;
  end if;

  if not p_allow_returning and exists (
    select 1 from public.dailyai_founding_seats s
     where s.stripe_customer_id = p_customer and s.status in ('converted', 'ended')
  ) then
    select st.taken into v_taken from public.dailyai_founding_stats(p_count_ended) st;
    return query select null::bigint, 'returning'::text, v_taken;
    return;
  end if;

  select st.taken into v_taken from public.dailyai_founding_stats(p_count_ended) st;
  if v_taken >= p_cap then
    return query select null::bigint, 'sold_out'::text, v_taken;
    return;
  end if;

  if p_max_holds is not null and (
    select count(*) from public.dailyai_founding_seats s
     where s.status = 'reserved' and s.hold_expires_at >= now()
  ) >= p_max_holds then
    return query select null::bigint, 'busy'::text, v_taken;
    return;
  end if;

  insert into public.dailyai_founding_seats (stripe_customer_id, user_id, status, hold_expires_at)
  values (p_customer, p_user, 'reserved', now() + make_interval(secs => p_hold_seconds))
  returning id into v_id;
  return query select v_id, 'reserved'::text, v_taken + 1;
end $$;

-- Move a seat through its life cycle. Idempotent and state-guarded: replays are no-ops.
-- p_event: 'session'  attach checkout session + extend hold   (reserved only)
--          'abandon'  checkout session could not be created   (reserved -> released)
--          'expired'  checkout session expired                (reserved -> released, matched by session id)
--          'started'  subscription exists, unpaid             (reserved|released -> trialing)
--          'paid'     first successful payment                (reserved|trialing|released -> converted)
--          'ended'    subscription ended                      (converted -> ended; reserved|trialing -> released)
-- Returns the seat's status afterwards and whether a released seat had to be re-claimed
-- beyond the cap (a founding-price subscription exists; it is honoured and flagged).
create or replace function public.dailyai_founding_transition(
  p_event text,
  p_seat bigint default null,
  p_session text default null,
  p_subscription text default null,
  p_user uuid default null,
  p_hold_until timestamptz default null,
  p_cap int default null,
  p_count_ended boolean default true
) returns table (seat_id bigint, status text, over_cap boolean)
language plpgsql security invoker set search_path = public as $$
declare
  v public.dailyai_founding_seats%rowtype;
  v_taken int;
  v_over boolean := false;
begin
  perform pg_advisory_xact_lock(hashtext('dailyai_founding_seats'));

  if p_seat is not null then
    select * into v from public.dailyai_founding_seats s where s.id = p_seat for update;
  end if;
  if v.id is null and p_subscription is not null then
    select * into v from public.dailyai_founding_seats s where s.stripe_subscription_id = p_subscription for update;
  end if;
  if v.id is null and p_session is not null then
    select * into v from public.dailyai_founding_seats s where s.checkout_session_id = p_session for update;
  end if;
  if v.id is null then
    return; -- no seat: nothing to do
  end if;

  if p_event = 'session' then
    if v.status = 'reserved' then
      update public.dailyai_founding_seats
         set checkout_session_id = p_session,
             hold_expires_at = greatest(hold_expires_at, coalesce(p_hold_until, hold_expires_at))
       where id = v.id;
    end if;
  elsif p_event = 'abandon' then
    if v.status = 'reserved' then
      update public.dailyai_founding_seats
         set status = 'released', released_at = now(), release_reason = 'checkout_not_created'
       where id = v.id;
    end if;
  elsif p_event = 'expired' then
    if v.status = 'reserved' and v.checkout_session_id = p_session then
      update public.dailyai_founding_seats
         set status = 'released', released_at = now(), release_reason = 'checkout_expired'
       where id = v.id;
    end if;
  elsif p_event in ('started', 'paid') then
    if v.status = 'released' then
      select st.taken into v_taken from public.dailyai_founding_stats(p_count_ended) st;
      v_over := p_cap is not null and v_taken >= p_cap;
    end if;
    if p_event = 'started' and v.status in ('reserved', 'released') then
      update public.dailyai_founding_seats
         set status = 'trialing', hold_expires_at = null,
             stripe_subscription_id = coalesce(p_subscription, stripe_subscription_id),
             user_id = coalesce(user_id, p_user), released_at = null, release_reason = null
       where id = v.id;
    elsif p_event = 'paid' and v.status in ('reserved', 'trialing', 'released') then
      update public.dailyai_founding_seats
         set status = 'converted', converted_at = now(), hold_expires_at = null,
             stripe_subscription_id = coalesce(p_subscription, stripe_subscription_id),
             user_id = coalesce(user_id, p_user), released_at = null, release_reason = null
       where id = v.id;
    elsif v.status in ('trialing', 'converted') then
      update public.dailyai_founding_seats
         set stripe_subscription_id = coalesce(stripe_subscription_id, p_subscription),
             user_id = coalesce(user_id, p_user)
       where id = v.id;
    end if;
  elsif p_event = 'ended' then
    if v.status = 'converted' then
      update public.dailyai_founding_seats set status = 'ended', ended_at = now() where id = v.id;
    elsif v.status in ('reserved', 'trialing') then
      update public.dailyai_founding_seats
         set status = 'released', released_at = now(), release_reason = 'ended_before_payment'
       where id = v.id;
    end if;
  else
    raise exception 'dailyai_founding_transition: unknown event %', p_event;
  end if;

  return query select s.id, s.status, v_over from public.dailyai_founding_seats s where s.id = v.id;
end $$;

revoke all on function public.dailyai_founding_touch() from public, anon, authenticated;
revoke all on function public.dailyai_founding_stats(boolean) from public, anon, authenticated;
revoke all on function public.dailyai_founding_reserve(text, uuid, int, int, boolean, boolean, int) from public, anon, authenticated;
revoke all on function public.dailyai_founding_transition(text, bigint, text, text, uuid, timestamptz, int, boolean) from public, anon, authenticated;
grant execute on function public.dailyai_founding_stats(boolean) to service_role;
grant execute on function public.dailyai_founding_reserve(text, uuid, int, int, boolean, boolean, int) to service_role;
grant execute on function public.dailyai_founding_transition(text, bigint, text, text, uuid, timestamptz, int, boolean) to service_role;


-- ---------------------------------------------------------------- one free trial per card
-- Stripe card fingerprints that have had a DailyAI free trial. A new trial on a card
-- already listed for a DIFFERENT customer is ended at once by the webhook (charged from
-- day one; disclosed on the pricing page and at checkout).
create table if not exists public.dailyai_trial_fingerprints (
  fingerprint text primary key,
  stripe_customer_id text not null,
  stripe_subscription_id text not null,
  created_at timestamptz not null default now()
);
alter table public.dailyai_trial_fingerprints enable row level security;
revoke all on public.dailyai_trial_fingerprints from public, anon, authenticated;
grant select, insert on public.dailyai_trial_fingerprints to service_role;

-- 'first' (recorded now) | 'same' (the same subscription again: a redelivery) | 'reused' (any other
-- subscription, including a second concurrent one of the same customer)
create or replace function public.dailyai_claim_trial_fingerprint(p_fingerprint text, p_customer text, p_subscription text)
returns text
language plpgsql security invoker set search_path = public as $$
declare
  v public.dailyai_trial_fingerprints%rowtype;
begin
  if coalesce(p_fingerprint, '') = '' or coalesce(p_customer, '') = '' or coalesce(p_subscription, '') = '' then
    raise exception 'dailyai_claim_trial_fingerprint: invalid arguments';
  end if;
  insert into public.dailyai_trial_fingerprints (fingerprint, stripe_customer_id, stripe_subscription_id)
  values (p_fingerprint, p_customer, p_subscription)
  on conflict (fingerprint) do nothing;
  if found then
    return 'first';
  end if;
  select * into v from public.dailyai_trial_fingerprints where fingerprint = p_fingerprint;
  if v.stripe_subscription_id = p_subscription then
    return 'same';
  end if;
  return 'reused';
end $$;
revoke all on function public.dailyai_claim_trial_fingerprint(text, text, text) from public, anon, authenticated;
grant execute on function public.dailyai_claim_trial_fingerprint(text, text, text) to service_role;

-- ---------------------------------------------------------------- refunds and disputes
-- One row per Stripe event (event id = primary key, so redelivery is a no-op).
-- Recorded for DailyAI customers only; nothing is refunded or changed automatically.
create table if not exists public.dailyai_billing_events (
  stripe_event_id text primary key,
  event_type text not null check (event_type in ('charge.refunded', 'charge.dispute.created')),
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_charge_id text,
  amount_cents int,
  refunded_cents int,
  dispute_reason text,
  created_at timestamptz not null default now()
);
create index if not exists dailyai_billing_events_customer_idx on public.dailyai_billing_events (stripe_customer_id);
alter table public.dailyai_billing_events enable row level security;
revoke all on public.dailyai_billing_events from public, anon, authenticated;
grant select, insert on public.dailyai_billing_events to service_role;
