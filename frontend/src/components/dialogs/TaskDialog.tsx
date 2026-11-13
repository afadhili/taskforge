import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api";
import { useApp } from "@/components/app-context";
import { useProjectMembers } from "@/lib/project";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUSES = [
  { value: "backlog", label: "Backlog" },
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "in_review", label: "In review" },
  { value: "done", label: "Done" },
] as const;

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
] as const;

export function TaskDialog({
  projectId,
  close,
  created,
}: {
  projectId: number;
  close: () => void;
  created: () => void;
}) {
  const { workspace } = useApp();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string>("backlog");
  const [priority, setPriority] = useState<string>("medium");
  const [assigneeId, setAssigneeId] = useState<string>("");

  const members = useProjectMembers(workspace.id);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const raw = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<
      string,
      string
    >;
    setSaving(true);
    setError("");
    try {
      await api.post(`/projects/${projectId}/tasks`, {
        title: raw.title,
        description: raw.description,
        status,
        priority,
        deadline: raw.deadline || null,
        assignee_id: assigneeId && assigneeId !== "unassigned" ? Number(assigneeId) : null,
        estimate_minutes: Number(raw.estimate_minutes || 0),
      });
      toast.success("Task created");
      created();
    } catch (err) {
      const failure = message(err);
      setError(failure.message);
      toast.error(failure.message, { description: failure.hint });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a task</DialogTitle>
          <DialogDescription>
            Capture the next piece of work for this project.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid gap-2">
            <Label htmlFor="task-title">Task title</Label>
            <Input
              id="task-title"
              name="title"
              required
              autoFocus
              placeholder="What needs to get done?"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              name="description"
              rows={3}
              placeholder="Add a little context…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value ?? "medium")}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string | null) =>
                      PRIORITIES.find((item) => item.value === (value ?? "medium"))?.label ?? "Priority"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value ?? "backlog")}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string | null) =>
                      STATUSES.find((item) => item.value === (value ?? "backlog"))?.label ?? "Status"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Assignee</Label>
              <Select value={assigneeId} onValueChange={(value) => setAssigneeId(value ?? "unassigned")}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string | null) =>
                      value === null || value === "" || value === "unassigned"
                        ? "Unassigned"
                        : (members.data ?? []).find((m) => String(m.id) === value)?.name ?? value}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {(members.data ?? []).map((member) => (
                    <SelectItem key={member.id} value={String(member.id)}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="task-deadline">Deadline</Label>
              <Input id="task-deadline" name="deadline" type="date" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="task-estimate">Estimate (minutes)</Label>
            <Input
              id="task-estimate"
              name="estimate_minutes"
              type="number"
              min={0}
              placeholder="60"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              <Plus data-slot="icon" /> {saving ? "Creating…" : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
