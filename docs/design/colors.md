# Colors

The site is light only. `dark.json` compiles to a `[data-mode="dark"]` block, but nothing in `src/` sets that attribute and `variables.css` sets `color-scheme: light`. Do not add `prefers-color-scheme` or `light-dark()` styles.

## Which layer is allowed

Blocks use layers 1-3. Layer 4 is the footer only. Never use a primitive or a raw value anywhere else.

| Layer | Tokens | Defined in |
| --- | --- | --- |
| 1. Page | `--background-light`, `--text-ink`, `--text-quiet`, `--scrim` | `global/variables.css` |
| 2. Brand | `--color-brand-primary`, `--color-brand-light` | `design-tokens/colors.json` |
| 3. Neutral semantic | `--color-fill-loud`, `--color-on-loud`, `--color-fill-normal`, `--color-decorative-stroke`, `--color-surface-border`, `--color-text-placeholder` | `design-tokens/colors.json` |
| 4. Footer surface | `--color-amber-950`, `-200`, `-50`, `-300` | `blocks/site-foot.css` only |

Values: `--background-light` is amber-50 `#fffbeb`. `--text-ink` and `--color-brand-primary` are amber-800 `#92400e`. `--color-brand-light` is `#ffffff`. `--text-quiet` is the ink mixed 85% toward the page, about 5:1 contrast on the page color.

The status groups (`--color-accent-*`, `-success-*`, `-warning-*`, `-error-*`, `-info-*`) compile, but no screen uses them: the site has no alerts or forms. Do not reach for one. If a feature needs a status color, add the component to these docs first.

## What text color do I use?

```
Is it on the amber-950 footer?
 ├── Yes → inherit amber-200; links amber-50, hover amber-300 (site-foot.css owns this)
 └── No
      ├── Is it on an ink or brand fill (button, skip link)?
      │    └── Yes → var(--color-brand-light)
      ├── Is it secondary: caption, metadata, summary, count?
      │    └── Yes → var(--text-quiet)
      └── Default → inherit. body already sets var(--text-ink); do not restate it.
```

## What background do I use?

```
Is it the page itself? → inherit (body sets var(--background-light))
Is it the footer? → var(--color-amber-950)
Is it the default button? → var(--color-interactive-fill-default) via .button
Is it the secondary button? → var(--color-fill-loud) via .button
Is it a control floating over a photo? → var(--background-light) (.round-button)
Is it behind a full-screen image? → var(--scrim)
Anything else → no background.
```

Content blocks (cards, figures, tags, sections) have no background. They are separated by space and strokes, not fills. Why: the page is one flat sheet of paper; a fill reads as a different material.

## Rules

- **Quiet text is `--text-quiet`, never opacity.** Opacity gives 3.5-4.4:1 on the page color; the token gives about 5:1. The only opacity dims are prose link hover (`0.7`) and `.end-mark` (`0.8`).
- **Strokes use `--stroke` or `--stroke-solid`** (surfaces.md), which already point at `--color-decorative-stroke`. Do not reference the token directly.
- **Focus ring color is `--focus-color`**, black by default and white on dark surfaces. Do not use the `--focus-ring-*` tokens: they compile to pink and nothing uses them.

```css
/* Correct: expand-button.css */
.expand-button { color: var(--text-quiet); }
.expand-button:hover { color: var(--text-ink); }

/* Incorrect: a primitive, a raw value, and opacity-as-quiet */
.expand-button { color: var(--color-neutral-600); }
.expand-button { color: #92400e; }
.expand-button { opacity: 0.6; }
```
