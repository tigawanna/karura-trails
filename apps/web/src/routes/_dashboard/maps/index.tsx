import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/maps/")({
  component: () => null,
  ssr: false,
});
