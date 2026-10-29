# Layout and spacing

## Spacing scale

All gaps, padding and margins between elements use `--space-*` (rem, fluid between min and max). Em-based padding inside a component is the only exception.

| Token | Size | Typical use |
| --- | --- | --- |
| `--space-3xs` | 4px | list gaps (`.explore-list`) |
| `--space-2xs` | 8px | tight gaps: tag rows, title to summary |
| `--space-xs` | 12px | list item spacing, skip-link inset |
| `--space-sm` | 16px | gaps inside a component, fieldset padding |
| `--space-md` | 24px | header padding, default `--flow-space` |
| `--space-lg` | 32px | `.prose` flow, footer padding |
| `--space-xl` | 48px | `.region` padding, space above prose headings |
| `--space-2xl` | 64px | around figures, tables and `hr` in prose |
| `--space-3xl` | 96px | exists, unused |

Pair steps (`--space-xs-sm`, `--space-sm-md`, `--space-md-lg`, `--space-lg-xl`) grow fluidly from the smaller to the larger step as the viewport widens. Use them for gaps that should breathe on desktop and tighten on phones: `--space-sm-md` for card and nav gaps, `--space-md-lg` for page gutters and grid gaps. Do not invent in-between values.

Hit-area sizes are not spacing. Tap targets are `2.75rem` (44px), written as a literal.

## Compositions

Use a composition for any arrangement of children. Each is tuned with custom properties, never with a new class.

| Class | Does | Tune with |
| --- | --- | --- |
| `wrapper` | centers content, `max-width: 80rem`, inline padding `--space-md-lg` (`--space-sm-md` from 100rem) | `--wrapper-max-width`, `--wrapper-padding-inline` |
| `region` (a utility in `utilities/region.css`, used like a composition) | vertical page-section padding, `--space-xl` | `--region-space` |
| `flow` | vertical rhythm between children, `--space-md` | `--flow-space` |
| `cluster` | wrapping row, `--space-sm` gap, centered | `--cluster-gap`, `--cluster-horizontal-alignment`, `--cluster-vertical-alignment`; `data-cluster-wrap="nowrap"` |
| `repel` | two groups pushed to opposite ends, wraps when narrow | `--repel-gap`, `--repel-direction`, `--repel-vertical-alignment` |
| `switcher` | exactly two items side by side, stack below `--switcher-inline-at` (40rem) | `--switcher-gap`, `--switcher-inline-at` |
| `grid-auto` | equal-width auto-fill grid, 16rem minimum column | `--grid-gap`, `--grid-item-min`, `--grid-placement` |
| `sidebar-layout` + `sidebar` | fixed-size sidebar beside fluid main; unused so far | `--sidebar-size`, `--sidebar-wrap-at`, `--sidebar-gap` |

`--wrapper-max-width` is `80rem`. `cube.json` also defines it as `container.4xl` (56rem), but `variables.css` loads later and wins. Change it in `variables.css`.

`.prose` overrides `--flow-space` to `--space-lg` and tunes it again for headings, figures and lists. Inside `.prose`, change `--flow-space` on the one element, not margins.

## Which composition?

```
What are the children doing?
 ├── Stacked vertically with even gaps → flow
 ├── In a wrapping row (tags, links, icons) → cluster
 ├── Two groups at opposite ends (title left, action right) → repel
 ├── Exactly two blocks, side by side when wide, stacked when narrow → switcher
 ├── A grid of equal cards that fills available width → grid-auto
 └── A page section → region (vertical padding) inside wrapper (width)
```

If none fit, write a block with a CSS grid (as `.project-list` and `.masonry-grid` do). Do not stack extra `display: flex` rules onto a composition's element.

## Page skeleton

Every page is `BaseLayout` plus sections shaped `wrapper region`. Add `prose` when the content is running text, and `flow` for the rhythm.

```html
<!-- Correct: projects.astro -->
<div class="wrapper region prose prose-w-sm flow">
  <h1>Projects</h1>
  <p>A few things I’ve built…</p>
</div>

<div class="wrapper region">
  <ul class="project-list not-prose">…</ul>
</div>

<!-- Incorrect: hand-built width, padding and spacing -->
<div style="max-width: 1100px; margin: 0 auto; padding: 40px 20px">
  <h1 style="margin-bottom: 20px">Projects</h1>
</div>
```

A short list of items (tools, skills, facts) is a plain unclassed `ul` inside `.prose`, as in `about.astro`. Do not style it as tags or cards.

Use `not-prose` on a list or element inside `.prose` that has its own block styling (`project-list`, `explore-list`, `resume__skill-list`). Why: `.prose` restyles every `ul`, `p` and heading inside it.

## Adding a page

Create `src/pages/<name>.astro` on `BaseLayout` with `title` ("Name | Sam Young") and a one-sentence `description`. Then register it by hand in two places: add `"/<name>/"` to `paths` in `src/pages/sitemap.xml.ts`, and add an entry to `navItems` in `src/data/site-data.ts` if it belongs in the header. Neither is generated.

## Breakpoints

Used today: `40rem`, `48rem`, `60rem`, `90rem`, `100rem`, all `min-width` except one `max-width: 40rem`. Prefer a composition that reflows without a query. When a query is unavoidable, pick one of these five.

`.site-head__brand` is a `container-type: inline-size` container; other blocks use viewport queries.
