import { defineConfig } from "drizzle-kit";

const gatewayPort = process.env.PGLITE_GATEWAY_PORT ?? "5433";
const browserProxyTcpPort = process.env.PGLITE_BROWSER_PROXY_TCP_PORT ?? "15432";
const useBrowserProxy = process.env.PGLITE_USE_BROWSER_PROXY === "true";
const gatewayUrl =
  process.env.PGLITE_GATEWAY_URL ?? `postgresql://postgres@127.0.0.1:${gatewayPort}/postgres`;
const browserProxyUrl =
  process.env.PGLITE_BROWSER_PROXY_URL ??
  `postgresql://postgres@127.0.0.1:${browserProxyTcpPort}/postgres`;

export default defineConfig({
  schema: "./src/lib/pglite/schema/**/*.ts",
  out: "./drizzle-pglite/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: useBrowserProxy ? browserProxyUrl : gatewayUrl,
  },
});
