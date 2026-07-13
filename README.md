# JT Builds Co.

Website for JT Builds Co. — a web & brand studio for main-street business, based in Foxboro, Massachusetts.

Built from the "Atelier" direction of the [JT Builds Co. landing page designs](https://claude.ai/design/p/5626d654-1c99-4f4e-a0a5-2a4d294a0f7d) project: ivory editorial layout, Marcellus + Karla type, bronze accents, hard hairline rules.

## Structure

- `index.html` — single-page site (masthead, hero, services, promise, terms, FAQ, contact)
- `css/style.css` — full stylesheet with design tokens as CSS custom properties, responsive at 960px and 600px breakpoints

## Development

It's a static site with no build step. Open `index.html` directly, or serve it:

```sh
python3 -m http.server 8000
```

Fonts load from Google Fonts (Marcellus, Karla).
