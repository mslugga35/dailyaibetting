# Adding a New Page — Step-by-Step Checklist

## 1. Create the Route (2 minutes)

```bash
# Create the directory
mkdir -p src/app/my-new-page

# Create page.tsx
cat > src/app/my-new-page/page.tsx << 'EOF'
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My New Page | DailyAI Betting',
  description: 'A brief description for search engines',
};

export default function MyNewPage() {
  return (
    <div className="container px-4 py-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">My New Page Title</h1>
      <p>Your content here.</p>
    </div>
  );
}
EOF
```

**Test locally:**
```bash
npm run dev
# Visit: http://localhost:3000/my-new-page
```

---

## 2. Add to Navigation (1 minute)

Edit `src/components/layout/Header.tsx` around line 40:

```tsx
import { MyIcon } from 'lucide-react'; // Add icon import

const navItems = [
  { name: 'Daily Bets', href: '/daily-bets', icon: Zap },
  { name: 'Consensus', href: '/consensus', icon: Target },
  { name: 'My New Page', href: '/my-new-page', icon: MyIcon }, // Add this
  // ... rest
];
```

**Icon options:** Use any from lucide-react
- BookOpen, FileText, Zap, Target, TrendingUp, BarChart3, etc.

**Test:** Menu should show your page

---

## 3. Add SEO Metadata

Already in page.tsx, customize as needed:

```tsx
export const metadata: Metadata = {
  title: 'My New Page | DailyAI Betting',
  description: 'What this page is about (for Google)',
  keywords: ['keyword1', 'keyword2', 'keyword3'],
  alternates: {
    canonical: 'https://dailyaibetting.com/my-new-page',
  },
  openGraph: {
    title: 'My New Page | DailyAI Betting',
    description: 'What this page is about',
    type: 'website',
    url: 'https://dailyaibetting.com/my-new-page',
  },
};
```

---

## 4. Add OG Image (Optional, 2 minutes)

For social sharing (Twitter, Discord):

Create `src/app/my-new-page/opengraph-image.tsx`:

```tsx
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
        color: '#10b981',
        fontWeight: 'bold',
      }}
    >
      My New Page
    </div>,
    { ...size }
  );
}
```

**Test:** Share link on Discord, image should appear

---

## 5. Add Data (If Needed)

### From Supabase

```tsx
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic'; // Always fetch fresh

async function getData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data, error } = await supabase
    .from('my_table_name')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (error) console.error('Database error:', error);
  return data || [];
}

export default async function MyNewPage() {
  const items = await getData();

  return (
    <div className="container px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Items</h1>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="border rounded-lg p-4">
            <h2 className="font-semibold">{item.title}</h2>
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### From API Endpoint

```tsx
export default async function MyNewPage() {
  const response = await fetch('/api/consensus', { cache: 'no-store' });
  const data = await response.json();

  return (
    <div>
      {data.consensus.map((pick) => (
        <div key={pick.id}>{pick.team} {pick.pickType}</div>
      ))}
    </div>
  );
}
```

---

## 6. Dynamic Routes (If List + Detail Pages)

### Structure
```
src/app/my-items/
├── page.tsx              /my-items (list)
└── [slug]/
    └── page.tsx          /my-items/anything (detail)
```

### List Page

```tsx
async function getItems() {
  const supabase = createClient(...);
  const { data } = await supabase
    .from('my_table')
    .select('id, slug, title, excerpt')
    .eq('status', 'published');
  return data || [];
}

export default async function ItemsListPage() {
  const items = await getItems();
  return (
    <div>
      {items.map((item) => (
        <Link key={item.id} href={`/my-items/${item.slug}`}>
          <h2>{item.title}</h2>
          <p>{item.excerpt}</p>
        </Link>
      ))}
    </div>
  );
}
```

### Detail Page

```tsx
interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getItem(slug: string) {
  const supabase = createClient(...);
  const { data } = await supabase
    .from('my_table')
    .select('*')
    .eq('slug', slug)
    .single();
  return data;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const item = await getItem(slug);
  return { title: item?.title };
}

export default async function ItemDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const item = await getItem(slug);

  if (!item) notFound();

  return (
    <div>
      <h1>{item.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: item.content }} />
    </div>
  );
}
```

---

## 7. Test Locally

```bash
npm run dev
# http://localhost:3000/my-new-page
```

**Checklist:**
- Page loads
- No console errors
- Navigation shows your page
- Mobile responsive (Ctrl+Shift+K in DevTools)
- Links work
- Data displays (if added)

---

## 8. Commit & Deploy

```bash
git add src/app/my-new-page/
git add src/components/layout/Header.tsx
git commit -m "feat: add my new page"
git push origin main

# Vercel auto-deploys within 30 seconds
# Check: https://dailyaibetting.com/my-new-page
```

---

## 9. Verify on Production

After push, within 30 seconds:
1. Visit: `https://dailyaibetting.com/my-new-page`
2. Check page loads
3. Right-click → Inspect → check meta tags in `<head>`
4. Share URL in Discord, check OG image preview
5. Check page appears in header navigation

---

## Common Tailwind Classes

```tsx
// Layout
<div className="container">              // Max-width container
<div className="container px-4">         // With padding
<div className="max-w-4xl mx-auto">     // Center & limit width

// Typography
<h1 className="text-4xl font-bold">     // Large heading
<p className="text-muted-foreground">   // Gray text

// Spacing
<div className="mb-8">                  // Margin bottom
<div className="py-8">                  // Padding vertical
<div className="gap-4">                 // Gap between items

// Cards
<div className="border rounded-lg p-6"> // Card box

// Grid
<div className="grid grid-cols-3 gap-4">// 3 columns

// Responsive
<div className="hidden md:block">       // Hide mobile, show desktop
<div className="md:grid-cols-2">        // 2 cols on desktop, 1 on mobile
```

---

## Gotchas

| Problem | Solution |
|---------|----------|
| Page returns 404 | Check: `src/app/my-route/page.tsx` exact name |
| Page shows cached data | Add `export const dynamic = 'force-dynamic';` |
| Supabase returns null | Verify `.env.local` has correct keys |
| Mobile menu broken | Update `Header.tsx` navItems array |
| SEO meta not updating | Hard refresh: Ctrl+Shift+R |
| OG image not showing | Check `opengraph-image.tsx` has `export const runtime = 'edge';` |
| Route not live | Wait 30 seconds after git push for Vercel deploy |

---

## Fastest Path (3 minutes)

1. Create `src/app/my-page/page.tsx` (use template above)
2. Edit `src/components/layout/Header.tsx` (add navItem)
3. `git push origin main`
4. Visit `https://dailyaibetting.com/my-page` after 30 seconds

Done!
