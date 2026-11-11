# Actions: buttons, links, icon controls, tags

Four shared pieces: `.button`, `.round-button`, `.expand-button`, and the link treatments (unclassed `a`, `.link-underline`, `.press`). Every one has a 44px hit area, a press scale on `:active` and gated hover. Copy that pattern from `button.css` for anything new.

## Which one do I use?

```
Does it go to another page or file?
 ├── Yes
 │    ├── Is it a standalone call to action at the end of a section? → .button
 │    ├── Is it a link inside a sentence? → plain <a> in .prose
 │    ├── Is it a "← Back to…" link? → <a class="… link-underline press">
 │    └── Is it a nav item? → inside .site-head nav / .site-foot .nav (already styled)
 └── No, it does something on this page
      ├── Is it icon-only and circular (close, previous, next)? → <button class="round-button">
      ├── Is it an icon plus a text label under an image? → <ExpandButton />
      └── Is it a filter or tag link? → use the block's own tag class (see Tags)
```

## Button

Use for the call to action on a page. Navigation inside a sentence is a plain link, not a button. Icon-only controls are `.round-button`.

Today `.button` is always an `<a>`. Add `target="_blank" rel="noopener noreferrer"` for external URLs.

Variants, set with `data-button-variant`: omit it, `secondary`, `border`. Nothing else works. `brand` is defined in `button.css` but renders identically to the default, so do not use it.

- **default (no attribute)** — the single most important action in the view: "View live site", "Download PDF". One per view. Why: two filled ink buttons side by side means nothing has priority.
- `secondary` — the second action beside a default button (the repo link). Dark neutral fill.
- `border` — outlined, for navigation CTAs that point to a sibling listing: "Browse all photos", "Browse by collection". It sits directly under the page intro (`photography.astro`, `collections.astro`), not at the page bottom. This is the default for a CTA that is not the page's main action.

```
Is it the most important action on the screen?
 ├── Yes → no data-button-variant
 └── No
      ├── Does it sit beside a default button? → data-button-variant="secondary"
      └── Default → data-button-variant="border"
```

```html
<!-- Correct: projects/[slug].astro and photography.astro -->
<a class="button" href={project.links.live}>View live site</a>
<a class="button" data-button-variant="secondary" href={project.links.repo}>…</a>
<a href="/collections/" class="button" data-button-variant="border">Browse by collection</a>

<!-- Incorrect: ghost doesn't exist; two defaults in one view; <div> as a button -->
<a class="button" data-button-variant="ghost" href="/projects/">Projects</a>
<a class="button" href="/a">Live</a> <a class="button" href="/b">Repo</a>
<div class="button" onclick="…">Expand</div>
```

Label text is sentence case in markup; the block uppercases it. Do not type it in caps.

## Round button

Use for icon-only circular controls: lightbox close, previous and next photo. Size comes from `--round-button-size` (default `2.5rem`; overlays set `2.75rem`, the photo nav `3.25rem` on phones). A control with text is a `.button` or `.expand-button`.

It floats over photography, so it is the one element with a shadow and a `--background-light` fill. Always give it an `aria-label`.

```html
<!-- Correct: components/core/ZoomStage.astro -->
<button type="button" class="round-button" data-action="close" aria-label={closeLabel}>
  <span class="zoom-stage__icon" set:html={CloseIcon} />
</button>

<!-- Incorrect: unlabeled, and a custom circle instead of the block -->
<button class="close" style="border-radius: 50%">×</button>
```

## Full-screen image viewer

Any overlay that shows one image large uses `<ZoomStage />` (`components/core/ZoomStage.astro`), wired with `setupZoomStage()` from `src/lib/zoom-stage.js`. It brings zoom and pan, fullscreen, the round-button toolbar (zoom out, zoom in, fullscreen, close) and, with `nav`, previous/next buttons. Its CSS is the `zoom-stage` block. The project page puts it in a `<dialog class="image-viewer">`; the photography page puts it in `.photo-lightbox`. Do not build a second toolbar or zoom handler.

A disabled round button inside it (zoom out at 1×, previous on a group's first image) inverts: `--scrim` fill, `--stroke-solid` ring, `--color-decorative-stroke` icon, no shadow. Why: the first attempt, `--color-fill-normal` on the cream disc, was too close to the enabled look to read as disabled.

Previous/next on the project page step through one gallery group (`.gallery-grid`) and stop at its ends. They never jump to an image in another group, and a standalone image shows no arrows.

## Expand button

Use for an icon and label under or beside an image that opens it larger. Use `<ExpandButton label="…" id="…" />` (`components/core/ExpandButton.astro`). It is quiet text (`--text-quiet`) that darkens to `--text-ink` on hover. Pass `decorative` only when a neighboring control already does the job.

## Links

- **In `.prose`:** a plain `<a>`. Underlined always; dims to 0.7 opacity on hover.
- **Outside `.prose`, no class:** a plain `<a>`. The underline grows left to right on hover.
- **A link that needs a class** (to position it): add `link-underline` to get the same growing underline, and `press` for press feedback. Always use them together on back links.

A back link is the first child of its `wrapper region`, outside any `.prose`. Why: `.prose a` forces a permanent underline and removes the background gradient, which breaks `link-underline`. Each detail page has its own `<block>__back` class for spacing (`project-detail__back`, `collection-detail__back`, `photo-detail__back`); on a new page with no such class, let `flow` space it.

`.press` is for text-sized links and chips. Cards press with their own `--press-scale-sm` rule (motion.md).

## Tags

There is no shared tag component. Three block-local versions exist, so reuse the one in the block you are editing:

- `.project-card__stack li` — square, uppercase, not interactive
- `.photo-detail__tag` — pill, link, with `press`
- `.resume__skill-tag` — pill, not interactive

Do not add a fourth look.
