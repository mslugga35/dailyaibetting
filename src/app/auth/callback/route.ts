import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next') || '/';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

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
      return NextResponse.redirect(new URL(next, req.url));
    }
  }

  // No code param — Supabase may have used implicit flow with hash fragment.
  // Serve a page that reads the hash client-side.
  const html = `<!DOCTYPE html>
<html><head><title>Signing in...</title></head>
<body>
<script>
  // Supabase implicit flow puts tokens in the URL hash
  const hash = window.location.hash;
  if (hash && hash.includes('access_token')) {
    // The Supabase client-side SDK will pick this up automatically
    window.location.replace('/');
  } else if (hash && hash.includes('error')) {
    const params = new URLSearchParams(hash.substring(1));
    const errDesc = params.get('error_description') || 'Authentication failed';
    window.location.replace('/login?error=' + encodeURIComponent(errDesc));
  } else {
    window.location.replace('/login?error=auth');
  }
</script>
<p>Signing you in...</p>
</body></html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}
