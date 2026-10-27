// Draws the contour lines of a scalar field onto a coarse grid of squares,
// like a topographic map rendered in pixels.
//
// Each cell samples the field, the value is quantised into bands, and a cell
// is inked when a neighbour sits in a different band. Every few levels the
// line is an "index" contour, drawn stronger like on a real map.
//
// The canvas bitmap is one pixel per cell, scaled up with CSS
// (image-rendering: pixelated), so a frame is a single putImageData.

import { DEFAULTS, FIELDS, KNOBS, PALETTES } from "./contour-config.js";

// field coordinates are measured against a fixed 1000px reference, so a
// given scale looks the same on a phone and a monitor
const REFERENCE_SIZE = 1000;
const INDEX_EVERY = 4;
const LINE_ALPHA = 0.55;
const SHADE_STRENGTH = 0.35;
const RESIZE_DELAY = 150;
// ~30fps, the field is slow so more frames buy nothing
const FRAME_INTERVAL = 33;
// stops a tiny cell size on a huge screen from sampling millions of cells
const MAX_CELLS = 200000;
// how fast the normalisation range follows the field as it moves
const RANGE_EASE = 0.08;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lattice(ix, iy, seed) {
  let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function smooth(t) {
  return t * t * (3 - 2 * t);
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

function fbm(x, y, seed, octaves, ridged) {
  let sum = 0;
  let amplitude = 1;
  let total = 0;
  for (let i = 0; i < octaves; i++) {
    let n = valueNoise(x, y, seed + i * 101);
    if (ridged) n = 1 - Math.abs(2 * n - 1);
    sum += n * amplitude;
    total += amplitude;
    x *= 2;
    y *= 2;
    amplitude *= 0.5;
  }
  return sum / total;
}

// Each builder takes the settings and returns a sampler (x, y, time) => number.
// Samplers don't need to be normalised, the grid is stretched to 0..1 afterwards.
// `time` is in seconds, already multiplied by the speed knob.
const FIELD_BUILDERS = {
  noise:
    ({ seed, detail }) =>
    (x, y, time) =>
      fbm(x + time * 0.06, y + time * 0.03, seed, detail, false),

  ridges:
    ({ seed, detail }) =>
    (x, y, time) =>
      fbm(x + time * 0.06, y + time * 0.03, seed, detail, true),

  hills: ({ seed, detail }) => {
    const random = mulberry32(seed);
    const count = 3 + detail * 2;
    const hills = Array.from({ length: count }, () => ({
      x: random() * 3,
      y: random() * 3,
      radius: 0.25 + random() * 0.6,
      height: 0.4 + random() * 0.6,
      // each hill wanders on its own slow loop
      rate: 0.15 + random() * 0.25,
      phase: random() * Math.PI * 2,
    }));
    return (x, y, time) => {
      let sum = 0;
      for (const hill of hills) {
        const angle = time * hill.rate + hill.phase;
        const dx = x - (hill.x + Math.sin(angle) * 0.4);
        const dy = y - (hill.y + Math.cos(angle * 0.8) * 0.4);
        sum += hill.height * Math.exp(-(dx * dx + dy * dy) / (2 * hill.radius * hill.radius));
      }
      return sum;
    };
  },

  waves: ({ seed, detail }) => {
    const random = mulberry32(seed);
    const waves = Array.from({ length: detail + 1 }, () => {
      const angle = random() * Math.PI * 2;
      const frequency = 1.5 + random() * 3;
      return {
        dx: Math.cos(angle) * frequency,
        dy: Math.sin(angle) * frequency,
        phase: random() * Math.PI * 2,
        rate: (random() - 0.5) * 0.8,
      };
    });
    return (x, y, time) => {
      let sum = 0;
      for (const wave of waves) {
        sum += Math.sin(x * wave.dx + y * wave.dy + wave.phase + time * wave.rate);
      }
      return sum;
    };
  },
};

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

// ImageData is little-endian RGBA, so a packed pixel is 0xAABBGGRR
function pack([r, g, b], alpha) {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

class Contour {
  constructor(container, settings) {
    this.container = container;
    this.settings = { ...DEFAULTS, ...settings };
    this.time = 0;
    this.lastFrame = 0;
    this.loop = null;

    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    // two layers: a one-pixel-per-cell wash underneath, and the dots on top
    this.canvas = document.createElement("canvas");
    this.dots = document.createElement("canvas");
    for (const layer of [this.canvas, this.dots]) layer.setAttribute("aria-hidden", "true");
    container.prepend(this.dots);
    container.prepend(this.canvas);
    this.ctx = this.canvas.getContext("2d");
    this.dotsCtx = this.dots.getContext("2d");

    this.onResize = () => {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => {
        this.#layout();
        this.#render();
      }, RESIZE_DELAY);
    };
    this.onVisibility = () => this.#syncLoop();
    window.addEventListener("resize", this.onResize);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.reducedMotion.addEventListener("change", this.onVisibility);

    this.container.dataset.palette = this.settings.palette;
    this.#layout();
    this.#render();
    this.#syncLoop();
  }

  update(changes) {
    const previous = this.settings;
    this.settings = { ...previous, ...changes };
    this.container.dataset.palette = this.settings.palette;

    // a different field or seed has a different range, don't ease from the old one
    if (changes.field || changes.seed || changes.detail) this.range = null;
    if (changes.cell) this.#layout();

    this.#render();
    this.#syncLoop();
  }

  reseed() {
    this.update({ seed: Math.floor(Math.random() * 1e6) });
    return this.settings.seed;
  }

  // Size the one-pixel-per-cell bitmap and stretch it over the container
  #layout() {
    const { clientWidth: width, clientHeight: height } = this.container;
    if (!width || !height) return;

    // grow the cell if the requested size would exceed the sampling budget
    const budgetCell = Math.sqrt((width * height) / MAX_CELLS);
    this.cell = Math.max(this.settings.cell, budgetCell);

    this.cols = Math.ceil(width / this.cell);
    this.rows = Math.ceil(height / this.cell);
    this.canvas.width = this.cols;
    this.canvas.height = this.rows;
    this.canvas.style.width = `${this.cols * this.cell}px`;
    this.canvas.style.height = `${this.rows * this.cell}px`;

    // dots are drawn at device resolution so small circles stay round
    this.dpr = window.devicePixelRatio || 1;
    this.dots.width = Math.round(this.cols * this.cell * this.dpr);
    this.dots.height = Math.round(this.rows * this.cell * this.dpr);
    this.dots.style.width = this.canvas.style.width;
    this.dots.style.height = this.canvas.style.height;

    this.image = this.ctx.createImageData(this.cols, this.rows);
    this.pixels = new Uint32Array(this.image.data.buffer);
    this.values = new Float32Array(this.cols * this.rows);
    this.bands = new Uint8Array(this.cols * this.rows);
    this.range = null;
  }

  #sample() {
    const { field, seed, scale, warp, detail } = this.settings;
    const { cols, rows, values } = this;
    const sampler = FIELD_BUILDERS[field]({ seed, detail });
    const step = (this.cell / REFERENCE_SIZE) * scale;
    // warp field drifts too, which is what makes the lines swim rather than slide
    const warpTime = this.time * 0.1;
    let min = Infinity;
    let max = -Infinity;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        let x = col * step;
        let y = row * step;
        if (warp > 0) {
          const wx = valueNoise(x * 1.7 + 11.3 + warpTime, y * 1.7, seed + 7) - 0.5;
          const wy = valueNoise(x * 1.7, y * 1.7 + 37.1 - warpTime, seed + 13) - 0.5;
          x += wx * warp * 2;
          y += wy * warp * 2;
        }
        const value = sampler(x, y, this.time);
        values[row * cols + col] = value;
        if (value < min) min = value;
        if (value > max) max = value;
      }
    }

    // ease the range so bands don't flicker as the field moves
    if (!this.range) {
      this.range = { min, max };
    } else {
      this.range.min += (min - this.range.min) * RANGE_EASE;
      this.range.max += (max - this.range.max) * RANGE_EASE;
    }
    const span = this.range.max - this.range.min || 1;
    for (let i = 0; i < values.length; i++) {
      values[i] = Math.max(0, Math.min(1, (values[i] - this.range.min) / span));
    }
  }

  #render() {
    if (!this.cols) return;

    const { levels, shading, dotSize } = this.settings;
    const { cols, rows, values, bands, pixels, cell } = this;

    this.#sample();

    const color = getComputedStyle(this.container).color;
    const rgb = toRgb(color);
    const radius = (cell * dotSize) / 2;
    const linePath = new Path2D();
    const indexPath = new Path2D();
    // one precomputed wash per band, higher ground is denser
    const wash = Array.from({ length: levels }, (_, band) =>
      pack(rgb, shading * (band / levels) * SHADE_STRENGTH),
    );

    for (let i = 0; i < values.length; i++) {
      bands[i] = Math.min(levels - 1, Math.floor(values[i] * levels));
    }

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const index = row * cols + col;
        const band = bands[index];

        // boundary level shared with the right and lower neighbours
        const right = col + 1 < cols ? bands[index + 1] : band;
        const below = row + 1 < rows ? bands[index + cols] : band;
        const rightLevel = right !== band ? Math.max(band, right) : 0;
        const belowLevel = below !== band ? Math.max(band, below) : 0;

        if (rightLevel || belowLevel) {
          const isIndex =
            (rightLevel && rightLevel % INDEX_EVERY === 0) ||
            (belowLevel && belowLevel % INDEX_EVERY === 0);
          // the contour itself is a dot, the wash layer stays clear here
          pixels[index] = 0;
          const path = isIndex ? indexPath : linePath;
          const cx = (col + 0.5) * cell;
          const cy = (row + 0.5) * cell;
          path.moveTo(cx + radius, cy);
          path.arc(cx, cy, radius, 0, Math.PI * 2);
        } else {
          pixels[index] = wash[band];
        }
      }
    }

    this.ctx.putImageData(this.image, 0, 0);

    const dots = this.dotsCtx;
    dots.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    dots.clearRect(0, 0, this.cols * cell, this.rows * cell);
    dots.fillStyle = color;
    dots.globalAlpha = LINE_ALPHA;
    dots.fill(linePath);
    dots.globalAlpha = 1;
    dots.fill(indexPath);
  }

  get isAnimated() {
    return this.settings.speed > 0 && !this.reducedMotion.matches && !document.hidden;
  }

  #syncLoop() {
    if (!this.isAnimated) {
      if (this.loop) cancelAnimationFrame(this.loop);
      this.loop = null;
      return;
    }
    if (this.loop) return;

    this.lastFrame = 0;
    const tick = (now) => {
      if (!this.lastFrame) this.lastFrame = now;
      const elapsed = now - this.lastFrame;
      if (elapsed >= FRAME_INTERVAL) {
        this.lastFrame = now;
        // clamp so a backgrounded tab doesn't leap when it returns
        this.time += (Math.min(elapsed, 100) / 1000) * this.settings.speed;
        this.#render();
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
    if (this.loop) cancelAnimationFrame(this.loop);
    this.loop = null;
    this.canvas.remove();
    this.dots.remove();
  }
}

