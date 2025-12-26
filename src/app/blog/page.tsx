'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, BookOpen, Calendar, Eye, ChevronRight } from 'lucide-react';
import { EmailCaptureBanner } from '@/components/monetization/EmailCapture';
import Link from 'next/link';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  sport: string | null;
  tags: string[];
  featured_image: string | null;
  published_at: string;
  view_count: number;
}

const categoryLabels: Record<string, string> = {
  'daily-picks': 'Daily Picks',
  'preview': 'Game Preview',
  'recap': 'Recap',
  'analysis': 'Analysis',
};

const categoryColors: Record<string, string> = {
  'daily-picks': 'bg-primary',
  'preview': 'bg-blue-500',
  'recap': 'bg-purple-500',
  'analysis': 'bg-orange-500',
};

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const res = await fetch('/api/blog?limit=20');
        const data = await res.json();

        if (data.success) {
          setPosts(data.posts);
        } else {
          setError(data.error || 'Failed to load posts');
        }
      } catch (err) {
        setError('Failed to load posts');
      } finally {
        setIsLoading(false);
      }
    }

    fetchPosts();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="container px-4 py-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-primary mb-2">
          <BookOpen className="h-5 w-5" />
          <span className="text-sm font-medium">AI Sports Blog</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          Daily Betting Insights
        </h1>
        <p className="text-muted-foreground">
          AI-generated analysis, picks previews, and betting strategy articles updated daily at 9 AM ET.
        </p>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading articles...</span>
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">{error}</p>
        </Card>
      )}

      {/* Posts Grid */}
      {!isLoading && !error && posts.length > 0 && (
        <div className="space-y-6">
          {/* Featured Post (first one) */}
          {posts[0] && (
            <Link href={`/blog/${posts[0].slug}`}>
              <Card className="overflow-hidden hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className={categoryColors[posts[0].category] || 'bg-primary'}>
                      {categoryLabels[posts[0].category] || posts[0].category}
                    </Badge>
                    {posts[0].sport && (
                      <Badge variant="outline">{posts[0].sport}</Badge>
                    )}
                    <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                      <Eye className="h-3 w-3" />
                      {posts[0].view_count}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">
                    {posts[0].title}
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    {posts[0].excerpt}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(posts[0].published_at)}
                    </span>
                    <span className="text-primary flex items-center gap-1 text-sm font-medium">
                      Read More <ChevronRight className="h-4 w-4" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}

          {/* Rest of posts */}
          <div className="grid md:grid-cols-2 gap-4">
            {posts.slice(1).map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`}>
                <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {categoryLabels[post.category] || post.category}
                      </Badge>
                      {post.sport && (
                        <Badge variant="outline" className="text-xs">{post.sport}</Badge>
                      )}
                    </div>
                    <h3 className="font-semibold mb-2 line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatDate(post.published_at)}</span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {post.view_count}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && posts.length === 0 && (
        <Card className="p-8 text-center">
          <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Coming Soon</h2>
          <p className="text-muted-foreground mb-6">
            Our AI-powered daily sports blog launches soon. Subscribe to get notified!
          </p>
        </Card>
      )}

      {/* Email Capture */}
      <div className="mt-8">
        <EmailCaptureBanner />
      </div>

      {/* Quick Links */}
      <Card className="mt-8">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Quick Links</h3>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/">Today&apos;s Consensus</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/daily-bets">Daily Bets</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/results">Track Record</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/sportsbooks">Sportsbooks</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SEO Content */}
      <section className="mt-12 prose prose-invert max-w-none">
        <h2 className="text-xl font-semibold mb-3">About Our AI Sports Blog</h2>
        <p className="text-muted-foreground">
          Our AI-powered sports betting blog provides daily analysis, game previews, and betting insights
          generated using advanced language models. Each morning at 9 AM ET, we publish fresh content
          analyzing the day&apos;s betting opportunities based on expert consensus data.
        </p>
        <p className="text-muted-foreground mt-4">
          Articles cover NFL, NBA, MLB, NHL, college football, and college basketball betting,
          with a focus on consensus plays where multiple professional handicappers agree.
          Our AI analyzes patterns, trends, and expert picks to provide actionable insights.
        </p>
      </section>
    </div>
  );
}
