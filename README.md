# estiqo-site

The public website for [Estiqo](https://estiqo.com.au), an iPhone app for Australian
investment property owners.
**[On the App Store](https://apps.apple.com/au/app/estiqo-investment-property/id6801718917)**
since 8 September 2026 (Australia only).

Served by GitHub Pages at **https://estiqo.com.au** (custom domain via `CNAME`, HTTPS enforced).

| Page | Purpose |
|---|---|
| `index.html` | Landing page. Needs `css/`, `js/`, `img/` and `video/` alongside it |
| `privacy-policy.html` | Linked from the App Store listing and from Settings in the app |
| `terms-of-use.html` | Linked from Settings in the app and from the App Store description |
| `confirmed.html` | Double opt-in landing for the closed pre-launch waitlist (`noindex`) |
| `llms.txt`, `robots.txt`, `sitemap.xml` | Search engine and AI assistant discovery |

## Why this repo is separate

The app's source lives in a **private** repo. This one exists only because GitHub Pages
publishes from public repositories on the free plan. Serving a site from a private repo
needs GitHub Pro. Splitting it costs nothing and exposes nothing, because these pages are
meant to be public.

## This is a deployment copy, not the source of truth

Every file here is copied from the private repo:

- `index.html`, `confirmed.html`, `llms.txt`, `robots.txt`, `sitemap.xml`, `css/`, `js/`,
  `img/`, `video/` ← `Landing Page/`
  (the page is split into external CSS/JS, so copying `index.html` alone produces an
  unstyled page; always bring every folder)
- `privacy-policy.html`, `terms-of-use.html` ← `Ship Kit/`

Edit them **there**, then copy across. Editing here directly means the next copy silently
overwrites your change.

> ⚠️ This already happened once. The launch-day swap (8 Sep 2026) was made here and not in
> `Landing Page/`, while the interactive hero demo (26 Aug) sat in `Landing Page/` and was
> never deployed. The two were reconciled with a three-way merge on 13 Sep 2026.

## Status

- [x] Contact email in both legal pages: `support@estiqo.com.au` (13 Aug 2026)
- [x] `estiqo.com.au` pointed at this site, DNS-only (grey cloud) in Cloudflare, HTTPS enforced
- [x] Real App Store download links replace "Coming soon", and the waitlist form is removed (8 Sep 2026)
- [x] Interactive app demo in the hero deployed (13 Sep 2026)
