# 002 — Add transition timing to button hover/press feedback

- **Status**: DONE
- **Commit**: baa7bd8
- **Severity**: MEDIUM
- **Category**: Easing & duration
- **Estimated scope**: 1 file, 2 rules changed

## Problem

`.button`'s hover and active states change `filter` and `transform`
instantly — there is no `transition` property on either rule, so the
brightness bump and press-scale both snap in a single frame instead of
animating. For a pressable element this reads as cheap/unpolished rather
than deliberate.

```css
/* src/styles/blocks/button.css:26-32 — current */
.button:hover {
  filter: brightness(105%);
}

.button:active {
  transform: scale(99%);
}
```

## Target

Add explicit, GPU-friendly transitions. Per the duration budget for button
press feedback (100–160ms) and the easing decision table (hover/color change
→ `ease`; entering feedback → `ease-out`), and pulling straight from this
repo's own compiled token source (`src/design-tokens/motion.json`):
duration `fast` = 75ms, `normal` = 150ms; easing `out` =
`cubic-bezier(0, 0, 0.2, 1)`.

```css
/* src/styles/blocks/button.css — target */
.button {
  --button-bg: var(--color-interactive-fill-default);
  --button-text: var(--color-interactive-text-default);
  --button-x-padding: 0.75em;
  --button-y-padding: 0.5em;
  --button-gutter: 0.5ch;
  --focus-color: var(--color-interactive-fill-default);

  display: inline-flex;
  gap: var(--button-gutter);
  align-items: center;
  line-height: var(--leading-flat);
  position: relative;
  border: none;
  cursor: pointer;
  background: var(--button-bg);
  color: var(--button-text);
  padding: var(--button-y-padding) var(--button-x-padding);
  text-transform: uppercase;
  letter-spacing: var(--uppercase-kerning);
  text-decoration: none;
  font-size: var(--size-step-00);
  font-weight: var(--font-bold);
  transition: filter 150ms cubic-bezier(0, 0, 0.2, 1),
    transform 100ms cubic-bezier(0, 0, 0.2, 1);
}

.button:hover {
  filter: brightness(105%);
}

.button:active {
  transform: scale(99%);
  transition-duration: 75ms;
}
```

Notes on the values:
- `filter: brightness()` and `transform: scale()` are both GPU-friendly, so
  no property list beyond these two is needed — do not use `transition: all`.
- The active-state duration is shortened to 75ms (this repo's own `fast`
  token value) to keep the press feel snappy — the hover fade can stay at
  150ms (`normal`) since it's the slower, more deliberate affordance.

## Repo conventions to follow

- This repo has a canonical, compiled motion-token source at
  `src/design-tokens/motion.json`, built by the `sugarcube` Vite plugin
  (`astro.config.mjs:3,9`, `virtual:sugarcube.css` imported in
  `src/layouts/BaseLayout.astro:6`) into real CSS custom properties.
  **Before hardcoding the literal values above, check whether sugarcube has
  already compiled them into usable custom properties** — run `pnpm astro
  dev`, open the dev server in a browser, and in DevTools search the
  Sources/Network tab for `sugarcube.css`. Given this repo's existing
  generated-token naming (`--space-xs`, `--space-2xs`, `--radius-l`, all
  `--category-key` shaped), the motion tokens likely compile to
  `--transition-fast` / `--transition-normal` / `--transition-slow` and
  `--ease-in` / `--ease-out` / `--ease-in-out`.
  - **If those custom properties exist**, use them instead of the literal
    values: `transition: filter var(--transition-normal) var(--ease-out),
    transform var(--transition-fast) var(--ease-out);` and
    `transition-duration: var(--transition-fast);` on `:active`.
  - **If they don't exist** (e.g. sugarcube doesn't emit cubic-bezier/duration
    tokens as plain custom properties), use the literal values shown in
    Target above — they are copied verbatim from `motion.json`, not
    approximated.
- Do not reach for `--transition-base`/`--transition-bounce`/etc. in
  `src/styles/global/variables.css` — those are a separate, divergent,
  partly-dead token set being consolidated in plan 003. Don't add a new
  dependency on them here.

## Steps

1. Open `src/styles/blocks/button.css`.
2. Add a `transition` declaration to the base `.button` rule (after the
   existing `font-weight: var(--font-bold);` line), using either the
   compiled custom properties or the literal fallback values per the
   discovery step above.
3. Add `transition-duration: 75ms;` (or `var(--transition-fast)` if that
   custom property exists) to the `.button:active` rule, so the press-in is
   snappier than the hover fade while both share the same easing curve.
4. Leave `.button[data-button-variant="secondary"]` untouched — it only
   overrides color custom properties, not transition behavior.

## Boundaries

- Do NOT touch `.button[data-button-variant="secondary"]`.
- Do NOT add `transition: all` — list `filter` and `transform` explicitly.
- Do NOT add a `:focus-visible` style or any other new state — this plan is
  scoped to timing on the two states that already exist.
- If `button.css` doesn't match the excerpt above (drift since commit
  `baa7bd8`), STOP and report instead of improvising.

## Verification

- **Mechanical**: `pnpm astro build` completes with no errors.
- **Feel check**: `.button` isn't currently rendered on any page in this
  branch (the demo buttons were removed from `src/pages/index.astro` during
  the redesign). Temporarily drop `<button class="button">Test</button>`
  into any page (e.g. `src/pages/index.astro`) to check it locally, then
  remove the test markup before finishing:
  - Hovering fades in the brightness bump instead of snapping.
  - Pressing (mousedown) scales down quickly (75ms) and releasing eases back
    over the hover transition's duration, not instantly.
  - In DevTools' Animations panel, set playback to 10% and confirm both
    transitions are visibly smooth curves, not a single jump.
- **Done when**: both `.button:hover` and `.button:active` animate over a
  named duration/easing instead of applying instantly, and no test markup is
  left behind in any page file.
