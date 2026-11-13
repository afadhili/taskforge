import { useState, type FormEvent } from "react";
import { LogOut, Users } from "lucide-react";
import { api } from "@/api";
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

export function CreateWorkspace({
  user,
  onCreated,
  onLogout,
}: {
  user: User;
  onCreated: (ws: { id: number }) => void;
  onLogout: () => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await api.post<{ data: { id: number } }>("/workspaces", {
        name,
      });
      onCreated(response.data.data);
    } catch (reason) {
      setError(message(reason).message);
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center px-4 py-10">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="absolute top-4 right-4 text-muted-foreground"
        onClick={() => onLogout()}
      >
        <LogOut /> Sign out
      </Button>

      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-muted">
            <Users className="size-5 text-muted-foreground" />
          </span>
          <CardTitle className="text-xl">Create your workspace</CardTitle>
          <CardDescription>
            Hi {user.name.split(" ")[0]}, give your team a shared home.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={submit}>
            <div className="grid gap-2">
              <Label htmlFor="workspace-name">Workspace name</Label>
              <Input
                id="workspace-name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Acme Studio"
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Spinner />}
              Create workspace
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
