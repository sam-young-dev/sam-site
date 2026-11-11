// Wires a <ZoomStage /> (components/core/ZoomStage.astro): zoom and pan,
// toolbar buttons, keyboard shortcuts, fullscreen, and optional prev/next.

import { createImageZoom } from "./image-zoom.js";

// Older Safari only has the prefixed Fullscreen API; iPhone Safari has
// neither for non-video elements, so the button stays hidden there
const fullscreenElement = () =>
  document.fullscreenElement ?? document.webkitFullscreenElement ?? null;
const fullscreenEnabled = () =>
  Boolean(document.fullscreenEnabled || document.webkitFullscreenEnabled);

function exitFullscreen() {
  if (!fullscreenElement()) return;
  if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
  else document.webkitExitFullscreen?.();
}

function enterFullscreen(el) {
  if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  else el.webkitRequestFullscreen?.();
}

function syncFullscreenButtons() {
  for (const button of document.querySelectorAll('.zoom-stage [data-action="fullscreen"]')) {
    const active = fullscreenElement() === button.closest(".zoom-stage");
    button.dataset.state = active ? "exit" : "enter";
    button.setAttribute("aria-label", active ? "Exit fullscreen" : "Enter fullscreen");
  }
}

// Module scripts run once per session, so these never stack across navigations
document.addEventListener("fullscreenchange", syncFullscreenButtons);
document.addEventListener("webkitfullscreenchange", syncFullscreenButtons);

const PAN_KEYS = {
  ArrowLeft: [1, 0],
  ArrowRight: [-1, 0],
  ArrowUp: [0, 1],
  ArrowDown: [0, -1],
};

/**
 * @param {HTMLElement} stage the .zoom-stage element
 * @param {{
 *   onClose: () => void,
 *   onNavigate?: (direction: "prev" | "next") => void,
 * }} options
 */
export function setupZoomStage(stage, { onClose, onNavigate }) {
  const image = stage.querySelector(".zoom-stage__image");
  const button = (action) => stage.querySelector(`[data-action="${action}"]`);
  const zoomIn = button("zoom-in");
  const zoomOut = button("zoom-out");
  const fullscreen = button("fullscreen");
  const prev = button("prev");
  const next = button("next");

  // A focused button that turns disabled drops focus to <body>, which would
  // end keyboard control of the viewer. Takes a pair of [button, disabled]:
  // enables first, then hands focus from a newly disabled button to its
  // partner, or to the stage when both are disabled.
  const setPairDisabled = ([a, aOff], [b, bOff]) => {
    const pairs = [[a, aOff, b], [b, bOff, a]].filter(([el]) => el);
    for (const [el, off] of pairs) if (!off) el.disabled = false;
    for (const [el, off, partner] of pairs) {
      if (!off || el.disabled) continue;
      const hadFocus = document.activeElement === el;
      el.disabled = true;
      if (hadFocus) (partner && !partner.disabled ? partner : stage).focus();
    }
  };

  let canGo = { prev: false, next: false };
  const navigate = (direction) => {
    if (onNavigate && canGo[direction]) onNavigate(direction);
  };

  const zoom = createImageZoom(stage, image, {
    onChange(scale) {
      setPairDisabled([zoomOut, scale <= zoom.min], [zoomIn, scale >= zoom.max]);
    },
    onDismiss: onClose,
    onSwipe: onNavigate ? navigate : undefined,
  });

  fullscreen.hidden = !fullscreenEnabled();
  syncFullscreenButtons();

  stage.addEventListener("click", (e) => {
    const action = e.target.closest("[data-action]")?.dataset.action;
    if (action === "zoom-in") zoom.zoomIn();
    else if (action === "zoom-out") zoom.zoomOut();
    else if (action === "fullscreen") {
      if (fullscreenElement() === stage) exitFullscreen();
      else enterFullscreen(stage);
    } else if (action === "close") onClose();
    else if (action === "prev" || action === "next") navigate(action);
  });

  stage.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "+" || e.key === "=") zoom.zoomIn();
    else if (e.key === "-") zoom.zoomOut();
    else if (e.key === "0") zoom.reset();
    else if (e.key === "f" && !fullscreen.hidden) fullscreen.click();
    else if (e.key in PAN_KEYS) {
      // Arrows pan a zoomed photo; unzoomed, left and right change photo
      if (!zoom.panBy(...PAN_KEYS[e.key])) {
        if (e.key === "ArrowLeft") navigate("prev");
        else if (e.key === "ArrowRight") navigate("next");
        else return;
      }
    } else return;
    e.preventDefault();
  });

  return {
    image,
    reset: () => zoom.reset(),
    refresh: () => zoom.refresh(),
    /** Call when the viewer closes, so the next open starts unzoomed and windowed. */
    close() {
      zoom.reset();
      if (fullscreenElement() === stage) exitFullscreen();
    },
    /** Shows prev/next when there is a neighbour in either direction, disabling an end. */
    setNav(state) {
      canGo = state;
      const show = state.prev || state.next;
      if (prev) prev.hidden = !show;
      if (next) next.hidden = !show;
      setPairDisabled([prev, !state.prev], [next, !state.next]);
    },
  };
}
