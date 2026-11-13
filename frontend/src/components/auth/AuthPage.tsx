import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Check, Command, KanbanSquare, Sparkles, Users } from "lucide-react";
import { api, setToken } from "@/api";
import { message } from "@/lib/errors";
import type { User } from "@/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

type AuthMode = "login" | "register";
type AuthPayload = Record<string, string>;

function GithubIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M12 .5C5.65.5.5 5.75.5 12.22c0 5.18 3.3 9.58 7.87 11.13.58.11.79-.26.79-.57v-2.2c-3.2.71-3.87-1.39-3.87-1.39-.53-1.36-1.28-1.72-1.28-1.72-1.05-.73.08-.72.08-.72 1.16.08 1.77 1.22 1.77 1.22 1.03 1.81 2.7 1.29 3.36.99.1-.76.4-1.29.73-1.59-2.55-.3-5.24-1.3-5.24-5.78 0-1.28.45-2.32 1.2-3.14-.12-.3-.52-1.5.11-3.12 0 0 .98-.32 3.2 1.2.93-.26 1.93-.4 2.92-.4s1.99.14 2.92.4c2.22-1.52 3.2-1.2 3.2-1.2.63 1.62.23 2.82.11 3.12.75.82 1.2 1.86 1.2 3.14 0 4.5-2.7 5.47-5.27 5.76.41.36.78 1.08.78 2.18v3.23c0 .31.21.69.8.57 4.56-1.55 7.85-5.95 7.85-11.13C23.5 5.75 18.35.5 12 .5Z"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 48"
      className="size-4"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M43.6 20.5H42V20H24v8h11.3A12 12 0 1 1 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7A20 20 0 1 0 44 24c0-1.2-.1-2.4-.4-3.5z"
      />
      <path
        fill="#34A853"
        d="M6.3 14.7 12.9 19.5A12 12 0 0 1 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7A20 20 0 0 0 4.8 12.5z"
      />
      <path
        fill="#FBBC05"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.5 5A20 20 0 0 0 24 44z"
      />
      <path
        fill="#EA4335"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C41 36 44 30.4 44 24c0-1.2-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

