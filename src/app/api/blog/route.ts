import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Initialize Supabase client with service role for write operations
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

// GET - Fetch blog posts
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const category = searchParams.get('category');
    const sport = searchParams.get('sport');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = getSupabaseAdmin();

    if (!supabase) {
      // Return mock data if no Supabase
      return NextResponse.json({
        success: true,
        posts: [],
        total: 0,
        message: 'Database not configured'
      });
    }

    // Single post by slug
    if (slug) {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

      if (error || !data) {
        return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
      }

      // Increment view count
      await supabase
        .from('blog_posts')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('id', data.id);

      return NextResponse.json({ success: true, post: data });
    }

    // List posts (filter by category=daily-picks for dailyaibetting posts)
    let query = supabase
      .from('blog_posts')
      .select('id, slug, title, excerpt, category, tags, featured_image, published_at, view_count, author', { count: 'exact' })
      .eq('status', 'published')
      .eq('category', 'daily-picks')  // Only show dailyaibetting posts
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (category && category !== 'daily-picks') {
      query = query.eq('category', category);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Blog fetch error:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch posts' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      posts: data || [],
      total: count || 0,
      limit,
      offset
    });
  } catch (error) {
    console.error('Blog API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new blog post (for n8n automation)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, content, excerpt, category, sport, tags, meta_title, meta_description, ai_model } = body;

    // Validate required fields
    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: 'Title and content are required' },
        { status: 400 }
      );
    }

    // Verify API key for automation
    const apiKey = request.headers.get('x-api-key');
    const expectedKey = process.env.BLOG_API_KEY || 'dailyai-blog-secret-2025';

    if (apiKey !== expectedKey) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Generate slug from title and date
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const slugBase = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
    const slug = `${slugBase}-${dateStr}`;

    // Create post (using existing table schema from pickleballcourts)
    const { data, error } = await supabase
      .from('blog_posts')
      .insert({
        slug,
        title,
        content,
        excerpt: excerpt || title.substring(0, 160),
        category: category || 'daily-picks',
        tags: tags || [],
        seo_title: meta_title || title,
        seo_description: meta_description || excerpt || title,
        ai_model: ai_model || 'gpt-3.5-turbo',
        ai_generated: true,
        author: 'DailyAI Betting',
        status: 'published',
        published_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Blog create error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create post' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      post: data,
      url: `/blog/${slug}`
    });
  } catch (error) {
    console.error('Blog POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
