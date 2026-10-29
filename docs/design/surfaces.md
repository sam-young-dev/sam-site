# Surfaces: strokes, corners, shadows, layering, focus

The site is flat. Structure comes from space and hairlines. Almost nothing has a radius, a fill or a shadow.

## Strokes

| Token | Value | Use |
| --- | --- | --- |
| `--stroke-width` | 1px | the only stroke width |
| `--stroke` | 1px dashed `--color-decorative-stroke` | structure: `hr`, `table`, `fieldset` |
| `--stroke-solid` | 1px solid `--color-decorative-stroke` | chips and inputs: tags, form controls |

Dashed divides, solid encloses. Under `prefers-contrast: more` both become solid `currentColor`, which is why you use the tokens and not a hand-written `1px dashed …`. Ink-colored rules (header `hr`, active nav underline) use `--text-ink` explicitly, set through `--hr-stroke`.

Do not box sections or cards with a border. Cards (`.project-card`) have no border, background or radius.

## Corners

Corners are square by default. Buttons, cards, images and panels have no radius.

| Shape | Value | Where |
| --- | --- | --- |
| Square | none | buttons, cards, images, tags in `.project-card__stack` |
| Circle | `50%` | `.round-button`, the about page dot |
| Pill | `999px` | `.photo-detail__tag`, `.resume__skill-tag`, active nav underline |
| Small | `var(--radius-s)` (0.2rem) | text inputs, selects, textareas |
| Prose code | `var(--panel-radius)`, `var(--form-control-radius)` | `.prose pre`, `.prose kbd` |

Radius tokens from the compiled scale (`--radius-sm` … `--radius-full`) exist, but blocks use the values above. `--radius-m` and `--radius-l` in `variables.css` are unused. `--radius-pill` does not exist anywhere; `site-head.css` references it and falls back to `999px`. Write `999px` for a pill.

## Shadows

One shadow exists in use: `.round-button` (`0 2px 10px rgb(0 0 0 / 0.25)`). It lifts a control off a photograph, where a fill alone would vanish. Nothing else gets a shadow, so do not add one to cards, buttons or tags. The compiled `--shadow-*` tokens are unused.

## Z-index

Three steps, defined in `variables.css`. Use these and no numbers.

| Token | Value | Use |
| --- | --- | --- |
| `--z-header` | 100 | `.site-head` |
| `--z-modal` | 200 | `.photo-lightbox`, `.image-viewer` |
| `--z-floating` | 300 | `.photo-nav`, `.skip-link` |

Inside an element that is already its own stacking context, use `1`. The compiled `--z-*` tokens from `elevation.json` also exist; `variables.css` loads later and overrides `--z-modal` from 100 to 200. Add a new step to `variables.css`, never a literal in a block.

## Focus

Every interactive element shows `:focus-visible`: `2px solid var(--focus-color)`, offset `var(--focus-offset)` (0.2lh). `--focus-color` is black. On a dark surface, set `--focus-color: white` on the surface (the footer, lightbox and image viewer do).

Never write `outline: none` on an interactive element. `:focus` without `-visible` is reset globally, so mouse clicks show no ring and keyboard users always do. If a fill swallows the ring, change `outline-color` or `outline-offset` as `.skip-link:focus-visible` does.

## Is this the right surface treatment?

```
Do I need to separate two regions?
 ├── Use space first (--space-* via flow or region)
 ├── Still need a line? → hr or --stroke (dashed)
 └── Never a filled box or a shadow

Is it a small enclosed label (tag, count)?
 └── --stroke-solid, square or 999px pill. Match the block's existing tag.

Is it a control floating over a photo?
 └── .round-button. It already has the fill and the shadow.
```

```css
/* Correct: structure from tokens; shadow only on the floating control */
.project-card__stack li { border: var(--stroke-solid); }
.round-button { box-shadow: 0 2px 10px rgb(0 0 0 / 0.25); }

/* Incorrect: boxed card with radius and shadow, hand-written stroke, removed focus ring */
.project-card { border: 1px solid #ddd; border-radius: 12px; box-shadow: var(--shadow-md); }
.tag { border: 1px dashed currentColor; }
.button:focus { outline: none; }
```
