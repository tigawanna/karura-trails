import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/drizzle/schema",
  out: "./drizzle",
  dialect: "sqlite",
});
