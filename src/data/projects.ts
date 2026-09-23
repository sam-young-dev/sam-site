import type { ImageMetadata } from "astro";

import hyperliteHome from "../assets/projects/hyperlite/home.png";
import hyperliteCategory from "../assets/projects/hyperlite/category.png";
import hyperliteProduct from "../assets/projects/hyperlite/product.png";
import hyperliteCart from "../assets/projects/hyperlite/cart.png";
import hyperliteLighthouse from "../assets/projects/hyperlite/lighthouse-report.png";

import portfolioPuddle from "../assets/projects/portfolio-site/home-puddle.png";
import portfolioPhotoExif from "../assets/projects/portfolio-site/photo-exif.png";
import portfolioPhotoCollectionIndex from "../assets/projects/portfolio-site/photography-collections.png";
import portfolioPhotographyIndex from "../assets/projects/portfolio-site/photography-index.png";
import portfolioFooter from "../assets/projects/portfolio-site/footer.png";

import roiStart from "../assets/projects/roi-app/start.png";
import roiForm from "../assets/projects/roi-app/form.png";
import roiSummaryExpand from "../assets/projects/roi-app/roi-summary-expand.png";
import roiEncounters from "../assets/projects/roi-app/encounters.png";
import roiRetention from "../assets/projects/roi-app/retention.png";
import roiFormMockup from "../assets/projects/roi-app/form-mockup.png";
import roiSummaryExpandMockup from "../assets/projects/roi-app/roi-summary-expand-mockup.png";
import roiRetentionMockup from "../assets/projects/roi-app/retention-mockup.png";

export interface ProjectImage {
  src: ImageMetadata;
  alt: string;
  caption?: string;
}

