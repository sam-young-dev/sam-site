import type { ImageMetadata } from "astro";

import hyperliteHome from "../assets/projects/hyperlite/home.png";
import hyperliteCategory from "../assets/projects/hyperlite/category.png";
import hyperliteProduct from "../assets/projects/hyperlite/product.png";
import hyperliteCart from "../assets/projects/hyperlite/cart.png";
import hyperliteLighthouse from "../assets/projects/hyperlite/lighthouse-report.png";

export interface ProjectImage {
  src: ImageMetadata;
  alt: string;
  caption?: string;
}

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
  description: string[];
  cover: ProjectImage;
  gallery: ProjectImage[];
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
    description: [
      "Hyperlite is a storefront modeled closely on Hyperlite Mountain Gear, an ultralight backpacking brand. The content and products are a deliberate clone rather than an original brand — the goal wasn't to design a store from scratch, it was to learn how the pieces of a headless ecommerce stack actually fit together, without also having to invent a catalog.",
      "Astro renders the storefront as fast, mostly-static HTML. Product, category, and page content live in Sanity.io as structured content, so the catalog can change without touching code. Snipcart is layered on top for cart state and checkout, which meant working within a client-side commerce widget instead of writing custom cart logic. The site is built and hosted on Netlify.",
      'The build covers a product catalog split across categories (backpacks, tents, sleep, and accessories), individual product pages with pricing and details pulled from Sanity, and a working cart and checkout flow through Snipcart (Snipcart kept in test mode, but payments will succeed with test card 4242424242424242. See <a href="https://docs.snipcart.com/v3/testing/payments" target="_blank" rel="noopener noreferrer">docs</a> for more).',
      "Every Netlify deploy preview runs a Lighthouse report and gives a build preview to check before merging into main, which turned performance into something to verify on every change rather than an afterthought. Chasing good Lighthouse scores across a client-side cart widget and image-heavy product pages was one of the bigger lessons of the project.",
    ],
    cover: {
      src: hyperliteHome,
      alt: "Hyperlite Mountain Gear homepage with a full-width photo collage hero and category navigation.",
    },
    gallery: [
      {
        src: hyperliteHome,
        alt: "Hyperlite Mountain Gear homepage with a full-width photo collage hero and category navigation.",
        caption: "Homepage hero and category navigation.",
      },
      {
        src: hyperliteCategory,
        alt: "Backpacks category page listing three ultralight packs with pricing.",
        caption: "Category listing page, pulled from Sanity.",
      },
      {
        src: hyperliteProduct,
        alt: "Southwest backpack product page with price, specs, image gallery, and an add to cart button.",
        caption: "Product detail page with Snipcart add-to-cart.",
      },
      {
        src: hyperliteCart,
        alt: "Snipcart cart summary showing the Southwest backpack, quantity, and checkout total.",
        caption: "Cart summary and checkout, handled entirely by Snipcart.",
      },
      {
        src: hyperliteLighthouse,
        alt: "Lighthouse report from a Netlify deploy preview showing performance, accessibility, best practices, and SEO scores.",
        caption:
          "Lighthouse report generated on a Netlify deploy preview, part of tuning the site for performance before merging to production.",
      },
    ],
  },
];

export function getProject(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug);
}
