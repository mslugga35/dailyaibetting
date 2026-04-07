import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Eye, ArrowLeft, Share2 } from 'lucide-react';
import { EmailCaptureBanner } from '@/components/monetization/EmailCapture';
import { BlogPostingJsonLd } from '@/components/seo/JsonLd';
import harborPosts from '@/lib/harbor-posts.json';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  seo_title: string | null;
  seo_description: string | null;
  featured_image: string | null;
  published_at: string;
  view_count: number;
  ai_model: string | null;
  author: string | null;
  read_time: string | null;
}

const categoryLabels: Record<string, string> = {
  'daily-picks': 'Daily Picks',
  'preview': 'Game Preview',
  'recap': 'Recap',
  'analysis': 'Analysis',
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

async function getBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('blog_posts')
      .select('id, slug, title, excerpt, content, category, tags, featured_image, published_at, view_count, ai_model, author, seo_title, seo_description, read_time')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (error || !data) {
      // Fallback: check Harbor SEO posts
      const harbor = (harborPosts as Array<Record<string, unknown>>).find(p => p.slug === slug);
      if (harbor) {
        return {
          id: `harbor-${harbor.slug}`,
          slug: harbor.slug as string,
          title: harbor.title as string,
          excerpt: harbor.description as string,
          content: harbor.content as string,
          category: 'analysis',
          tags: (harbor.tags as string[]) || [],
          seo_title: null,
          seo_description: harbor.description as string,
          featured_image: null,
          published_at: harbor.date as string,
          view_count: 0,
          ai_model: 'harbor-seo',
          author: (harbor.author as string) || 'DailyAI Betting',
          read_time: `${harbor.readTime || 5} min read`,
        };
      }
      return null;
    }
    return data as unknown as BlogPost;
  } catch (error) {
    console.error('Failed to fetch blog post:', error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    return {
      title: 'Article Not Found | DailyAI Betting',
      robots: { index: false, follow: false },
    };
  }

  return {
    title: post.seo_title || `${post.title} | DailyAI Betting`,
    description: post.seo_description || post.excerpt,
    keywords: post.tags?.join(', '),
    alternates: {
      canonical: `https://dailyaibetting.com/blog/${slug}`,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    notFound();
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="container px-4 py-8 max-w-3xl mx-auto">
      {/* Back Link */}
      <Link
        href="/blog"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Blog
      </Link>

      {/* Blog Post Schema */}
      <BlogPostingJsonLd
        title={post.title}
        description={post.seo_description || post.excerpt}
        slug={post.slug}
        publishedAt={post.published_at}
        category={post.category}
        tags={post.tags || []}
        viewCount={post.view_count}
      />

      {/* Article Header */}
      <article>
        <header className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Badge className="bg-primary">
              {categoryLabels[post.category] || post.category}
            </Badge>
            {(post as any).sport && (
              <Badge variant="outline">{(post as any).sport}</Badge>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            {post.title}
          </h1>

          <div className="flex items-center justify-between flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(post.published_at)}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {post.view_count} views
              </span>
            </div>
            <ShareButton />
          </div>
        </header>

        {/* Article Content */}
        <div
          className="prose prose-invert max-w-none mb-8"
          dangerouslySetInnerHTML={{ __html: post.content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').replace(/on\w+\s*=/gi, 'data-removed=') }}
        />

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* AI Attribution */}
        <Card className="mb-8 bg-muted/30">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              This article was generated by AI ({post.ai_model || 'GPT-4'}) based on expert consensus data.
              Always do your own research before placing bets.
            </p>
          </CardContent>
        </Card>
      </article>

      {/* Email Capture */}
      <EmailCaptureBanner />

      {/* Related Links */}
      <Card className="mt-8">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Continue Reading</h3>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/blog">More Articles</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">Today&apos;s Consensus</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/daily-bets">Daily Bets</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/sportsbooks">Sportsbooks</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Client component for share functionality
function ShareButton() {
  return (
    <Button variant="ghost" size="sm" className="share-button" data-share="true">
      <Share2 className="h-4 w-4 mr-1" />
      Share
    </Button>
  );
}
