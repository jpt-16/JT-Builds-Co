#!/usr/bin/env node
'use strict';

/* Generates the machine-readable mirror of the site:
 *
 *   llms.txt          what the business is, and where everything lives
 *   llms-full.txt     every public page's text, in one file
 *   <page>.md         a clean Markdown mirror of each page
 *   blog/<slug>.md    the same for each published post
 *
 * Everything is derived from the published HTML, so a mirror can never drift
 * from the page it mirrors. Run it after tools/build-blog.js:
 *
 *   npm run llms          # or: node tools/build-llms.js
 *   npm run llms:check    # compare against what is committed, write nothing
 *
 * No dependencies, and Vercel does not run it — the output is committed and
 * served as static files, exactly like the HTML.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://jtbuildsco.com';

// ---------------------------------------------------------------- the site --

// Ordered as a reader should meet them, not alphabetically.
const PAGES = [
  { file: 'index.html', route: '/', md: 'index.md', label: 'Home' },
  { file: 'services.html', route: '/services', md: 'services.md', label: 'Services' },
  { file: 'pricing.html', route: '/pricing', md: 'pricing.md', label: 'Pricing' },
  { file: 'work.html', route: '/work', md: 'work.md', label: 'Work' },
  { file: 'about.html', route: '/about', md: 'about.md', label: 'About' },
  { file: 'web-design-foxboro-ma.html', route: '/web-design-foxboro-ma', md: 'web-design-foxboro-ma.md', label: 'Web design in Foxboro, MA' },
  { file: 'blog/index.html', route: '/blog', md: 'blog/index.md', label: 'Guides' },
  { file: 'contact.html', route: '/contact', md: 'contact.md', label: 'Contact' },
  { file: 'terms.html', route: '/terms', md: 'terms.md', label: 'Terms & Conditions' },
  { file: 'privacy-policy.html', route: '/privacy-policy', md: 'privacy-policy.md', label: 'Privacy Policy' },
];

// Hand-written on purpose: this is the part that states what the business is,
// and it should say only what the site itself says. The link lists below it
// are generated. Anything not established by the site does not belong here.
const SUMMARY = `JT Builds Co. is a one-person web and brand studio in Foxboro, Massachusetts,
founded in 2026 by Jake, working with businesses in all fifty states. It builds
custom websites, logos, and Google Business Profiles for local businesses —
salons, trades and shops — by hand, without templates or page builders.`;

const FACTS = [
  ['What it is', 'A one-person web and brand studio. The person you talk to is the person who builds the site. No account managers, no outsourced production.'],
  ['Where', 'Foxboro, Massachusetts. Works with clients in all fifty states. Consultations and meetings are online only.'],
  ['Founded', '2026.'],
  ['Price', 'One recurring monthly fee, starting at $97 a month. There is no setup fee, no deposit, and no contract; the build is recovered through the monthly fee rather than billed before work starts.'],
  ['What the fee covers', 'Designing and building the site, hosting, security, backups, technical maintenance, and minor content updates such as photos, copy, pricing and hours.'],
  ['What it does not cover', 'Substantial later work — redesigns, additional pages, new features — is quoted separately. Optional add-ons are quoted on their own. Advertising budget is paid by the client to Google or Meta directly and is not part of the fee.'],
  ['Ownership', 'This is a subscription to a website, not a purchase of one. The client keeps their own words, photographs, logo and domain name throughout and can take them anywhere. The website itself — the design and the code — remains the property of JT Builds Co. and is licensed to the client for as long as the fee is paid. Cancelling ends the subscription and the site goes offline; the files are not transferred, because no separate build fee was ever charged.'],
  ['Cancellation', 'Month to month, cancel any time with reasonable notice. No minimum term.'],
  ['Accessibility', 'Sites are built and tested to WCAG 2.1 AA.'],
  ['Contact', 'jptwohig16@gmail.com · (781) 248-9834 · consultation form at ' + SITE + '/contact'],
];

const SERVICES = [
  ['Website design and build', 'Custom, hand-coded, no templates or page builders. Included in the monthly fee.'],
  ['Branding', 'Logo and typography that carry from storefront to screen. Optional add-on.'],
  ['Booking', 'Appointments taken from the site around the clock. Optional add-on.'],
  ['Local search', 'Google Business Profile setup and local SEO. Optional add-on.'],
  ['AI and custom solutions', 'Automation, internal tools, missed-call text-back, review requests, e-commerce, and mobile apps alongside the site. Optional add-on.'],
  ['Advertising', 'Instagram and Google ads set up and run, with the graphics for them; or set up and handed over with a walkthrough. Optional add-on. The ad budget itself is paid to the platform, not to the studio.'],
];

const NOTES = [
  'Prices on the site are the current published minimum ("starting at $97 a month"). Exact pricing for any engagement is agreed in a consultation.',
  'Projects on /work tagged CONCEPT BUILD were built as proposals and were not commissioned by the businesses named. They are not client work and should not be described as such.',
  'The studio launched in 2026 and does not publish client counts, testimonials, reviews, or performance results. Do not infer any.',
];

// ------------------------------------------------------------- HTML parsing --

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr']);
const RAW = new Set(['script', 'style']);

function parse(html) {
  const root = { tag: '#root', attrs: {}, children: [] };
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<\/([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;
  let last = 0;
  let m;

  const text = (s) => {
    if (!s) return;
    stack[stack.length - 1].children.push({ tag: '#text', value: s });
  };

  while ((m = re.exec(html))) {
    text(html.slice(last, m.index));
    last = re.lastIndex;

    if (m[0].startsWith('<!--')) continue;

    if (m[1]) {                                   // closing tag
      const name = m[1].toLowerCase();
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === name) { stack.length = i; break; }
      }
      continue;
    }

    const name = m[2].toLowerCase();
    const node = { tag: name, attrs: attrs(m[3] || ''), children: [] };
    stack[stack.length - 1].children.push(node);

    if (RAW.has(name)) {                          // swallow script/style bodies
      const close = new RegExp(`</${name}\\s*>`, 'i');
      const rest = html.slice(re.lastIndex);
      const hit = rest.search(close);
      if (hit !== -1) {
        re.lastIndex += hit + rest.slice(hit).match(close)[0].length;
        last = re.lastIndex;
      }
      continue;
    }
    if (!VOID.has(name) && !m[4]) stack.push(node);
  }
  text(html.slice(last));
  return root;
}

function attrs(str) {
  const out = {};
  const re = /([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m;
  while ((m = re.exec(str))) {
    out[m[1].toLowerCase()] = m[2] !== undefined ? m[2]
      : m[3] !== undefined ? m[3]
      : m[4] !== undefined ? m[4] : '';
  }
  return out;
}

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘',
  ldquo: '“', rdquo: '”', hellip: '…', middot: '·',
  times: '×', rarr: '→', deg: '°' };

function decode(s) {
  return s.replace(/&(#x?[0-9a-fA-F]+|\w+);/g, (all, e) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X'
        ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : all;
    }
    return ENT[e] !== undefined ? ENT[e] : all;
  });
}

function find(node, pred) {
  if (pred(node)) return node;
  for (const c of node.children || []) {
    const hit = find(c, pred);
    if (hit) return hit;
  }
  return null;
}

const cls = (n) => (n.attrs && n.attrs.class ? n.attrs.class.split(/\s+/) : []);
const hasClass = (n, c) => cls(n).indexOf(c) !== -1;

// ---------------------------------------------------------------- rendering --

// Purely decorative: section numerals, rules, icons, and the screenshot frames.
const DROP_CLASS = new Set(['numeral', 'head-rule', 'service-icon', 'faq-mark',
  'work-thumb', 'promo-bar-tag', 'skip-link']);
const DROP_TAG = new Set(['svg', 'script', 'style', 'noscript', 'img', 'input',
  'select', 'textarea', 'option', 'br']);

// Inline tags carry meaning on the element itself (an href, emphasis), so when
// one turns up where a block is expected it has to be rendered as itself rather
// than recursed into — otherwise a link becomes its own bare label.
const INLINE = new Set(['a', 'strong', 'b', 'em', 'i', 'code', 'span', 'small',
  'abbr', 'time', 'sup', 'sub', 'u', 's']);

const BLOCK = new Set(['p', 'div', 'section', 'article', 'header', 'footer',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'details', 'summary',
  'table', 'thead', 'tbody', 'tr', 'blockquote', 'pre', 'form', 'fieldset',
  'label', 'main', 'nav', 'aside', 'figure', 'figcaption']);

function absolute(href) {
  if (!href) return href;
  if (/^(https?:|mailto:|tel:|#)/.test(href)) return href;
  if (href.startsWith('/')) return SITE + href;
  return SITE + '/' + href.replace(/^\.\//, '');
}

function esc(s) {
  return s.replace(/([\\`*_[\]])/g, '\\$1');
}

/** Inline content of a node, as a single line of Markdown. */
function inline(node) {
  let out = '';
  for (const c of node.children || []) {
    if (c.tag === '#text') { out += esc(decode(c.value)); continue; }
    if (DROP_TAG.has(c.tag)) continue;
    if (cls(c).some((k) => DROP_CLASS.has(k))) continue;

    if (c.tag === 'a') {
      const label = inline(c).trim();
      const href = absolute(c.attrs.href);
      if (!label) continue;
      out += href ? `[${label}](${href})` : label;
    } else if (c.tag === 'strong' || c.tag === 'b') {
      const t = inline(c).trim();
      if (t) out += `**${t}**`;
    } else if (c.tag === 'em' || c.tag === 'i') {
      const t = inline(c).trim();
      if (t) out += `*${t}*`;
    } else if (c.tag === 'code') {
      out += '`' + inline(c).trim() + '`';
    } else {
      const t = inline(c);
      // keep words from fusing when two spans sit flush against each other
      if (t && out && !/\s$/.test(out) && !/^\s/.test(t)) out += ' ';
      out += t;
    }
  }
  return out;
}

