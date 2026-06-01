import { apiApp } from "@/server/api-app";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      ANY: async ({ request }: { request: Request }) => apiApp.fetch(request),
    },
  },
});
