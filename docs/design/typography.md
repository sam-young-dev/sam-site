# Typography

Two families. `--font-body` and `--font-heading` are both Cabinet Grotesk. `--font-mono` is DM Mono, used for `figcaption`, `code`, `kbd` and `samp` and nothing else. `--font-serif` compiles but is unused: do not use it.

## Size scale

Sizes are fluid `--size-step-*` tokens (rem, shown min-max). Use only the steps below. The rest of the scale (`-2`, `2`, `7`-`10`) compiles but no component uses it.

| Token | Size | Use |
| --- | --- | --- |
| `--size-step--1` | 14px | captions, tags, metadata, expand-button. **Nothing goes smaller.** |
| `--size-step-0` | 15-16px | UI text: buttons, nav, `small` |
| `--size-step-1` | 16-18px | body (set on `body`), card titles |
| `--size-step-3` | 20-24px | `h4`-`h6`, `.end-mark` |
| `--size-step-4` | 24-30px | `h3`, hero lines |
| `--size-step-5` | 28-36px | `h2` |
| `--size-step-6` | 32-48px | `h1` |

`h1`-`h4` get their size, tracking and `max-width` from `global.css`. Do not set `font-size` on a heading in a block. The one exception is a heading used at body size inside a card (`.project-card__title`: `--size-step-1`, `letter-spacing: 0`).

## Weight

Use `--font-weight-normal` (400), `--font-weight-medium` (500) or `--font-weight-bold` (700). Those are the three faces preloaded in `BaseLayout.astro`.

- 400: body text.
- 500: labels, `dt`, `var`, blockquote text, field labels.
- 700: buttons, nav, `th`, display text.
- `--font-weight-semibold` (600) appears only inside `.prose` (headings, `strong`). No 600 face is declared, so it renders as the 700 face. Do not use it elsewhere expecting a middle weight.

## Italics do not exist

No italic face is loaded and `font-synthesis: none` is set on `body`. Emphasis is weight 500 or 700, never `font-style: italic` or `<em>` styling. Why: a missing face should fail visibly, not get a browser-slanted fake.

## Uppercase labels

Buttons, header nav and project stack tags are uppercase. They always carry both declarations:

```css
text-transform: uppercase;
letter-spacing: var(--uppercase-kerning); /* 0.04ch */
```

Everything else is sentence case. Why: caps without tracking crowd; caps on long text are unreadable.

## Tracking and leading

| Text | `letter-spacing` | `line-height` |
| --- | --- | --- |
| `h1` | `-0.02em` | `--leading-heading` (1) |
| `h2` | `-0.015em` | `--leading-heading` |
| `h3` | `-0.01em` | `--leading-heading` |
| body, prose paragraphs | 0 | `--leading-body` (1.5) |
| buttons, nav, uppercase labels | `--uppercase-kerning` | `--leading-none` (1) |

Tracking tightens as type grows. Hero display text hard-codes `line-height` 1.05-1.2 in `home.css`; that is the only place.

## Line length

- `.prose` paragraphs, lists and captions: `max-width: 70ch`.
- `.prose.prose-w-sm`: 45ch. Use it for short intro and contact blocks.
- Headings: 35ch (`h1`: 20ch).
- Headings get `text-wrap: balance`; prose gets `text-wrap: pretty`.

Why: past about 75 characters a line loses the reader on the return sweep.

## Which size is it?

```
Is it a heading?
 ├── Yes → use h1-h4. Size comes from global.css. Do not override it.
 └── No
      ├── Is it a caption, tag, count or metadata? → --size-step--1
      ├── Is it text inside a button, nav link or label? → --size-step-0
      └── Default → inherit (--size-step-1 from body)
```

```html
<!-- Correct: index.astro -->
<div class="content region prose prose-w-sm flow">
  <h2>Howdy!</h2>
  <p>I’m a software engineer…</p>
</div>

<!-- Incorrect: heading sized by hand, italic emphasis, text below the 14px floor -->
<h2 style="font-size: 28px">Howdy!</h2>
<p><em>I’m a software engineer…</em></p>
<small style="font-size: 11px">Nashville</small>
```