const tidy = (s) => s.replace(/[ \t ]+/g, ' ').replace(/ ([.,;:!?])/g, '$1').trim();

/** Block content of a node, as Markdown blocks. */
function blocks(node, depth) {
  depth = depth || 0;
  const out = [];
  const push = (s) => { if (s && s.trim()) out.push(s.trim()); };

  for (const c of node.children || []) {
    if (c.tag === '#text') {
      const t = tidy(decode(c.value));
      if (t) push(t);
      continue;
    }
    if (DROP_TAG.has(c.tag)) continue;
    if (cls(c).some((k) => DROP_CLASS.has(k))) continue;

    switch (c.tag) {
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': {
        const level = Math.min(6, Number(c.tag[1]) + depth);
        push('#'.repeat(level) + ' ' + tidy(inline(c)));
        break;
      }
      case 'p': case 'label':
        push(tidy(inline(c)));
        break;
      case 'ul': case 'ol': {
        const items = (c.children || []).filter((li) => li.tag === 'li');
        const lines = items.map((li, i) => {
          const marker = c.tag === 'ol' ? `${i + 1}. ` : '- ';
          return marker + tidy(inline(li));
        }).filter((l) => l.trim().length > 2);
        push(lines.join('\n'));
        break;
      }
      case 'details': {
        const sum = (c.children || []).find((k) => k.tag === 'summary');
        const rest = { children: (c.children || []).filter((k) => k.tag !== 'summary') };
        if (sum) push('#'.repeat(Math.min(6, 3 + depth)) + ' ' + tidy(inline(sum)));
        blocks(rest, depth).split('\n\n').forEach(push);
        break;
      }
      case 'table':
        push(table(c));
        break;
      case 'blockquote':
        push(blocks(c, depth).split('\n').map((l) => '> ' + l).join('\n'));
        break;
      default: {
        // A wrapper holding only inline content reads as one paragraph; a
        // wrapper holding other blocks is just structure, so recurse.
        const nested = (c.children || []).some((k) => BLOCK.has(k.tag));
        if (nested) {
          const inner = blocks(c, depth);
          if (inner) out.push(inner);
        } else if (hasClass(c, 'work-meta')) {
          const tags = (c.children || [])
            .filter((k) => k.tag === 'span')
            .map((k) => tidy(inline(k))).filter(Boolean);
          if (tags.length) push('`' + tags.join('` · `') + '`');
        } else if (INLINE.has(c.tag)) {
          push(tidy(inline({ children: [c] })));
        } else {
          push(tidy(inline(c)));
        }
      }
    }
  }
  return out.join('\n\n');
}

