# 004 — Give reduced-motion users a static fallback instead of a blank puddle container

- **Status**: DONE
- **Commit**: baa7bd8
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 1 file (JS), 0 CSS changes (existing CSS is reused as-is)

## Problem

On `prefers-reduced-motion: reduce`, `puddle.js` never constructs the
`Puddle` class at all, so `#puddle-container` renders as an empty div with no
background, no image, nothing — on both `/` and `/about`, where sighted
users get the full animated ASCII-ripple background. "Reduced motion" is
supposed to mean fewer/gentler animations, not the removal of the entire
visual, and the CSS for exactly this kind of static fallback already exists
in the codebase, unused:

```js
// src/lib/puddle.js:283-289 — current
if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  try {
    const puddle = new Puddle("#puddle-container");
  } catch (error) {
    console.error("Failed to initialize puddle:", error);
  }
}
```

```css
/* src/styles/global/global.css:23-29 — already exists, currently never applied by any script */
#puddle-container.puddle-container--reveal {
  color: transparent;
  background-image: url("/images/tree-texture.webp");
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}
```

`#puddle-container` is marked `aria-hidden="true"` in both
`src/pages/index.astro` and `src/pages/about.astro` — it's purely decorative,
so this fix only affects what's visually shown, not anything
assistive-tech-relevant.

## Target

When reduced motion is preferred, skip building the interactive ASCII grid
(no `Puddle` instance, no per-cell spans, no `setInterval`, no listeners —
all motion stays off, exactly as today) but add the existing
`puddle-container--reveal` class so the container shows the static
tree-texture image instead of nothing.

```js
// src/lib/puddle.js — target
const container = document.querySelector("#puddle-container");
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

if (prefersReducedMotion) {
  container?.classList.add("puddle-container--reveal");
} else {
  try {
    const puddle = new Puddle("#puddle-container");
  } catch (error) {
    console.error("Failed to initialize puddle:", error);
  }
}
```

## Repo conventions to follow

- `image-ripple.js` already takes the same reduced-motion check and branches
  on it (`src/lib/image-ripple.js:174,227` — `if (!this.reducedMotion) ...`)
  rather than skipping setup altogether; this plan brings `puddle.js` to the
  same "always show something, just skip the motion" posture instead of an
  all-or-nothing branch.
- `.puddle-container--reveal` and its `span` opacity-transition rule
  (`global.css:31-34`) look like they were built for a richer *interactive*
  reveal-through-ripple mechanic (each span fading to transparent to expose
  the tree image as force passes through it), not merely a reduced-motion
  fallback. Nothing in the current `puddle.js` drives that per-span opacity,
  so that mechanic is unfinished/out of scope here — this plan only reuses
  the container-level `background-image` rule (`global.css:23-29`), which
  works correctly with zero spans present. Do not attempt to wire up the
  per-span opacity mechanic as part of this plan; that's a separate,
  larger feature decision.

## Steps

1. Open `src/lib/puddle.js` and locate the module-level reduced-motion check
   at the bottom of the file (lines 283-289).
2. Replace it with the version shown in Target: compute
   `prefersReducedMotion` once, and when `true`, look up `#puddle-container`
   and add the `puddle-container--reveal` class to it; when `false`, keep the
   existing `try { new Puddle(...) } catch` behavior unchanged.
3. Do not modify any CSS — `global.css:23-29` already renders correctly for
   a container with the class and no child spans.

## Boundaries

- Do NOT modify `global.css` — the container-level reveal styling already
  works for this use case as written.
- Do NOT attempt to implement the per-span opacity/reveal-through-ripple
  interaction — flag it as a follow-up if you notice it, but it's out of
  scope for this plan.
- Do NOT change the `Puddle` class itself or how it behaves for
  non-reduced-motion users.
- If `src/lib/puddle.js`'s bottom section doesn't match the excerpt above
  (drift since commit `baa7bd8`), STOP and report instead of improvising.

## Verification

- **Mechanical**: `pnpm astro build` completes with no errors; confirm
  `/images/tree-texture.webp` exists at `public/images/tree-texture.webp`
  (it does, per the repo's asset list) so the background-image resolves.
- **Feel check**:
  - In Chrome DevTools, open the Rendering panel (Cmd/Ctrl+Shift+P →
    "Show Rendering"), set "Emulate CSS media feature
    prefers-reduced-motion" to "reduce", then reload `/` and `/about`.
  - Confirm `#puddle-container` now shows the static tree-texture image
    (not a blank area), and confirm there is no animation, no console
    errors, and no `mousemove`/`click` ripple response.
  - Set the emulation back to "No emulation" and reload — confirm the full
    animated ASCII puddle still works exactly as before.
- **Done when**: reduced-motion users see the static tree image where the
  puddle background would otherwise be, with zero motion, and
  non-reduced-motion behavior is unchanged.
