// Draws the contour lines of a scalar field like a topographic map: thin lines
// at fixed elevation steps, every few of them an "index" contour drawn stronger,
// over a faint wash that deepens with height.
//
// The field is sampled on a coarse grid and the lines are traced through it with
// marching squares, so they are smooth vector curves, not pixels. Lines fade with
// elevation, valleys are faint and peaks crisp, and the land slowly reshapes
// itself rather than sliding across the screen.

const SETTINGS = {
  seed: 783098,
  // sampling grid, in px. Lines are traced through it, so it can be coarse
  cell: 8,
  // elevation steps between the lowest and highest ground
  levels: 24,
  // how zoomed in the land is, higher is smaller features
  scale: 1.5,
  // noise octaves, each adds finer wrinkles to the land
  detail: 4,
  // how far the land is bent sideways, higher looks more marbled
  warp: 0.35,
  // multiplies line weight
  line: 1,
  // strength of the shading that deepens with height, 0 is none
  wash: 0.5,
  // multiplies how fast the land reshapes
  speed: 0.4,
};

// field coordinates are measured against a fixed 1000px reference, so a
// given scale looks the same on a phone and a monitor
const REFERENCE_SIZE = 1000;
// every Nth level is an "index" contour, drawn stronger like on a real map
const INDEX_EVERY = 5;
// line weight (px) and opacity. Opacity rises from valley to peak so the
// high ground reads as nearer, then index contours sit above the minor ones
const MINOR_WIDTH = 0.7;
const INDEX_WIDTH = 1.4;
const MINOR_ALPHA = [0.14, 0.5];
const INDEX_ALPHA = [0.35, 0.9];
// index lines get a wide, faint underlay that gives them a soft glow
const HALO_WIDTH = 6;
const HALO_ALPHA = 0.06;
// opacity of the wash at the highest ground, at full strength
const WASH_ALPHA = 0.2;
// how far (in noise-lattice units) each octave travels around its slow orbit
const ORBIT_RADIUS = 0.5;
const RESIZE_DELAY = 150;
// a render slower than this (ms, smoothed) drops the loop to every other frame,
// an even 30fps beats a 60fps that stutters
const FRAME_BUDGET = 12;
// stops a tiny cell size on a huge screen from sampling too many nodes
const MAX_CELLS = 40000;
// how fast the normalisation range follows the field as it moves, per second
const RANGE_RATE = 2.5;

function lattice(ix, iy, seed) {
  let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

function lerp(range, t) {
  return range[0] + (range[1] - range[0]) * t;
}

function valueNoise(x, y, seed) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smooth(x - ix);
  const fy = smooth(y - iy);
  const top = lattice(ix, iy, seed) + (lattice(ix + 1, iy, seed) - lattice(ix, iy, seed)) * fx;
  const bottom =
    lattice(ix, iy + 1, seed) + (lattice(ix + 1, iy + 1, seed) - lattice(ix, iy + 1, seed)) * fx;
  return top + (bottom - top) * fy;
}

// Returns a sampler (x, y, time) => number. It doesn't need to be normalised, the
// grid is stretched to 0..1 afterwards. `time` is in seconds, already multiplied
// by the speed setting.
//
// Land: broad soft valleys, with sharp ridgelines only on the high ground.
// Each octave orbits its own slow circle instead of panning, so the terrain
// breathes and reshapes rather than sliding off the screen.
function buildTerrain({ seed, detail }) {
  const orbits = Array.from({ length: detail }, (_, i) => ({
    rate: 0.1 * (1 + i * 0.7),
    phase: i * 1.9,
    dx: 0,
    dy: 0,
  }));
  let stamp = NaN;
  return (x, y, time) => {
    // the orbit offsets only change with time, not per sample
    if (time !== stamp) {
      stamp = time;
      for (const orbit of orbits) {
        const angle = time * orbit.rate + orbit.phase;
        orbit.dx = Math.cos(angle) * ORBIT_RADIUS;
        orbit.dy = Math.sin(angle) * ORBIT_RADIUS;
      }
    }
    let rolling = 0;
    let ridged = 0;
    let amplitude = 1;
    let total = 0;
    for (let i = 0; i < detail; i++) {
      const n = valueNoise(x + orbits[i].dx, y + orbits[i].dy, seed + i * 101);
      rolling += n * amplitude;
      ridged += (1 - Math.abs(2 * n - 1)) * amplitude;
      total += amplitude;
      x *= 2;
      y *= 2;
      amplitude *= 0.5;
    }
    const height = rolling / total;
    // squaring the height keeps ridges off the lowlands
    return height + (ridged / total) * height * height * 1.5;
  };
}

