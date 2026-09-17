# 003 — Consolidate hand-rolled transition tokens into the compiled motion tokens

- **Status**: DONE
- **Commit**: baa7bd8
- **Severity**: LOW
- **Category**: Cohesion & tokens
- **Estimated scope**: 2 files, ~6 lines removed/changed, plus every consumer of the removed custom properties

## Problem

`src/styles/global/variables.css` hand-declares a second, parallel set of
transition tokens that duplicates (and diverges from) the canonical,
already-compiled token source at `src/design-tokens/motion.json`. Two of the
four are entirely unused anywhere in `src/`, and the two that are used both
reference dead or soon-to-be-fixed code (the unreachable puddle "reveal"
fade, and the currently-unrendered `Hero` component's bounce).

```css
/* src/styles/global/variables.css:1-6 — current (full file) */
:root {
  --transition-base: 250ms ease;
  --transition-movement: 200ms linear;
  --transition-fade: 300ms ease;
  --transition-bounce: 500ms cubic-bezier(0.5, 0.05, 0.2, 1.5);

  --radius-l: 2.5rem;
  --uppercase-kerning: 0.04ch;
  --indent-size: var(--space-xs-l);

  --wrapper-max-width: 80rem;

  color-scheme: light dark;
  --black: oklch(18% 0.003 17.5);
  --bright_white: oklch(94.75% 0.04 73);
  --background-light: var(--color-amber-50);
}
```

```json
// src/design-tokens/motion.json — canonical source, already compiled by sugarcube
{
  "transition": {
    "$type": "duration",
    "fast": { "$value": { "value": 75, "unit": "ms" } },
    "normal": { "$value": { "value": 150, "unit": "ms" } },
    "slow": { "$value": { "value": 300, "unit": "ms" } }
  },
  "ease": {
    "$type": "cubicBezier",
    "in": { "$value": [0.4, 0, 1, 1] },
    "out": { "$value": [0, 0, 0.2, 1] },
    "in-out": { "$value": [0.4, 0, 0.2, 1] }
  }
}
```

Only two consumers reference the hand-rolled tokens today:

```css
/* src/styles/global/global.css:31-34 — current */
#puddle-container.puddle-container--reveal span {
  background-color: light-dark(var(--background-light), var(--black));
  transition: opacity var(--transition-fade);
}
```

```css
/* src/styles/blocks/hero.css:70-73 — current */
.hero__skip-link:hover .hero__skip-link-icon {
  transform: translateY(5%);
  transition: transform var(--transition-bounce);
}
```

`--transition-base` and `--transition-movement` have zero references anywhere
in `src/` — they're dead.

## Target

1. Delete all four hand-rolled tokens from `variables.css`.
2. Repoint the two live consumers at the compiled tokens (or, if discovery
   shows sugarcube doesn't expose them as plain custom properties, at
   literal values copied from `motion.json` — see the discovery step below).
3. `--transition-bounce`'s overshoot curve (`cubic-bezier(0.5, 0.05, 0.2, 1.5)`,
   y > 1 for a deliberate bounce) has no equivalent in `motion.json`, which
   only defines `in`/`out`/`in-out`. Since that curve is intentional
   character for a playful hover nudge (not a mistake to "correct" to a
   standard ease), keep a *single* bounce token, but move it to
   `motion.json` as a proper token rather than leaving it hand-typed in
   `variables.css` — see step 3.

```css
/* src/styles/global/variables.css — target */
:root {
  --radius-l: 2.5rem;
  --uppercase-kerning: 0.04ch;
  --indent-size: var(--space-xs-l);

  --wrapper-max-width: 80rem;

  color-scheme: light dark;
  --black: oklch(18% 0.003 17.5);
  --bright_white: oklch(94.75% 0.04 73);
  --background-light: var(--color-amber-50);
}
```

```json
// src/design-tokens/motion.json — target (adds a "bounce" ease + duration)
{
  "transition": {
    "$type": "duration",
    "fast": { "$value": { "value": 75, "unit": "ms" } },
    "normal": { "$value": { "value": 150, "unit": "ms" } },
    "slow": { "$value": { "value": 300, "unit": "ms" } },
    "bounce": { "$value": { "value": 500, "unit": "ms" } }
  },
  "ease": {
    "$type": "cubicBezier",
    "in": { "$value": [0.4, 0, 1, 1] },
    "out": { "$value": [0, 0, 0.2, 1] },
    "in-out": { "$value": [0.4, 0, 0.2, 1] },
    "bounce": { "$value": [0.5, 0.05, 0.2, 1.5] }
  }
}
```

```css
/* src/styles/global/global.css — target */
#puddle-container.puddle-container--reveal span {
  background-color: light-dark(var(--background-light), var(--black));
  transition: opacity var(--transition-slow) var(--ease-out);
}
```

```css
/* src/styles/blocks/hero.css — target */
.hero__skip-link:hover .hero__skip-link-icon {
  transform: translateY(5%);
  transition: transform var(--transition-bounce) var(--ease-bounce);
}
```

## Repo conventions to follow

