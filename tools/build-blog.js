#!/usr/bin/env node
/*
 * build-blog.js — turns content/posts/*.md into /blog pages.
 *
 * The site has no framework and no build step at deploy time. This script runs
 * locally, writes plain HTML into blog/, and you commit the result. Vercel keeps
 * serving static files exactly as before.
 *
 *   node tools/build-blog.js          build
 *   node tools/build-blog.js --check  validate only, write nothing
 *
 * Page chrome (topbar, masthead, nav, footer) is lifted from services.html at
 * build time rather than duplicated here, so a nav or footer edit propagates to
 * every post the next time this runs.
 *
 * A post is only rendered when its front matter says `published: true`. Anything
 * else is left out of blog/, off the index and out of the sitemap.
 *
 * The build refuses to render a post that still contains an unresolved
 * [EXTERNAL LINK: ...] marker. Those need a real URL; guessing one would put a
 * citation on the page that nobody verified.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'content', 'posts');
const OUT_DIR = path.join(ROOT, 'blog');
const CHROME_SOURCE = path.join(ROOT, 'services.html');
const SITEMAP = path.join(ROOT, 'sitemap.xml');
const SITE = 'https://jtbuildsco.com';
const CHECK_ONLY = process.argv.includes('--check');

/* ---------- small helpers ---------- */

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const escapeAttr = (s) => escapeHtml(s).replace(/"/g, '&quot;');

function fail(msg) {
  console.error('\n  BUILD STOPPED\n  ' + msg + '\n');
  process.exit(1);
}

/* ---------- front matter ---------- */

function parseFrontMatter(raw, file) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) fail(`${file}: no front matter block found.`);
  const fm = {};
  let listKey = null;
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim()) continue;
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && listKey) {
      fm[listKey].push(item[1].trim().replace(/^["']|["']$/g, ''));
      continue;
    }
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    const val = kv[2].trim();
    if (val === '') {
      listKey = key;
      fm[key] = [];
    } else {
      listKey = null;
      fm[key] = val.replace(/^["']|["']$/g, '');
    }
  }
  return { data: fm, body: m[2] };
}

/* ---------- link markers ---------- */

// [INTERNAL LINK: /pricing "the two numbers, in full"]
const INTERNAL_RE = /\[INTERNAL LINK:\s*([^\s\]]+)\s*"([^"]*)"\s*\]/g;
const EXTERNAL_RE = /\[EXTERNAL LINK:[^\]]*\]/g;

// Sibling posts are written as /posts/<slug> in the drafts but the route is
// /blog/<slug>. Same slug, so this is a route correction, not a guess.
function normaliseTarget(target) {
  if (target.startsWith('/posts/')) return '/blog/' + target.slice('/posts/'.length);
  return target;
}

// slugs that are live right now; a link to anything else would be a 404
let LIVE_SLUGS = new Set();
const DEFERRED = [];

function linkHtml(target, anchor) {
  const href = normaliseTarget(target);
  const external = /^https?:\/\//.test(href);
  if (!external && href.startsWith('/blog/')) {
    const slug = href.slice('/blog/'.length);
    if (!LIVE_SLUGS.has(slug)) {
      // the sibling is not published yet. Keep the sentence intact and leave
      // the words unlinked rather than shipping a 404. The next build after
      // that post goes live turns it back into a link, with no edit here.
      DEFERRED.push({ slug, anchor });
      return escapeHtml(anchor);
    }
  }
  const attrs = external ? ' target="_blank" rel="noopener"' : '';
  return `<a href="${escapeAttr(href)}"${attrs}>${escapeHtml(anchor)}</a>`;
}

/* ---------- inline markdown ---------- */

