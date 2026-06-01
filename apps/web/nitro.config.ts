import { defineConfig } from "nitro";

export default defineConfig({
  experimental: {
    asyncContext: true,
  },
});
