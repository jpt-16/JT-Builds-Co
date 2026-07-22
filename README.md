# JT Builds Co.

Website for JT Builds Co. — a web & brand studio for main-street business, based in Foxboro, Massachusetts.

Originally built from the "Atelier" direction of the [JT Builds Co. landing page designs](https://claude.ai/design/p/5626d654-1c99-4f4e-a0a5-2a4d294a0f7d) project, then reskinned to "Nocturne" — a quiet, compact dark interface from a later [design exploration](https://claude.ai/design/p/7725dfe1-4b99-4472-aa92-0ad5c5445603): a near-neutral blue-grey ground, Inter at a weight capped at 500, a single blurple accent used as a line or a glow rather than a flood, soft radii, and dividers that fade at their ends instead of stopping hard.

## Structure

Multi-page static site sharing one stylesheet:

- `index.html` — Home: masthead, hero with stats, services teaser, promise/terms teaser, CTA band
- `services.html` — full seven-service grid with expanded descriptions
- `pricing.html` — the promise, terms table, and FAQ
- `contact.html` — the consultation form
- `dashboard.html` + `api/send-review-request.js` + `js/dashboard.js` — internal review-request texting tool, see below
- `css/style.css` — full stylesheet with design tokens as CSS custom properties, responsive at 960px and 600px breakpoints
- `assets/logo-icon.png` — the "JT" icon mark alone (accent-outlined square, transparent background), cropped from the official lockup export; used in the masthead, footer, and closing brandmarks
- `assets/logo-lockup.png` — the full horizontal lockup (icon + "BUILDS CO. / WEB & BRAND STUDIO" wordmark), transparent background tuned to sit on the dark page; used in the nav bar
- `assets/favicon.png` — built from the circular badge export (icon + wordmark on a dark ground), resized for browser chrome
- `assets/logo-source-lockup.png`, `assets/logo-source-pfp.png` — the original, uncropped exports from the Claude Design logo project; kept as the source of truth if either mark needs re-cropping later

Every page shares the same top bar, masthead, nav (with the current page highlighted via `aria-current="page"`), and a sitewide footer with sitemap links.

## Theme

The whole site runs on one dark theme rather than a light/dark toggle. `css/style.css` defines full neutral and accent tonal ramps (`--color-neutral-100..900`, `--color-accent-100..900`) as CSS custom properties, plus a compact spacing scale (`--space-1..8`) and radius/shadow tokens. Full-bleed section dividers (topbar, masthead, nav, hero, etc.) fade to transparent at their ends via a gradient background layered on a pseudo-element, rather than a hard `border`; smaller list-internal dividers (FAQ rows, pricing rows) stay solid. Buttons are accent-outlined on a transparent fill, not solid-filled.

## Development

It's a static site with no build step. Open `index.html` directly, or serve it:

```sh
python3 -m http.server 8000
```

Fonts load from Google Fonts (Inter, weights 400/500).

## Contact form

The consultation form posts to [FormSubmit](https://formsubmit.co/) addressed to the business email — no backend needed. The first submission after deployment triggers a one-time activation email from FormSubmit; confirm it and all later submissions arrive in the inbox. To switch providers (Formspree, Netlify Forms, a custom endpoint), change the form's `action` attribute in `index.html`.

## Review request tool

`dashboard.html` (not linked from the public nav) and `api/send-review-request.js` are a small internal tool for sending an automated "please leave a review" text once a job wraps — the automation behind the Reviews service described on the Services and Pricing pages. It's the one part of this repo that isn't purely static: the `/api` function needs a serverless host to run.

Without Twilio credentials configured, it runs in dry run — the form works and shows you the exact message that would be sent, but nothing goes out. `python3 -m http.server` still works for browsing every other page, but won't execute the API function; local testing of the send flow needs the Vercel CLI (`vercel dev`). See [SETUP.md](SETUP.md) for deployment, environment variables, Twilio/carrier verification, and compliance notes before sending to real customers.
