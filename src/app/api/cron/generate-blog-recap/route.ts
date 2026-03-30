/**
 * Daily Blog Recap Generator
 *
 * Generates an SEO-optimized blog post from today's consensus fire picks.
 * Runs once daily at 9 AM ET via Vercel cron.
 *
 * Post targets keywords: "AI sports picks today [date]", "consensus picks today",
 * "best bets today", sport-specific terms based on what's in the picks.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

interface ConsensusPick {
  team: string;
  pick_type: string;
  line: string;
  sport: string;
  capper_count: number;
  cappers: string[];
  is_fire: boolean;
}

async function getTodaysFirePicks(): Promise<ConsensusPick[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dailyaibetting.com';
    const res = await fetch(`${baseUrl}/api/consensus?minCappers=3`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.consensus || []).filter((p: ConsensusPick) => p.is_fire || p.capper_count >= 3);
  } catch {
    return [];
  }
}

async function generateRecapPost(picks: ConsensusPick[], dateStr: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured');

  const sports = [...new Set(picks.map((p) => p.sport))].join(', ');
  const fireCount = picks.filter((p) => p.capper_count >= 3).length;
  const topPicks = picks.slice(0, 8);

  const picksText = topPicks
    .map(
      (p) =>
        `- ${p.team} ${p.pick_type}${p.line ? ' ' + p.line : ''} (${p.sport}, ${p.capper_count} cappers: ${p.cappers.slice(0, 3).join(', ')}${p.cappers.length > 3 ? '...' : ''})`,
    )
    .join('\n');

  const systemPrompt = `You are an expert sports betting analyst writing SEO-optimized blog content for DailyAI Betting (dailyaibetting.com). Write in an engaging, informative style. Always include a responsible gambling disclaimer. Target keywords: "AI sports picks today", "consensus picks today", "best bets today", "fire picks", "expert consensus picks".`;

  const userPrompt = `Write a detailed HTML blog post about today's (${dateStr}) top consensus sports betting picks. We have ${picks.length} total consensus picks across ${sports}, with ${fireCount} fire picks (3+ experts agree).

Top picks:
${picksText}

Requirements:
- Title (H1): Include the date and target "AI sports picks today" or "consensus picks today"
- 400-600 words total
- Include sections: intro paragraph, fire picks highlight, sport breakdown, betting tips
- Use <h2> for section headers, <p> for paragraphs, <ul><li> for pick lists
- Bold fire picks (🔥) using <strong>
- End with a responsible gambling disclaimer in a <p class="disclaimer"> tag
- Include natural mentions of "expert consensus", "AI-powered analysis", "free sports picks"
- Do NOT include <html>, <head>, or <body> tags — just the article content starting with <h1>`;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://dailyaibetting.com',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-haiku-4-5',
      max_tokens: 1500,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function POST(req: NextRequest) {
  // Auth check
  const secret = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/New_York',
  });
  const isoDate = today.toISOString().split('T')[0];
  const slug = `ai-consensus-picks-today-${isoDate}`;

  const supabase = getSupabaseAdmin();

  // Skip if already generated today
  const { data: existing } = await supabase
    .from('blog_posts')
    .select('id')
    .eq('slug', slug)
    .eq('site', 'dailyaibetting')
    .single();

  if (existing) {
    return NextResponse.json({ success: true, skipped: true, slug, reason: 'Already generated today' });
  }

  // Get today's fire picks
  const picks = await getTodaysFirePicks();

  if (picks.length === 0) {
    return NextResponse.json({ success: false, error: 'No consensus picks available yet' }, { status: 404 });
  }

  // Generate the post
  const content = await generateRecapPost(picks, dateStr);

  if (!content) {
    return NextResponse.json({ success: false, error: 'Failed to generate content' }, { status: 500 });
  }

  const sports = [...new Set(picks.map((p) => p.sport))];
  const fireCount = picks.filter((p) => p.capper_count >= 3).length;
  const title = `AI Sports Picks Today (${dateStr}) — ${fireCount} Fire Consensus Picks`;
  const excerpt = `Today's AI-powered consensus picks: ${fireCount} fire picks where 3+ expert cappers agree across ${sports.join(', ')}. Updated ${dateStr}.`;
  const tags = [
    'consensus picks',
    'AI picks',
    'best bets today',
    'free sports picks',
    ...sports.map((s) => `${s} picks`),
  ];

  const { data, error } = await supabase
    .from('blog_posts')
    .insert({
      slug,
      title,
      content,
      excerpt,
      category: 'daily-picks',
      sport: sports.length === 1 ? sports[0] : null,
      tags,
      seo_title: `AI Consensus Sports Picks Today (${isoDate}) | DailyAI Betting`,
      seo_description: excerpt,
      ai_model: 'claude-haiku-4-5',
      ai_generated: true,
      author: 'DailyAI Betting',
      site: 'dailyaibetting',
      status: 'published',
      published_at: new Date().toISOString(),
    })
    .select('id, slug')
    .single();

  if (error) {
    console.error('Blog insert error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save post' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    slug,
    url: `/blog/${slug}`,
    picks: picks.length,
    fireCount,
    sports,
  });
}
