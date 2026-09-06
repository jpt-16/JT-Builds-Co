# Publishing guides

The eight drafts live in `content/posts/`. Nothing is live until you say so.

```bash
node tools/build-blog.js          # build
node tools/build-blog.js --check  # validate, write nothing
npm run blog                      # same as the first one
```

The script writes `blog/<slug>.html`, rewrites `blog/index.html`, and updates the
blog block in `sitemap.xml`. Commit what it produces. Vercel has no build step
and does not run this — it serves the committed HTML, exactly as it does for
every other page.

---

## Publishing one post

1. Open `content/posts/<slug>.md`.
2. Replace every `[EXTERNAL LINK: ...]` marker with a real URL, written as
   `[anchor text](https://example.com/page)`. **The build refuses to publish a
   post that still has one.**
3. Set the real publication date: `date: "2026-09-14"`.
4. Set `published: true`.
5. Run `node tools/build-blog.js`.
6. Add the reciprocal link from an existing page — see the table below.
7. Commit and push.

To unpublish, set `published: false` and rebuild. The page is deleted from
`blog/` and drops out of the index and the sitemap.

---

## Links to posts that are not live yet

Handled for you. When a published post links to a sibling that is still held
back, the build keeps the sentence and leaves those words unlinked rather than
shipping a 404, and prints a line saying so:

```
  google-business-profile-setup-massachusetts.md: "More on whether you need a
  site at all" left unlinked until facebook-page-vs-website-small-business
  publishes.
```

The next build after that sibling goes live turns it back into a real link. You
do not edit anything — just rebuild after each publication, which you are doing
anyway.

The build also warns when a post has no `date`, or links to a page that does
not exist at all.

---

## Reciprocal links, from `internal-linking-plan.md`

These are **not** in the pages yet, deliberately: each one points at a post that
is still held back, and a live page must not link to a 404. Add the matching row
when you publish that post.

| Publish this post | Add this link | To this page | Anchor text |
|---|---|---|---|
| `small-business-website-cost-massachusetts` | `/blog/small-business-website-cost-massachusetts` | `/pricing`, under the FAQ | What a website costs across Massachusetts |
| `wix-squarespace-or-hand-built-website` | `/blog/wix-squarespace-or-hand-built-website` | `/pricing`, in "Quoted, Not Packaged" | How this compares to Wix and Squarespace |
| `google-business-profile-setup-massachusetts` | `/blog/google-business-profile-setup-massachusetts` | `/services`, Local Search add-on | How a Google Business Profile is set up |
| `salon-barbershop-website-booking-massachusetts` | `/blog/salon-barbershop-website-booking-massachusetts` | `/services`, Booking add-on | What an appointment business needs |
| `ada-website-compliance-small-business-massachusetts` | `/blog/ada-website-compliance-small-business-massachusetts` | `/services`, Accessibility in Step One | What accessibility means in practice |
| `who-owns-your-website-domain-hosting-access` | `/blog/who-owns-your-website-domain-hosting-access` | `/about`, near "The site is yours" | Who owns the site once it is built |
| `google-business-profile-setup-massachusetts` | `/blog/google-business-profile-setup-massachusetts` | `/web-design-foxboro-ma`, Google Maps FAQ | Getting found on Google Maps locally |
| `salon-barbershop-website-booking-massachusetts` | `/blog/salon-barbershop-website-booking-massachusetts` | `/work`, beside Clover Downs | What a booking-driven site needs |

The sitewide footer link to `/blog` is already in place.

---

## Images

No images are generated. Each post carries an HTML comment near the end listing
the drafted alt text and a ready-made markdown line per image.

To place one: drop the file in `assets/blog/`, then add the markdown line at the
right point in the `.md` file and rebuild.

```markdown
![A WHOIS lookup showing the registrant details for a small business domain name.](/assets/blog/who-owns-your-website-domain-hosting-access-1.jpg)
```

Alt text is already written for every suggested image. Keep it.

---

## What the build guarantees

- No `[EXTERNAL LINK]` or `[INTERNAL LINK]` marker ever reaches a page.
- `/posts/<slug>` in a draft is rewritten to `/blog/<slug>`, the real route.
- JSON-LD from the bottom of each file is validated as JSON and moved to `<head>`.
- Page chrome is lifted from `services.html` at build time, so a nav or footer
  change reaches every post on the next build.
- Tables are wrapped in a keyboard-reachable scroll box, so a long table never
  widens the page.

---

## The schedule

Weekly, Mondays. Post 1 is live.

| # | Post | Date | State |
|---|---|---|---|
| 1 | `google-business-profile-setup-massachusetts` | Mon 31 Aug 2026 | **live** |
| 2 | `who-owns-your-website-domain-hosting-access` | Mon 7 Sep 2026 | ready |
| 3 | `small-business-website-cost-massachusetts` | Mon 14 Sep 2026 | **HOLD** — priced on the old model, needs a rewrite |
| 4 | `what-to-have-ready-before-hiring-web-designer` | Mon 21 Sep 2026 | ready |
| 5 | `facebook-page-vs-website-small-business` | Mon 28 Sep 2026 | ready |
| 6 | `salon-barbershop-website-booking-massachusetts` | Mon 5 Oct 2026 | ready |
| 7 | `ada-website-compliance-small-business-massachusetts` | Mon 12 Oct 2026 | ready |
| 8 | `wix-squarespace-or-hand-built-website` | Mon 19 Oct 2026 | ready, paths unverified |

All eight are clear of `[EXTERNAL LINK]` markers — set `published: true` and
rebuild to release one.

Prices in the posts must track the site: one monthly fee starting at $97, no
setup fee. One draft — `small-business-website-cost-massachusetts` — was
written against the old two-number model ($225 setup + $45 a month) and still
argues it, so it is held back and needs a rewrite rather than a
find-and-replace. No other draft names a price. Grep `content/posts/` for one
before publishing anything, and again whenever the fee changes.

Before publishing each one, check Search Console: if the previous post has not
been indexed, that is worth knowing before adding another page.
