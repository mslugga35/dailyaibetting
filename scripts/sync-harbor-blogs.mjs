#!/usr/bin/env node
/**
 * sync-harbor-blogs.mjs
 * Scans public/blog/*.html for Harbor SEO posts,
 * extracts content via cheerio, writes src/lib/harbor-posts.json.
 * Runs automatically before `next build`.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'fs'
import { join, basename } from 'path'
import * as cheerio from 'cheerio'

const BLOG_DIR = join(import.meta.dirname, '..', 'public', 'blog')
const OUTPUT = join(import.meta.dirname, '..', 'src', 'lib', 'harbor-posts.json')
const IGNORE = new Set(['index.html', 'rss.xml'])

function extractPost(filePath) {
  const html = readFileSync(filePath, 'utf-8')
  const $ = cheerio.load(html)
  const slug = basename(filePath, '.html')
  const title = $('article header h1').text().trim()
  const description = $('.blog-article-intro').text().trim()
  const dateRaw = $('article time').attr('datetime') || ''
  const date = dateRaw ? dateRaw.split('T')[0] : ''
  const author = $('article address').text().trim() || 'DailyAI Betting'
  const keywords = $('meta[name="keywords"]').attr('content') || ''
  const tags = keywords ? keywords.split(',').map(t => t.trim()).filter(Boolean).slice(0, 4) : ['AI Betting']
  const introHtml = $('.blog-article-intro').html() || ''
  const bodyHtml = $('.blog-article-body').html() || ''
  const content = (introHtml ? `<div class="lead">${introHtml}</div>\n` : '') + bodyHtml
  if (!title || !content) { console.warn(`⚠️  Skipping ${slug}`); return null }
  const wordCount = content.replace(/<[^>]+>/g, '').split(/\s+/).length
  const readTime = Math.max(1, Math.ceil(wordCount / 200))
  return { slug, title, description, date, author, tags, content, readTime }
}

function main() {
  if (!existsSync(BLOG_DIR)) { writeFileSync(OUTPUT, '[]'); return }
  const files = readdirSync(BLOG_DIR).filter(f => {
    if (!f.endsWith('.html') || IGNORE.has(f)) return false
    const full = join(BLOG_DIR, f)
    return statSync(full).isFile()
  })
  const posts = []
  for (const file of files) {
    const post = extractPost(join(BLOG_DIR, file))
    if (post) { posts.push(post); console.log(`✅ ${post.slug} (${post.date})`) }
  }
  posts.sort((a, b) => b.date.localeCompare(a.date))
  writeFileSync(OUTPUT, JSON.stringify(posts, null, 2))
  console.log(`\n📝 Synced ${posts.length} Harbor post(s) → src/lib/harbor-posts.json`)
}

main()
