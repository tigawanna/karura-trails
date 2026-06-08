import {
  TanstackQueryProvider,
  getTanstackQueryContext,
} from "@/lib/tanstack/query/query-provider";
import { ThemeProvider } from "@/lib/tanstack/router/theme-provider";
import { AppConfig } from "@/utils/system";
import type { QueryClient } from "@tanstack/react-query";
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import appCss from "../styles.css?url";

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: AppConfig.name },
      { name: "description", content: AppConfig.description || AppConfig.name },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png", type: "image/png", sizes: "48x48" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "1024x1024" },
    ],
  }),
  component: RootDocument,
});

function RootDocument() {
  const { queryClient } = getTanstackQueryContext();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider storageKey={AppConfig.themeStorageKey}>
          <TanstackQueryProvider queryClient={queryClient}>
            <Outlet />
          </TanstackQueryProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
