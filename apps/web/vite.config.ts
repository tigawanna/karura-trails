import DrizzleORMMigrations from "@proj-airi/unplugin-drizzle-orm-migrations/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import evlog from "evlog/vite";
import { fileURLToPath, URL } from "url";
import { defineConfig } from "vite-plus";

const drizzlePgliteRoot = fileURLToPath(new URL("./drizzle-pglite", import.meta.url));

export default defineConfig({
  staged: { "*": "vp check --fix" },
  optimizeDeps: {
    exclude: ["@electric-sql/pglite", "@electric-sql/pglite-postgis"],
  },
  server: {
    host: "::",
  },
  ssr: {
    optimizeDeps: {
      exclude: ["better-auth", "@electric-sql/pglite", "@electric-sql/pglite-postgis"],
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    tsconfigPaths: true,
  },
  plugins: [
    DrizzleORMMigrations({ root: drizzlePgliteRoot }),
    devtools(),
    evlog({ service: "karura-trails" }),
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    tanstackStart({
      importProtection: {
        behavior: {
          build: "mock",
        },
      },
      router: {
        routeToken: "layout",
      },
    }),
    viteReact(),
  ],
});
