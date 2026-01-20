'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, Eye, ArrowLeft, Share2, BookOpen } from 'lucide-react';
import { EmailCaptureBanner } from '@/components/monetization/EmailCapture';
import { BlogPostingJsonLd } from '@/components/seo/JsonLd';
import Link from 'next/link';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  sport: string | null;
  tags: string[];
  meta_title: string;
  meta_description: string;
  featured_image: string | null;
  published_at: string;
  view_count: number;
  ai_model: string;
}

const categoryLabels: Record<string, string> = {
  'daily-picks': 'Daily Picks',
  'preview': 'Game Preview',
  'recap': 'Recap',
  'analysis': 'Analysis',
};

export default function BlogPostPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [post, setPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPost() {
      if (!slug) return;

      try {
        const res = await fetch(`/api/blog?slug=${encodeURIComponent(slug)}`);
        const data = await res.json();

        if (data.success && data.post) {
          setPost(data.post);
        } else {
          setError('Article not found');
        }
      } catch (err) {
        setError('Failed to load article');
      } finally {
        setIsLoading(false);
      }
    }

    fetchPost();
  }, [slug]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleShare = async () => {
    if (navigator.share && post) {
      try {
        await navigator.share({
          title: post.title,
          text: post.excerpt,
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  if (isLoading) {
    return (
      <div className="container px-4 py-16 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="mt-4 text-muted-foreground">Loading article...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="container px-4 py-16 text-center max-w-2xl mx-auto">
        <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Article Not Found</h1>
        <p className="text-muted-foreground mb-6">
          This article may have been removed or the URL is incorrect.
        </p>
        <Button asChild>
          <Link href="/blog">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Blog
          </Link>
        </Button>
      </div>
    );
  }

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
        description={post.meta_description || post.excerpt}
        slug={post.slug}
        publishedAt={post.published_at}
        category={post.category}
        tags={post.tags}
        viewCount={post.view_count}
      />

      {/* Article Header */}
      <article>
        <header className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Badge className="bg-primary">
              {categoryLabels[post.category] || post.category}
            </Badge>
            {post.sport && (
              <Badge variant="outline">{post.sport}</Badge>
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
            <Button variant="ghost" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
          </div>
        </header>

        {/* Article Content */}
        <div
          className="prose prose-invert max-w-none mb-8"
          dangerouslySetInnerHTML={{ __html: post.content }}
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