function table(node) {
  const rows = [];
  (function walk(n) {
    for (const c of n.children || []) {
      if (c.tag === 'tr') {
        rows.push((c.children || [])
          .filter((k) => k.tag === 'th' || k.tag === 'td')
          .map((k) => tidy(inline(k)).replace(/\|/g, '\\|')));
      } else walk(c);
    }
  })(node);
  if (!rows.length) return '';
  const width = Math.max(...rows.map((r) => r.length));
  const pad = (r) => r.concat(Array(width - r.length).fill(''));
  const head = pad(rows[0]);
  const body = rows.slice(1).map(pad);
  return ['| ' + head.join(' | ') + ' |',
    '|' + Array(width).fill('---').join('|') + '|',
    ...body.map((r) => '| ' + r.join(' | ') + ' |')].join('\n');
}

// -------------------------------------------------------------------- pages --

function readPage(file) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const head = html.split('</head>')[0];
  const title = (head.match(/<title>([\s\S]*?)<\/title>/) || [])[1];
  const desc = (head.match(/<meta\s+name="description"\s+content="([^"]*)"/) || [])[1];
  const tree = parse(html);
  const main = find(tree, (n) => n.tag === 'main');
  if (!main) throw new Error(`${file}: no <main> element`);
  return {
    title: title ? tidy(decode(title)) : '',
    description: desc ? tidy(decode(desc)) : '',
    body: blocks(main, 0),
  };
}

