// Shared by the Contour component markup (server) and the contour engine (client),
// so the panel controls and the engine defaults can't drift apart.

export const FIELDS = {
  hills: "Hills",
  noise: "Noise",
  ridges: "Ridges",
  waves: "Waves",
};

export const PALETTES = {
  stone: "Stone",
  ink: "Ink",
  amber: "Amber",
};

// Numeric knobs, rendered as range inputs in the panel.
export const KNOBS = [
  { key: "cell", label: "Cell size", min: 2, max: 40, step: 1 },
  { key: "levels", label: "Levels", min: 4, max: 30, step: 1 },
  { key: "scale", label: "Scale", min: 0.5, max: 6, step: 0.1 },
  { key: "detail", label: "Detail", min: 1, max: 5, step: 1 },
  { key: "warp", label: "Warp", min: 0, max: 2, step: 0.05 },
  { key: "dotSize", label: "Dot size", min: 0.2, max: 1.5, step: 0.05 },
  { key: "shading", label: "Shading", min: 0, max: 1, step: 0.05 },
  { key: "speed", label: "Speed", min: 0, max: 3, step: 0.05 },
];

export const DEFAULTS = {
  field: "ridges",
  palette: "ink",
  seed: 783098,
  cell: 2,
  levels: 16,
  scale: 1.8,
  detail: 3,
  warp: 1.45,
  dotSize: 0.8,
  shading: 0.5,
  speed: 0.45,
};
