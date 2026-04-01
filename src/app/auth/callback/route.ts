import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next') || '/';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dailyaibetting.com';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, baseUrl));
    }
    // Code exchange failed — redirect to login with error
    console.error('[auth/callback] code exchange failed:', error.message);
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, baseUrl));
  }

  // No code param — check for hash fragment (implicit flow).
  // The hash is only available client-side, so serve a lightweight page
  // that initializes the Supabase client to pick up the tokens.
  const html = `<!DOCTYPE html>
<html><head><title>Signing in...</title>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"
  onerror="window.location.replace('/login?error=script_load_failed')"></script>
</head>
<body>
<p>Signing you in...</p>
<script>
  // Timeout: if auth hasn't completed in 8s, redirect to login
  var _authTimeout = setTimeout(function() {
    window.location.replace('/login?error=session_timeout');
  }, 8000);

  (async function() {
    var hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      var supabase = window.supabase.createClient(
        '${process.env.NEXT_PUBLIC_SUPABASE_URL}',
        '${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}'
      );
      var result = await supabase.auth.getSession();
      clearTimeout(_authTimeout);
      if (result.data?.session) {
        window.location.replace('${next}');
      } else {
        window.location.replace('/login?error=' + encodeURIComponent(result.error?.message || 'session_failed'));
      }
    } else if (hash && hash.includes('error')) {
      clearTimeout(_authTimeout);
      var params = new URLSearchParams(hash.substring(1));
      var errDesc = params.get('error_description') || 'Authentication failed';
      window.location.replace('/login?error=' + encodeURIComponent(errDesc));
    } else {
      clearTimeout(_authTimeout);
      window.location.replace('/login?error=no_auth_data');
    }
  })();
</script>
</body></html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}
