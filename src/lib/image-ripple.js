// Same wave-simulation approach as puddle.js, but instead of shading ASCII
// text per grid cell, each cell's local force gradient is used to displace a
// sampled tile of a source image on a <canvas>, producing a real pixel-warp
// ripple instead of a text/opacity effect.

const CONFIG = {
  DEFAULT_UPDATE_INTERVAL: 50,
  MIN_NODE_SIZE: 16,
  NODE_SIZE_PERCENT: 2.5,
  MAX_RIPPLE_STRENGTH: 100.0,
  FORCE_DAMPENING_RATIO: 0.9,
  FORCE_CUTOFF: 1,
  MOUSE_DELAY: 120,
  MAX_DISPLACEMENT_PX: 22,
  TILE_OVERSCAN_RATIO: 0.5,
};

class RippleNode {
  constructor(xx, yy, data) {
    this.xx = xx;
    this.yy = yy;
    this.data = data;
    this.currentForce = 0;
    this.nextForce = 0;
    this.isAddedToUpdate = false;
  }

  startRipple(rippleStrength = this.data.maxRippleStrength) {
    this.currentForce = rippleStrength;
    this.data.drawTile(this.xx, this.yy);
    this.#updateNeighbors();
  }

  #updateNeighbors() {
    this.data.addToUpdateQueue(this.xx - 1, this.yy - 1);
    this.data.addToUpdateQueue(this.xx, this.yy - 1);
    this.data.addToUpdateQueue(this.xx + 1, this.yy - 1);
    this.data.addToUpdateQueue(this.xx - 1, this.yy);
    this.data.addToUpdateQueue(this.xx + 1, this.yy);
    this.data.addToUpdateQueue(this.xx - 1, this.yy + 1);
    this.data.addToUpdateQueue(this.xx, this.yy + 1);
    this.data.addToUpdateQueue(this.xx + 1, this.yy + 1);
  }

  updateNode() {
    const { forceDampeningRatio } = this.data;
    const neighborSum = this.#getNeighborForces();

    this.nextForce = (neighborSum / 2 - this.nextForce) * forceDampeningRatio;
    this.data.addToDrawQueue(this.xx, this.yy);
  }

  #getNeighborForces() {
    return (
      this.#getNodeForce(this.xx, this.yy - 1) +
      this.#getNodeForce(this.xx, this.yy + 1) +
      this.#getNodeForce(this.xx + 1, this.yy) +
      this.#getNodeForce(this.xx - 1, this.yy)
    );
  }

  #getNodeForce(xx, yy) {
    const node = this.data.getNode(xx, yy);
    return node?.currentForce || 0;
  }

  computeForceAndDraw() {
    if (Math.abs(this.nextForce) < this.data.forceCutOff) {
      this.nextForce = 0;
    }

    this.data.drawTile(this.xx, this.yy);
    [this.currentForce, this.nextForce] = [this.nextForce, this.currentForce];
    this.#updateNeighbors();
  }
}

class RippleData {
  constructor(numRows, numCols, cellSize, drawTile) {
    this.nodeList = new Array(numRows * numCols);
    this.updateQueue = new Set();
    this.drawQueue = new Set();
    this.numRows = numRows;
    this.numCols = numCols;
    this.cellSize = cellSize;
    this.isUpdateDone = true;
    this.maxRippleStrength = CONFIG.MAX_RIPPLE_STRENGTH;
    this.forceDampeningRatio = CONFIG.FORCE_DAMPENING_RATIO;
    this.forceCutOff = CONFIG.FORCE_CUTOFF;
    this.mouseThrottleMap = new Map();
    this.drawTile = drawTile;

    for (let i = 0; i < this.nodeList.length; i++) {
      const yy = Math.floor(i / numCols);
      const xx = i % numCols;
      this.nodeList[i] = new RippleNode(xx, yy, this);
    }
  }

  isValidCoordinate(xx, yy) {
    return xx >= 0 && xx < this.numCols && yy >= 0 && yy < this.numRows;
  }

  getIndex(xx, yy) {
    return yy * this.numCols + xx;
  }

  getNode(xx, yy) {
    return this.isValidCoordinate(xx, yy)
      ? this.nodeList[this.getIndex(xx, yy)]
      : null;
  }

  addToUpdateQueue(xx, yy) {
    if (!this.isValidCoordinate(xx, yy)) return;

    const index = this.getIndex(xx, yy);
    const node = this.nodeList[index];

    if (!node.isAddedToUpdate) {
      this.updateQueue.add(index);
      node.isAddedToUpdate = true;
    }
  }

  addToDrawQueue(xx, yy) {
    if (!this.isValidCoordinate(xx, yy)) return;
    this.drawQueue.add(this.getIndex(xx, yy));
  }