function inline(text) {
  const slots = [];
  const stash = (html) => {
    slots.push(html);
    return `%%SLOT${slots.length - 1}%%`;
  };

  let s = text;
  s = s.replace(INTERNAL_RE, (_, t, a) => stash(linkHtml(t, a)));
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) =>
    stash(`<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" loading="lazy">`));
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, a, t) => stash(linkHtml(t, a)));
  s = s.replace(/`([^`]+)`/g, (_, c) => stash(`<code>${escapeHtml(c)}</code>`));
  s = s.replace(/\*\*([^*]+)\*\*/g, (_, b) => stash(`<strong>${escapeHtml(b)}</strong>`));

  s = escapeHtml(s);
  s = s.replace(/%%SLOT(\d+)%%/g, (_, i) => slots[Number(i)]);
  return s;
}

/* ---------- block markdown ---------- */

function renderBody(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  let i = 0;

  const isTableRow = (l) => /^\s*\|.*\|\s*$/.test(l);
  const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

    // fenced code — the JSON-LD block is pulled out before this runs, so
    // anything left is a genuine code sample
    if (/^```/.test(line)) {
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(`<pre><code>${escapeHtml(buf.join('\n'))}</code></pre>`);
      continue;
    }

    if (/^---+\s*$/.test(line)) { out.push('<hr>'); i++; continue; }

    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = Math.min(h[1].length, 6);
      out.push(`<h${level}>${inline(h[2].trim())}</h${level}>`);
      i++;
      continue;
    }

    // table: header row, delimiter row, then body rows
    if (isTableRow(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      const head = cells(lines[i]);
      i += 2;
      const body = [];
      while (i < lines.length && isTableRow(lines[i])) body.push(cells(lines[i++]));
      out.push(
        // tabindex makes the scroll box reachable by keyboard (WCAG 2.1.1)
        '<div class="post-table-wrap" tabindex="0" role="group" aria-label="Table, scrolls sideways"><table>' +
        // a blank corner cell in a comparison table is not a header;
        // emitting <th></th> leaves a header with no accessible name
        '<thead><tr>' + head.map((c) => (c.trim()
          ? `<th scope="col">${inline(c)}</th>`
          : '<td></td>')).join('') + '</tr></thead>' +
        '<tbody>' + body.map((r) => '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') +
        '</tbody></table></div>'
      );
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      out.push('<ul>' + items.map((t) => `<li>${inline(t)}</li>`).join('') + '</ul>');
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      out.push('<ol>' + items.map((t) => `<li>${inline(t)}</li>`).join('') + '</ol>');
      continue;
    }

    // paragraph — consecutive non-blank lines that start no other block
    const para = [];
    while (
      i < lines.length && lines[i].trim() &&
      !/^```/.test(lines[i]) && !/^---+\s*$/.test(lines[i]) &&
      !/^#{1,6}\s/.test(lines[i]) && !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) && !isTableRow(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }

  return out.join('\n');
}

/* ---------- page chrome, lifted from an existing page ---------- */

function readChrome() {
  const html = fs.readFileSync(CHROME_SOURCE, 'utf8');
  const grab = (start, end) => {
    const a = html.indexOf(start);
    const b = html.indexOf(end, a);
    if (a === -1 || b === -1) fail(`could not read chrome from ${path.basename(CHROME_SOURCE)}`);
    return html.slice(a, b + end.length);
  };
  const banner = grab('<header class="site-banner">', '</header>');
  let nav = grab('<nav class="nav">', '</nav>');
  const footer = grab('<footer class="site-footer">', '</footer>');
  const skip = '<a class="skip-link" href="#main">Skip to content</a>';
  // the chrome page marks itself current; posts are not that page
  nav = nav.replace(/\s*aria-current="page"/g, '');
  // posts live one directory down, so relative asset paths have to be absolute
  const absolutise = (s) => s.replace(/(src|href)="(?!\/|https?:|mailto:|tel:|#)/g, '$1="/');
  return {
    banner: absolutise(banner),
    nav: absolutise(nav),
    footer: absolutise(footer),
    skip,
  };
}

function navFor(href, chrome) {
  return chrome.nav.replace(
    new RegExp(`(<a href="${href.replace('/', '\\/')}"[^>]*)(>)`),
    '$1 aria-current="page"$2'
  );
}

/* ---------- templates ---------- */

const HEAD = ({ title, description, canonical, jsonld, keywords }) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeAttr(description)}">${
  keywords && keywords.length ? `\n<meta name="keywords" content="${escapeAttr(keywords.join(', '))}">` : ''}
<link rel="icon" type="image/png" href="/assets/favicon.png">
<link rel="canonical" href="${escapeAttr(canonical)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="JT Builds Co.">
<meta property="og:title" content="${escapeAttr(title)}">
<meta property="og:description" content="${escapeAttr(description)}">
<meta property="og:url" content="${escapeAttr(canonical)}">
<meta property="og:image" content="${SITE}/assets/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/style.css">${jsonld ? `
<script type="application/ld+json">
${jsonld}
</script>` : ''}
</head>
<body>`;

function postPage(post, chrome) {
  const canonical = `${SITE}/blog/${post.slug}`;
  return [
    HEAD({
      title: post.title + ' — JT Builds Co.',
      description: post.description,
      canonical,
      jsonld: post.jsonld,
      keywords: post.keywords,
    }),
    chrome.skip,
    '',
    chrome.banner,
    '',
    navFor('/blog', chrome),
    '',
    '<main id="main" tabindex="-1">',
    '<article class="post">',
    '  <a href="/blog" class="post-back">&larr; GUIDES</a>',
    `  <h1>${escapeHtml(post.title)}</h1>`,
    `  <p class="post-meta"><time datetime="${escapeAttr(post.date)}">${escapeHtml(post.dateLabel)}</time> &middot; ${post.readingTime} min read</p>`,
    `  <p class="post-standfirst">${escapeHtml(post.description)}</p>`,
    '  <div class="post-body">',
    post.html,
    '  </div>',
    post.imageComment,
    '</article>',
    '',
    '<section class="cta-band reveal">',
    '  <h2>Want a straight answer about your own site?</h2>',
    '  <p class="cta-band-sub">Tell me what your business needs and I\'ll reply personally within one business day.</p>',
    '  <a href="/contact" class="btn btn-dark">REQUEST A FREE CONSULTATION</a>',
    '</section>',
    '</main>',
    '',
    chrome.footer,
    '',
    '<script src="/js/reveal.js" defer></script>',
    '</body>',
    '</html>',
    '',
  ].join('\n');
}

function indexPage(posts, chrome) {
  const cards = posts.length
    ? posts.map((p) => `      <article class="guide-card">
        <p class="guide-date"><time datetime="${escapeAttr(p.date)}">${escapeHtml(p.dateLabel)}</time> &middot; ${p.readingTime} min read</p>
        <h2><a href="/blog/${escapeAttr(p.slug)}">${escapeHtml(p.title)}</a></h2>
        <p>${escapeHtml(p.description)}</p>
        <a href="/blog/${escapeAttr(p.slug)}" class="link-rule">READ THE GUIDE &rarr;</a>
      </article>`).join('\n')
    : '      <p class="terms-text">The first guides are being written. Check back shortly.</p>';

  return [
    HEAD({
      title: 'Guides — JT Builds Co.',
      description: 'Plain-English guides for small business owners on websites, costs, Google Business Profile, accessibility and ownership, from a one-person studio in Foxboro, Massachusetts.',
      canonical: `${SITE}/blog`,
      jsonld: null,
      keywords: null,
    }),
    chrome.skip,
    '',
    chrome.banner,
    '',
    navFor('/blog', chrome),
    '',
    '<main id="main" tabindex="-1">',
    '<section class="page-header">',
    '  <span class="numeral">VII.</span>',
    '  <h1>Guides</h1>',
    '  <p>Straight answers to the questions small business owners actually ask before they hire anyone &mdash; what a website costs, who owns it, and what is worth paying for.</p>',
    '</section>',
    '',
    '<section class="services reveal">',
    '  <div class="section-head">',
    '    <h2>All Guides</h2>',
    '    <div class="head-rule"></div>',
    '  </div>',
    '  <div class="guide-list">',
    cards,
    '  </div>',
    '</section>',
    '',
    '<section class="cta-band reveal">',
    '  <h2>Still not sure what your business needs?</h2>',
    '  <p class="cta-band-sub">That is what the consultation is for. No obligation, no sales pitch.</p>',
    '  <a href="/contact" class="btn btn-dark">REQUEST A FREE CONSULTATION</a>',
    '</section>',
    '</main>',
    '',
    chrome.footer,
    '',
    '<script src="/js/reveal.js" defer></script>',
    '</body>',
    '</html>',
    '',
  ].join('\n');
}

/* ---------- one post ---------- */

function loadPost(file) {
  const name = path.basename(file);
  const raw = fs.readFileSync(file, 'utf8');
  const { data, body } = parseFrontMatter(raw, name);

  for (const key of ['title', 'description', 'slug']) {
    if (!data[key]) fail(`${name}: front matter is missing "${key}".`);
  }

  const published = String(data.published).toLowerCase() === 'true';

  // JSON-LD lives in the last fenced json block
  let jsonld = null;
  let content = body;
  const fence = content.match(/```json\s*\r?\n([\s\S]*?)\r?\n```\s*$/);
  if (fence) {
    jsonld = fence[1].trim();
    try {
      JSON.parse(jsonld);
    } catch (e) {
      fail(`${name}: the JSON-LD block is not valid JSON — ${e.message}`);
    }
    content = content.slice(0, fence.index);
  }

  // image suggestions become a comment, never visible copy
  let imageComment = '';
  const imgIdx = content.search(/^##\s+Image suggestions\s*$/m);
  if (imgIdx !== -1) {
    const section = content.slice(imgIdx).replace(/^##\s+Image suggestions\s*/m, '').replace(/\n---\s*$/, '').trim();
    const alts = [...section.matchAll(/Alt text:\s*"([^"]+)"/g)].map((m) => m[1]);
    imageComment = [
      '  <!-- IMAGE PLACEHOLDERS — alt text is written, images are not.',
      '       To place one, add a markdown image line at the right point in',
      '       content/posts/' + name + ' and re-run: node tools/build-blog.js',
      '',
      ...alts.map((a, n) => `       ${n + 1}. ![${a}](/assets/blog/${data.slug}-${n + 1}.jpg)`),
      '',
      '       Original suggestions:',
      ...section.split(/\r?\n/).filter(Boolean).map((l) => '       ' + l.replace(/--+>/g, '- ->')),
      '  -->',
    ].join('\n');
    content = content.slice(0, imgIdx);
  }

  // drop the leading H1; the template renders the title from front matter
  content = content.replace(/^\s*#\s+.*\r?\n/, '');
  content = content.replace(/\n---\s*$/, '').trim();

  const external = content.match(EXTERNAL_RE);
  const words = content.split(/\s+/).filter(Boolean).length;

  const date = data.date || '';
  const dateLabel = date
    ? new Date(date + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return {
    file: name,
    slug: data.slug,
    title: data.title,
    description: data.description,
    keywords: data.keywords || [],
    schema: data.schema || '',
    date,
    dateLabel,
    published,
    jsonld,
    external: external || [],
    words,
    readingTime: Math.max(1, Math.round(words / 220)),
    render: () => renderBody(content),
    imageComment,
  };
}

/* ---------- sitemap ---------- */

function updateSitemap(posts) {
  const START = '  <!-- blog:start -->';
  const END = '  <!-- blog:end -->';
  let xml = fs.readFileSync(SITEMAP, 'utf8');
  const block = [
    START,
    `  <url>\n    <loc>${SITE}/blog</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`,
    ...posts.map((p) =>
      `  <url>\n    <loc>${SITE}/blog/${p.slug}</loc>${p.date ? `\n    <lastmod>${p.date}</lastmod>` : ''}\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`),
    END,
  ].join('\n');

  if (xml.includes(START) && xml.includes(END)) {
    xml = xml.replace(new RegExp(START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?' + END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), block);
  } else {
    xml = xml.replace('</urlset>', block + '\n</urlset>');
  }
  if (!CHECK_ONLY) fs.writeFileSync(SITEMAP, xml);
  return posts.length;
}

/* ---------- main ---------- */

function main() {
  if (!fs.existsSync(POSTS_DIR)) fail(`no posts directory at ${POSTS_DIR}`);
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md')).sort();
  if (!files.length) fail('no markdown files in content/posts/');

  const all = files.map((f) => loadPost(path.join(POSTS_DIR, f)));
  const live = all.filter((p) => p.published);

  // a published post may not carry an unresolved external citation
  const blocked = live.filter((p) => p.external.length);
  if (blocked.length) {
    const detail = blocked
      .map((p) => `    ${p.file}\n` + p.external.map((m) => `      ${m}`).join('\n'))
      .join('\n');
    fail(
      'These posts are marked published but still contain [EXTERNAL LINK] markers\n' +
      '  with no URL. Add the real URLs, or set published: false.\n\n' + detail
    );
  }

  const bySlug = new Map(all.map((p) => [p.slug, p]));
  const warnings = [];
  LIVE_SLUGS = new Set(live.map((p) => p.slug));

  for (const p of live) {
    if (!p.date) warnings.push(`${p.file}: no date in front matter, so the index shows none.`);
    DEFERRED.length = 0;
    p.html = p.render();
    for (const d of DEFERRED) {
      const target = bySlug.get(d.slug);
      warnings.push(target
        ? `${p.file}: "${d.anchor}" left unlinked until ${d.slug} publishes.`
        : `${p.file}: links to /blog/${d.slug}, which is not a post in content/posts/.`);
    }
    // internal links must point at something that exists
    for (const m of p.html.matchAll(/href="(\/[^"#]*)"/g)) {
      const href = m[1].replace(/\/$/, '') || '/';
      if (href === '/') continue;
      if (href.startsWith('/blog/')) continue;
      if (href === '/blog') continue;
      const asFile = path.join(ROOT, href.slice(1) + '.html');
      if (!fs.existsSync(asFile)) warnings.push(`${p.file}: links to ${href}, and ${path.basename(asFile)} does not exist.`);
    }
  }

  live.sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.title.localeCompare(b.title));

  if (!CHECK_ONLY) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    // clear out pages whose post is no longer published
    for (const f of fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.html'))) {
      const slug = f.replace(/\.html$/, '');
      if (slug !== 'index' && !live.some((p) => p.slug === slug)) {
        fs.unlinkSync(path.join(OUT_DIR, f));
        console.log(`  removed  blog/${f} (no longer published)`);
      }
    }
  }

  const chrome = readChrome();

  for (const p of live) {
    const out = path.join(OUT_DIR, p.slug + '.html');
    if (!CHECK_ONLY) fs.writeFileSync(out, postPage(p, chrome));
    console.log(`  ${CHECK_ONLY ? 'ok' : 'wrote'}     blog/${p.slug}.html  (${p.words} words, ${p.readingTime} min)`);
  }

  if (!CHECK_ONLY) fs.writeFileSync(path.join(OUT_DIR, 'index.html'), indexPage(live, chrome));
  console.log(`  ${CHECK_ONLY ? 'ok' : 'wrote'}     blog/index.html      (${live.length} listed)`);

  updateSitemap(live);
  console.log(`  ${CHECK_ONLY ? 'ok' : 'wrote'}     sitemap.xml          (${live.length} post URLs)`);

  const held = all.filter((p) => !p.published);
  if (held.length) {
    console.log('\n  Not published (set published: true to release):');
    for (const p of held) {
      const note = p.external.length ? `${p.external.length} external link marker${p.external.length > 1 ? 's' : ''} unresolved` : 'ready';
      console.log(`    ${p.slug}  —  ${note}`);
    }
  }

  if (warnings.length) {
    console.log('\n  Warnings:');
    for (const w of warnings) console.log('    ' + w);
  }

  console.log('');
}

main();
