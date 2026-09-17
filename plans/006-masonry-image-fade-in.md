# 006 — Fade in masonry images as they finish loading

- **Status**: DONE
- **Commit**: baa7bd8
- **Severity**: LOW
- **Category**: Missed opportunities
- **Estimated scope**: 2 files, ~15 lines added

## Problem

The photography page renders every image with `loading="lazy"` and zero
transition. As the user scrolls the 3-column masonry grid, each image pops
in at full opacity the instant it finishes decoding — a hard, unmasked
"popcorn" effect that's especially visible because the columns load at
different rates.

```astro
<!-- src/pages/photography.astro:29-39 — current -->
  <div class="region">
		<div class="masonry wrapper switcher">
      {columns.map((column) => (
        <div class="flow">
          {column.map((image) => (
            <img src={image.src} width={image.width} height={image.height} alt="" loading="lazy" />
          ))}
        </div>
      ))}
    </div>
  </div>
```

```css
/* src/styles/blocks/masonry.css:1-11 — current (full file) */
.masonry {
  --gutter: 0.4em;
  --switcher-gap: var(--gutter);
  --flow-space: var(--gutter);
  --switcher-target-container-width: 28rem;
  --wrapper-padding-inline: var(--gutter);
}

.masonry img {
  width: 100%;
}
```

## Target

Give each image a resting state of `opacity: 0` + a small `translateY(8px)`
lift, and reveal it once the browser's native `load` event fires (set via an
inline `onload` handler — no JS module needed for this simple case). Timing
comes straight from this repo's compiled motion tokens
(`src/design-tokens/motion.json`, already confirmed as real CSS custom
properties — see `src/styles/blocks/button.css:24` for a live consumer):
`--transition-slow` (300ms) and `--ease-out`
(`cubic-bezier(0, 0, 0.2, 1)`), matching the "Modals, drawers" 200–500ms
duration budget since this is a content-reveal, not a button-press.

```astro
<!-- src/pages/photography.astro — target -->
  <div class="region">
		<div class="masonry wrapper switcher">
      {columns.map((column) => (
        <div class="flow">
          {column.map((image) => (
            <img
              src={image.src}
              width={image.width}
              height={image.height}
              alt=""
              loading="lazy"
              class="masonry__image"
              onload="this.classList.add('is-loaded')"
            />
          ))}
        </div>
      ))}
    </div>
  </div>
```

```css
/* src/styles/blocks/masonry.css — target */
.masonry {
  --gutter: 0.4em;
  --switcher-gap: var(--gutter);
  --flow-space: var(--gutter);
  --switcher-target-container-width: 28rem;
  --wrapper-padding-inline: var(--gutter);
}

.masonry img {
  width: 100%;
}

.masonry__image {
  opacity: 0;
  transform: translateY(8px);
  transition: opacity var(--transition-slow) var(--ease-out),
    transform var(--transition-slow) var(--ease-out);
}

.masonry__image.is-loaded {
  opacity: 1;
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .masonry__image {
    transform: none;
    transition: opacity var(--transition-slow) var(--ease-out);
  }
}
```

## Repo conventions to follow

- Use the compiled motion custom properties directly (`--transition-slow`,
  `--ease-out`) rather than hand-typing `300ms`/`cubic-bezier(...)` — this
  repo already has a live exemplar of this exact pattern at
  `src/styles/blocks/button.css:24` (`transition: filter
  var(--transition-normal) var(--ease-out), transform var(--transition-fast)
  var(--ease-out);`). Do not add these tokens to
  `src/styles/global/variables.css` — that hand-rolled file is being
  deprecated by plan 003, not extended.
- `.masonry img { width: 100%; }` already exists and must be preserved
  as-is; the new `.masonry__image` rule is additive, not a replacement.
- Per the accessibility rule (reduced motion means fewer/gentler animations,
  not zero), keep the opacity fade under `prefers-reduced-motion: reduce`
  and only drop the `translateY` movement.

## Steps

1. In `src/pages/photography.astro`, add `class="masonry__image"` and
   `onload="this.classList.add('is-loaded')"` to the `<img>` element inside
   the `column.map` loop, leaving every existing attribute
   (`src`, `width`, `height`, `alt`, `loading="lazy"`) untouched.
2. In `src/styles/blocks/masonry.css`, append the `.masonry__image`,
   `.masonry__image.is-loaded`, and `@media (prefers-reduced-motion:
   reduce)` rules shown in Target, after the existing `.masonry img` rule.
   Do not modify the existing `.masonry` or `.masonry img` rules.

## Boundaries

- Do NOT touch any other `<img>` element in the codebase (e.g. the `Hero`
  component's image) — this plan is scoped to the photography masonry grid
  only.
- Do NOT change the grid/switcher layout, column logic, or image sorting in
  `photography.astro`'s frontmatter.
- Do NOT add a JS module, IntersectionObserver, or any build dependency —
  the inline `onload` attribute is the entire mechanism.
- If `photography.astro`'s image loop or `masonry.css`'s current rules don't
  match the excerpts above (drift since commit `baa7bd8`), STOP and report
  instead of improvising.

## Verification

- **Mechanical**: `pnpm astro build` completes with no errors.
- **Feel check**: run `pnpm astro dev`, open `/photography`, and scroll
  through the grid slowly (throttle network to "Fast 3G" in DevTools to make
  the effect visible):
  - Each image lifts up 8px while fading in over roughly 300ms — it should
    not feel like a hard pop or a slow drift.
  - In DevTools' Animations panel (or by re-throttling network), confirm the
    transition runs on `opacity`/`transform` only, never causing layout
    shift (the `width`/`height` attributes already reserve the image's box).
  - Toggle `prefers-reduced-motion` (Rendering panel) and reload: images
    still fade in (no instant pop-in), but no longer move vertically.
- **Done when**: every masonry image transitions from `opacity: 0` to
  `opacity: 1` on load instead of appearing instantly, the transform lift is
  dropped (not the fade) under reduced motion, and no other image on the
  site is affected.
