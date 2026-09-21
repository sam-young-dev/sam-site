# Sam Young — Personal Site

[![Netlify Status](https://api.netlify.com/api/v1/badges/cfaa4515-eb0a-4bee-bd48-1520f17ea868/deploy-status)](https://app.netlify.com/projects/young-sam/deploys)

Personal portfolio site for Sam Young, built with [Astro](https://astro.build). Showcases software projects, photography, and art, with a resume and about page. Live at [young-sam.netlify.app](https://young-sam.netlify.app/).

## Features

- **Projects** — case studies for personal and professional work
- **Photography** — a photo grid with per-image detail pages, EXIF metadata (via [exifr](https://github.com/MikeKovarik/exifr)), a lightbox, and curated collections
- **Art**, **About**, and **Resume** pages
- Image processing/optimization via [sharp](https://sharp.pixelplumbing.com/) and [Sugarcube](https://github.com/sugarcube-sh)
- Custom design token system (colors, typography, spacing, motion, etc.) under [src/design-tokens/](src/design-tokens/)
- CSS architecture following [CUBE CSS](https://cube.fyi/) (compositions, blocks, utilities) under [src/styles/](src/styles/)

## Project Structure

```text
/
├── public/
├── src/
│   ├── assets/            # images, icons, fonts, logos
│   ├── components/        # Astro components (core, hero, masthead, photography)
│   ├── data/               # site data, photos, collections, projects
│   ├── design-tokens/      # design system tokens (JSON)
│   ├── layouts/            # BaseLayout.astro
│   ├── lib/                 # client-side helpers (image ripple, puddle effect)
│   ├── pages/               # routes: index, about, art, resume, projects/, photography/, collections/
│   ├── styles/              # CUBE CSS (compositions, blocks, utilities, global)
│   └── utils/                # collections/photos helpers
└── package.json
```

## Commands

All commands are run from the root of the project, from a terminal:

| Command         | Action                                           |
| :--------------- | :----------------------------------------------- |
| `pnpm install`    | Installs dependencies                            |
| `pnpm dev`        | Starts local dev server at `localhost:4321`      |
| `pnpm build`      | Build your production site to `./dist/`          |
| `pnpm preview`    | Preview your build locally, before deploying     |
| `pnpm astro ...`  | Run CLI commands like `astro add`, `astro check` |

## Deployment

Deployed and hosted on [Netlify](https://www.netlify.com/), with automatic deploys from this repo.
