export type DatabaseErrorContent = {
  title: string;
  message: string;
  hint?: string;
};

export function getDatabaseErrorContent(rawError: string): DatabaseErrorContent {
  if (rawError.includes("libspatialite")) {
    return {
      title: "Development build required",
      message:
        "Trail data uses SpatiaLite, which is not available in Expo Go. Install a dev client that includes the native database libraries.",
      hint: "From apps/mobile, run pnpm run:android or pnpm build-dev:local, then open the app in that build instead of Expo Go.",
    };
  }

  return {
    title: "Could not load trails",
    message: "Something went wrong while preparing offline trail data on this device.",
    hint: "Check that you have enough storage, then try again. If the problem continues, reinstall the app.",
  };
}
