import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { api } from "@/api";
import { useApp } from "@/components/app-context";
import { message } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Project } from "@/types";

type ProjectDialogProps = {
  project?: Project;
  close: () => void;
  created: (project: Project) => void;
};

export function ProjectDialog({ project, close, created }: ProjectDialogProps) {
  const app = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const body = Object.fromEntries(new FormData(event.currentTarget).entries());
      const response = project
        ? await api.patch(`/projects/${project.id}`, body)
        : await api.post(`/workspaces/${app.workspace.id}/projects`, body);
      created(response.data.data as Project);
    } catch (err) {
      setError(message(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(next) => { if (!next) close(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{project ? "Project settings" : "Create a project"}</DialogTitle>
          <DialogDescription>
            Projects keep related tasks and people together.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              name="name"
              required
              defaultValue={project?.name}
              placeholder="Website refresh"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="project-key">Project key</Label>
            <Input
              id="project-key"
              name="key"
              maxLength={12}
              required
              defaultValue={project?.key}
              placeholder="WEB"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="project-description">Description</Label>
            <Textarea
              id="project-description"
              name="description"
              rows={3}
              defaultValue={project?.description}
              placeholder="What are you working toward?"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {project ? (
                "Save changes"
              ) : (
                <>
                  <Plus data-slot="icon" /> Create project
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
