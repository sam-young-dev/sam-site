# 008 — Add cross-page View Transitions

- **Status**: DONE
- **Commit**: baa7bd8
- **Severity**: MEDIUM
- **Category**: Missed opportunities
- **Estimated scope**: 3 files, ~40 lines added/changed

## Problem

Every navigation between this site's four pages (`/`, `/photography`,
`/about`, `/contact`) is a full, hard page reload — no cross-fade, no
continuity. Astro ships a built-in View Transitions router
(`astro:transitions`, confirmed present at
`node_modules/astro/dist/virtual-modules/transitions.js` in this repo's
installed `astro@7.3.2`) that is not wired up anywhere in this codebase.

```astro
<!-- src/layouts/BaseLayout.astro — current (full file) -->
---
import MetaInfo from '../components/core/MetaInfo.astro';
import Header from '../components/core/SiteHeader.astro';
import SiteFooter from '../components/core/SiteFooter.astro';

import "virtual:sugarcube.css";
import "../styles/index.css";

const { title, description, socialImage, allowRobots } = Astro.props;
const canonicalURL = new URL(Astro.url.pathname, Astro.site);
---

<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <meta name="generator" content={Astro.generator} />
    <MetaInfo
      title={title}
      description={description}
      canonicalURL={canonicalURL}
      socialImage={socialImage}
      allowRobots={allowRobots}
    />
  </head>
  <body>
    <Header />
    <main tabindex="-1" id="main-content">
      <slot />
    </main>
    <SiteFooter />
  </body>
</html>
```

**This is not a drop-in one-line fix.** Two pages run persistent JS effects
that self-initialize as an ES module side effect:

```js
// src/lib/puddle.js:299-312 — current (bottom of file)
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

export default Puddle;
```

`Puddle`'s constructor registers a `window` resize listener
(`src/lib/puddle.js:193-194`) and starts a `setInterval` update loop
(`src/lib/puddle.js:261-285`'s `setupGrid`, restarted via
`#startLoopIfIdle`), but the class has **no way to tear either down**. Once
client-side routing replaces `#puddle-container` with a different page's
DOM, that `Puddle` instance's `window` listener keeps firing against a
detached element forever — a leak that never happened before because every
navigation used to be a full reload.

`src/pages/contact.astro:49-62`'s inline script constructs an `ImageRipple`
the same way (module-scoped, run once per script execution), but
`ImageRipple` already has a `destroy()` method
(`src/lib/image-ripple.js:324-327`) that isn't called anywhere. It just
needs to be wired up.

There's a second problem specific to `puddle.js`: it's a single module
imported by both `src/pages/index.astro:38` and `src/pages/about.astro:11`.
Under client-side routing, the browser's ES module cache means that module
body only ever executes **once** for the whole session (re-importing an
already-loaded module URL does not re-run its top-level code) — so the
current self-initializing side effect would only ever fire on whichever of
those two pages the visitor lands on first, never again on subsequent
visits to either page. Initialization must move into a named function
re-invoked via Astro's `astro:page-load` lifecycle event instead of running
once at import time.

## Target

### 1. Enable the router

```astro
<!-- src/layouts/BaseLayout.astro — target -->
---
import MetaInfo from '../components/core/MetaInfo.astro';
import Header from '../components/core/SiteHeader.astro';
import SiteFooter from '../components/core/SiteFooter.astro';
import { ClientRouter } from 'astro:transitions';

import "virtual:sugarcube.css";
import "../styles/index.css";

const { title, description, socialImage, allowRobots } = Astro.props;
const canonicalURL = new URL(Astro.url.pathname, Astro.site);
---

<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <meta name="generator" content={Astro.generator} />
    <MetaInfo
      title={title}
      description={description}
      canonicalURL={canonicalURL}
      socialImage={socialImage}
      allowRobots={allowRobots}
    />
    <ClientRouter />
  </head>
  <body>
    <Header />
    <main tabindex="-1" id="main-content">
      <slot />
    </main>
    <SiteFooter />
  </body>
</html>
```

No `transition:animate` attributes are needed anywhere: Astro's default
(applied automatically with no opt-in) is its built-in `fade` — 180ms,
`cubic-bezier(0.76, 0, 0.24, 1)` — which already sits inside this
codebase's UI duration budget and needs no override. Astro's bundled
`viewtransitions.css` also already wraps every transition keyframe in
`@media (prefers-reduced-motion)` and disables it, so reduced-motion users
get an instant swap for free — no additional CSS is required for that.

### 2. Make `Puddle` re-initializable and teardown-able

```js
// src/lib/puddle.js — target (add inside the Puddle class, after setupGrid())
  destroy() {
    window.removeEventListener("resize", this.resizeHandler);
    clearInterval(this.updateLoop);
    this.updateLoop = null;
  }
```

```js
// src/lib/puddle.js — target (replace lines 299-312, the bottom-of-file init block)
let activePuddle;

function initPuddle() {
  const container = document.querySelector("#puddle-container");
  if (!container) return;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  if (prefersReducedMotion) {
    container.classList.add("puddle-container--reveal");
    return;
  }

  try {
    activePuddle = new Puddle("#puddle-container");
  } catch (error) {
    console.error("Failed to initialize puddle:", error);
  }
}

function destroyPuddle() {
  activePuddle?.destroy();
  activePuddle = undefined;
}

document.addEventListener("astro:page-load", initPuddle);
document.addEventListener("astro:before-swap", destroyPuddle);

export default Puddle;
```

`astro:page-load` fires once for the very first page load and again after
every client-side navigation, so this listener alone replaces the old
top-level init call — no direct `initPuddle()` call is needed outside the
listener registration.

