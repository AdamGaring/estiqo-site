# estiqo-site

The public website for [Estiqo](https://estiqo.com.au) — an iPhone app for Australian
investment property owners.

Served by GitHub Pages:

| Page | Purpose |
|---|---|
| `index.html` | Landing page |
| `privacy-policy.html` | Linked from the App Store listing and from Settings in the app |
| `terms-of-use.html` | Linked from Settings in the app |

## Why this repo is separate

The app's source lives in a **private** repo. This one exists only because GitHub Pages
publishes from public repositories on the free plan — serving a site from a private repo
needs GitHub Pro. Splitting it costs nothing and exposes nothing: these three pages are
meant to be public.

## This is a deployment copy, not the source of truth

Every file here is copied from the private repo:

- `index.html`, `img/`, `video/` ← `Landing Page/`
- `privacy-policy.html`, `terms-of-use.html` ← `Ship Kit/`

Edit them **there**, then copy across. Editing here directly means the next copy silently
overwrites your change.

## Before this goes live

- [ ] Replace `CONTACT-EMAIL-HERE` in both legal pages with the real support address
- [ ] Swap the "Coming soon to the App Store" badges for real download links once the
      listing is live (deliberate until then — there is nothing to link to yet)
