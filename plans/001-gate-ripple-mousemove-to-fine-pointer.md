# 001 — Gate ripple mousemove listeners to hover-capable, fine-pointer devices

- **Status**: DONE
- **Commit**: baa7bd8
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 2 files, ~6 lines changed

## Problem

Both custom ripple effects attach a `mousemove` listener unconditionally, with no
check for whether the device actually has a hover-capable, fine pointer. On
touch devices, `mousemove`-equivalent events can still fire on tap/drag,
triggering this per-pixel canvas/DOM simulation work for a "hover" effect that
was never meant to run there — the standard rule for hover-gated motion is to
gate it behind `@media (hover: hover) and (pointer: fine)` (or its JS
equivalent), which neither file does today.

```js
// src/lib/puddle.js:225-251 — current
#setupDelegatedListeners() {
  if (this._listenersSetup) return;
  this._listenersSetup = true;

  this.parentNode.addEventListener("click", (e) => {
    const span = e.target.closest("span");
    if (!span) return;
    const xx = Number(span.dataset.xx);
    const yy = Number(span.dataset.yy);
    const node = this.data.getNode(xx, yy);
    if (node) node.startRipple();
  });

  this.parentNode.addEventListener("mousemove", (e) => {
    const span = e.target.closest("span");
    if (!span) return;
    const xx = Number(span.dataset.xx);
    const yy = Number(span.dataset.yy);
    const key = `${xx},${yy}`;
    const now = Date.now();
    const lastTime = this.data.mouseThrottleMap.get(key) || 0;
    if (now - lastTime < CONFIG.MOUSE_DELAY) return;
    this.data.mouseThrottleMap.set(key, now);
    const node = this.data.getNode(xx, yy);
    if (node) node.startRipple();
  });
}
```

```js
// src/lib/image-ripple.js:295-313 — current
#setupListeners() {
  if (this._listenersSetup) return;
  this._listenersSetup = true;

  this.canvas.addEventListener("click", (e) => {
    const { xx, yy } = this.#getGridCoords(e.clientX, e.clientY);
    this.data.getNode(xx, yy)?.startRipple();
  });

  this.canvas.addEventListener("mousemove", (e) => {
    const { xx, yy } = this.#getGridCoords(e.clientX, e.clientY);
    const key = `${xx},${yy}`;
    const now = Date.now();
    const lastTime = this.data.mouseThrottleMap.get(key) || 0;
    if (now - lastTime < CONFIG.MOUSE_DELAY) return;
    this.data.mouseThrottleMap.set(key, now);
    this.data.getNode(xx, yy)?.startRipple(CONFIG.MAX_RIPPLE_STRENGTH * 0.6);
  });
}
```

## Target

Only attach the `mousemove` listener when the device reports a hover-capable,
fine pointer. The `click` listener stays as-is in both files — a tap-to-ripple
interaction is fine on touch, it's the continuous mousemove trail that isn't.

```js
// src/lib/puddle.js — target
#setupDelegatedListeners() {
  if (this._listenersSetup) return;
  this._listenersSetup = true;

  this.parentNode.addEventListener("click", (e) => {
    const span = e.target.closest("span");
    if (!span) return;
    const xx = Number(span.dataset.xx);
    const yy = Number(span.dataset.yy);
    const node = this.data.getNode(xx, yy);
    if (node) node.startRipple();
  });

  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  this.parentNode.addEventListener("mousemove", (e) => {
    const span = e.target.closest("span");
    if (!span) return;
    const xx = Number(span.dataset.xx);
    const yy = Number(span.dataset.yy);
    const key = `${xx},${yy}`;
    const now = Date.now();
    const lastTime = this.data.mouseThrottleMap.get(key) || 0;
    if (now - lastTime < CONFIG.MOUSE_DELAY) return;
    this.data.mouseThrottleMap.set(key, now);
    const node = this.data.getNode(xx, yy);
    if (node) node.startRipple();
  });
}
```

```js
// src/lib/image-ripple.js — target
#setupListeners() {
  if (this._listenersSetup) return;
  this._listenersSetup = true;

  this.canvas.addEventListener("click", (e) => {
    const { xx, yy } = this.#getGridCoords(e.clientX, e.clientY);
    this.data.getNode(xx, yy)?.startRipple();
  });

  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  this.canvas.addEventListener("mousemove", (e) => {
    const { xx, yy } = this.#getGridCoords(e.clientX, e.clientY);
    const key = `${xx},${yy}`;
    const now = Date.now();
    const lastTime = this.data.mouseThrottleMap.get(key) || 0;
    if (now - lastTime < CONFIG.MOUSE_DELAY) return;
    this.data.mouseThrottleMap.set(key, now);
    this.data.getNode(xx, yy)?.startRipple(CONFIG.MAX_RIPPLE_STRENGTH * 0.6);
  });
}
```

## Repo conventions to follow

- This exact media query already appears in the audit playbook's accessibility
  example (`@media (hover: hover) and (pointer: fine)`) — the JS form
  (`window.matchMedia(...).matches`) mirrors the `prefers-reduced-motion`
  check already used correctly at `src/lib/puddle.js:283` and
  `src/pages/contact.astro`'s inline script. Match that style: a guard
  clause, not a wrapping `if` block, to keep the diff minimal.
- Do not memoize the `matchMedia` result across resizes/device changes —
  both files already re-run setup on resize (`#resizeHandler` /
  `resizeHandler`), so a one-time check at listener-setup time is consistent
  with how `reducedMotion` is already handled (checked once, not reactively).

## Steps

1. In `src/lib/puddle.js`, inside `#setupDelegatedListeners()` (starts at
   line 225), insert `if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;`
   immediately after the `click` listener block (after line 236, before line 238's
   `mousemove` listener).
2. In `src/lib/image-ripple.js`, inside `#setupListeners()` (starts at line
   295), insert the same guard immediately after the `click` listener block
   (after line 302, before line 304's `mousemove` listener).

## Boundaries

- Do NOT touch the `click` listeners — tap-to-ripple should still work on
  touch devices.
- Do NOT add a CSS media query anywhere; this is pointer-capability
  detection for a JS event listener, not a CSS animation, so the JS
  `matchMedia` form is correct here.
- Do NOT change `CONFIG.MOUSE_DELAY` or any other tuning constant in this
  plan — that's covered by plan 005.
- If the line numbers or surrounding code don't match what's described above
  (drift since commit `baa7bd8`), STOP and report instead of improvising.

## Verification

- **Mechanical**: `pnpm astro build` completes with no errors.
- **Feel check**:
  - In a desktop browser (mouse present), open `/` and `/about` — moving the
    mouse over the puddle background still ripples; open `/contact` — moving
    the mouse over the tree canvas still warps it.
  - In Chrome DevTools, open the Device Toolbar (Ctrl+Shift+M) to emulate a
    touch device (e.g. "iPhone 14 Pro"), reload each of `/`, `/about`,
    `/contact`, and confirm dragging a finger across the effect does *not*
    trigger continuous ripples, while a single tap still does.
- **Done when**: mousemove-driven ripples only fire under
  `(hover: hover) and (pointer: fine)`, and tap/click-triggered ripples are
  unaffected on both touch and desktop.
