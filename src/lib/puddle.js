// Based on Puddle.js
// https://batmannair.com/puddle.js/
//
// Renders to a single <canvas> rather than one DOM node per grid cell —
// a typical viewport needs 1,000-4,500+ cells, which is far too many
// elements/style recalcs for the DOM to carry.

const CONFIG = {
  DEFAULT_UPDATE_INTERVAL: 100,
  MIN_NODE_SIZE: 1,
  // Node size as a fraction of the smaller viewport dimension. Lower = smaller,
  // more tightly packed grid items (more rows/cols); higher = fewer, larger items.
  NODE_SIZE_RATIO: 0.015,
  // Ripple strength scales with screen size: MAX_RIPPLE_STRENGTH on large
  // screens, up to MAX_RIPPLE_STRENGTH_SMALL_SCREEN on small/touch screens
  // (interpolated linearly between the two breakpoints below, in px).
  MAX_RIPPLE_STRENGTH: 15.0,
  MAX_RIPPLE_STRENGTH_SMALL_SCREEN: 45.0,
  RIPPLE_STRENGTH_SMALL_BREAKPOINT: 400,
  RIPPLE_STRENGTH_LARGE_BREAKPOINT: 1200,
  FORCE_DAMPENING_RATIO: 0.85,
  FORCE_CUTOFF: 2,
  ASCII_SHADES: [...".*"],
  MOUSE_DELAY: 500,
};

function computeMaxRippleStrength(lesserDimension) {
  const {
    MAX_RIPPLE_STRENGTH,
    MAX_RIPPLE_STRENGTH_SMALL_SCREEN,
    RIPPLE_STRENGTH_SMALL_BREAKPOINT,
    RIPPLE_STRENGTH_LARGE_BREAKPOINT,
  } = CONFIG;

  const t =
    (lesserDimension - RIPPLE_STRENGTH_SMALL_BREAKPOINT) /
    (RIPPLE_STRENGTH_LARGE_BREAKPOINT - RIPPLE_STRENGTH_SMALL_BREAKPOINT);
  const clampedT = Math.max(0, Math.min(1, t));

  return (
    MAX_RIPPLE_STRENGTH_SMALL_SCREEN +
    clampedT * (MAX_RIPPLE_STRENGTH - MAX_RIPPLE_STRENGTH_SMALL_SCREEN)
  );
}

const ASCII_THRESHOLDS = CONFIG.ASCII_SHADES.map(
  (_, index) => (index * 100.0) / (CONFIG.ASCII_SHADES.length - 1),
);

function shadeForForce(force) {
  const clampedForce = Math.max(0, Math.min(100, force));
  const index = ASCII_THRESHOLDS.findIndex(
    (threshold) => threshold >= clampedForce,
  );
  return CONFIG.ASCII_SHADES[index];
}

class PuddleData {
  constructor(numRows, numCols) {
    this.numRows = numRows;
    this.numCols = numCols;
    this.#allocate(numRows * numCols);
    this.updateQueue = new Set();
    this.drawQueue = new Set();
    this.changed = new Set();
    this.isUpdateDone = true;
    this.maxRippleStrength = CONFIG.MAX_RIPPLE_STRENGTH;
    this.forceDampeningRatio = CONFIG.FORCE_DAMPENING_RATIO;
    this.forceCutOff = CONFIG.FORCE_CUTOFF;
    this.mouseThrottleMap = new Map();
  }