const colorProbe = document.createElement("canvas");
colorProbe.width = colorProbe.height = 1;
const probeCtx = colorProbe.getContext("2d", { willReadFrequently: true });

// Resolve any CSS colour (including oklch and friends) to 8-bit RGB
function toRgb(color) {
  probeCtx.clearRect(0, 0, 1, 1);
  probeCtx.fillStyle = color;
  probeCtx.fillRect(0, 0, 1, 1);
  const [r, g, b] = probeCtx.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

// Marching squares. For each cell of the node grid and each level its corners
// straddle, add the line segment crossing it to that level's path. Crossings are
// placed by linear interpolation along the cell edge, which is what makes the
// lines smooth rather than stepped. `values` are 0..1, `paths[k]` is level k.
function traceContours(values, nodeCols, cols, rows, cell, levels, paths) {
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const i = row * nodeCols + col;
      const tl = values[i] * levels;
      const tr = values[i + 1] * levels;
      const bl = values[i + nodeCols] * levels;
      const br = values[i + nodeCols + 1] * levels;

      const first = Math.max(1, Math.floor(Math.min(tl, tr, bl, br)) + 1);
      const last = Math.min(levels - 1, Math.floor(Math.max(tl, tr, bl, br)));
      if (first > last) continue;

      const x = col * cell;
      const y = row * cell;
      for (let k = first; k <= last; k++) {
        const code = (tl >= k ? 8 : 0) | (tr >= k ? 4 : 0) | (br >= k ? 2 : 0) | (bl >= k ? 1 : 0);
        if (code === 0 || code === 15) continue;

        // where the level crosses each edge. Only the crossed edges are read
        const topX = x + (cell * (k - tl)) / (tr - tl);
        const rightY = y + (cell * (k - tr)) / (br - tr);
        const bottomX = x + (cell * (k - bl)) / (br - bl);
        const leftY = y + (cell * (k - tl)) / (bl - tl);
        const path = paths[k];

        switch (code) {
          case 1:
          case 14:
            path.moveTo(x, leftY);
            path.lineTo(bottomX, y + cell);
            break;
          case 2:
          case 13:
            path.moveTo(bottomX, y + cell);
            path.lineTo(x + cell, rightY);
            break;
          case 3:
          case 12:
            path.moveTo(x, leftY);
            path.lineTo(x + cell, rightY);
            break;
          case 4:
          case 11:
            path.moveTo(topX, y);
            path.lineTo(x + cell, rightY);
            break;
          case 5:
            path.moveTo(x, leftY);
            path.lineTo(topX, y);
            path.moveTo(bottomX, y + cell);
            path.lineTo(x + cell, rightY);
            break;
          case 6:
          case 9:
            path.moveTo(topX, y);
            path.lineTo(bottomX, y + cell);
            break;
          case 7:
          case 8:
            path.moveTo(topX, y);
            path.lineTo(x, leftY);
            break;
          case 10:
            path.moveTo(topX, y);
            path.lineTo(x + cell, rightY);
            path.moveTo(x, leftY);
            path.lineTo(bottomX, y + cell);
            break;
        }
      }
    }
  }
}

