# Motion

Motion confirms input or eases a change of state. It is short, uses ease-out, and never decorates. Hover is a hint, press is a confirmation, fades smooth an appearance.

## Tokens

| Token | Value | Use |
| --- | --- | --- |
| `--transition-fast` | 75ms | press scale (`:active`) |
| `--transition-normal` | 150ms | hover: color, filter, underline growth, card scale |
| `--transition-slow` | 300ms | appearances: image fade-in, overlays, lightbox, stagger |
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | every transition (38 uses) |

`--transition-bounce`, `--ease-bounce`, `--ease-in` and `--ease-in-out` compile but nothing uses them. Do not use them. Why: ease-out starts fast, so the UI answers the input immediately; a bounce reads as playful and the rest of the site is not.

Animate only `transform`, `opacity`, `filter`, `color` and `background-size`. Never `transition: all`, never `width`, `height`, `margin` or `top`. Why: those five stay off the layout path and can't cause reflow.

## The three gates

**Hover** only fires where a pointer can hover. Without the gate, a tap leaves the element stuck in its hover state.

```css
@media (hover: hover) and (pointer: fine) {
  .button:hover { filter: brightness(105%); }
}
```

**Transitions** only run for users who have not asked for reduced motion. The state change still happens; it just doesn't animate.

```css
@media (prefers-reduced-motion: no-preference) {
  .button {
    transition:
      filter var(--transition-normal) var(--ease-out),
      transform var(--transition-fast) var(--ease-out);
  }
}
```

**Press** feedback fires on `:active` (press, not release) and applies to touch too. It lives inside the reduced-motion gate.

```css
@media (prefers-reduced-motion: no-preference) {
  .button:active { transform: scale(var(--press-scale-md)); }
}
```

## Press scale

| Token | Scale | Use |
| --- | --- | --- |
| `--press-scale-sm` | 0.985 | large surfaces: gallery tiles, masonry photos, collection and about cards |
| `--press-scale-md` | 0.97 | text-sized targets: buttons, links, nav, expand-button |
| `--press-scale-lg` | 0.96 | small round controls: `.round-button`, photo nav |

Nothing goes below 0.95; it reads as exaggerated. Why three steps: a bigger surface moves more pixels at the same scale, so it needs a smaller change.

Exception today: `.project-card__link` uses `--press-scale-lg` on a large card. Follow the table for new work.

## Hover effects in use

- Buttons: `filter: brightness(105%)`.
- Text controls: color shifts from `--text-quiet` to `--text-ink`.
- Links: underline grows from 0 to 100% (`background-size`), 150ms.
- Project cards: `scale(101%)` on hover and on `:focus-visible`.
- List links (`.explore-list a`): `translateX(0.25rem)`. Keep the nudge in the `:hover:active` rule so the link doesn't slide back while pressed.

## Appearing content

- **Images** fade in when loaded: `opacity: 0` with `transition: opacity var(--transition-slow) var(--ease-out)`, revealed by `[data-state="loaded"]`. Wrap it in `@media (scripting: enabled)` so no-JS users still see the image. `img[data-state="error"]` stays visible.
- **Stagger**: children get `--i` (1, 2, 3) and `animation-delay: calc(var(--i, 0) * 60ms)`, `--transition-slow`, `translateY(0.5rem)` to none. The LCP element (the h1) is never staggered. Reduced motion keeps the fade and drops the slide.
- **Overlays** (`dialog`, lightbox): fade the backdrop and settle the image from `scale(0.96)` over `--transition-slow`; use `@starting-style` and `allow-discrete` on `display` and `overlay` so the exit animates too.

## Should this animate?

```
Does it respond to input the user just made (press, hover, focus)?
 ├── Yes → transition it. Hover in --transition-normal, press in --transition-fast.
 └── No
      ├── Is it content appearing (image load, overlay open)? → --transition-slow, opacity first
      └── Default → don't animate it. Decorative motion is a bug here.
```

```css
/* Correct: gated, ease-out, tokens, transform only */
@media (prefers-reduced-motion: no-preference) {
  .press { transition: transform var(--transition-fast) var(--ease-out); }
  .press:active { transform: scale(var(--press-scale-md)); }
}

/* Incorrect: ungated, layout property, raw values, bounce, below the 0.95 floor */
.card { transition: all 300ms ease-in-out; }
.card:hover { margin-top: -4px; }
.card:active { transform: scale(0.9); transition-timing-function: var(--ease-bounce); }
```
