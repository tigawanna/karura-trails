import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "url";
import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: { "*": "vp check --fix" },
  server: {
    host: "::",
  },
  ssr: {
    optimizeDeps: {
      exclude: ["better-auth"],
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    tsconfigPaths: true,
  },
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    tanstackStart({
      router: {
        routeToken: "layout",
      },
    }),
    viteReact(),
  ],
});
