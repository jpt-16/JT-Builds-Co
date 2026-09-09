# JT Builds Co.

Website for JT Builds Co. — a web & brand studio for main-street business, based in Foxboro, Massachusetts.

Originally built from the "Atelier" direction of the [JT Builds Co. landing page designs](https://claude.ai/design/p/5626d654-1c99-4f4e-a0a5-2a4d294a0f7d) project, then reskinned to "Nocturne" — a quiet, compact dark interface from a later [design exploration](https://claude.ai/design/p/7725dfe1-4b99-4472-aa92-0ad5c5445603): a near-neutral blue-grey ground, Inter at a weight capped at 500, a single blurple accent used as a line or a glow rather than a flood, soft radii, and dividers that fade at their ends instead of stopping hard.

## Structure

Multi-page static site sharing one stylesheet:

- `index.html` — Home: hero with stats, services teaser, selected-work teaser, five-step process, promise/terms split, why-JT-Builds grid, Instagram band, CTA
- `work.html` — Selected Work portfolio. See "Adding a project" below
- `services.html` — the seven services, plus a "What You Get" deliverables list
- `pricing.html` — setup fee vs. Care plan, how quoting works, and the FAQ
- `about.html` — the mission and why the studio exists
- `contact.html` — the consultation form
- `dashboard.html` + `api/send-review-request.js` + `js/dashboard.js` — internal review-request texting tool, see below
- `css/style.css` — full stylesheet with design tokens as CSS custom properties, responsive at 960px and 600px breakpoints
- `assets/work/` — project screenshots for the portfolio
- `assets/logo-icon.svg` — the JT monogram on its own, white, 96×81; used in the masthead, footer and closing brandmarks. Because it is not square, size it by `height` and leave `width: auto`
- `assets/logo-lockup.svg` — monogram plus the "BUILDS CO. / WEB & BRAND STUDIO" wordmark; used in the nav bar
- `assets/logo-mark-purple.svg`, `assets/logo-mark-black.svg`, `assets/logo-lockup-black.svg`, `assets/logo-lockup-large.svg` — the same marks in the other brand colourways, for anything off-site
- `assets/logo-mark-solid.svg`, `assets/logo-mark-solid-black.svg` — the solid cut, no kerf, for anything under 24px
- `assets/favicon.png` — 256×256, the solid cut in white on the page ink
- `assets/og-image.png` — the 1200×630 social preview referenced by every page's Open Graph tags
- `assets/logo-schema.png` — 600×260 on white, used only as `Organization.logo` in the JSON-LD, where search UIs put it on a light ground

All of the above come out of `tools/build-logo.py`. See "The logo" below.

Every page shares the same top bar, masthead, nav (with the current page highlighted via `aria-current="page"`), and a sitewide footer with sitemap links.

## Theme

The whole site runs on one dark theme rather than a light/dark toggle. `css/style.css` defines full neutral and accent tonal ramps (`--color-neutral-100..900`, `--color-accent-100..900`) as CSS custom properties, plus a compact spacing scale (`--space-1..8`) and radius/shadow tokens. Full-bleed section dividers (topbar, masthead, nav, hero, etc.) fade to transparent at their ends via a gradient background layered on a pseudo-element, rather than a hard `border`; smaller list-internal dividers (FAQ rows, pricing rows) stay solid. Buttons are accent-outlined on a transparent fill, not solid-filled.

## Machine-readable mirror

Three things are published for language models and other automated readers:

- `llms.txt` — what the business is, what it charges, what it sells, and an
  index of every page. The prose is hand-written; the link lists are generated.
- `llms-full.txt` — the text of every public page in one file.
- `<page>.md` — a clean Markdown mirror of each page, at the same path with a
  `.md` extension. `/pricing` also exists at `/pricing.md`.

`tools/build-llms.js` generates all of it **from the published HTML**, so a
mirror cannot drift from the page it mirrors. Like the blog builder, it is a
local step whose output is committed; Vercel runs nothing.

```bash
npm run llms          # regenerate
npm run llms:check    # exits 1 if the committed files are stale
npm run generate      # blog, then llms
npm run check         # both --check modes
```

Run it after any content edit, and after `npm run blog`. There is deliberately
no `build` script: Vercel auto-runs `build` and `vercel-build`, and this repo
has no build step on purpose.

The one part that is hand-written is the `SUMMARY`, `FACTS`, `SERVICES` and
`NOTES` constants at the top of `tools/build-llms.js`. Keep them true to the
site — in particular `NOTES`, which tells a model that the CONCEPT BUILD
projects were never commissioned and that the studio publishes no client
counts, testimonials or results. Update those constants when the business
changes, not the generated files.

`vercel.json` serves `.md` as `text/plain` so it opens in a browser instead of
downloading, and sets `X-Robots-Tag: noindex` on the mirrors and on
`llms-full.txt` — they duplicate the HTML pages, and only the HTML should be in
the search index. `llms.txt` itself stays indexable.

## The sitemap

`sitemap.xml` lists only canonical page URLs: `<loc>`, plus `<lastmod>` on blog
posts where a real publication date exists. It carries no `<changefreq>` or
`<priority>` — Google has ignored both since 2023, and a field nothing reads is
a field that can only go stale. The Markdown mirrors and `llms*.txt` are not
listed; they are not pages.

The block between `<!-- blog:start -->` and `<!-- blog:end -->` belongs to
`tools/build-blog.js`. Everything above it is edited by hand — add a row there
when you add a page.

## The logo

The mark is a single piece of geometry on a 96×81 grid: a vertical spine, a
crossbar across the top, and a foot that turns off the bottom and rises again.
The T is the spine and the bar; the J is the spine and the foot. Both joints are
cut by a 45° kerf.

`tools/build-logo.py` generates every logo file from that one path. It is a dev
tool — the site does not run it and neither does Vercel, which serves the
committed output as-is. You only need it if the mark, the wordmark or the brand
colours change.

```bash
pip install fonttools brotli uharfbuzz
curl -sS "https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap" \
  -H "User-Agent: Mozilla/5.0 Chrome/120"        # find the latin woff2 URL in the output
curl -sS -o tools/inter-latin.woff2 "<that URL>"
python3 tools/build-logo.py
```

The wordmark is converted to outlines at build time, so the SVGs carry no font
dependency and render the same inside `<img>`, in email, and in anything that
does not load webfonts. Inter is not committed here; the script tells you where
to get it.

Two rules the files already encode, worth keeping if you edit them by hand:

- **Below about 24px the kerf closes up and reads as dirt**, so the favicon and
  the nav lockup use the solid cut instead. The symbol inside the nav lockup
  lands at roughly 20px.
- **The mark is 96×81, not square.** Size it by height with `width: auto`; the
  brandmark rules in `css/style.css` already do.

## Adding a project to Selected Work

`work.html` holds a commented-out `<article class="work-card">` template just below the
live cards. Copy it, fill in the business name, industry, what was built, and the live
URL, and drop a screenshot into `assets/work/`.

Screenshots are shown in a 16:10 slot. Around 1120×700 is plenty — export as JPEG and
keep it under ~80 KB so the page stays fast. A card with no image yet still looks
deliberate: leave the `.work-thumb-empty` span in place and it renders as a captioned
gradient panel.

Two tags sit above each project title. Client work uses the industry and location
(`MOBILE CAR DETAILING`, `FRAMINGHAM, MA`); work built for the studio itself uses
`<span class="work-tag work-tag-studio">STUDIO PROJECT</span>` so the two are never
confused for one another.

## Development

It's a static site with no build step. Open `index.html` directly, or serve it:

```sh
python3 -m http.server 8000
```

Fonts load from Google Fonts (Inter, weights 400/500).

## Contact form

The consultation form posts to [FormSubmit](https://formsubmit.co/) addressed to the business email — no backend needed. The first submission after deployment triggers a one-time activation email from FormSubmit; confirm it and all later submissions arrive in the inbox. To switch providers (Formspree, Netlify Forms, a custom endpoint), change the form's `action` attribute in `contact.html`.

## Review request tool

`dashboard.html` (not linked from the public nav) and `api/send-review-request.js` are a small internal tool for sending an automated "please leave a review" text once a job wraps — the automation behind the Reviews service described on the Services and Pricing pages. It's the one part of this repo that isn't purely static: the `/api` function needs a serverless host to run.

Without Twilio credentials configured, it runs in dry run — the form works and shows you the exact message that would be sent, but nothing goes out. `python3 -m http.server` still works for browsing every other page, but won't execute the API function; local testing of the send flow needs the Vercel CLI (`vercel dev`). See [SETUP.md](SETUP.md) for deployment, environment variables, Twilio/carrier verification, and compliance notes before sending to real customers.

## Guides (blog)

Drafts live in `content/posts/*.md`. Nothing publishes until its front matter
says `published: true`.

```bash
npm run blog          # build blog/ and refresh the sitemap
npm run blog:check    # validate only
```

The generator (`tools/build-blog.js`) has no dependencies and does not run on
Vercel — it writes plain HTML that you commit, same as every other page. It
refuses to publish a post that still contains an unresolved `[EXTERNAL LINK]`
marker. Full workflow in `docs/blog-publishing.md`.