const COPY_RESET_DELAY = 1600;

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // clipboard API needs a secure context, fall back to a hidden textarea
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

function formatValue(key, value) {
  const knob = KNOBS.find((item) => item.key === key);
  return knob && knob.step < 1 ? Number(value).toFixed(2) : String(value);
}

let active;

function init() {
  const container = document.querySelector("[data-contour]");
  if (!container) return;

  const panel = document.querySelector("[data-contour-panel]");
  const contour = new Contour(container, DEFAULTS);

  const controller = new AbortController();
  const { signal } = controller;

  function syncPanel(seed) {
    if (!panel) return;
    const seedOutput = panel.querySelector("[data-contour-seed]");
    if (seedOutput) seedOutput.textContent = String(seed);
  }

  // a click on the map is a new composition
  contour.dots.addEventListener("click", () => syncPanel(contour.reseed()), { signal });

  if (panel) {
    syncPanel(contour.settings.seed);

    panel.addEventListener(
      "input",
      (event) => {
        const { name, value, type } = event.target;
        if (!name) return;
        const parsed = type === "range" ? Number(value) : value;
        contour.update({ [name]: parsed });
        const output = panel.querySelector(`[data-contour-output="${name}"]`);
        if (output) output.textContent = formatValue(name, parsed);
      },
      { signal },
    );

    const copyButton = panel.querySelector("[data-contour-copy]");
    const copyLabel = copyButton?.querySelector("[data-contour-copy-label]");
    let copyTimeout;
    copyButton?.addEventListener(
      "click",
      async () => {
        const ok = await copyText(JSON.stringify(contour.settings, null, 2));
        copyLabel.textContent = ok ? "Copied" : "Copy failed";
        clearTimeout(copyTimeout);
        copyTimeout = setTimeout(() => {
          copyLabel.textContent = "Copy settings";
        }, COPY_RESET_DELAY);
      },
      { signal },
    );

    panel
      .querySelector("[data-contour-reseed]")
      ?.addEventListener("click", () => syncPanel(contour.reseed()), { signal });
  }

  active = {
    destroy() {
      controller.abort();
      contour.destroy();
    },
  };
}

function destroy() {
  active?.destroy();
  active = undefined;
}

document.addEventListener("astro:page-load", init);
document.addEventListener("astro:before-swap", destroy);

export { FIELDS, PALETTES };
export default Contour;
