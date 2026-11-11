// Zoom and pan for the project image viewer. The image fills the stage with
// object-fit: contain and is moved with one transform (origin 0 0), so a point
// p on the stage lands at translate + scale * p.

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const CLICK_SCALE = 2.5;
const STEP = 2;
const KEY_PAN = 80;
const TAP_SLOP = 6;
const DOUBLE_TAP_MS = 300;
const SWIPE_DISTANCE = 50;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * @param {HTMLElement} stage the element the image fills; receives the gestures
 * @param {HTMLImageElement} image
 * @param {{ onChange?: (scale: number) => void, onDismiss?: () => void, onSwipe?: (direction: "prev" | "next") => void }} options
 */
export function createImageZoom(stage, image, { onChange, onDismiss, onSwipe } = {}) {
  let scale = 1;
  let x = 0;
  let y = 0;

  const pointers = new Map();
  let pan = null;
  let pinch = null;
  let moved = false;
  let pinched = false;
  let lastTap = null;

  function layout() {
    const { width: W, height: H } = stage.getBoundingClientRect();
    const nw = image.naturalWidth || W;
    const nh = image.naturalHeight || H;
    const fit = Math.min(W / nw, H / nh);
    const cw = nw * fit;
    const ch = nh * fit;
    return { W, H, cw, ch, ox: (W - cw) / 2, oy: (H - ch) / 2 };
  }

  // Keeps the photo's edges past the stage's edges, or centred on an axis
  // where the zoomed photo is still narrower than the stage
  function clampAxis(t, size, content, offset) {
    // Closed dialog or photo not loaded yet: nothing to measure
    if (!(content > 0)) return 0;
    if (scale * content <= size) return (1 - scale) * (size / 2);
    return clamp(t, size - scale * (offset + content), -scale * offset);
  }

  function commit(animate) {
    const { W, H, cw, ch, ox, oy } = layout();
    x = clampAxis(x, W, cw, ox);
    y = clampAxis(y, H, ch, oy);
    if (animate) image.dataset.animate = "";
    else delete image.dataset.animate;
    image.style.transform =
      scale === 1 ? "" : `translate(${x}px, ${y}px) scale(${scale})`;
    stage.dataset.zoomed = String(scale > 1);
    onChange?.(scale);
  }

  function zoomTo(next, clientX, clientY, animate) {
    const rect = stage.getBoundingClientRect();
    const px = (clientX ?? rect.left + rect.width / 2) - rect.left;
    const py = (clientY ?? rect.top + rect.height / 2) - rect.top;
    next = clamp(next, MIN_SCALE, MAX_SCALE);
    const k = next / scale;
    // Hold the point under the cursor (or the centre) still while scaling
    x = px - (px - x) * k;
    y = py - (py - y) * k;
    scale = next;
    commit(animate);
  }

  function isOnPhoto(clientX, clientY) {
    const rect = stage.getBoundingClientRect();
    const { cw, ch, ox, oy } = layout();
    const px = (clientX - rect.left - x) / scale;
    const py = (clientY - rect.top - y) / scale;
    return px >= ox && px <= ox + cw && py >= oy && py <= oy + ch;
  }

  function toggleAt(clientX, clientY) {
    if (scale > 1) zoomTo(1, clientX, clientY, true);
    else zoomTo(CLICK_SCALE, clientX, clientY, true);
  }

  function startPan(point) {
    pan = { startX: point.x, startY: point.y, x, y };
  }

  function startPinch() {
    const [a, b] = [...pointers.values()];
    const rect = stage.getBoundingClientRect();
    pinch = {
      dist: Math.hypot(b.x - a.x, b.y - a.y) || 1,
      scale,
      // The photo point under the fingers' midpoint, in unscaled coordinates
      qx: ((a.x + b.x) / 2 - rect.left - x) / scale,
      qy: ((a.y + b.y) / 2 - rect.top - y) / scale,
    };
    pan = null;
    pinched = true;
    // Lets other gestures on the stage (drag to dismiss) stand down
    stage.dataset.pinching = "";
  }

  stage.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.target.closest("button")) return;
    stage.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      moved = false;
      pinched = false;
      startPan(pointers.get(e.pointerId));
    } else if (pointers.size === 2) {
      moved = true;
      startPinch();
    }
  });

  stage.addEventListener("pointermove", (e) => {
    const point = pointers.get(e.pointerId);
    if (!point) return;
    point.x = e.clientX;
    point.y = e.clientY;

    if (pinch && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const rect = stage.getBoundingClientRect();
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      scale = clamp((pinch.scale * dist) / pinch.dist, MIN_SCALE, MAX_SCALE);
      x = (a.x + b.x) / 2 - rect.left - pinch.qx * scale;
      y = (a.y + b.y) / 2 - rect.top - pinch.qy * scale;
      commit(false);
      return;
    }

    if (!pan) return;
    const dx = e.clientX - pan.startX;
    const dy = e.clientY - pan.startY;
    if (!moved && Math.hypot(dx, dy) < TAP_SLOP) return;
    moved = true;
    if (scale === 1) return;
    stage.dataset.dragging = "";
    x = pan.x + dx;
    y = pan.y + dy;
    commit(false);
  });

  function release(e) {
    if (!pointers.delete(e.pointerId)) return;
    if (pinch) {
      if (pointers.size < 2) {
        pinch = null;
        delete stage.dataset.pinching;
      }
      // One finger left after a pinch: carry on panning from where it is
      if (pointers.size === 1) startPan([...pointers.values()][0]);
      return;
    }
    if (pointers.size > 0) return;
    const dx = pan ? e.clientX - pan.startX : 0;
    const dy = pan ? e.clientY - pan.startY : 0;
    pan = null;
    delete stage.dataset.dragging;
    if (e.type === "pointercancel") return;

    // A sideways flick on an unzoomed photo moves to the neighbouring one
    if (moved) {
      const isSwipe =
        onSwipe &&
        !pinched &&
        scale === 1 &&
        e.pointerType !== "mouse" &&
        Math.abs(dx) > SWIPE_DISTANCE &&
        Math.abs(dx) > Math.abs(dy) * 1.5;
      if (isSwipe) onSwipe(dx < 0 ? "next" : "prev");
      return;
    }

    const onPhoto = isOnPhoto(e.clientX, e.clientY);
    if (e.pointerType === "mouse") {
      if (onPhoto || scale > 1) toggleAt(e.clientX, e.clientY);
      else onDismiss?.();
      return;
    }

    // Touch: a single tap would fight with double-tap, so only a tap on the
    // empty area dismisses, and two quick taps on the photo zoom
    const now = performance.now();
    const isDouble =
      lastTap &&
      now - lastTap.time < DOUBLE_TAP_MS &&
      Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < TAP_SLOP * 4;
    if (isDouble) {
      lastTap = null;
      toggleAt(e.clientX, e.clientY);
    } else if (!onPhoto && scale === 1) {
      onDismiss?.();
    } else {
      lastTap = { time: now, x: e.clientX, y: e.clientY };
    }
  }

  stage.addEventListener("pointerup", release);
  stage.addEventListener("pointercancel", release);

  // Trackpad pinch arrives as ctrl+wheel with small deltas; a mouse wheel
  // without ctrl gets a gentler rate per notch
  stage.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const delta = e.deltaY * (e.deltaMode === 1 ? 16 : 1);
      const rate = e.ctrlKey ? 0.01 : 0.002;
      zoomTo(scale * Math.exp(-delta * rate), e.clientX, e.clientY, false);
    },
    { passive: false },
  );

  // Safari fires its own pinch gesture alongside pointer events
  stage.addEventListener("gesturestart", (e) => e.preventDefault());

  // Entering or leaving fullscreen resizes the stage: keep the same photo
  // point in the middle of the view instead of snapping back
  let size = null;
  new ResizeObserver(() => {
    const next = layout();
    if (size && size.cw > 0 && scale > 1) {
      const qx = ((size.W / 2 - x) / scale - size.ox) / size.cw;
      const qy = ((size.H / 2 - y) / scale - size.oy) / size.ch;
      x = next.W / 2 - scale * (next.ox + qx * next.cw);
      y = next.H / 2 - scale * (next.oy + qy * next.ch);
      commit(false);
    }
    size = next;
  }).observe(stage);

  return {
    get scale() {
      return scale;
    },
    min: MIN_SCALE,
    max: MAX_SCALE,
    zoomIn: () => zoomTo(scale * STEP, undefined, undefined, true),
    zoomOut: () => zoomTo(scale / STEP, undefined, undefined, true),
    reset() {
      scale = 1;
      x = 0;
      y = 0;
      pointers.clear();
      pan = pinch = lastTap = null;
      delete stage.dataset.dragging;
      delete stage.dataset.pinching;
      commit(false);
      size = layout();
    },
    /** Re-fits the current zoom to the image's real proportions once it loads. */
    refresh() {
      commit(false);
      size = layout();
    },
    /** Arrow keys pan a zoomed photo; returns true when it handled the key. */
    panBy(dx, dy) {
      if (scale === 1) return false;
      x += dx * KEY_PAN;
      y += dy * KEY_PAN;
      commit(true);
      return true;
    },
  };
}
