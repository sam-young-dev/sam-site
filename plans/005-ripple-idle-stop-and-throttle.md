# 005 — Stop ripple update loops when idle; loosen the image-ripple mousemove throttle

- **Status**: DONE
- **Commit**: baa7bd8
- **Severity**: LOW
- **Category**: Performance
- **Estimated scope**: 2 files, ~25 lines changed

## Problem

**`puddle.js`** starts a `setInterval` the moment the grid is built and never
stops it, even when the simulation has fully decayed back to rest. Every
100ms, forever, for as long as `/` or `/about` is open, `updateElements()`
runs a Set-iteration + early-return — cheap per call, but it's unbounded
background work with no idle state, and if a ripple *is* active, each tick
writes `textContent` on every affected `<span>` in the grid (a
layout/paint-triggering DOM write, not a compositor-only one — there is no
GPU-only way to do ASCII shading, but there's no reason to keep paying that
cost after the ripple has fully died out):

```js
// src/lib/puddle.js:253-280 — current
setupGrid() {
  clearInterval(this.updateLoop);
  this.data.refresh(this.numRows, this.numCols);

  const fragment = document.createDocumentFragment();
  this.parentNode.innerHTML = "";

  this.parentNode.style.cssText = `
    grid-template-columns: repeat(${this.numCols}, ${this.nodeSize}px);
    grid-template-rows: repeat(${this.numRows}, ${this.nodeSize}px);
  `;

  const totalNodes = this.numRows * this.numCols;
  for (let i = 0; i < totalNodes; i++) {
    const yy = Math.floor(i / this.numCols);
    const xx = i % this.numCols;

    const node = new AsciiNode(xx, yy, this.data);
    this.data.appendNode(node, i);
    fragment.appendChild(node.element);
  }

  this.parentNode.appendChild(fragment);
  this.updateLoop = setInterval(
    () => this.data.updateElements(),
    this.updateInterval,
  );
}
```

```js
// src/lib/puddle.js:225-251 — current (click/mousemove trigger ripples directly on nodes, bypassing Puddle)
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

**`image-ripple.js`** has the same always-on interval, plus a `mousemove`
throttle of only 40ms — close to unthrottled — stacked on top of that
interval, each doing a `clearRect` + `drawImage` on a real `<canvas>`:

```js
// src/lib/image-ripple.js:13 — current
MOUSE_DELAY: 40,
```

```js
// src/lib/image-ripple.js:227-232 — current
if (!this.reducedMotion) {
  this.updateLoop = setInterval(
    () => this.data.updateElements(),
    this.updateInterval,
  );
}
```

## Target

**`puddle.js`**: don't start the interval in `setupGrid()`. Start it lazily
the first time a ripple is triggered, and let it clear itself once the
simulation's `updateQueue` is empty after a tick (meaning nothing will change
on the next tick either).

```js
// src/lib/puddle.js — target: setupGrid() no longer starts the interval
setupGrid() {
  clearInterval(this.updateLoop);
  this.updateLoop = null;
  this.data.refresh(this.numRows, this.numCols);

  const fragment = document.createDocumentFragment();
  this.parentNode.innerHTML = "";

  this.parentNode.style.cssText = `
    grid-template-columns: repeat(${this.numCols}, ${this.nodeSize}px);
    grid-template-rows: repeat(${this.numRows}, ${this.nodeSize}px);
  `;

  const totalNodes = this.numRows * this.numCols;
  for (let i = 0; i < totalNodes; i++) {
    const yy = Math.floor(i / this.numCols);
    const xx = i % this.numCols;

    const node = new AsciiNode(xx, yy, this.data);
    this.data.appendNode(node, i);
    fragment.appendChild(node.element);
  }

  this.parentNode.appendChild(fragment);
}

#startLoopIfIdle() {
  if (this.updateLoop) return;
  this.updateLoop = setInterval(() => {
    this.data.updateElements();
    if (this.data.updateQueue.size === 0) {
      clearInterval(this.updateLoop);
      this.updateLoop = null;
    }
  }, this.updateInterval);
}
```

```js
// src/lib/puddle.js — target: both listeners start the loop right after triggering a ripple
#setupDelegatedListeners() {
  if (this._listenersSetup) return;
  this._listenersSetup = true;

  this.parentNode.addEventListener("click", (e) => {
    const span = e.target.closest("span");
    if (!span) return;
    const xx = Number(span.dataset.xx);
    const yy = Number(span.dataset.yy);
    const node = this.data.getNode(xx, yy);
    if (node) {
      node.startRipple();
      this.#startLoopIfIdle();
    }
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
    if (node) {
      node.startRipple();
      this.#startLoopIfIdle();
    }
  });
}
```

**`image-ripple.js`**: raise the mousemove throttle, and apply the same
idle-stop pattern to its interval.

```js
// src/lib/image-ripple.js:13 — target
MOUSE_DELAY: 120,
```

```js
// src/lib/image-ripple.js — target: #setup() no longer starts the interval unconditionally
#setup() {
  clearInterval(this.updateLoop);
  this.updateLoop = null;

  // ...unchanged sizing/paint logic...

  this.data = new RippleData(
    this.numRows,
    this.numCols,
    this.cellSize,
    (xx, yy) => this.#drawTile(xx, yy),
  );

  this.ctx.clearRect(0, 0, this.width, this.height);
  this.ctx.drawImage(this.offscreen, 0, 0);
}

