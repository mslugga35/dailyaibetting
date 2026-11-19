/**
 * Billing portal button (Nov 19 break-test: "Manage Subscription stays on Opening portal…").
 * Any response without a portal URL must reset the button and explain why.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { portalErrorMessage } = await import('../../src/components/subscription/ManageSubscriptionButton.tsx');
const SRC = readFileSync(new URL('../../src/components/subscription/ManageSubscriptionButton.tsx', import.meta.url), 'utf8');
const ACCOUNT = readFileSync(new URL('../../src/app/account/page.tsx', import.meta.url), 'utf8');

test('each failure status gets a distinct, honest message', () => {
  assert.match(portalErrorMessage(401), /sign in again/i);
  assert.match(portalErrorMessage(404), /no Stripe billing account/i);
  assert.match(portalErrorMessage(500), /could not be opened/i);
  assert.match(portalErrorMessage(503), /could not be opened/i);
  assert.match(portalErrorMessage(0), /could not be opened/i);
});

test('button resets loading on every non-redirect path', () => {
  // The redirect path returns early; everything else falls through to setLoading(false).
  const body = SRC.slice(SRC.indexOf('async function handleManage'), SRC.indexOf('return (\n    <div'));
  assert.match(body, /window\.location\.href = data\.url;\s*return;/);
  assert.match(body, /\}\s*setLoading\(false\);\s*\}\s*$/);
  assert.match(body, /res\.ok && typeof data\.url === 'string' && data\.url\.startsWith\('https:\/\/'\)/);
});

test('complimentary Pro (no Stripe subscription) shows no portal button and no renewal wording', () => {
  assert.match(ACCOUNT, /const complimentary = isPremium && !sub\?\.stripeSubscriptionId;/);
  const premiumBlock = ACCOUNT.slice(ACCOUNT.indexOf('{complimentary ? ('), ACCOUNT.indexOf(') : paymentProblem ? ('));
  const [compBranch, paidBranch] = premiumBlock.split(') : (');
  assert.doesNotMatch(compBranch, /ManageSubscriptionButton/);
  assert.match(compBranch, /nothing will be charged/);
  assert.match(paidBranch, /<ManageSubscriptionButton \/>/);
  assert.match(ACCOUNT, /complimentary \? 'Access until' : sub\.cancelAtPeriodEnd \? 'Cancels on' : 'Renews on'/);
});