export type ProjectContentBlock =
  | { type: "text"; html: string }
  | { type: "image"; image: ProjectImage }
  | { type: "gallery"; images: ProjectImage[]; caption?: string };

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
        html: 'On top of that sits a working cart and checkout flow through Snipcart (Snipcart is kept in test mode since nothing is actually being sold, but payments will succeed with test card 4242424242424242. See <a href="https://docs.snipcart.com/v3/testing/payments" target="_blank" rel="noopener noreferrer">docs</a> for more).',
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
        html: 'I also used the project as a chance to try <a href="https://sugarcube.sh/" target="_blank" rel="noopener noreferrer">Sugarcube</a> for design tokens instead of hand-writing CSS variables. Colors, spacing, and type scale are defined once as tokens and Sugarcube generates the CSS variables and utility classes from them, so a change to a token (a brand color, a spacing step) propagates everywhere it\'s used instead of needing a find-and-replace across stylesheets. This matters more and more as a codebase grows in size and complexity. Category pages, product pages, and cart UI all need to look like the same brand, and tokens keep them from drifting apart as the site grows.',
      },
      {
        type: "text",
        html: "Overall, I learned a lot about how to set up a basic ecommerce store, some of the tradeoffs that need to be made based on the site goals, and more about performance updates across the board. My time was definitely well spent on this project.",
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
        html: "This is the site you're on. It's an Astro build for photography, a couple of side projects, and a resume. It's mostly static, so pages ship as fast HTML with only the interactive pieces (the puddle background, the photo lightbox) shipping their own JS.",
      },
      {
        type: "image",
        image: {
          src: portfolioPuddle,
          alt: "Homepage of the portfolio site showing a dot-grid canvas background rippling outward from mouse movement.",
          caption:
            "The puddle background mid-ripple, rendered to a single canvas instead of thousands of DOM nodes.",
        },
      },
      {
        type: "text",
        html: 'The rippling dot grid on the homepage started from <a href="https://batmannair.com/puddle.js/" target="_blank" rel="noopener noreferrer">Puddle.js</a>, which renders each grid cell as its own DOM element. A typical viewport needs 1,000 to 4,500 or more cells, more elements and style recalculations than a browser can update at 60fps, so I rewrote it to render the whole grid to a single &lt;canvas&gt;, tracking force values in flat Float32Arrays and only redrawing cells whose neighbors changed on each tick. I leaned on <a href="https://emilkowal.ski/" target="_blank" rel="noopener noreferrer">Emil Kowalski</a>\'s writing on UI feel and his <a href="https://emilkowal.ski/skill" target="_blank" rel="noopener noreferrer">skills</a> to tune it afterward: ripple strength that scales with screen size, snapping small forces to zero so ripples settle cleanly instead of trailing off forever, and respecting prefers-reduced-motion.',
      },
      {
        type: "text",
        html: "The photography section reads real EXIF data out of each JPEG at build time with exifr: camera, lens, focal length, aperture, shutter speed, ISO, and GPS coordinates. It formats that data for display next to the photo. The data comes straight from the file, so adding a new photo means dropping in a JPEG, not hand-typing camera settings. Along with this locations, descriptions, and tags were added to each photo to provide more detail and to allow for showing images by collection.",
      },
      {
        type: "image",
        image: {
          src: portfolioPhotoExif,
          alt: "Photo detail page showing a mountain landscape alongside EXIF metadata: date, camera, lens, focal length, aperture, shutter speed, and ISO.",
          caption:
            "EXIF metadata read from the JPEG at build time and rendered next to each photo.",
        },
      },
      {
        type: "image",
        image: {
          src: portfolioPhotoCollectionIndex,
          alt: "Photo collections page showing photo collections grouped by user tags.",
          caption: "Collection view of photos grouped by tags.",
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
          caption:
            "The photography index, a masonry grid over the same photo set.",
        },
      },
      {
        type: "text",
        html: "The footer also is a place with a nice touch. One of my photos with a mountain in it had the background removed and was converted into an svg shape to be used for the footer. The result is subtle, calculated, and fits into the site as a whole really well.",
      },
      {
        type: "image",
        image: {
          src: portfolioFooter,
          alt: "Footer mountain svg shape.",
          caption: "The footer mountain svg shape.",
        },
      },
      {
        type: "text",
        html: "I learned a lot about animations, writing code for good performance, and I had a blast making this site go from sketches and ideas to a reality. There are some improvements that can be made for sure, but it is in a great spot as I see it right now.",
      },
    ],
    cover: {
      src: portfolioPuddle,
      alt: "Homepage of the portfolio site showing a dot-grid canvas background rippling outward from mouse movement.",
    },
  },
  {
    slug: "roi-calculator",
    title: "APP Program ROI Calculator",
    summary:
      "A sales tool for an APP education company that projects the return on enrolling a health system's NPs and PAs in its transition-to-practice program, based on benchmark data from past cohorts.",
    year: "2025",
    stack: ["React", "ASP.NET Core", "Azure", "Entra ID", "Figma"],
    links: {},
    content: [
      {
        type: "text",
        html: "The client, an APP education company, runs a transition-to-practice program for Advanced Practice Providers (APPs), meaning Nurse Practitioners (NPs) and Physician Associates (PAs). The program helps new APPs get productive and confident in practice sooner. The pitch to health systems is that trained APPs see more patients and stay longer. This calculator puts numbers on that pitch. A prospective client enters a few details about their APP workforce, and the app projects the ROI they could expect in the first year.",
      },
      {
        type: "text",
        html: "Before writing any code, I designed the calculator in Figma and walked the client through the mockups. Changing a design is much cheaper than changing a build, so this is where we agreed on which numbers to feature, how much of the math to show, and how to be upfront that the results are illustrative, not guaranteed, while still making a clear case. Once the client signed off on the designs, I built the app from them.",
      },
      {
        type: "gallery",
        images: [
          {
            src: roiSummaryExpandMockup,
            alt: "Figma mockup of the results summary with a 6.24 ROI headline and an expanded Show me the math section breaking down productivity, incremental revenue, program cost, and ROI.",
          },
          {
            src: roiRetentionMockup,
            alt: "Figma mockup of the retention tab showing annual retention savings per provider, a bar chart of status quo versus projected retention, and participant testimonials.",
          },
        ],
        caption: "Figma mockups used to get client sign-off before development.",
      },
      {
        type: "image",
        image: {
          src: roiStart,
          alt: "ROI calculator empty state with an inputs panel for client information and calculation fields, and a placeholder asking the user to enter inputs and calculate.",
          caption: "The starting state: a short set of inputs and nothing else.",
        },
      },
      {
        type: "text",
        html: "The inputs are kept to the few numbers a practice manager would know offhand: how many APPs they have, average years of experience, average monthly encounters per APP, and current retention rate. Those numbers are matched against longitudinal data from a benchmark cohort of APPs who have already completed the program. The calculator finds comparable providers in the benchmark set, places the client's encounter volume in a quartile, and projects expected encounters with a 95% confidence range.",
      },
      {
        type: "image",
        image: {
          src: roiForm,
          alt: "Filled-in calculator showing a 5.63:1 ROI headline, a download full report button, and an About the Program section with disclaimers.",
          caption: "Results lead with a single headline ROI number.",
        },
      },
      {
        type: "text",
        html: "It works as a sales tool in two ways. The sales team uses an internal version during conversations with health systems, and an external version is embedded on the client's site so interested prospects can try their own numbers before they ever talk to anyone. Both come from one React codebase with two build processes. The internal build is secured with Azure Entra ID, and the external build is packaged to embed in their marketing site. An ASP.NET Core API on Azure handles the benchmark data and the calculations.",
      },
      {
        type: "text",
        html: "A headline ROI figure is only persuasive if people believe it, so the results show their work. The ROI quick report expands to show every step: projected encounters per APP, incremental revenue across the whole team, retention savings, total annual return, program cost, and the final ratio. Each line shows the inputs that produced it, so anyone reading it can follow the math.",
      },
      {
        type: "image",
        image: {
          src: roiSummaryExpand,
          alt: "Expanded ROI quick report listing projected encounters, monthly incremental revenue, annual retention savings, total annual return, program cost, and the resulting 5.63 ROI.",
          caption: "The quick report walks through each step of the ROI math.",
        },
      },
      {
        type: "text",
        html: "The two drivers of the ROI each get their own tab. Encounters shows the projected lift in patient volume and what it means in monthly and annual revenue, alongside the benchmark match details and a chart of current versus projected encounters.",
      },
      {
        type: "image",
        image: {
          src: roiEncounters,
          alt: "Encounters tab showing a 10.1% increase in encounters, projected monthly and annual incremental revenue, a benchmark comparison table, and a bar chart of current versus projected encounters.",
          caption: "Encounters: projected productivity gain, backed by benchmark matches.",
        },
      },
      {
        type: "text",
        html: "Retention compares the client's current turnover cost to the projected cost at the program's retention rate. Replacing an APP is expensive, so even a few points of retention add up to real savings. Participant testimonials sit underneath, putting a human voice next to the numbers.",
      },
      {
        type: "image",
        image: {
          src: roiRetention,
          alt: "Retention tab showing annual retention savings, the program's retention rate, a bar chart of current versus projected retention cost, and participant testimonials.",
          caption: "Retention: turnover cost now versus projected with the program.",
        },
      },
      {
        type: "text",
        html: "The build stayed close to the approved designs, with a few changes along the way. The mockups had a wRVU tab alongside encounters. The benchmark data supported both, but after talking it through with the client, we dropped wRVUs and focused on encounters, since that's the metric their business model is built around. The specialty input came out too, because the benchmark data covered one main specialty and there was nothing to choose between. The single client name field grew into a lead capture section with name, business email, and organization, so when prospects use the calculator on the company's website, the client knows who's interested.",
      },
      {
        type: "gallery",
        images: [
          {
            src: roiFormMockup,
            alt: "Figma mockup with a single Client Name field, Provider Specialty and wRVU inputs, and four result tabs including wRVU Results.",
            caption: "Figma mockup",
          },
          {
            src: roiForm,
            alt: "Final build with a Client Information lead capture section, a fixed specialty, and three result tabs: ROI Summary, Encounters, and Retention.",
            caption: "Final build",
          },
        ],
        caption: "The approved mockup next to the shipped app.",
      },
    ],
    cover: {
      src: roiForm,
      alt: "Filled-in calculator showing a 5.63:1 ROI headline, a download full report button, and an About the Program section with disclaimers.",
    },
  },
];

export function getProject(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug);
}
