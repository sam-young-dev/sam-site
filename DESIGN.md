# Design system

Warm, flat, editorial. Amber ink (`#92400e`) on cream paper (`#fffbeb`), Cabinet Grotesk type, dashed hairlines instead of boxes, square-cornered uppercase buttons. Light only. Motion is short, ease-out, and exists to confirm input.

Tokens live in `src/design-tokens/*.json` and are compiled by Sugarcube into `virtual:sugarcube.css`, which `BaseLayout.astro` imports before `src/styles/index.css`. The CSS in `src/styles/` follows CUBE: `compositions/` (layout), `utilities/` (one job), `blocks/` (components), `global/` (element defaults and site-level variables).

A token, variant or class that is not named in these docs does not exist. If you need one, add it to the system first, then use it.

## Rules that apply everywhere

1. **Color comes from the layers in [colors.md](docs/design/colors.md).** Never write a hex, `rgb()` or `oklch()` value in a block. Never use a primitive (`--color-amber-*`, `--color-neutral-*`) outside `site-foot.css`.
2. **Spacing, font size, duration and easing come from tokens.** No raw `px` or `ms` values. Em-based padding inside a component (`0.5em 0.75em`) is allowed because it scales with the font.
3. **Every interactive element has all three:** a 44px (`2.75rem`) hit area, `:active` press feedback, and hover gated behind `(hover: hover) and (pointer: fine)`. Touch screens have no hover, and an ungated hover sticks after a tap.
4. **Every transition is gated behind `prefers-reduced-motion: no-preference`.** See [motion.md](docs/design/motion.md).
5. **No italics, no dark mode, no new z-index numbers, no new shadows.** Each has a reason in the topic files.
6. **Classes in markup are plain and space-separated: block class first, then compositions and utilities.** `class="photo-nav round-button"`. Never CUBE bracket grouping (`[ photo-nav ] [ round-button ]`). Why: house style, set by Sam.

## Where does a new value go?

```
Is it a step on a scale (color, space, font size, duration, easing, radius)?
 ├── Yes → add to src/design-tokens/*.json (it compiles to a custom property)
 └── No
      ├── Is it a site-wide alias (--text-ink, --press-scale-*, --z-*)?
      │    └── Yes → src/styles/global/variables.css
      └── Default → a custom property on the one block that uses it
```

Do not hand-roll a second copy of a compiled token in `variables.css`. Plan 003 removed the duplicate transition tokens for exactly this reason.

## Where does new CSS go?

```
Does it only arrange children (rows, columns, gaps)?
 ├── Yes → compose with an existing composition (layout.md). Add one only if none fits.
 └── No
      ├── Is it one job reused across blocks (underline, press, visually-hidden)?
      │    └── Yes → src/styles/utilities/<name>.css
      └── Default → src/styles/blocks/<name>.css, then @import it in src/styles/index.css
```

Block naming is `block`, `block__element`; state and variants are `data-*` attributes (`data-button-variant`, `data-state`), not modifier classes.

## Index

| File | Read it when you are |
| --- | --- |
| [colors.md](docs/design/colors.md) | picking a text, background or stroke color |
| [typography.md](docs/design/typography.md) | setting a font size, weight, case or line length |
| [layout.md](docs/design/layout.md) | spacing things, building a page or choosing a composition |
| [actions.md](docs/design/actions.md) | adding a button, link, icon control or tag |
| [motion.md](docs/design/motion.md) | adding a hover, press, fade or overlay transition |
| [surfaces.md](docs/design/surfaces.md) | touching strokes, radii, shadows, z-index or focus rings |
