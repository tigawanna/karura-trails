import type { PGlite } from "@electric-sql/pglite";

export async function connectPgliteBrowserProxy(
  client: Pick<PGlite, "execProtocolRaw">,
): Promise<void> {
  if (!import.meta.env.DEV) {
    return;
  }

  const wsPort = Number(import.meta.env.VITE_PGLITE_PROXY_WS_PORT ?? 15433);
  const { connectProxy } = await import("pg-browser-proxy");
  connectProxy((message) => client.execProtocolRaw(message), {
    wsPort,
    silent: true,
  });
}