#startLoopIfIdle() {
  if (this.reducedMotion || this.updateLoop) return;
  this.updateLoop = setInterval(() => {
    this.data.updateElements();
    if (this.data.updateQueue.size === 0) {
      clearInterval(this.updateLoop);
      this.updateLoop = null;
    }
  }, this.updateInterval);
}
```

```js
// src/lib/image-ripple.js — target: both listeners start the loop after triggering a ripple
this.canvas.addEventListener("click", (e) => {
  const { xx, yy } = this.#getGridCoords(e.clientX, e.clientY);
  this.data.getNode(xx, yy)?.startRipple();
  this.#startLoopIfIdle();
});

this.canvas.addEventListener("mousemove", (e) => {
  const { xx, yy } = this.#getGridCoords(e.clientX, e.clientY);
  const key = `${xx},${yy}`;
  const now = Date.now();
  const lastTime = this.data.mouseThrottleMap.get(key) || 0;
  if (now - lastTime < CONFIG.MOUSE_DELAY) return;
  this.data.mouseThrottleMap.set(key, now);
  this.data.getNode(xx, yy)?.startRipple(CONFIG.MAX_RIPPLE_STRENGTH * 0.6);
  this.#startLoopIfIdle();
});
```

## Repo conventions to follow

- Both files already use the `Set`-based `updateQueue`/`drawQueue` pattern
  and a private-field (`#method`) style for internal methods — the new
  `#startLoopIfIdle()` methods should match that style (private, called
  only from within the class).
- `RippleData.updateElements()` in `image-ripple.js:110-126` already
  guards on `this.updateQueue.size === 0` at entry — reuse that same
  property (`updateQueue.size`) as the idle signal after the tick, don't
  introduce a separate "isIdle" flag or new bookkeeping.
- This plan should compose cleanly with plan 001 (hover/pointer gating) and
  plan 004 (puddle reduced-motion fallback) — none of the three touch the
  same lines, but if executing more than one, apply 001 and 004 first, then
  this one, to avoid re-deriving line numbers against a moved target.

## Steps

1. In `src/lib/puddle.js`, in `setupGrid()` (lines 253-280), remove the
   trailing `this.updateLoop = setInterval(...)` call and instead set
   `this.updateLoop = null;` right after the existing
   `clearInterval(this.updateLoop);` at the top of the method.
2. Add a new private method `#startLoopIfIdle()` to the `Puddle` class (near
   `#resizeHandler`), exactly as shown in Target.
3. In `#setupDelegatedListeners()` (lines 225-251), after each `if (node)
   node.startRipple();` line (in both the `click` and `mousemove`
   listeners), add `this.#startLoopIfIdle();` inside the same `if` block.
4. In `src/lib/image-ripple.js`, change `MOUSE_DELAY: 40,` (line 13) to
   `MOUSE_DELAY: 120,`.
5. In `#setup()` (lines 194-233), remove the `if (!this.reducedMotion) {
   this.updateLoop = setInterval(...) }` block at the end, and instead set
   `this.updateLoop = null;` right after the existing
   `clearInterval(this.updateLoop);` at the top of the method.
6. Add a new private method `#startLoopIfIdle()` to the `ImageRipple` class,
   exactly as shown in Target (it must check `this.reducedMotion` itself,
   since the click listener is still attached even when disabled — actually
   note: `#setupListeners()` is only called `if (!this.reducedMotion)` per
   `init()` at line 174, so the reduced-motion guard in
   `#startLoopIfIdle()` is redundant-but-harmless defensive code; keep it
   for clarity).
7. In `#setupListeners()` (lines 295-313), after the `startRipple()` call in
   both the `click` and `mousemove` listeners, add
   `this.#startLoopIfIdle();`.

## Boundaries

- Do NOT change `CONFIG.DEFAULT_UPDATE_INTERVAL` (100ms in `puddle.js`, 50ms
  in `image-ripple.js`) — only whether the interval keeps running while
  idle, not its tick rate while active.
- Do NOT change `CONFIG.MOUSE_DELAY` in `puddle.js` (leave at 500ms) — only
  `image-ripple.js`'s.
- Do NOT change the `#drawTile`/`#drawNode`/force-diffusion math in either
  file.
- Do NOT combine this with plan 001's `matchMedia` gating in a way that
  duplicates the check — plan 001 already prevents `mousemove` listeners
  from attaching on coarse-pointer devices; this plan's idle-stop applies
  regardless of that gate.
- If either file's `setupGrid()`/`#setup()` or listener blocks don't match
  the excerpts above (drift since commit `baa7bd8`), STOP and report instead
  of improvising.

## Verification

- **Mechanical**: `pnpm astro build` completes with no errors.
- **Feel check**:
  - Open `/` (puddle) in a browser, open DevTools → Performance, and record
    ~5 seconds of *no interaction* after page load. Confirm there is no
    recurring `updateElements`/timer activity in the trace once the initial
    idle state is reached (there should be none firing at all, since
    nothing ripples on load).
  - Click once to trigger a ripple, confirm the ASCII wave animates and
    decays visibly the same as before this change (same speed, same
    falloff), then confirm (via the Performance trace, or by adding a
    temporary `console.count` inside the interval callback) that the timer
    stops firing within roughly one decay cycle after the visual ripple
    has settled — remove any temporary logging before finishing.
  - Repeat on `/contact` for the canvas ripple: move the mouse across the
    tree image and confirm it still warps smoothly at the new, slightly
    coarser throttle — it should still feel responsive, just not
    over-firing.
- **Done when**: both effects' update intervals are not running while at
  rest, ripples still look and decay the same as before, and
  `image-ripple.js`'s mousemove throttle is 120ms.