export function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("login");
  const [oauthBusy, setOauthBusy] = useState<"google" | "github" | null>(null);
  const [oauthError, setOauthError] = useState("");

  const auth = useMutation({
    mutationFn: async (data: AuthPayload) =>
      (await api.post(`/auth/${mode}`, data)).data as {
        data: { token: string; user: User };
      },
    onSuccess: (result) => {
      setToken(result.data.token);
      localStorage.setItem("tf_user", JSON.stringify(result.data.user));
      navigate("/", { replace: true });
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    auth.mutate(
      Object.fromEntries(
        new FormData(event.currentTarget).entries(),
      ) as AuthPayload,
    );
  };

  const startOAuth = async (provider: "google" | "github") => {
    setOauthBusy(provider);
    setOauthError("");
    try {
      const response = await api.get(`/auth/oauth/${provider}`);
      window.location.assign(response.data.data.authorization_url);
    } catch (reason) {
      setOauthError(message(reason).message);
      setOauthBusy(null);
    }
  };

  const failure = auth.error ? message(auth.error) : null;
  const busy = auth.isPending || !!oauthBusy;

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-muted/40 px-4 py-8 sm:px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/4 size-80 rounded-full bg-primary/5 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 bottom-0 size-96 rounded-full bg-primary/5 blur-3xl"
      />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-border/70 bg-card shadow-xl shadow-foreground/5 md:min-h-[640px] md:grid-cols-[1fr_0.92fr]">
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-foreground p-10 text-background md:flex lg:p-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-28 -top-24 size-80 rounded-full border border-background/10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 -left-20 size-72 rounded-full border border-background/10"
          />

          <div className="relative flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-background/10 ring-1 ring-background/15">
              <Command className="size-5" />
            </span>
            <span className="text-base font-semibold tracking-tight">
              TaskForge
            </span>
          </div>

          <div className="relative my-12">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-background/15 bg-background/5 px-3 py-1.5 text-xs font-medium text-background/80">
              <Sparkles className="size-3.5" /> Your team, in sync
            </span>
            <h1 className="max-w-md text-4xl font-semibold leading-[1.12] tracking-tight lg:text-5xl">
              Great work happens when it’s all in sync.
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-6 text-background/65">
              Plan projects, share ownership, and move every task forward from
              one calm workspace.
            </p>

            <div className="mt-9 grid gap-3 text-sm text-background/80">
              <div className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-lg bg-background/10">
                  <KanbanSquare className="size-4" />
                </span>
                Project boards that keep work visible
              </div>
              <div className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-lg bg-background/10">
                  <Users className="size-4" />
                </span>
                A shared rhythm for the whole team
              </div>
              <div className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-lg bg-background/10">
                  <Check className="size-4" />
                </span>
                Clear ownership from start to done
              </div>
            </div>
          </div>

          <p className="relative text-xs text-background/45">
            © 2026 TaskForge · Built for focused teams.
          </p>
        </aside>

        <section className="flex flex-col justify-center p-6 sm:p-10 lg:p-12">
          <div className="mb-8 flex items-center gap-2 text-sm font-semibold md:hidden">
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Command className="size-4" />
            </span>
            TaskForge
          </div>

          <div className="mb-6">
            <p className="text-sm font-medium text-primary">
              {mode === "login" ? "Welcome back" : "Get started"}
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              {mode === "login"
                ? "Sign in to your workspace"
                : "Create your account"}
            </h2>
            <p className="mt-2 text-sm leading-5 text-muted-foreground">
              {mode === "login"
                ? "Pick up where your team left off."
                : "Set up your account and start building together."}
            </p>
          </div>

          <div className="mb-5 grid grid-cols-2 rounded-xl bg-muted/70 p-1">
            {(["login", "register"] as const).map((item) => (
              <button
                key={item}
                type="button"
                disabled={busy}
                aria-pressed={mode === item}
                onClick={() => {
                  setMode(item);
                  auth.reset();
                  setOauthError("");
                }}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${mode === item ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {item === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2 bg-background"
              disabled={busy}
              onClick={() => void startOAuth("google")}
            >
              {oauthBusy === "google" ? <Spinner /> : <GoogleIcon />}
              <span className="truncate">
                {oauthBusy === "google" ? "Connecting…" : "Google"}
              </span>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2 bg-background"
              disabled={busy}
              onClick={() => void startOAuth("github")}
            >
              {oauthBusy === "github" ? <Spinner /> : <GithubIcon />}
              <span className="truncate">
                {oauthBusy === "github" ? "Connecting…" : "GitHub"}
              </span>
            </Button>
          </div>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">
              or continue with email
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form className="grid gap-4" onSubmit={submit}>
            {mode === "register" && (
              <div className="grid gap-2">
                <Label htmlFor="name">Your name</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  autoComplete="name"
                  placeholder="Alex Morgan"
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@company.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={mode === "register" ? 10 : 1}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                placeholder={
                  mode === "login"
                    ? "Enter your password"
                    : "At least 10 characters"
                }
              />
            </div>
            {mode === "register" && (
              <div className="grid gap-2">
                <Label htmlFor="password_confirmation">Confirm password</Label>
                <Input
                  id="password_confirmation"
                  name="password_confirmation"
                  type="password"
                  required
                  minLength={10}
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                />
              </div>
            )}

            {failure && (
              <Alert variant="destructive">
                <AlertDescription>
                  {failure.message}
                  {failure.hint ? ` ${failure.hint}` : ""}
                </AlertDescription>
              </Alert>
            )}
            {oauthError && (
              <Alert variant="destructive">
                <AlertDescription role="alert">{oauthError}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="mt-1 h-10 w-full" disabled={busy}>
              {auth.isPending && <Spinner />}
              {auth.isPending
                ? "Please wait…"
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Demo account:{" "}
            <code className="rounded bg-muted px-1.5 py-0.5">
              demo@taskforge.local
            </code>
            <span className="mx-1">/</span>
            <code className="rounded bg-muted px-1.5 py-0.5">password</code>
          </p>
        </section>
      </div>
    </main>
  );
}
