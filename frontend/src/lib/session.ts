import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";
import type { User } from "@/types";

export function useCurrentSession() {
  const hasToken = Boolean(localStorage.getItem("tf_token"));
  const session = useQuery({
    queryKey: ["public-session"],
    queryFn: async () => (await api.get("/auth/me")).data.data as User,
    enabled: hasToken,
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
  });

  return {
    user: session.isSuccess ? session.data : undefined,
    isChecking: hasToken && session.isFetching,
  };
}
