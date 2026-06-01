import { defineConfig } from "vite-plus";

const ignoredPaths = ["**/routeTree.gen.ts", "apps/mobile/scripts/**"];

export default defineConfig({
  fmt: {
    ignorePatterns: ignoredPaths,
    sortTailwindcss: {
      stylesheet: "apps/web/src/styles.css",
      functions: ["cn", "clsx", "cva"],
    },
  },
  staged: {
    "*": "vp check --fix",
  },
  lint: {
    ignorePatterns: ignoredPaths,
    options: { typeAware: true, typeCheck: true },
  },
});
