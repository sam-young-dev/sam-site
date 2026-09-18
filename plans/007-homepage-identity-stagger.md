# 007 — Stagger the homepage identity block's entrance

- **Status**: DONE
- **Commit**: baa7bd8
- **Severity**: LOW
- **Category**: Missed opportunities
- **Estimated scope**: 2 files, ~25 lines added

## Problem

The homepage's identity block — the name and three role labels layered over
the puddle canvas — renders as static text with zero entrance motion. It's
the first thing a visitor sees, appearing all at once with no sense of
sequence, while the puddle canvas behind it is fully animated. This is a
missed opportunity for a brief, first-impression stagger.

```astro
<!-- src/pages/index.astro:8-17 — current -->
<BaseLayout>
  <div id="puddle-container" aria-hidden="true"></div>

  <div class="reasonable-width">
		<div class="hero-about wrapper">
			<h1>Sam Young</h1>
			<p>Developer</p>
			<p>Designer</p>
			<p>Artist</p>
		</div>
```

```css
/* src/styles/blocks/about.css:1-15 — current (full file) */
.reasonable-width {
  max-width: 80rem;
  margin-inline: auto;
}

.hero-about {
  position: relative;
  block-size: 85dvb;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  justify-content: center;
  font-size: 1.8rem;
  line-height: 2.2rem;
}
```

Note: `.hero-about` is a shared block class also used by
`src/pages/contact.astro:10` (wrapping a single `<h1>Get in touch</h1>`).
This plan must not change contact's rendering — see Boundaries.

## Target

Add a `hero-about--stagger` modifier class to the homepage's block only, and
give its four direct children (`h1`, `p`, `p`, `p`) a fade-up entrance with a
60ms stagger between each — within the audit's 30–80ms stagger range for
group entrances. Use this repo's compiled duration/easing tokens
(`src/design-tokens/motion.json`, exposed as real custom properties —
confirmed live at `src/styles/blocks/button.css:24`): `--transition-slow`
(300ms) and `--ease-out` (`cubic-bezier(0, 0, 0.2, 1)`), matching the
"entering" easing rule.

```astro
<!-- src/pages/index.astro — target -->
<BaseLayout>
  <div id="puddle-container" aria-hidden="true"></div>

  <div class="reasonable-width">
		<div class="hero-about hero-about--stagger wrapper">
			<h1>Sam Young</h1>
			<p>Developer</p>
			<p>Designer</p>
			<p>Artist</p>
		</div>
```

```css
/* src/styles/blocks/about.css — target additions, appended after .hero-about */
.hero-about--stagger > * {
  opacity: 0;
  transform: translateY(12px);
  animation: hero-about-in var(--transition-slow) var(--ease-out) forwards;
}

.hero-about--stagger > *:nth-child(1) { animation-delay: 0ms; }
.hero-about--stagger > *:nth-child(2) { animation-delay: 60ms; }
.hero-about--stagger > *:nth-child(3) { animation-delay: 120ms; }
.hero-about--stagger > *:nth-child(4) { animation-delay: 180ms; }

@keyframes hero-about-in {
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-about--stagger > * {
    transform: none;
    animation-name: hero-about-in-reduced;
  }

  @keyframes hero-about-in-reduced {
    to {
      opacity: 1;
    }
  }
}
```

## Repo conventions to follow

- Use the compiled motion custom properties (`--transition-slow`,
  `--ease-out`) rather than hand-typed values — live exemplar at
  `src/styles/blocks/button.css:24`. Do not reach for
  `src/styles/global/variables.css`'s hand-rolled `--transition-*` tokens;
  those are being deprecated by plan 003.
- This is a one-shot, page-load-only entrance (not retriggered by user
  interaction), so `@keyframes` is the correct tool here — the
  interruptibility rule (prefer transitions over keyframes) applies to
  rapidly-retriggered UI, not a single mount animation.
- Per the accessibility rule, reduced motion keeps the opacity fade (a
  four-step 0→1 crossfade, still "not zero") and only drops the vertical
  movement and, for simplicity, collapses to a single reduced keyframe name
  — the stagger delays are harmless to keep since they don't involve motion.

## Steps

1. In `src/pages/index.astro`, add the modifier class `hero-about--stagger`
   to the existing `<div class="hero-about wrapper">` so it reads
   `<div class="hero-about hero-about--stagger wrapper">`. Do not touch the
   `h1`/`p` children or any other markup.
2. In `src/styles/blocks/about.css`, append the `.hero-about--stagger > *`
   base rule, the four `:nth-child` delay rules, the `@keyframes
   hero-about-in` block, and the `@media (prefers-reduced-motion:
   reduce)` block shown in Target, directly after the existing `.hero-about`
   rule. Do not modify `.reasonable-width` or the existing `.hero-about`
   rule.

## Boundaries

- Do NOT add `hero-about--stagger` to `src/pages/contact.astro` — that
  page's single-child `.hero-about` block is out of scope for this plan.
- Do NOT change `.hero-about`'s existing layout properties (`block-size`,
  `pointer-events`, `display`, `flex-direction`, `justify-content`,
  `font-size`, `line-height`).
- Do NOT add more than 4 `:nth-child` delay rules — if `index.astro`'s
  `.hero-about--stagger` block has a different number of children than the
  4 shown above (drift since commit `baa7bd8`), STOP and report instead of
  improvising additional delay steps.
- Do NOT touch `src/lib/puddle.js` or the puddle canvas underneath this
  block.

## Verification

- **Mechanical**: `pnpm astro build` completes with no errors.
- **Feel check**: run `pnpm astro dev`, load `/`, and hard-reload a few
  times:
  - The name and three role labels fade up in sequence, top to bottom, each
    starting shortly (60ms) after the previous one — it should read as a
    quick cascade, not a single simultaneous fade or a slow, disjointed
    trickle.
  - In DevTools' Animations panel, set playback to 10% and confirm all four
    elements move only via `opacity`/`transform` (no layout shift, since
    `.hero-about` already has a fixed `block-size: 85dvb`).
  - Toggle `prefers-reduced-motion` (Rendering panel) and reload: all four
    elements still fade in from transparent, but none of them move
    vertically.
  - Load `/contact` and confirm its `.hero-about` heading appears exactly as
    before (instantly, no fade) — it must not have picked up this plan's
    modifier class.
- **Done when**: the homepage's four identity-block children animate in
  with a visible 60ms stagger, `/contact`'s `.hero-about` is unaffected, and
  reduced-motion users still get an opacity fade without vertical movement.
