# JT Builds Co.

Website for JT Builds Co. — a web & brand studio for main-street business, based in Foxboro, Massachusetts.

Built from the "Atelier" direction of the [JT Builds Co. landing page designs](https://claude.ai/design/p/5626d654-1c99-4f4e-a0a5-2a4d294a0f7d) project, since reversed into a dark theme ("Atelier Noir") to match the brand mark: a near-black ground, Marcellus + Karla + IBM Plex Mono type, and a rust-orange accent.

## Structure

Multi-page static site sharing one stylesheet:

- `index.html` — Home: masthead, hero with stats, services teaser, promise/terms teaser, CTA band
- `services.html` — full seven-service grid with expanded descriptions
- `pricing.html` — the promise, terms table, and FAQ
- `contact.html` — the consultation form
- `dashboard.html` + `api/send-review-request.js` + `js/dashboard.js` — internal review-request texting tool, see below
- `css/style.css` — full stylesheet with design tokens as CSS custom properties, responsive at 960px and 600px breakpoints
- `assets/logo-icon.png` — the brand mark (browser window + cursor), cropped with a transparent background from the official export; used in the masthead and footer
- `assets/favicon.png` — a compact favicon built from the same mark, with its own rounded dark badge so it reads in any browser chrome
- `assets/logo-source-reversed.png` — the original full lockup (icon + "JT" + "BUILDS CO." wordmark) exported from the Claude Design logo project; kept as the source of truth if the mark needs re-cropping later

Every page shares the same top bar, masthead, nav (with the current page highlighted via `aria-current="page"`), and a sitewide footer with sitemap links.

## Theme

The whole site runs on one dark ("reversed") theme rather than a light/dark toggle. The color tokens in `css/style.css` are intentionally still named `--ivory` and `--ink` even though `--ivory` now holds the dark value and `--ink` the light one — nearly every rule in the stylesheet was written against those two tokens, so keeping the names stable let the whole design invert from a single edit in `:root`. `--bronze`/`--bronze-light` hold the two rust-orange tints (a brighter one for accents on the dark page, a deeper one for text inside the light "flipped" panels like the Promise block).

## Development

It's a static site with no build step. Open `index.html` directly, or serve it:

```sh
python3 -m http.server 8000
```

Fonts load from Google Fonts (Marcellus, Karla).

## Contact form

The consultation form posts to [FormSubmit](https://formsubmit.co/) addressed to the business email — no backend needed. The first submission after deployment triggers a one-time activation email from FormSubmit; confirm it and all later submissions arrive in the inbox. To switch providers (Formspree, Netlify Forms, a custom endpoint), change the form's `action` attribute in `index.html`.

## Review request tool

`dashboard.html` (not linked from the public nav) and `api/send-review-request.js` are a small internal tool for sending an automated "please leave a review" text once a job wraps — the automation behind the Reviews service described on the Services and Pricing pages. It's the one part of this repo that isn't purely static: the `/api` function needs a serverless host to run.

Without Twilio credentials configured, it runs in dry run — the form works and shows you the exact message that would be sent, but nothing goes out. `python3 -m http.server` still works for browsing every other page, but won't execute the API function; local testing of the send flow needs the Vercel CLI (`vercel dev`). See [SETUP.md](SETUP.md) for deployment, environment variables, Twilio/carrier verification, and compliance notes before sending to real customers.
