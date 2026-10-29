// Draws the contour lines of a scalar field onto a coarse grid of squares,
// like a topographic map rendered in pixels.
//
// Each cell samples the field and measures how far it sits from the nearest
// band boundary. Close cells get a dot, sized by that distance so a line glides
// across the grid. Every few levels the line is an "index" contour, drawn
// stronger like on a real map.
//
// Between the lines, a lattice of shading dots in three tones (page colour, a
// mid tone, ink) gives the height. Everything is drawn as dots onto one canvas.

import { DEFAULTS, FIELDS, KNOBS, PALETTES } from "./contour-config.js";

// field coordinates are measured against a fixed 1000px reference, so a
// given scale looks the same on a phone and a monitor
const REFERENCE_SIZE = 1000;
const INDEX_EVERY = 4;
const LINE_ALPHA = 0.55;
// shading dots sit one per block of this many cells, a full dot per cell
// would be a solid fill and cost four times the arcs
const SHADE_STRIDE = 2;
// how far each shading tone reaches into its neighbour, in tone units
const TONE_BLEND = 0.25;
const RESIZE_DELAY = 150;
// a render slower than this (ms, smoothed) drops the loop to every other frame,
// an even 30fps beats a 60fps that stutters
const FRAME_BUDGET = 12;
// stops a tiny cell size on a huge screen from sampling millions of cells
const MAX_CELLS = 200000;
// how fast the normalisation range follows the field as it moves, per second
const RANGE_RATE = 2.5;
// a line fades out this many cells from its contour, so dots grow and shrink
// as a line passes instead of popping on and off
const LINE_REACH = 0.8;
// flat ground has no gradient, keep the distance maths from blowing up there
const GRADIENT_FLOOR = 0.15;
// line dots fainter than this are invisible, skip them
const MIN_COVERAGE = 0.05;
// dots smaller than this (px) don't register, skip the arc
const MIN_RADIUS = 0.15;

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

function addDot(path, cx, cy, radius) {
  if (radius < MIN_RADIUS) return;
  path.moveTo(cx + radius, cy);
  path.arc(cx, cy, radius, 0, Math.PI * 2);
}

// How much of a tone a shading dot shows, given its distance from that tone's
// centre in tone units (a tone is one unit wide). Full inside the tone, easing to
// nothing a little past its edge, so at a boundary both tones sit at half size.
function toneWeight(distance) {
  const t = (distance - (0.5 - TONE_BLEND)) / (2 * TONE_BLEND);
  return 1 - smooth(Math.max(0, Math.min(1, t)));
}

