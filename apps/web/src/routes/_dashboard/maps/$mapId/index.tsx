import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/maps/$mapId/")({
  component: () => null,
  ssr: false,
});
