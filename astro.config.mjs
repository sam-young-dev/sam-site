// @ts-check
import { defineConfig } from "astro/config";
import sugarcube from "@sugarcube-sh/vite";

// https://astro.build/config
export default defineConfig({
  site: "https://young-sam.netlify.app/",
  vite: {
    plugins: [sugarcube()],
  },
});
