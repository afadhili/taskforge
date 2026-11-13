import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, setToken } from "@/api";
import { message } from "@/lib/errors";
import type { User } from "@/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type CallbackResponse = { data: { token: string; user: User } };

export function OAuthCallback() {
  // Parsed once per mount; the OAuth query string cannot change while the
  // callback page is open.
  const [params] = useState(() => new URLSearchParams(window.location.search));
  const { provider } = useParams<{ provider: string }>();
  const providerName = provider === "github" ? "GitHub" : "Google";
  const providerKey = provider === "github" ? "github" : "google";

  const [error, setError] = useState(() =>
    params.has("error")
      ? params.get("error_description") || "Sign in was cancelled."
      : !params.get("code") || !params.get("state")
        ? "The sign-in response is missing its code or state."
        : "",
  );

  // Keep the request across StrictMode's setup/cleanup replay, while each
  // effect setup can attach its own live response handler.
  const callbackRequest = useRef<Promise<CallbackResponse> | null>(null);

  useEffect(() => {
    if (error) return;
    let active = true;
    const code = params.get("code");
    const state = params.get("state");
    const request = (callbackRequest.current ??= api
      .post<CallbackResponse>(`/auth/oauth/${providerKey}/callback`, { code, state })
      .then((response) => response.data));
    request
      .then(({ data }) => {
        if (!active) return;
        setToken(data.token);
        localStorage.setItem("tf_user", JSON.stringify(data.user));
        window.location.replace("/");
      })
      .catch((reason) => {
        if (active) setError(message(reason).message);
      });
    return () => {
      active = false;
    };
  }, [error, params, providerKey]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-4">
      {error ? (
        <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
          <Alert variant="destructive">
            <AlertTitle>Could not sign in with {providerName}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Link
            to="/login"
            className="text-sm font-medium underline-offset-4 hover:underline"
          >
            Return to sign in
          </Link>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground" role="status">
          Finishing sign in with {providerName}…
        </p>
      )}
    </div>
  );
}
