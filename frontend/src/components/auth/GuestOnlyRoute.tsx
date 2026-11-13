import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useCurrentSession } from "@/lib/session";
import { Spinner } from "@/components/ui/spinner";

export function GuestOnlyRoute({ children }: { children: ReactNode }) {
  const session = useCurrentSession();

  if (session.isChecking) {
    return (
      <div className="flex min-h-svh items-center justify-center gap-3 text-sm text-muted-foreground" role="status">
        <Spinner className="size-5" /> Checking your session…
      </div>
    );
  }

  if (session.user) {
    return <Navigate to="/board" replace />;
  }

  return children;
}