// Resolve any CSS colour (including oklch and friends) to 8-bit RGB
function toRgb(color) {
  probeCtx.clearRect(0, 0, 1, 1);
  probeCtx.fillStyle = color;
  probeCtx.fillRect(0, 0, 1, 1);
  const [r, g, b] = probeCtx.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

class Contour {
  constructor(container, settings) {
    this.container = container;
    this.settings = { ...DEFAULTS, ...settings };
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
    this.#resolveColor();
    this.#layout();
    this.#render();
    this.#syncLoop();
  }

  update(changes) {
    const previous = this.settings;
    this.settings = { ...previous, ...changes };
    this.container.dataset.palette = this.settings.palette;
    this.#resolveColor();

    // a different field or seed has a different range, don't ease from the old one
    if (changes.field || changes.seed || changes.detail) {
      this.range = null;
      this.sampler = null;
    }
    if (changes.cell) this.#layout();

    this.#render();
    this.#syncLoop();
  }

  reseed() {
    this.update({ seed: Math.floor(Math.random() * 1e6) });
    return this.settings.seed;
  }

  // The palette only changes through update(), so resolve the colours here
  // rather than reading computed style and canvas pixels every frame
  #resolveColor() {
    const style = getComputedStyle(this.container);
    this.color = style.color;
    // the mid tone sits halfway between ink and the page colour behind the canvas
    const ink = toRgb(this.color);
    const page = toRgb(style.backgroundColor);
    this.midColor = `rgb(${ink.map((channel, i) => Math.round((channel + page[i]) / 2)).join(" ")})`;
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

    // dots are drawn at device resolution so small circles stay round
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(this.cols * this.cell * this.dpr);
    this.canvas.height = Math.round(this.rows * this.cell * this.dpr);
    this.canvas.style.width = `${this.cols * this.cell}px`;
    this.canvas.style.height = `${this.rows * this.cell}px`;

    this.values = new Float32Array(this.cols * this.rows);
    this.coverages = new Float32Array(this.cols * this.rows);
    this.range = null;
  }

  #sample(dt) {
    const { field, seed, scale, warp, detail } = this.settings;
    const { cols, rows, values } = this;
    // builders can be costly (hills seeds a random set), build once per settings change
    this.sampler ??= FIELD_BUILDERS[field]({ seed, detail });
    const sampler = this.sampler;
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
      // time-based so the easing doesn't speed up or slow down with the frame rate
      const ease = 1 - Math.exp(-RANGE_RATE * dt);
      this.range.min += (min - this.range.min) * ease;
      this.range.max += (max - this.range.max) * ease;
    }
    const span = this.range.max - this.range.min || 1;
    for (let i = 0; i < values.length; i++) {
      values[i] = Math.max(0, Math.min(1, (values[i] - this.range.min) / span));
    }
  }

  // `dt` is the seconds since the last render, it only paces the range easing
  #render(dt = 0) {
    if (!this.cols) return;

    const { levels, shading, dotSize } = this.settings;
    const { cols, rows, values, coverages, cell } = this;

    this.#sample(dt);

    const maxRadius = (cell * dotSize) / 2;
    const linePath = new Path2D();
    const indexPath = new Path2D();
    const midPath = new Path2D();
    const inkPath = new Path2D();

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const index = row * cols + col;
        const level = values[index] * levels;

        // distance, in cells, to the nearest band boundary. Measuring it rather
        // than testing "is a neighbour in another band" lets a line fade through
        // a cell, so it glides across the grid instead of hopping a cell at a time
        const boundary = Math.round(level);
        let coverage = 0;
        if (boundary > 0 && boundary < levels) {
          const gx =
            (values[col + 1 < cols ? index + 1 : index] - values[col > 0 ? index - 1 : index]) *
            levels *
            0.5;
          const gy =
            (values[row + 1 < rows ? index + cols : index] -
              values[row > 0 ? index - cols : index]) *
            levels *
            0.5;
          const gradient = Math.max(Math.sqrt(gx * gx + gy * gy), GRADIENT_FLOOR);
          const distance = Math.abs(level - boundary) / gradient;
          coverage = Math.max(0, 1 - distance / LINE_REACH);
        }

        coverages[index] = coverage;

        if (coverage > MIN_COVERAGE) {
          const path = boundary % INDEX_EVERY === 0 ? indexPath : linePath;
          addDot(path, (col + 0.5) * cell, (row + 0.5) * cell, maxRadius * smooth(coverage));
        }
      }
    }

    // Shading: a sparser lattice of dots, one per block of cells. Each block is
    // one of three tones by height. Background, mid and ink.
    // Neighbouring tones overlap and trade size (see toneWeight), so a dot swells
    // in as the next tone takes over, rather than flipping colour.
    // Background-tone dots are the page colour, so drawing them would change
    // nothing, they're simply left out.
    const shadeRadius = ((cell * SHADE_STRIDE) / 2) * shading;
    if (shadeRadius > 0) {
      for (let row = 0; row < rows; row += SHADE_STRIDE) {
        for (let col = 0; col < cols; col += SHADE_STRIDE) {
          // leave a clear halo around the contour lines
          let nearLine = 0;
          for (let r = row; r < Math.min(row + SHADE_STRIDE, rows); r++) {
            for (let c = col; c < Math.min(col + SHADE_STRIDE, cols); c++) {
              nearLine = Math.max(nearLine, coverages[r * cols + c]);
            }
          }
          const open = 1 - nearLine;
          if (open <= 0) continue;

          const height = values[row * cols + col] * 3;
          const cx = (col + SHADE_STRIDE / 2) * cell;
          const cy = (row + SHADE_STRIDE / 2) * cell;
          addDot(midPath, cx, cy, shadeRadius * open * toneWeight(Math.abs(height - 1.5)));
          // the top tone holds all the way up, it has no higher neighbour to hand over to
          addDot(inkPath, cx, cy, shadeRadius * open * toneWeight(Math.max(0, 2.5 - height)));
        }
      }
    }

    // paint low to high so the ink sits over the mid tone it is replacing
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, cols * cell, rows * cell);
    ctx.fillStyle = this.midColor;
    ctx.fill(midPath);
    ctx.fillStyle = this.color;
    ctx.fill(inkPath);
    ctx.globalAlpha = LINE_ALPHA;
    ctx.fill(linePath);
    ctx.globalAlpha = 1;
    ctx.fill(indexPath);
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
    if (this.loop) cancelAnimationFrame(this.loop);
    this.loop = null;
    this.canvas.remove();
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
  contour.canvas.addEventListener("click", () => syncPanel(contour.reseed()), { signal });

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