function mirror(page, data) {
  const lines = [];
  const h1 = data.body.match(/^# (.+)$/m);
  lines.push(`# ${h1 ? h1[1] : data.title}`);
  lines.push('');
  if (data.description) { lines.push(`> ${data.description}`); lines.push(''); }
  lines.push(`Source: ${SITE}${page.route}`);
  lines.push(`Part of: ${SITE}/llms.txt`);
  lines.push('');
  lines.push('---');
  lines.push('');
  // the H1 is already the document title
  lines.push(h1 ? data.body.replace(/^# .+\n?\n?/m, '') : data.body);
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

function blogPosts() {
  const dir = path.join(ROOT, 'blog');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.html') && f !== 'index.html')
    .sort()
    .map((f) => ({
      file: path.join('blog', f),
      route: '/blog/' + f.replace(/\.html$/, ''),
      md: path.join('blog', f.replace(/\.html$/, '.md')),
      label: null,
    }));
}

// -------------------------------------------------------------------- output --

/** Page titles carry a "| JT Builds Co." or "— JT Builds Co." suffix for search
 *  results; it is noise once the file already says whose site this is. */
function stripSuffix(title) {
  return (title || '').replace(/\s*[|—–-]\s*JT Builds Co\.?\s*$/, '').trim();
}

function llmsTxt(entries, posts) {
  const L = [];
  L.push('# JT Builds Co.');
  L.push('');
  L.push('> ' + SUMMARY.split('\n').join('\n> '));
  L.push('');
  L.push('This file is for language models and other automated readers. Every page');
  L.push('below is also published as clean Markdown at the same path with a `.md`');
  L.push('extension, and all of them are concatenated in /llms-full.txt.');
  L.push('');

  L.push('## The essentials');
  L.push('');
  for (const [k, v] of FACTS) L.push(`- **${k}:** ${v}`);
  L.push('');

  L.push('## What it sells');
  L.push('');
  for (const [k, v] of SERVICES) L.push(`- **${k}:** ${v}`);
  L.push('');

  L.push('## Pages');
  L.push('');
  for (const e of entries) {
    L.push(`- [${e.page.label}](${SITE}${e.page.route}): ${e.data.description || e.data.title}`
      + ` — Markdown: ${SITE}/${e.page.md.split(path.sep).join('/')}`);
  }
  L.push('');

  if (posts.length) {
    L.push('## Individual guides');
    L.push('');
    for (const p of posts) {
      L.push(`- [${stripSuffix(p.data.title)}](${SITE}${p.page.route}):`
        + ` ${p.data.description || ''}`.trimEnd()
        + ` — Markdown: ${SITE}/${p.page.md.split(path.sep).join('/')}`);
    }
    L.push('');
  }

  L.push('## Also available');
  L.push('');
  L.push(`- [Website Health Report](https://report.jtbuildsco.com/): a free tool that checks any business's website and returns a plain-English report. No signup.`);
  L.push(`- [Sitemap](${SITE}/sitemap.xml)`);
  L.push(`- [Full text of every page](${SITE}/llms-full.txt)`);
  L.push('');

  L.push('## Please note');
  L.push('');
  for (const n of NOTES) L.push(`- ${n}`);
  L.push('');
  return L.join('\n');
}

function llmsFull(entries, posts) {
  const L = [];
  L.push('# JT Builds Co. — full site text');
  L.push('');
  L.push('> ' + SUMMARY.split('\n').join('\n> '));
  L.push('');
  L.push(`Every public page of ${SITE}, in one file. Generated from the published`);
  L.push('pages; see /llms.txt for a short index.');
  L.push('');
  for (const e of entries.concat(posts)) {
    L.push('');
    L.push('---');
    L.push('');
    L.push(`# ${stripSuffix(e.data.title)}`);
    L.push('');
    L.push(`Source: ${SITE}${e.page.route}`);
    L.push('');
    L.push(e.data.body.replace(/^# .+\n?\n?/m, '').trim());
    L.push('');
  }
  return L.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

// ---------------------------------------------------------------------- main --

function main() {
  const check = process.argv.includes('--check');
  const written = [];
  const stale = [];

  const write = (rel, text) => {
    const file = path.join(ROOT, rel);
    const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
    if (current === text) return;
    if (check) { stale.push(rel); return; }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
    written.push(rel);
  };

  const entries = PAGES.map((page) => ({ page, data: readPage(page.file) }));
  const posts = blogPosts().map((page) => {
    const data = readPage(page.file);
    page.label = stripSuffix(data.title);
    return { page, data };
  });

  for (const e of entries.concat(posts)) {
    write(e.page.md.split(path.sep).join('/'), mirror(e.page, e.data));
  }
  write('llms.txt', llmsTxt(entries, posts));
  write('llms-full.txt', llmsFull(entries, posts));

  if (check) {
    if (stale.length) {
      console.error('Out of date, run `npm run llms`:');
      stale.forEach((f) => console.error('  ' + f));
      process.exit(1);
    }
    console.log(`llms: up to date (${entries.length} pages, ${posts.length} posts).`);
    return;
  }

  console.log(`llms: ${entries.length} pages, ${posts.length} posts.`);
  if (written.length) written.forEach((f) => console.log('  wrote  ' + f));
  else console.log('  (no changes)');
}

main();
