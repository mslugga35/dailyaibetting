# Quick Start: Adding a New Page to DailyAI Betting

**TL;DR:** Next.js auto-routes any `.tsx` file in `src/app/` to a URL.

---

## The Minimal Page (2 minutes)

```bash
# 1. Create folder
mkdir -p src/app/my-new-page

# 2. Create page file
cat > src/app/my-new-page/page.tsx << 'EOF'
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My New Page | DailyAI Betting',
  description: 'A description for search engines',
};

export default function MyNewPage() {
  return (
    <div className="container px-4 py-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">My New Page</h1>
      <p>Your content here</p>
    </div>
  );
}
EOF

# 3. Test it
npm run dev
# Visit: http://localhost:3000/my-new-page
```

**Done.** It's live locally. Push to deploy to production.

---

## Routing Convention

| File | Route |
|------|-------|
| `src/app/my-page/page.tsx` | `/my-page` |
| `src/app/guides/page.tsx` | `/guides` |
| `src/app/guides/[slug]/page.tsx` | `/guides/anything` (slug param) |
| `src/app/api/my-endpoint/route.ts` | `GET /api/my-endpoint` |

---

## With Supabase Data (5 minutes)

```typescript
// src/app/my-content/page.tsx
import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic'; // Always fresh data

export const metadata: Metadata = {
  title: 'My Content | DailyAI Betting',
  description: 'Dynamic content from Supabase',
};

interface Item {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

async function getItems(): Promise<Item[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data, error } = await supabase
    .from('my_table')
    .select('id, title, content, created_at')
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (error) console.error('Supabase error:', error);
  return data || [];
}

export default async function MyContentPage() {
  const items = await getItems();

  return (
    <div className="container px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">My Content</h1>
      <div className="space-y-6">
        {items.map((item) => (
          <div key={item.id} className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">{item.title}</h2>
            <p className="text-muted-foreground">{item.content}</p>
            <time className="text-sm text-muted-foreground">
              {new Date(item.created_at).toLocaleDateString()}
            </time>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Dynamic Pages (Like Blog Posts)

**List page:** `src/app/my-items/page.tsx`
**Detail page:** `src/app/my-items/[slug]/page.tsx`

```typescript
// src/app/my-items/[slug]/page.tsx
import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface Item {
  id: string;
  slug: string;
  title: string;
  content: string;
  seo_title: string | null;
  seo_description: string | null;
}

async function getItem(slug: string): Promise<Item | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data } = await supabase
    .from('my_table')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  return data as unknown as Item | null;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = await getItem(slug);

  if (!item) {
    return { title: 'Not Found' };
  }

  return {
    title: item.seo_title || item.title,
    description: item.seo_description,
  };
}

export default async function ItemPage({ params }: PageProps) {
  const { slug } = await params;
  const item = await getItem(slug);

  if (!item) {
    notFound(); // Render 404 page
  }

  return (
    <div className="container px-4 py-8 max-w-3xl mx-auto">
      <article>
        <h1 className="text-4xl font-bold mb-4">{item.title}</h1>
        <div
          className="prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: item.content }}
        />
      </article>
    </div>
  );
}
```

---

## Add to Navigation

Update `src/components/layout/Header.tsx` (line ~40):

```typescript
const navItems = [
  { name: 'Daily Bets', href: '/daily-bets', icon: Zap },
  { name: 'Consensus', href: '/consensus', icon: Target },
  // Add your new page:
  { name: 'My New Page', href: '/my-new-page', icon: BookOpen }, // Import BookOpen from lucide-react
  // ... rest
];
```

---

## Add OG Image (for Social Sharing)

Create `src/app/my-page/opengraph-image.tsx`:

```typescript
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'My New Page';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        fontSize: 48,
        background: 'linear-gradient(135deg, #000 0%, #1a1a1a 100%)',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#10b981', // emerald
        fontWeight: 'bold',
      }}
    >
      My New Page
    </div>,
    { ...size }
  );
}
```

---

## API Endpoint (Optional)

Create `src/app/api/my-endpoint/route.ts`:

```typescript
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    // Your logic here
    const result = { query, data: [] };

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Request failed' },
      { status: 500 }
    );
  }
}
```

**Call it:** `fetch('/api/my-endpoint?q=search')`

---

## Common Tailwind Classes

```tsx
// Layout
<div className="container px-4 py-8">     {/* Max width + padding */}
<div className="max-w-4xl mx-auto">      {/* Center & limit width */}
<div className="flex gap-4">              {/* Horizontal flex */}
<div className="grid grid-cols-3 gap-4"> {/* 3-column grid */}

// Text
<h1 className="text-4xl font-bold">     {/* Heading */}
<p className="text-muted-foreground">    {/* Gray text */}

// Cards
<div className="border rounded-lg p-6">  {/* Card */}

// Spacing
mb-4  {/* Margin bottom */}
gap-4 {/* Gap between children */}
```

---

## Deploy

```bash
git add src/app/my-page/
git commit -m "feat: add my new page"
git push origin main
# Vercel auto-deploys. Check https://dailyaibetting.com/my-page in 30 seconds
```

---

## Common Gotchas

| Issue | Fix |
|-------|-----|
| Page not found (404) | Check folder structure & filename: must be `page.tsx` in `src/app/` |
| Page shows old data | Add `export const dynamic = 'force-dynamic';` to always fetch fresh |
| Metadata not showing | Add `export const metadata: Metadata = {...};` at top |
| Supabase null response | Check `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Image broken on social | Add `opengraph-image.tsx` in the page folder |
| Mobile nav broken | Don't forget to update Header.tsx's `navItems` array |

---

## Examples in Codebase

Look at these for reference:

- **Simple page:** `src/app/advertise/page.tsx`
- **Dynamic list + detail:** `src/app/blog/page.tsx` + `src/app/blog/[slug]/page.tsx`
- **With API data:** `src/app/consensus/page.tsx`
- **Sport-specific:** `src/app/nfl-picks-today/page.tsx`
- **API endpoint:** `src/app/api/consensus/route.ts`

---

## Need Help?

Check `SITE-STRUCTURE.md` for full documentation.
