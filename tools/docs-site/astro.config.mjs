// The portal's Astro config. The title and sidebar are read from the chain in docs/ and the stage
// table in AGENTS.md at config load, so stage order here is never a second copy of the pipeline:
// change the table, restart, and the sidebar follows.
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import { collect, siteTitle, sidebar } from "./chain.mjs";

const chain = collect();

export default defineConfig({
    integrations: [
        starlight({
            title: `${siteTitle()} docs`,
            sidebar: sidebar(chain),
            customCss: ["./src/styles/chain.css"],
        }),
    ],
});
