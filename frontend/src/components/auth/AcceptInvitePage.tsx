import { useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { api, setToken } from "@/api";
import { message } from "@/lib/errors";
import type { User } from "@/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

type AcceptResponse = {
  data: { token?: string; user?: User; workspace_id: number };
};

export function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  // The endpoint is public: unauthenticated invitees register inline with a
  // name + password, already signed-in users just confirm the invite.
  const authenticated = !!localStorage.getItem("tf_token");

  const accept = useMutation({
    mutationFn: async () =>
      (
        await api.post<AcceptResponse>(
          `/invitations/${token}/accept`,
          authenticated ? {} : { name, password },
        )
      ).data,
  });

  const openWorkspace = () => {
    const result = accept.data?.data;
    if (!result) return;
    if (result.token) setToken(result.token);
    if (result.user) {
      localStorage.setItem("tf_user", JSON.stringify(result.user));
    }
    localStorage.setItem("tf_workspace", String(result.workspace_id));
    navigate("/", { replace: true });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    accept.mutate();
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-muted">
            <Users className="size-5 text-muted-foreground" />
          </span>
          <CardTitle className="text-xl">Join a workspace</CardTitle>
          <CardDescription>
            Accept this invitation to start collaborating.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {accept.data ? (
            <Button type="button" className="w-full" onClick={openWorkspace}>
              Open workspace
            </Button>
          ) : authenticated ? (
            <>
              {accept.error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{message(accept.error).message}</AlertDescription>
                </Alert>
              )}
              <Button
                type="button"
                className="w-full"
                disabled={accept.isPending}
                onClick={() => accept.mutate()}
              >
                {accept.isPending && <Spinner />}
                {accept.isPending ? "Accepting…" : "Accept invitation"}
              </Button>
            </>
          ) : (
            <form className="grid gap-4" onSubmit={submit}>
              <div className="grid gap-2">
                <Label htmlFor="name">Your name</Label>
                <Input
                  id="name"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Alex Morgan"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={10}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              {accept.error && (
                <Alert variant="destructive">
                  <AlertDescription>{message(accept.error).message}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" disabled={accept.isPending}>
                {accept.isPending && <Spinner />}
                {accept.isPending ? "Accepting…" : "Accept invitation"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
