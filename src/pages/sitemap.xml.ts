import type { APIRoute } from "astro";
import { projects } from "../data/projects";
import { getCollections } from "../utils/collections";
import { getPhotos } from "../utils/photos";

export const GET: APIRoute = async ({ site }) => {
  const [photos, collections] = await Promise.all([getPhotos(), getCollections()]);

  const paths = [
    "/",
    "/about/",
    "/projects/",
    "/photography/",
    "/collections/",
    "/resume/",
    ...projects.map((project) => `/projects/${project.slug}/`),
    ...photos.map((photo) => `/photography/${photo.slug}/`),
    ...collections.map((collection) => `/collections/${collection.slug}/`),
  ];

  const urls = paths.map((path) => `  <url><loc>${new URL(path, site).href}</loc></url>`).join("\n");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
};