  #allocate(total) {
    this.currentForce = new Float32Array(total);
    this.nextForce = new Float32Array(total);
    this.isAddedToUpdate = new Uint8Array(total);
  }

  refresh(numRows, numCols) {
    this.numRows = numRows;
    this.numCols = numCols;
    this.#allocate(numRows * numCols);
    this.updateQueue.clear();
    this.drawQueue.clear();
    this.changed.clear();
    this.isUpdateDone = true;
    this.mouseThrottleMap.clear();
  }

  isValidCoordinate(xx, yy) {
    return xx >= 0 && xx < this.numCols && yy >= 0 && yy < this.numRows;
  }

  getIndex(xx, yy) {
    return yy * this.numCols + xx;
  }

  startRipple(xx, yy, rippleStrength = this.maxRippleStrength) {
    if (!this.isValidCoordinate(xx, yy)) return;
    const index = this.getIndex(xx, yy);
    this.currentForce[index] = rippleStrength;
    this.changed.add(index);
    this.#queueNeighbors(xx, yy);
  }

  #queueNeighbors(xx, yy) {
    this.#addToUpdateQueue(xx - 1, yy - 1);
    this.#addToUpdateQueue(xx, yy - 1);
    this.#addToUpdateQueue(xx + 1, yy - 1);
    this.#addToUpdateQueue(xx - 1, yy);
    this.#addToUpdateQueue(xx + 1, yy);
    this.#addToUpdateQueue(xx - 1, yy + 1);
    this.#addToUpdateQueue(xx, yy + 1);
    this.#addToUpdateQueue(xx + 1, yy + 1);
  }

  #addToUpdateQueue(xx, yy) {
    if (!this.isValidCoordinate(xx, yy)) return;
    const index = this.getIndex(xx, yy);
    if (!this.isAddedToUpdate[index]) {
      this.updateQueue.add(index);
      this.isAddedToUpdate[index] = 1;
    }
  }

  #neighborForceSum(xx, yy) {
    return (
      this.#forceAt(xx, yy - 1) +
      this.#forceAt(xx, yy + 1) +
      this.#forceAt(xx + 1, yy) +
      this.#forceAt(xx - 1, yy)
    );
  }

  #forceAt(xx, yy) {
    if (!this.isValidCoordinate(xx, yy)) return 0;
    return this.currentForce[this.getIndex(xx, yy)];
  }

  updateElements() {
    if (!this.isUpdateDone) {
      console.warn("Previous update not completed, skipping update");
      return;
    }
    this.isUpdateDone = false;

    for (const index of this.updateQueue) {
      this.isAddedToUpdate[index] = 0;
      const xx = index % this.numCols;
      const yy = Math.floor(index / this.numCols);
      const neighborSum = this.#neighborForceSum(xx, yy);
      this.nextForce[index] =
        (neighborSum / 2 - this.nextForce[index]) * this.forceDampeningRatio;
      this.drawQueue.add(index);
    }
    this.updateQueue.clear();

    for (const index of this.drawQueue) {
      if (Math.abs(this.nextForce[index]) < this.forceCutOff) {
        this.nextForce[index] = 0;
      }
      const swapped = this.nextForce[index];
      this.nextForce[index] = this.currentForce[index];
      this.currentForce[index] = swapped;
      this.changed.add(index);

      const xx = index % this.numCols;
      const yy = Math.floor(index / this.numCols);
      this.#queueNeighbors(xx, yy);
    }
    this.drawQueue.clear();

    this.isUpdateDone = true;
  }
}

class Puddle {
  constructor(
    queryElement,
    { updateInterval = CONFIG.DEFAULT_UPDATE_INTERVAL } = {},
  ) {
    this.parentNode = document.querySelector(queryElement);
    if (!this.parentNode) {
      throw new Error(`Element ${queryElement} not found`);
    }

    this.updateInterval = updateInterval;
    this.nodeSize = CONFIG.MIN_NODE_SIZE;

    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute("aria-hidden", "true");
    this.parentNode.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");

    this.resizeHandler = this.#resizeHandler.bind(this);
    window.addEventListener("resize", this.resizeHandler);

    this.colorSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    this.colorSchemeHandler = () => {
      this.#readColor();
      this.#redrawAll();
    };
    this.colorSchemeQuery.addEventListener("change", this.colorSchemeHandler);

    this.#initialize();
  }