### 3. Wire up `ImageRipple`'s existing `destroy()`

```astro
<!-- src/pages/contact.astro — target (replace the bottom <script> block) -->
<script>
  import ImageRipple from "../lib/image-ripple.js";

  let activeRipple;

  function setupRipple() {
    const canvas = document.querySelector<HTMLElement>("#tree-ripple");
    const src = canvas?.dataset.src;
    if (!canvas || !src) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    activeRipple = new ImageRipple("#tree-ripple", src, { reducedMotion });
    activeRipple.init();
  }

  function teardownRipple() {
    activeRipple?.destroy();
    activeRipple = undefined;
  }

  document.addEventListener("astro:page-load", setupRipple);
  document.addEventListener("astro:before-swap", teardownRipple);
</script>
```

## Repo conventions to follow

- `puddle.js` and `image-ripple.js` already share the "class instance holds
  `resizeHandler`/`updateLoop`, constructor wires them up" shape — the new
  `Puddle.destroy()` above is written to exactly mirror the existing
  `ImageRipple.destroy()` at `src/lib/image-ripple.js:324-327`
  (`clearInterval` + `removeEventListener("resize", ...)`), just reordered
  to match `puddle.js`'s existing method style. Do not invent a different
  cleanup shape.
- Both libraries already guard reduced motion with
  `window.matchMedia("(prefers-reduced-motion: reduce)")` — reuse that exact
  media query string, don't introduce a different one.
- `src/pages/index.astro:37-39` and `src/pages/about.astro:10-12` both do a
  bare `<script>import '../lib/puddle.js';</script>` with no local logic —
  leave both of those `<script>` tags completely untouched. All of this
  plan's `puddle.js` changes live inside the module itself, so both pages
  pick up the fix automatically without their own script tags changing.

## Steps

1. In `src/layouts/BaseLayout.astro`, add the `import { ClientRouter } from
   'astro:transitions';` line and render `<ClientRouter />` as the last
   child of `<head>`, exactly as shown in Target section 1.
2. In `src/lib/puddle.js`, add the `destroy()` method to the `Puddle` class
   immediately after the closing brace of `setupGrid()` (before
   `#startLoopIfIdle()`).
3. In `src/lib/puddle.js`, replace the bottom-of-file init block (current
   lines 299-312, from `const container = ...` through
   `export default Puddle;`) with the `activePuddle` /
   `initPuddle` / `destroyPuddle` / event-listener block shown in Target
   section 2, ending with the same `export default Puddle;` line.
4. In `src/pages/contact.astro`, replace the final `<script>` block (current
   lines 49-62) with the `setupRipple` / `teardownRipple` version shown in
   Target section 3. Leave the `<style>` block and all markup above it
   untouched.

## Boundaries

- Do NOT add `transition:persist` to `SiteHeader`, `SiteFooter`, or any
  other element. Persisting the header would freeze its `aria-current`
  attribute on whichever link was current at first load, since Astro
  doesn't re-render persisted DOM on subsequent navigations — fixing that
  would require separate router-aware active-link logic, which is out of
  scope for this plan. Every page continues to cross-fade as a whole via
  Astro's default behavior.
- Do NOT add `transition:animate` or `transition:name` anywhere — Astro's
  default `fade` is the target end state, not a starting point to
  customize.
- Do NOT touch `src/pages/photography.astro` or `src/pages/about.astro`'s
  script tags — `about.astro`'s puddle usage is fixed entirely by the
  `puddle.js` module change in step 3.
- Do NOT change `ImageRipple`'s class body in `src/lib/image-ripple.js` —
  its `destroy()` method already exists and is correct as-is; only
  `contact.astro`'s consumption of it changes.
- If any of the four quoted "current" excerpts above don't match the code
  you find (drift since commit `baa7bd8`), STOP and report instead of
  improvising — in particular, re-check `puddle.js`'s exact bottom-of-file
  block and line numbers before deleting/replacing it, since plans 004 and
  005 both touch this same file and may have shifted lines.

## Verification

- **Mechanical**: `pnpm astro build` completes with no errors; `pnpm astro
  dev` starts with no console errors on any of the four pages.
- **Feel check**: run `pnpm astro dev` and, using the site's own nav links
  (not a hard reload/URL bar entry, which bypasses the router):
  - Navigating between any two pages cross-fades instead of flashing to a
    blank white page — the outgoing page fades out as the incoming one
    fades in, over roughly 180ms.
  - Navigate `/` → `/photography` → `/` → `/photography` (repeat 3-4
    times), then open DevTools' Performance Monitor or the Elements panel
    and confirm the puddle canvas (`#puddle-container`) re-renders its ASCII
    grid and responds to hover/click ripples every time you land back on
    `/` — it must not go dark/inert on a second visit.
  - Do the same round trip between `/` and `/about` (both use
    `puddle.js`) and confirm both re-initialize correctly.
  - Navigate away from `/contact` mid-ripple-animation (click a ripple, then
    immediately click a nav link) and confirm no console errors appear —
    this exercises `teardownRipple` interrupting an active update loop.
  - Toggle `prefers-reduced-motion` (Rendering panel): page navigations
    should swap instantly with no cross-fade (Astro's bundled CSS handles
    this automatically), and the puddle should still reveal its static
    `puddle-container--reveal` state instead of animating.
- **Done when**: all four pages cross-fade on nav-link navigation, the
  puddle canvas correctly re-initializes every time `/` or `/about` is
  revisited via client-side routing, the tree ripple on `/contact` tears
  down cleanly on navigation away, and reduced-motion users get instant
  page swaps.
