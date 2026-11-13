import { useEffect } from "react";

type QueryFailureProps = {
  title: string;
  error: unknown;
  retry: () => void;
};

/** Full-page failure state for a top-level query. */
export function QueryFailure({ title, error, retry }: QueryFailureProps) {
  useEffect(() => {
    console.error(title, error);
  }, [title, error]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Something went wrong talking to the TaskForge API. Check your connection and try again.
      </p>
      <button
        type="button"
        onClick={retry}
        className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
      >
        Retry
      </button>
    </div>
  );
}