  updateElements() {
    if (!this.isUpdateDone) return;
    if (this.updateQueue.size === 0) return;

    this.isUpdateDone = false;

    for (const index of this.updateQueue) {
      this.nodeList[index].isAddedToUpdate = false;
      this.nodeList[index].updateNode();
    }
    this.updateQueue.clear();

    for (const index of this.drawQueue) {
      this.nodeList[index].computeForceAndDraw();
    }
    this.drawQueue.clear();

    this.isUpdateDone = true;
  }
}

export default class ImageRipple {
  constructor(canvasSelector, imageUrl, { updateInterval = CONFIG.DEFAULT_UPDATE_INTERVAL, reducedMotion = false } = {}) {
    this.canvas = document.querySelector(canvasSelector);
    if (!this.canvas) {
      throw new Error(`Element ${canvasSelector} not found`);
    }

    this.imageUrl = imageUrl;
    this.updateInterval = updateInterval;
    this.reducedMotion = reducedMotion;
    this.dpr = Math.max(1, window.devicePixelRatio || 1);
    this.ctx = this.canvas.getContext("2d");
    this.offscreen = document.createElement("canvas");
    this.offscreenCtx = this.offscreen.getContext("2d");

    this.resizeHandler = this.#debounce(() => this.#setup(), 150);
    window.addEventListener("resize", this.resizeHandler);
  }

  async init() {
    this.image = await this.#loadImage(this.imageUrl);
    this.#setup();
    if (!this.reducedMotion) this.#setupListeners();
  }

  #loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  #debounce(fn, wait) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), wait);
    };
  }

  #setup() {
    clearInterval(this.updateLoop);
    this.updateLoop = null;

    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, Math.round(rect.width * this.dpr));
    this.height = Math.max(1, Math.round(rect.height * this.dpr));

    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.offscreen.width = this.width;
    this.offscreen.height = this.height;

    this.#paintSourceToOffscreen();

    const lesserDimension = Math.min(this.width, this.height);
    this.cellSize = Math.max(
      CONFIG.MIN_NODE_SIZE * this.dpr,
      (lesserDimension * CONFIG.NODE_SIZE_PERCENT) / 100,
    );

    this.numCols = Math.max(1, Math.ceil(this.width / this.cellSize));
    this.numRows = Math.max(1, Math.ceil(this.height / this.cellSize));

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

  #paintSourceToOffscreen() {
    const { image, width, height } = this;
    const imageRatio = image.naturalWidth / image.naturalHeight;
    const boxRatio = width / height;

    let drawWidth, drawHeight;
    if (imageRatio > boxRatio) {
      drawHeight = height;
      drawWidth = height * imageRatio;
    } else {
      drawWidth = width;
      drawHeight = width / imageRatio;
    }

    const offsetX = (width - drawWidth) / 2;
    const offsetY = (height - drawHeight) / 2;

    this.offscreenCtx.clearRect(0, 0, width, height);
    this.offscreenCtx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
  }

  #drawTile(xx, yy) {
    const { cellSize } = this;
    const left = this.data.getNode(xx - 1, yy)?.currentForce || 0;
    const right = this.data.getNode(xx + 1, yy)?.currentForce || 0;
    const up = this.data.getNode(xx, yy - 1)?.currentForce || 0;
    const down = this.data.getNode(xx, yy + 1)?.currentForce || 0;

    const maxDisplacement = CONFIG.MAX_DISPLACEMENT_PX * this.dpr;
    const scale = maxDisplacement / CONFIG.MAX_RIPPLE_STRENGTH;

    const dx = this.#clamp((right - left) * scale, -maxDisplacement, maxDisplacement);
    const dy = this.#clamp((down - up) * scale, -maxDisplacement, maxDisplacement);

    const destX = xx * cellSize;
    const destY = yy * cellSize;
    const overscan = cellSize * CONFIG.TILE_OVERSCAN_RATIO;
    const size = cellSize + overscan;

    const srcX = destX - dx - overscan / 2;
    const srcY = destY - dy - overscan / 2;
    const drawX = destX - overscan / 2;
    const drawY = destY - overscan / 2;

    this.ctx.clearRect(drawX, drawY, size, size);
    this.ctx.drawImage(this.offscreen, srcX, srcY, size, size, drawX, drawY, size, size);
  }

  #clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  #getGridCoords(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      xx: Math.floor(((clientX - rect.left) * this.dpr) / this.cellSize),
      yy: Math.floor(((clientY - rect.top) * this.dpr) / this.cellSize),
    };
  }

  #setupListeners() {
    if (this._listenersSetup) return;
    this._listenersSetup = true;

    this.canvas.addEventListener("click", (e) => {
      const { xx, yy } = this.#getGridCoords(e.clientX, e.clientY);
      this.data.getNode(xx, yy)?.startRipple();
      this.#startLoopIfIdle();
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
      this.#startLoopIfIdle();
    });
  }

  destroy() {
    clearInterval(this.updateLoop);
    window.removeEventListener("resize", this.resizeHandler);
  }
}
