import { createServer } from "node:net";
import { fromNodeSocket } from "pg-gateway/node";
import type { PGlite } from "@electric-sql/pglite";

export async function startPgliteGateway(
  client: Pick<PGlite, "waitReady" | "execProtocolRaw">,
  port = Number(process.env.PGLITE_GATEWAY_PORT ?? 5433),
) {
  const server = createServer((socket) => {
    void fromNodeSocket(socket, {
      serverVersion: "16.3 (PGlite dev gateway)",
      auth: { method: "trust" },
      onStartup: async () => {
        await client.waitReady;
      },
      onMessage: async (data, state) => {
        if (!state.isAuthenticated) {
          return;
        }
        return client.execProtocolRaw(data);
      },
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve());
  });

  return () =>
    new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
}
