import type { ImageMetadata } from "astro";

import hyperliteHome from "../assets/projects/hyperlite/home.png";
import hyperliteCategory from "../assets/projects/hyperlite/category.png";
import hyperliteProduct from "../assets/projects/hyperlite/product.png";
import hyperliteCart from "../assets/projects/hyperlite/cart.png";
import hyperliteLighthouse from "../assets/projects/hyperlite/lighthouse-report.png";

import portfolioPuddle from "../assets/projects/portfolio-site/home-puddle.png";
import portfolioPhotoExif from "../assets/projects/portfolio-site/photo-exif.png";
import portfolioPhotographyIndex from "../assets/projects/portfolio-site/photography-index.png";

export interface ProjectImage {
  src: ImageMetadata;
  alt: string;
  caption?: string;
}

export type ProjectContentBlock =
  | { type: "text"; html: string }
  | { type: "image"; image: ProjectImage };

export interface Project {
  slug: string;
  title: string;
  summary: string;
  year: string;
  stack: string[];
  links: {
    live?: string;
    repo?: string;
  };
  content: ProjectContentBlock[];
  cover: ProjectImage;
}

export const projects: Project[] = [
  {
    slug: "ecommerce-store",
    title: "Ecommerce Store",
    summary:
      "A hiking-gear ecommerce storefront built to learn headless commerce with Astro, Sanity, and Snipcart.",
    year: "2026",
    stack: ["Astro", "Sanity.io", "Snipcart", "Netlify"],
    links: {
      live: "https://hyperlite.netlify.app/",
      repo: "https://github.com/sam-young-dev/hyperlite-ecommerce",
    },
    content: [
      {
        type: "text",
        html: "Hyperlite is a storefront modeled closely on Hyperlite Mountain Gear, an ultralight backpacking brand. The content and products are a deliberate clone rather than an original brand. The goal wasn't to design a store from scratch, it was to learn how the pieces of a headless ecommerce stack fit together without also having to invent a catalog.",
      },
      {
        type: "image",
        image: {
          src: hyperliteHome,
          alt: "Hyperlite Mountain Gear homepage with a full-width photo collage hero and category navigation.",
          caption: "Homepage hero and category navigation.",
        },
      },
      {
        type: "text",
        html: "Astro renders the storefront as fast, mostly-static HTML. Product, category, and page content live in Sanity.io as structured content, so the catalog can change without touching code. Snipcart is layered on top for cart state and checkout, which meant working within a client-side commerce widget instead of writing custom cart logic. The site is built and hosted on Netlify.",
      },
      {
        type: "image",
        image: {
          src: hyperliteCategory,
          alt: "Backpacks category page listing three ultralight packs with pricing.",
          caption: "Category listing page, pulled from Sanity.",
        },
      },
      {
        type: "text",
        html: "The build covers a product catalog split across categories (backpacks, tents, sleep, and accessories) and individual product pages with pricing and details pulled from Sanity.",
      },
      {
        type: "image",
        image: {
          src: hyperliteProduct,
          alt: "Southwest backpack product page with price, specs, image gallery, and an add to cart button.",
          caption: "Product detail page with Snipcart add-to-cart.",
        },
      },
      {
        type: "text",
        html: 'On top of that sits a working cart and checkout flow through Snipcart (Snipcart kept in test mode, but payments will succeed with test card 4242424242424242. See <a href="https://docs.snipcart.com/v3/testing/payments" target="_blank" rel="noopener noreferrer">docs</a> for more).',
      },
      {
        type: "image",
        image: {
          src: hyperliteCart,
          alt: "Snipcart cart summary showing the Southwest backpack, quantity, and checkout total.",
          caption: "Cart summary and checkout, handled entirely by Snipcart.",
        },
      },
      {
        type: "text",
        html: "Every Netlify deploy preview runs a Lighthouse report and gives a build preview to check before merging into main, which turned performance into something to verify on every change rather than an afterthought. Chasing good Lighthouse scores across a client-side cart widget and image-heavy product pages was one of the bigger lessons of the project.",
      },
      {
        type: "image",
        image: {
          src: hyperliteLighthouse,
          alt: "Lighthouse report from a Netlify deploy preview showing performance, accessibility, best practices, and SEO scores.",
          caption:
            "Lighthouse report generated on a Netlify deploy preview, part of tuning the site for performance before merging to production.",
        },
      },
      {
        type: "text",
        html: 'Product photography was the biggest single drag on those scores, so I swapped Astro\'s built-in image handling for <a href="https://unpic.pics/img/astro/" target="_blank" rel="noopener noreferrer">@unpic/astro</a>. It detects the CDN an image is served from and generates the right responsive srcset, sizes, and layout for it automatically, so product images pulled from Sanity\'s image CDN get properly optimized variants without hand-rolling breakpoints for every image on the site.',
      },
      {
        type: "text",
        html: 'I also used the project as a chance to try <a href="https://sugarcube.sh/" target="_blank" rel="noopener noreferrer">Sugarcube</a> for design tokens instead of hand-writing CSS variables. Colors, spacing, and type scale are defined once as tokens and Sugarcube generates the CSS variables and utility classes from them, so a change to a token (a brand color, a spacing step) propagates everywhere it\'s used instead of needing a find-and-replace across stylesheets. That matters more on a storefront than it sounds. Category pages, product pages, and cart UI all need to look like the same brand, and tokens keep them from drifting apart as the site grows.',
      },
    ],
    cover: {
      src: hyperliteHome,
      alt: "Hyperlite Mountain Gear homepage with a full-width photo collage hero and category navigation.",
    },
  },
  {
    slug: "portfolio-site",
    title: "This Site",
    summary:
      "My own portfolio, built with Astro. A place to show photography and projects, and an excuse to sweat details like a canvas ripple animation and build-time EXIF metadata.",
    year: "2026",
    stack: ["Astro", "TypeScript", "exifr", "Netlify"],
    links: {
      live: "https://samyoung.dev/",
      repo: "https://github.com/sam-young-dev/sam-site",
    },
    content: [
      {
        type: "text",
        html: "This is the site you're on. It's an Astro build for photography, a couple of art/side projects, and a resume. It's mostly static, so pages ship as fast HTML with only the interactive pieces (the puddle background, the photo lightbox) shipping their own JS.",
      },
      {
        type: "image",
        image: {
          src: portfolioPuddle,
          alt: "Homepage of the portfolio site showing a dot-grid canvas background rippling outward from mouse movement.",
          caption: "The puddle background mid-ripple, rendered to a single canvas instead of thousands of DOM nodes.",
        },
      },
      {
        type: "text",
        html: 'The rippling dot grid on the homepage started from <a href="https://batmannair.com/puddle.js/" target="_blank" rel="noopener noreferrer">Puddle.js</a>, which renders each grid cell as its own DOM element. A typical viewport needs 1,000 to 4,500 or more cells, more elements and style recalculations than a browser can update at 60fps, so I rewrote it to render the whole grid to a single &lt;canvas&gt;, tracking force values in flat Float32Arrays and only redrawing cells whose neighbors changed on each tick. I leaned on <a href="https://emilkowal.ski/" target="_blank" rel="noopener noreferrer">Emil Kowalski</a>\'s writing on UI feel to tune it afterward: ripple strength that scales with screen size, snapping small forces to zero so ripples settle cleanly instead of trailing off forever, and respecting prefers-reduced-motion.',
      },
      {
        type: "text",
        html: "The photography section reads real EXIF data out of each JPEG at build time with exifr: camera, lens, focal length, aperture, shutter speed, ISO, and GPS coordinates. It formats that data for display next to the photo. The data comes straight from the file, so adding a new photo means dropping in a JPEG, not hand-typing camera settings.",
      },
      {
        type: "image",
        image: {
          src: portfolioPhotoExif,
          alt: "Photo detail page showing a mountain landscape alongside EXIF metadata: date, camera, lens, focal length, aperture, shutter speed, and ISO.",
          caption: "EXIF metadata read from the JPEG at build time and rendered next to each photo.",
        },
      },
      {
        type: "text",
        html: "The rest is the usual accumulation of small decisions: chasing down Lighthouse warnings across every page, re-encoding a folder of multi-megabyte camera JPEGs down to something that loads quickly without looking compressed, and a handful of passes on the header, footer, and layout to get the site feeling less like a template and more like a specific, considered place.",
      },
      {
        type: "image",
        image: {
          src: portfolioPhotographyIndex,
          alt: "Photography index page showing a masonry grid of landscape and hiking photos.",
          caption: "The photography index, a masonry grid over the same photo set.",
        },
      },
    ],
    cover: {
      src: portfolioPuddle,
      alt: "Homepage of the portfolio site showing a dot-grid canvas background rippling outward from mouse movement.",
    },
  },
];

export function getProject(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug);
}