  #initialize() {
    this.#readColor();
    this.#setupDimensions();
    this.data = new PuddleData(this.numRows, this.numCols);
    this.data.maxRippleStrength = this.maxRippleStrength;
    this.#setupDelegatedListeners();
    this.setupGrid();
  }

  #readColor() {
    this.color = getComputedStyle(this.parentNode).color;
  }

  #setupDimensions() {
    const { clientWidth, clientHeight } = this.parentNode;
    const lesserDimension = Math.min(clientHeight, clientWidth);
    this.nodeSize = Math.max(
      CONFIG.MIN_NODE_SIZE,
      lesserDimension * CONFIG.NODE_SIZE_RATIO,
    );
    this.maxRippleStrength = computeMaxRippleStrength(lesserDimension);

    if (this.data) {
      this.data.maxRippleStrength = this.maxRippleStrength;
    }

    this.width = clientWidth;
    this.height = clientHeight;

    if (clientHeight) {
      this.numRows = Math.floor(clientHeight / this.nodeSize);
      this.numCols = Math.floor(clientWidth / this.nodeSize);
    }
  }

  #resizeHandler() {
    clearTimeout(this._resizeTimeout);
    this._resizeTimeout = setTimeout(() => {
      this.#setupDimensions();
      this.setupGrid();
    }, 150);
  }

  #cellFromEvent(event) {
    const rect = this.canvas.getBoundingClientRect();
    const xx = Math.floor((event.clientX - rect.left) / this.nodeSize);
    const yy = Math.floor((event.clientY - rect.top) / this.nodeSize);
    return { xx, yy };
  }

  #setupDelegatedListeners() {
    if (this._listenersSetup) return;
    this._listenersSetup = true;

    this.canvas.addEventListener("click", (e) => {
      const { xx, yy } = this.#cellFromEvent(e);
      if (!this.data.isValidCoordinate(xx, yy)) return;
      this.data.startRipple(xx, yy);
      this.#flushChanged();
      this.#startLoopIfIdle();
    });

    const canHover = window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    ).matches;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!canHover || prefersReducedMotion) return;

    this.canvas.addEventListener("mousemove", (e) => {
      const { xx, yy } = this.#cellFromEvent(e);
      if (!this.data.isValidCoordinate(xx, yy)) return;
      const key = `${xx},${yy}`;
      const now = Date.now();
      const lastTime = this.data.mouseThrottleMap.get(key) || 0;
      if (now - lastTime < CONFIG.MOUSE_DELAY) return;
      this.data.mouseThrottleMap.set(key, now);
      this.data.startRipple(xx, yy);
      this.#flushChanged();
      this.#startLoopIfIdle();
    });
  }

  setupGrid() {
    if (this.updateLoop) cancelAnimationFrame(this.updateLoop);
    this.updateLoop = null;
    this.data.refresh(this.numRows, this.numCols);

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.round(this.width * dpr));
    this.canvas.height = Math.max(1, Math.round(this.height * dpr));
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.font = `${this.nodeSize}px "Fira Code", monospace`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillStyle = this.color;

    this.ctx.clearRect(0, 0, this.width, this.height);
    for (let yy = 0; yy < this.numRows; yy++) {
      for (let xx = 0; xx < this.numCols; xx++) {
        this.#drawCell(xx, yy, 0);
      }
    }
  }

  #drawCell(xx, yy, force) {
    const glyph = shadeForForce(force);
    const px = xx * this.nodeSize;
    const py = yy * this.nodeSize;
    this.ctx.clearRect(px, py, this.nodeSize, this.nodeSize);
    this.ctx.fillText(glyph, px + this.nodeSize / 2, py + this.nodeSize / 2);
  }

  #flushChanged() {
    for (const index of this.data.changed) {
      const xx = index % this.numCols;
      const yy = Math.floor(index / this.numCols);
      this.#drawCell(xx, yy, this.data.currentForce[index]);
    }
    this.data.changed.clear();
  }

  #redrawAll() {
    this.ctx.fillStyle = this.color;
    for (let yy = 0; yy < this.numRows; yy++) {
      for (let xx = 0; xx < this.numCols; xx++) {
        const index = this.data.getIndex(xx, yy);
        this.#drawCell(xx, yy, this.data.currentForce[index]);
      }
    }
  }

  destroy() {
    window.removeEventListener("resize", this.resizeHandler);
    this.colorSchemeQuery.removeEventListener(
      "change",
      this.colorSchemeHandler,
    );
    if (this.updateLoop) cancelAnimationFrame(this.updateLoop);
    this.updateLoop = null;
  }

  #startLoopIfIdle() {
    if (this.updateLoop) return;
    let lastTick = 0;
    const tick = (now) => {
      if (now - lastTick < this.updateInterval) {
        this.updateLoop = requestAnimationFrame(tick);
        return;
      }
      lastTick = now;
      this.data.updateElements();
      this.#flushChanged();
      if (this.data.updateQueue.size === 0) {
        this.updateLoop = null;
        return;
      }
      this.updateLoop = requestAnimationFrame(tick);
    };
    this.updateLoop = requestAnimationFrame(tick);
  }
}

let activePuddle;

function initPuddle() {
  const container = document.querySelector("#puddle-container");
  if (!container) return;

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
