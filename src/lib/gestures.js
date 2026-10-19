// Small helpers for gesture-driven motion: momentum projection, rubber-banding,
// and a critically damped spring that can inherit release velocity.

export function project(velocity, decelerationRate = 0.998) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

export function rubberband(overshoot, dimension, constant = 0.55) {
  const sign = Math.sign(overshoot);
  const abs = Math.abs(overshoot);
  return (sign * (abs * dimension * constant)) / (dimension + constant * abs);
}

export const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Animates a number from `from` to `to`, starting at `velocity` (units/s).
 * Critically damped (no overshoot). Returns a cancel function.
 */
export function spring({ from, to, velocity = 0, response = 0.4, onUpdate, onDone }) {
  if (prefersReducedMotion()) {
    onUpdate(to);
    onDone?.();
    return () => {};
  }
  const omega = (2 * Math.PI) / response;
  let x = from;
  let v = velocity;
  let last = performance.now();
  let raf = 0;
  let cancelled = false;

  const tick = (now) => {
    if (cancelled) return;
    let remaining = Math.min((now - last) / 1000, 0.064);
    last = now;
    while (remaining > 0) {
      const dt = Math.min(remaining, 1 / 240);
      const a = -omega * omega * (x - to) - 2 * omega * v;
      v += a * dt;
      x += v * dt;
      remaining -= dt;
    }
    if (Math.abs(x - to) < 0.5 && Math.abs(v) < 5) {
      onUpdate(to);
      onDone?.();
      return;
    }
    onUpdate(x);
    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);
  return () => {
    cancelled = true;
    cancelAnimationFrame(raf);
  };
}

/** Tracks recent pointer samples so release velocity reflects the last ~100ms. */
export function createVelocityTracker() {
  let samples = [];
  return {
    reset() {
      samples = [];
    },
    add(x, y) {
      const t = performance.now();
      samples.push({ x, y, t });
      samples = samples.filter((s) => t - s.t < 100);
    },
    velocity() {
      if (samples.length < 2) return { x: 0, y: 0 };
      const a = samples[0];
      const b = samples[samples.length - 1];
      const dt = (b.t - a.t) / 1000;
      return dt > 0 ? { x: (b.x - a.x) / dt, y: (b.y - a.y) / dt } : { x: 0, y: 0 };
    },
  };
}
