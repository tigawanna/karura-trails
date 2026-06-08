import { authClient, type BetterAuthSession } from "@/lib/better-auth/client";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";

type ViewerUser = BetterAuthSession["user"];
type ViewerSession = BetterAuthSession["session"];

export type TViewer = {
  user?: ViewerUser;
  session?: ViewerSession;
};

export type TViewerLoginPayload = { email: string; password: string };

export const ADMIN_ROLE = "admin";

export function isAdminUser(user: ViewerUser | undefined): boolean {
  return user?.role === ADMIN_ROLE;
}

export const viewerqueryOptions = queryOptions({
  queryKey: ["viewer"],
  queryFn: async () => {
    const { data, error } = await authClient.getSession();
    if (error) {
      return { data: null, error };
    }
    return { data, error: null };
  },
  staleTime: 10,
});

export function useViewer() {
  const qc = useQueryClient();
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await authClient.signOut();
      void qc.invalidateQueries(viewerqueryOptions);
      throw redirect({ to: "/auth", search: { returnTo: "/" } });
    },
  });
  const viewerQuery = useSuspenseQuery(viewerqueryOptions);

  return {
    viewerQuery,
    viewer: {
      user: viewerQuery.data.data?.user,
      session: viewerQuery.data.data?.session,
    },
    logoutMutation,
  } as const;
}
