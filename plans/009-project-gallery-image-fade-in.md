# 009 — Fade in project detail gallery images as they finish loading

- **Status**: TODO
- **Commit**: d47a6aa
- **Severity**: LOW
- **Category**: Missed opportunities
- **Estimated scope**: 2 files, ~20 lines changed

## Problem

On a project detail page, gallery images are `loading="lazy"` and have no
reveal. They pop in at full opacity the moment they decode. The project list
cards, collection cards and masonry grid already fade in on load (plans 006
and its siblings), so the detail pages are the one place images still pop.

```astro
<!-- src/pages/projects/[slug].astro:103-111 — current -->
                    <Image
                      src={image.src}
                      widths={[500, 900, 1400, 2000]}
                      sizes="(min-width: 48rem) 80vw, 100vw"
                      format="avif"
                      quality={85}
                      alt={image.alt}
                      loading="lazy"
                      class="project-detail__gallery-image"
                    />
```

```css
/* src/styles/blocks/project-detail.css:132-137 — current */
.project-detail__gallery-image {
  display: block;
  width: 100%;
  height: auto;
  border: var(--stroke-solid);
}
```

Trap: two later rules set `transition` on this same element and would
silently override a new opacity transition, because `transition` is a
shorthand and the last matching declaration wins:

```css
/* src/styles/blocks/project-detail.css:155-161 — current */
@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
  .project-detail__zoom .project-detail__gallery-image {
    transition:
      transform var(--transition-normal) var(--ease-out),
      filter var(--transition-normal) var(--ease-out);
  }
}

/* src/styles/blocks/project-detail.css:179-184 — current */
@media (prefers-reduced-motion: no-preference) {
  .project-detail__zoom .project-detail__gallery-image {
    transition:
      transform var(--transition-normal) var(--ease-out),
      filter var(--transition-normal) var(--ease-out);
  }
```

## Target

Opacity fade only: no translate, no scale. These are large images the user
reads and the zoom hover already owns `transform`, so the reveal stays on
`opacity` alone. Duration is `--transition-slow` (300ms) with `--ease-out`
(`cubic-bezier(0, 0, 0.2, 1)`), identical to the existing card images.
Reduced-motion users keep the fade (gentle, not zero). Images are hidden only
when scripting is enabled, so no-JS visitors still see them.

```astro
<!-- src/pages/projects/[slug].astro — target -->
                    <Image
                      src={image.src}
                      widths={[500, 900, 1400, 2000]}
                      sizes="(min-width: 48rem) 80vw, 100vw"
                      format="avif"
                      quality={85}
                      alt={image.alt}
                      loading="lazy"
                      class="project-detail__gallery-image"
                      onload="this.classList.add('is-loaded')"
                    />
```

```css
/* src/styles/blocks/project-detail.css — target */
.project-detail__gallery-image {
  display: block;
  width: 100%;
  height: auto;
  border: var(--stroke-solid);
  transition: opacity var(--transition-slow) var(--ease-out);
}

@media (scripting: enabled) {
  .project-detail__gallery-image {
    opacity: 0;
  }

  .project-detail__gallery-image.is-loaded {
    opacity: 1;
  }
}

/* in BOTH existing transition lists (lines ~157 and ~181), add opacity first: */
    transition:
      opacity var(--transition-slow) var(--ease-out),
      transform var(--transition-normal) var(--ease-out),
      filter var(--transition-normal) var(--ease-out);
```

## Repo conventions to follow

- Exemplar: `src/styles/blocks/projects.css:40-50` (`.project-card__image`
  with `opacity: 0`, a `--transition-slow` / `--ease-out` transition, and
  `.is-loaded { opacity: 1 }`), paired with
  `onload="this.classList.add('is-loaded')"` at `src/pages/projects.astro:30`.
- Use the compiled tokens (`--transition-slow`, `--ease-out`); do not
  hand-type `300ms` or a cubic-bezier, and do not add anything to
  `src/styles/global/variables.css`.
- Keep the new fade outside any `prefers-reduced-motion` media query so it
  survives for reduced-motion users.

## Steps

1. In `src/pages/projects/[slug].astro`, add
   `onload="this.classList.add('is-loaded')"` as the last attribute of the
   `<Image ... class="project-detail__gallery-image" />` element (around
   line 111). Change nothing else in the element.
2. In `src/styles/blocks/project-detail.css`, add
   `transition: opacity var(--transition-slow) var(--ease-out);` to the
   `.project-detail__gallery-image` rule (line 132).
3. Directly after that rule, add the `@media (scripting: enabled)` block from
   Target (the `opacity: 0` rule and the `.is-loaded` rule).
4. In the two existing `transition:` lists on
   `.project-detail__zoom .project-detail__gallery-image` (inside the
   hover/fine-pointer media query and inside the
   `prefers-reduced-motion: no-preference` media query), insert
   `opacity var(--transition-slow) var(--ease-out),` as the first entry.
   Leave `.project-detail__zoom:active ... transition-duration` as is.

## Boundaries

- Do NOT touch `.image-viewer`, `.image-viewer__image` or the expand script
  in `[slug].astro`; the lightbox uses its own element.
- Do NOT touch `.project-detail__placeholder`, `ExpandButton`, or any other
  image on the site.
- Do NOT add `transform`, blur or stagger to the reveal.
- Do NOT add JS modules, IntersectionObserver or dependencies; the inline
  `onload` is the whole mechanism.
- If the code doesn't match the excerpts above (drift since `d47a6aa`), STOP
  and report instead of improvising.

## Verification

- **Mechanical**: `pnpm astro build` completes with no errors.
- **Feel check**: run `pnpm astro dev`, open a project with a gallery
  (`/projects/<slug>`), throttle to "Fast 3G" and scroll:
  - Each gallery image fades in over about 300ms and never pops.
  - Hovering a loaded image still scales to 1.02 and brightens in 150ms, and
    pressing it still dips to 0.985. The opacity transition must not have
    knocked out the transform or filter transitions.
  - Hard-reload with cached images and reload through the site's nav (client
    router): images must still end up visible. If one stays at `opacity: 0`,
    the `load` event was missed, so report it instead of patching around it.
  - Disable JavaScript in DevTools: images are visible immediately.
  - Toggle `prefers-reduced-motion` (Rendering panel): the fade remains, and
    the hover scale does not.
  - Layout must not shift: confirm in the Performance panel that no layout
    shift occurs as images reveal.
- **Done when**: gallery images transition from `opacity: 0` to `1` on load,
  the existing hover and press feedback is unchanged, no-JS users still see
  images, and no other image on the site is affected.