class Contour {
  constructor(container) {
    this.container = container;
    this.settings = SETTINGS;
    this.time = 0;
    this.lastFrame = 0;
    this.loop = null;
    this.sampler = null;
    this.frameCost = 0;
    this.ticks = 0;

    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute("aria-hidden", "true");
    container.prepend(this.canvas);
    this.ctx = this.canvas.getContext("2d");

    // the wash is one pixel per node, scaled up with smoothing into a soft gradient
    this.washCanvas = document.createElement("canvas");
    this.washCtx = this.washCanvas.getContext("2d");

    this.onResize = () => {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => {
        this.#layout();
        this.#render();
      }, RESIZE_DELAY);
    };
    this.onVisibility = () => this.#syncLoop();
    // the map scrolls away with the hero, don't keep rendering what nobody can see
    this.onView = new IntersectionObserver(([entry]) => {
      this.inView = entry.isIntersecting;
      this.#syncLoop();
    });
    this.inView = true;
    this.onView.observe(container);
    window.addEventListener("resize", this.onResize);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.reducedMotion.addEventListener("change", this.onVisibility);

    this.#resolveColor();
    this.#layout();
    this.#render();
    this.#syncLoop();
  }

  // Resolve the colour once rather than reading computed style and canvas
  // pixels every frame
  #resolveColor() {
    this.color = getComputedStyle(this.container).color;
    this.ink = toRgb(this.color);
  }

  // Size the canvas to a whole number of cells and stretch it over the container
  #layout() {
    const { clientWidth: width, clientHeight: height } = this.container;
    if (!width || !height) return;

    // grow the cell if the requested size would exceed the sampling budget
    const budgetCell = Math.sqrt((width * height) / MAX_CELLS);
    this.cell = Math.max(this.settings.cell, budgetCell);

    this.cols = Math.ceil(width / this.cell);
    this.rows = Math.ceil(height / this.cell);
    // a grid of cells has a node on each corner
    this.nodeCols = this.cols + 1;
    this.nodeRows = this.rows + 1;

    // drawn at device resolution so the lines stay crisp
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(this.cols * this.cell * this.dpr);
    this.canvas.height = Math.round(this.rows * this.cell * this.dpr);
    this.canvas.style.width = `${this.cols * this.cell}px`;
    this.canvas.style.height = `${this.rows * this.cell}px`;

    this.washCanvas.width = this.nodeCols;
    this.washCanvas.height = this.nodeRows;
    this.washPixels = this.washCtx.createImageData(this.nodeCols, this.nodeRows);

    this.values = new Float32Array(this.nodeCols * this.nodeRows);
    this.range = null;
  }

  #sample(dt) {
    const { seed, scale, warp, detail } = this.settings;
    const { nodeCols, nodeRows, values } = this;
    this.sampler ??= buildTerrain({ seed, detail });
    const sampler = this.sampler;
    const step = (this.cell / REFERENCE_SIZE) * scale;
    // the warp field orbits too, which is what makes the lines swim
    const warpAngle = this.time * 0.08;
    const warpX = Math.cos(warpAngle) * 0.5;
    const warpY = Math.sin(warpAngle) * 0.5;
    let min = Infinity;
    let max = -Infinity;

    for (let row = 0; row < nodeRows; row++) {
      for (let col = 0; col < nodeCols; col++) {
        let x = col * step;
        let y = row * step;
        if (warp > 0) {
          const wx = valueNoise(x * 1.7 + 11.3 + warpX, y * 1.7 + warpY, seed + 7) - 0.5;
          const wy = valueNoise(x * 1.7 + 5.1 - warpY, y * 1.7 + 37.1 + warpX, seed + 13) - 0.5;
          x += wx * warp * 2;
          y += wy * warp * 2;
        }
        const value = sampler(x, y, this.time);
        values[row * nodeCols + col] = value;
        if (value < min) min = value;
        if (value > max) max = value;
      }
    }

    // ease the range so bands don't flicker as the field moves
    if (!this.range) {
      this.range = { min, max };
    } else {
      // time-based so the easing doesn't speed up or slow down with the frame rate
      const ease = 1 - Math.exp(-RANGE_RATE * dt);
      this.range.min += (min - this.range.min) * ease;
      this.range.max += (max - this.range.max) * ease;
    }
    const rangeMin = this.range.min;
    const toUnit = 1 / (this.range.max - rangeMin || 1);
    for (let i = 0; i < values.length; i++) {
      const unit = (values[i] - rangeMin) * toUnit;
      values[i] = unit < 0 ? 0 : unit > 1 ? 1 : unit;
    }
  }

  // The wash: ink at an opacity that follows height squared, so lowlands stay
  // clear and the peaks are tinted. One pixel per node, smoothed on the way up.
  #paintWash(strength) {
    const { values, washPixels, nodeCols, nodeRows, cell, ctx } = this;
    const { data } = washPixels;
    const [r, g, b] = this.ink;
    const alpha = strength * WASH_ALPHA * 255;
    for (let i = 0, p = 0; i < values.length; i++, p += 4) {
      data[p] = r;
      data[p + 1] = g;
      data[p + 2] = b;
      data[p + 3] = values[i] * values[i] * alpha;
    }
    this.washCtx.putImageData(washPixels, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    // a node sits on a cell corner, so its pixel is centred half a pixel out
    ctx.drawImage(this.washCanvas, -cell / 2, -cell / 2, nodeCols * cell, nodeRows * cell);
  }

  // `dt` is the seconds since the last render, it only paces the range easing
  #render(dt = 0) {
    if (!this.cols) return;

    const { levels, line, wash } = this.settings;
    const { cols, rows, nodeCols, values, cell, ctx } = this;

    this.#sample(dt);

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, cols * cell, rows * cell);
    if (wash > 0) this.#paintWash(wash);

    const paths = Array.from({ length: levels }, () => new Path2D());
    traceContours(values, nodeCols, cols, rows, cell, levels, paths);

    ctx.strokeStyle = this.color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let k = 1; k < levels; k++) {
      const height = k / levels;
      const isIndex = k % INDEX_EVERY === 0;
      if (isIndex) {
        ctx.globalAlpha = HALO_ALPHA;
        ctx.lineWidth = HALO_WIDTH * line;
        ctx.stroke(paths[k]);
      }
      ctx.globalAlpha = lerp(isIndex ? INDEX_ALPHA : MINOR_ALPHA, height);
      ctx.lineWidth = (isIndex ? INDEX_WIDTH : MINOR_WIDTH) * line;
      ctx.stroke(paths[k]);
    }
    ctx.globalAlpha = 1;
  }

  get isAnimated() {
    return (
      this.settings.speed > 0 && !this.reducedMotion.matches && !document.hidden && this.inView
    );
  }

  #syncLoop() {
    if (!this.isAnimated) {
      if (this.loop) cancelAnimationFrame(this.loop);
      this.loop = null;
      return;
    }
    if (this.loop) return;

    this.lastFrame = 0;
    let pending = 0;
    const tick = (now) => {
      if (!this.lastFrame) this.lastFrame = now;
      // clamp so a backgrounded tab doesn't leap when it returns
      const dt = Math.min(now - this.lastFrame, 100) / 1000;
      this.lastFrame = now;
      this.time += dt * this.settings.speed;
      pending += dt;
      this.ticks++;

      // render every display frame, unless renders are running long. Then render
      // every other frame, counted rather than timed, so the cadence stays even
      if (this.frameCost <= FRAME_BUDGET || this.ticks % 2 === 0) {
        const start = performance.now();
        this.#render(pending);
        pending = 0;
        this.frameCost += (performance.now() - start - this.frameCost) * 0.1;
      }
      this.loop = requestAnimationFrame(tick);
    };
    this.loop = requestAnimationFrame(tick);
  }

  destroy() {
    window.removeEventListener("resize", this.onResize);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.reducedMotion.removeEventListener("change", this.onVisibility);
    clearTimeout(this.resizeTimeout);
    this.onView.disconnect();
    if (this.loop) cancelAnimationFrame(this.loop);
    this.loop = null;
    this.canvas.remove();
  }
}

let active;

function init() {
  const container = document.querySelector("[data-contour]");
  if (container) active = new Contour(container);
}

function destroy() {
  active?.destroy();
  active = undefined;
}

document.addEventListener("astro:page-load", init);
document.addEventListener("astro:before-swap", destroy);
