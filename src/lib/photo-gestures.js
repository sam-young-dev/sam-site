import { project, spring, createVelocityTracker } from "./gestures.js";

const HYSTERESIS = 10;

// Swipe the photo sideways to move to the next/previous photo. The photo
// follows the finger 1:1, and the release velocity decides commit vs. return.
function setupSwipe() {
  const image = document.querySelector(".photo-detail__image");
  if (!image || image.dataset.swipeReady) return;
  image.dataset.swipeReady = "1";

  const tracker = createVelocityTracker();
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let x = 0;
  let dragging = false;
  let intent = null;
  let cancelSpring = () => {};
  let suppressClick = false;

  const hasLink = (dir) => Boolean(document.getElementById(`photo-detail-${dir}`));

  const render = (value) => {
    x = value;
    image.style.translate = `${value}px 0`;
  };

  image.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") return;
    cancelSpring(); // grab it mid-flight: continue from the on-screen value
    dragging = true;
    intent = null;
    startX = e.clientX;
    lastX = e.clientX;
    startY = e.clientY;
    tracker.reset();
    tracker.add(e.clientX, e.clientY);
  });

  image.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (!intent) {
      if (Math.abs(dx) < HYSTERESIS && Math.abs(dy) < HYSTERESIS) return;
      intent = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (intent === "x") image.setPointerCapture(e.pointerId);
    }
    if (intent !== "x") return;
    suppressClick = true;
    tracker.add(e.clientX, e.clientY);

    // No photo on that side: resist progressively instead of following 1:1.
    // Applied per-delta so it stays continuous when grabbed mid-flight.
    let delta = e.clientX - lastX;
    lastX = e.clientX;
    const edge = x + delta < 0 ? !hasLink("next") : !hasLink("prev");
    if (edge && Math.sign(delta) === Math.sign(x + delta)) {
      const width = image.getBoundingClientRect().width;
      delta *= 0.55 * (1 - Math.min(Math.abs(x) / (width * 0.5), 0.9));
    }
    render(x + delta);
  });

  const end = () => {
    if (!dragging) return;
    dragging = false;
    if (intent !== "x") return;
    const width = image.getBoundingClientRect().width;
    const velocity = tracker.velocity().x;
    const projected = x + project(velocity, 0.99);
    const link = document.getElementById(projected < 0 ? "photo-detail-next" : "photo-detail-prev");
    if (Math.abs(projected) > width * 0.35 && link) {
      const target = Math.sign(projected) * (width + 40);
      cancelSpring = spring({
        from: x,
        to: target,
        velocity,
        response: 0.3,
        onUpdate: render,
        onDone: () => link.click(),
      });
    } else {
      cancelSpring = spring({
        from: x,
        to: 0,
        velocity,
        onUpdate: render,
        onDone: () => (image.style.translate = ""),
      });
    }
  };
  image.addEventListener("pointerup", end);
  image.addEventListener("pointercancel", end);

  // A swipe shouldn't also count as a tap that opens the lightbox.
  image.addEventListener(
    "click",
    (e) => {
      if (suppressClick) {
        e.stopImmediatePropagation();
        suppressClick = false;
      }
    },
    true,
  );
}

// Drag the lightbox image down (or up) to dismiss. The scrim fades as you drag.
function setupDismiss() {
  const lightbox = document.getElementById("photo-lightbox");
  const image = lightbox?.querySelector(".photo-lightbox__image");
  if (!lightbox || !image || lightbox.dataset.dismissReady) return;
  lightbox.dataset.dismissReady = "1";

  const tracker = createVelocityTracker();
  let startY = 0;
  let y = 0;
  let dragging = false;
  let moved = false;
  let cancelSpring = () => {};

  const render = (value) => {
    y = value;
    image.style.translate = `0 ${value}px`;
    const progress = Math.min(Math.abs(value) / (window.innerHeight * 0.6), 1);
    lightbox.style.opacity = String(1 - progress * 0.7);
  };

  const reset = () => {
    image.style.translate = "";
    lightbox.style.opacity = "";
    lightbox.style.transition = "";
    y = 0;
  };

  image.addEventListener("pointerdown", (e) => {
    cancelSpring();
    dragging = true;
    moved = false;
    startY = e.clientY - y;
    tracker.reset();
    tracker.add(e.clientX, e.clientY);
    lightbox.style.transition = "none";
  });

  image.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dy = e.clientY - startY;
    if (!moved) {
      if (Math.abs(dy - y) < HYSTERESIS) return;
      moved = true;
      image.setPointerCapture(e.pointerId);
    }
    tracker.add(e.clientX, e.clientY);
    render(dy);
  });

  const end = () => {
    if (!dragging) return;
    dragging = false;
    if (!moved) {
      lightbox.style.transition = "";
      return;
    }
    const velocity = tracker.velocity().y;
    const projected = y + project(velocity, 0.99);
    const h = window.innerHeight;
    if (Math.abs(projected) > h * 0.25) {
      cancelSpring = spring({
        from: y,
        to: Math.sign(projected) * h,
        velocity,
        response: 0.3,
        onUpdate: render,
        onDone: () => {
          window.__photoLightbox?.close();
          lightbox.style.display = "none";
          reset();
        },
      });
    } else {
      cancelSpring = spring({ from: y, to: 0, velocity, onUpdate: render, onDone: reset });
    }
  };
  image.addEventListener("pointerup", end);
  image.addEventListener("pointercancel", end);
  // Clicking the image itself must not fall through to the backdrop-close handler.
  image.addEventListener("click", (e) => e.stopPropagation());
}

document.addEventListener("astro:page-load", () => {
  setupSwipe();
  setupDismiss();
});