- **Discovery step, required before editing**: this repo generates real CSS
  custom properties from the DTCG JSON files under `src/design-tokens/` via
  the `sugarcube` Vite plugin (`astro.config.mjs:3,9`), imported as
  `virtual:sugarcube.css` in `src/layouts/BaseLayout.astro:6`. Confirm the
  exact compiled names before using them: run `pnpm astro dev`, load any
  page, and inspect the generated stylesheet in DevTools (Sources tab, or
  view-source on the dev server's CSS output) for the `:root` block. Based
  on this repo's existing pattern for other token categories
  (`space.xs` → `--space-xs`, `radius.lg`-shaped keys → `--radius-*`), the
  expected names are `--transition-fast` / `--transition-normal` /
  `--transition-slow` / `--transition-bounce` and `--ease-in` / `--ease-out`
  / `--ease-in-out` / `--ease-bounce`.
  - **If confirmed**, proceed exactly as shown in Target above.
  - **If the names differ**, use whatever sugarcube actually generates for
    the `transition.*` and `ease.*` (and your added `transition.bounce` /
    `ease.bounce`) keys instead — do not invent a name that doesn't match
    the generator's real output.
  - **If sugarcube cannot represent a `cubicBezier`-typed token as a plain
    CSS value** (e.g. it errors, or only emits the four numbers rather than
    a `cubic-bezier(...)` string), STOP and report this instead of forcing
    it — in that case, keep the hand-typed cubic-bezier values in
    `variables.css` for `--ease-bounce` only, and revert `motion.json` to
    its original content.
- Token files in `src/design-tokens/` follow the DTCG format already used by
  every sibling file (`corners.json`, `space.json`, etc.) — add new keys
  under the existing `transition`/`ease` groups, don't create new groups.

## Steps

1. Add `bounce` entries to `src/design-tokens/motion.json` under both
   `transition` (duration, `500ms`) and `ease` (cubic-bezier,
   `[0.5, 0.05, 0.2, 1.5]`), exactly as shown in Target.
2. Run the discovery step above to confirm the compiled custom-property
   names for `transition.*` and `ease.*`, including the two new `bounce`
   entries.
3. In `src/styles/global/variables.css`, delete the four-line block
   `--transition-base` / `--transition-movement` / `--transition-fade` /
   `--transition-bounce` (lines 3-6).
4. In `src/styles/global/global.css`, update the `.puddle-container--reveal
   span` rule's `transition` to use the confirmed slow-duration and
   out-easing custom properties (or their literal `motion.json` values if
   discovery showed the names differ or don't exist).
5. In `src/styles/blocks/hero.css`, update the `.hero__skip-link:hover
   .hero__skip-link-icon` rule's `transition` to use the confirmed
   bounce-duration and bounce-easing custom properties (or literal values).

## Boundaries

- Do NOT change the actual visual timing/feel of either consumer — this is a
  token-source consolidation, not a re-tuning. The bounce curve, its 500ms
  duration, and the fade's 300ms/`ease` feel should be preserved as closely
  as the compiled tokens allow (note: `ease.out` is
  `cubic-bezier(0, 0, 0.2, 1)`, not identical to the old bare `ease` keyword,
  but is the correct "entering" curve per this codebase's audit standard —
  this is an intentional, in-scope improvement, not drift).
- Do NOT touch `--radius-l`, `--uppercase-kerning`, `--indent-size`,
  `--wrapper-max-width`, `--black`, `--bright_white`, `--background-light`,
  or `color-scheme` in `variables.css` — only the four transition lines.
- Do NOT run this plan's changes through `pnpm astro build` in a way that
  writes build output into the repo (no committing `dist/`); `pnpm astro
  dev` for the discovery step is fine since it's non-mutating to source
  files.
- If `motion.json`'s existing `fast`/`normal`/`slow`/`in`/`out`/`in-out`
  values differ from what's quoted in Problem above (drift since commit
  `baa7bd8`), STOP and report instead of improvising new numbers.

## Verification

- **Mechanical**: `pnpm astro build` completes with no errors; grep the repo
  for `--transition-base` and `--transition-movement` and confirm zero
  remaining references (they should already have been zero before this
  plan — confirms nothing else silently depended on them).
- **Feel check**: since both consumers are currently unreachable in the live
  UI (`.puddle-container--reveal` is never toggled — see plan 004; `Hero`
  isn't rendered on any page), a feel check requires manually forcing the
  state:
  - Temporarily add `class="puddle-container--reveal"` to the
    `#puddle-container` div in `src/pages/index.astro` and load the page —
    the span fade should look the same speed/character as before (300ms,
    unhurried) even though the token source changed.
  - Temporarily render `<Hero />` on a page (it's still imported in
    `src/pages/index.astro:4` even though unused) and hover the skip-link —
    the icon should still visibly overshoot/bounce, not linearly ease.
  - Remove all temporary test markup before finishing.
- **Done when**: `variables.css` no longer declares any `--transition-*`
  custom property, both consumers reference tokens sourced from
  `motion.json` (directly or via its compiled output), and the visual
  timing of both is unchanged from before this plan.
