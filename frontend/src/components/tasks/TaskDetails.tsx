import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ChevronRight,
  Loader,
  Paperclip,
  Plus,
  Save,
  Trash2,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api";
import { useApp } from "@/components/app-context";
import { useProjectMembers } from "@/lib/project";
import { message } from "@/lib/errors";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Task, TaskDetail, TaskComment, TaskAttachment } from "@/types";

const STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog",
  todo: "To do",
  in_progress: "In progress",
  in_review: "In review",
  done: "Done",
};

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
] as const;

// Editable fields are free-form strings while editing (the API re-validates
// them), so the draft keeps them loose instead of the Task unions.
interface TaskDraft {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee_id?: number | "";
  deadline?: string;
  estimate_minutes?: number;
}

export function TaskDetails({
  taskId,
  onClose,
}: {
  taskId: number;
  onClose: () => void;
}) {
  const { workspace } = useApp();
  const location = useLocation();
  const qc = useQueryClient();
  const {
    data: task,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<TaskDetail>({
    queryKey: ["/tasks", taskId],
    queryFn: async () => (await api.get(`/tasks/${taskId}`)).data.data,
    enabled: !!taskId,
  });

  const { data: members } = useProjectMembers(workspace.id);

  const projectId = task?.project_id;
  const { data: projectTasks } = useQuery<{ data: Task[] }>({
    queryKey: ["/projects", projectId, "tasks", "all"],
    queryFn: async () =>
      (await api.get(`/projects/${projectId}/tasks?per_page=100`)).data,
    enabled: !!projectId,
  });

  const [saving, setSaving] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<number | null>(null);
  const [attachmentToDelete, setAttachmentToDelete] = useState<TaskAttachment | null>(null);
  const [deletingAttachment, setDeletingAttachment] = useState(false);

  // Local draft for the editable fields so edits are reflected before saving.
  const [draft, setDraft] = useState<TaskDraft>({});
  useEffect(() => {
    if (!task) return;
    setDraft({
      title: task.title,
      description: task.description ?? "",
      status: task.status,
      priority: task.priority,
      assignee_id: task.assignee?.id ?? "",
      deadline: task.deadline ?? "",
      estimate_minutes: task.estimate_minutes ?? 0,
    });
  }, [task]);

  const assigneeId = draft.assignee_id ?? "";
  const estimateMinutes = draft.estimate_minutes ?? 0;

  // Title map for looking up dependency names.
  const taskById = useMemo(() => {
    const map: Record<number, { id: number; title: string; status: string }> =
      {};
    for (const item of projectTasks?.data ?? []) {
      map[item.id] = { id: item.id, title: item.title, status: item.status };
    }
    return map;
  }, [projectTasks]);

  // Parent tasks = this task depends on these.
  const parents = task?.dependencies ?? [];

  // Subtasks = tasks in this project that list this task in their dependencies.
  const subtasks = useMemo(() => {
    if (!task) return [];
    return (projectTasks?.data ?? [])
      .filter(
        (item) =>
          Array.isArray(item.dependencies) &&
          item.dependencies.includes(task.id),
      )
      .map((item) => ({ id: item.id, title: item.title, status: item.status }));
  }, [projectTasks, task]);

  const invalidateTask = () => {
    qc.invalidateQueries({ queryKey: ["/tasks", taskId] });
    qc.invalidateQueries({ queryKey: ["/projects", projectId, "tasks"] });
    qc.invalidateQueries({ queryKey: ["tasks", projectId] });
  };

  const handleSave = async () => {
    if (!task || !draft.title) return;
    setSaving(true);
    try {
      await api.patch(`/tasks/${task.id}`, {
        title: draft.title,
        description: draft.description,
        status: draft.status,
        priority: draft.priority,
        assignee_id: assigneeId === "" ? null : assigneeId,
        deadline: draft.deadline || null,
        estimate_minutes: estimateMinutes,
      });
      await refetch();
      invalidateTask();
      toast.success("Task saved");
    } catch (err) {
      const failure = message(err);
      toast.error(failure.message, { description: failure.hint });
    } finally {
      setSaving(false);
    }
  };

  const handleDependencyToggle = async (depId: number) => {
    if (!task) return;
    const next = new Set(task.dependencies ?? []);
    if (next.has(depId)) next.delete(depId);
    else next.add(depId);
    try {
      await api.put(`/tasks/${task.id}/dependencies`, {
        dependency_ids: Array.from(next),
      });
      await refetch();
      invalidateTask();
    } catch (err) {
      const failure = message(err);
      toast.error(failure.message, { description: failure.hint });
    }
  };

  const handleCommentSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!task || !commentBody.trim()) return;
    try {
      await api.post(`/tasks/${task.id}/comments`, { body: commentBody });
      setCommentBody("");
      await refetch();
    } catch (err) {
      const failure = message(err);
      toast.error(failure.message, { description: failure.hint });
    }
  };

  const handleAttachmentSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!task || !attachmentFile) return;
    try {
      const formData = new FormData();
      formData.append("file", attachmentFile);
      await api.post(`/tasks/${task.id}/attachments`, formData);
      setAttachmentFile(null);
      await refetch();
      toast.success("Attachment uploaded");
    } catch (err) {
      const failure = message(err);
      toast.error(failure.message, { description: failure.hint });
    }
  };

  const handleAttachmentDownload = async (attachment: TaskAttachment) => {
    setDownloadingAttachmentId(attachment.id);
    try {
      const response = await api.get(`/attachments/${attachment.id}`, {
        responseType: "blob",
      });
      const objectUrl = URL.createObjectURL(response.data as Blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = attachment.original_name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err) {
      const failure = message(err);
      toast.error(failure.message, { description: failure.hint });
    } finally {
      setDownloadingAttachmentId(null);
    }
  };

  const handleAttachmentDelete = async () => {
    if (!attachmentToDelete) return;
    setDeletingAttachment(true);
    try {
      await api.delete(`/attachments/${attachmentToDelete.id}`);
      await refetch();
      invalidateTask();
      toast.success("Attachment deleted");
      setAttachmentToDelete(null);
    } catch (err) {
      const failure = message(err);
      toast.error(failure.message, { description: failure.hint });
    } finally {
      setDeletingAttachment(false);
    }
  };

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-md p-4"
      >
        <SheetHeader>
          <SheetTitle>Task TF-{taskId}</SheetTitle>
          <SheetDescription>
            {task?.status
              ? (STATUS_LABELS[task.status] ?? task.status)
              : "Loading task…"}
          </SheetDescription>
        </SheetHeader>

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner className="size-4" /> Loading task…
          </div>
        )}

        {isError && (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>Could not load task</AlertTitle>
            <AlertDescription>
              {(error as Error)?.message ?? "Try again."}
            </AlertDescription>
            <AlertAction>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            </AlertAction>
          </Alert>
        )}

        {task && (
          <>
            <div className="grid gap-2">
              <Label htmlFor="task-detail-title">Title</Label>
              <Input
                id="task-detail-title"
                value={draft.title ?? ""}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Task title"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="task-detail-description">Description</Label>
              <Textarea
                id="task-detail-description"
                rows={4}
                value={draft.description ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
                placeholder="Add a description…"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={draft.status ?? task.status}
                  onValueChange={(value) =>
                    setDraft({ ...draft, status: value ?? "" })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: string | null) =>
                        STATUS_LABELS[value ?? task.status] ?? task.status
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select
                  value={draft.priority ?? task.priority}
                  onValueChange={(value) =>
                    setDraft({ ...draft, priority: value ?? "" })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: string | null) =>
                        PRIORITIES.find(
                          (item) => item.value === (value ?? task.priority),
                        )?.label ?? task.priority
                      }
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
                <Label>Assignee</Label>
                <Select
                  value={assigneeId === "" ? "unassigned" : String(assigneeId)}
                  onValueChange={(value) =>
                    setDraft({
                      ...draft,
                      assignee_id:
                        !value || value === "unassigned" ? "" : Number(value),
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: string | null) =>
                        value === null || value === "" || value === "unassigned"
                          ? "Unassigned"
                          : (members?.find((m) => String(m.id) === value)
                              ?.name ?? value)
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {(members ?? []).map((member) => (
                      <SelectItem key={member.id} value={String(member.id)}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="task-detail-deadline">Due date</Label>
                <Input
                  id="task-detail-deadline"
                  type="date"
                  value={draft.deadline ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, deadline: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="task-detail-estimate">Estimate (minutes)</Label>
                <Input
                  id="task-detail-estimate"
                  type="number"
                  min={0}
                  value={estimateMinutes}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      estimate_minutes: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving || !draft.title}
              className="mt-1"
            >
              {saving ? (
                <Loader className="size-4 animate-spin" />
              ) : (
                <Save data-slot="icon" />
              )}
              {saving ? "Saving…" : "Save task"}
            </Button>

            {task.labels && task.labels.length > 0 && (
              <>
                <Separator />
                <div className="flex flex-wrap gap-2">
                  {task.labels.map((label) => (
                    <Badge
                      key={label.id}
                      variant="outline"
                      style={{ backgroundColor: label.color }}
                    >
                      {label.name}
                    </Badge>
                  ))}
                </div>
              </>
            )}

            {parents.length > 0 && (
              <>
                <Separator />
                <div className="grid gap-2">
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    <AlertTriangle className="size-3.5" /> Depends on
                  </p>
                  {parents.map((depId) => {
                    const parent = taskById[depId];
                    return (
                      <div
                        key={depId}
                        className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm"
                      >
                        <span className="text-muted-foreground">
                          TF-{depId}
                        </span>
                        <span className="truncate">
                          {parent?.title ?? "Task"}
                        </span>
                        {parent && (
                          <Badge
                            variant="secondary"
                            className="ml-auto shrink-0"
                          >
                            {STATUS_LABELS[parent.status] ?? parent.status}
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 shrink-0"
                          onClick={() => handleDependencyToggle(depId)}
                          aria-label={`Remove TF-${depId} as a dependency`}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {subtasks.length > 0 && (
              <>
                <Separator />
                <div className="grid gap-2">
                  <p className="text-sm font-medium">Blocks</p>
                  {subtasks.map((sub) => (
                    <Link
                      key={sub.id}
                      to={`/projects/${projectId}/tasks/${sub.id}`}
                      state={{ backgroundLocation: (location.state as { backgroundLocation?: Location } | null)?.backgroundLocation ?? location }}
                      className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm hover:bg-accent"
                    >
                      <span className="text-muted-foreground">TF-{sub.id}</span>
                      <span className="truncate">{sub.title}</span>
                      <Badge variant="secondary" className="ml-auto shrink-0">
                        {STATUS_LABELS[sub.status] ?? sub.status}
                      </Badge>
                      <ChevronRight className="size-3.5 shrink-0" />
                    </Link>
                  ))}
                </div>
              </>
            )}

            <Separator />
            <div className="grid gap-3">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <User className="size-3.5" /> Comments
                <Badge variant="secondary">{task.comments?.length ?? 0}</Badge>
              </p>
              {task.comments && task.comments.length > 0 ? (
                <div className="grid gap-2">
                  {task.comments.map((comment: TaskComment) => (
                    <div
                      key={comment.id}
                      className="rounded-md border px-2 py-1.5"
                    >
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{comment.user?.name || "Unknown"}</span>
                        <span>
                          {comment.created_at
                            ? new Date(comment.created_at).toLocaleDateString()
                            : ""}
                        </span>
                      </div>
                      <p className="mt-1 text-sm">{comment.body}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No comments yet. Start the discussion.
                </p>
              )}
              <form className="flex gap-2" onSubmit={handleCommentSubmit}>
                <Input
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="Add a comment…"
                  aria-label="Add a comment"
                />
                <Button type="submit" size="sm" disabled={!commentBody.trim()}>
                  <Plus data-slot="icon" /> Comment
                </Button>
              </form>
            </div>

            <Separator />
            <div className="grid gap-3 pb-2">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <Paperclip className="size-3.5" /> Attachments
                <Badge variant="secondary">
                  {task.attachments?.length ?? 0}
                </Badge>
              </p>
              {task.attachments && task.attachments.length > 0 ? (
                <div className="grid gap-2">
                  {task.attachments.map((attachment: TaskAttachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center gap-1 rounded-md border p-1"
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={downloadingAttachmentId === attachment.id}
                        onClick={() => void handleAttachmentDownload(attachment)}
                        className="flex h-auto min-w-0 flex-1 items-center justify-start gap-2 px-2 py-1.5 text-left text-sm hover:bg-accent disabled:opacity-60"
                      >
                        <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{attachment.original_name}</span>
                        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                          {(attachment.size / 1024).toFixed(1)} KB
                        </span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete attachment: ${attachment.original_name}`}
                        title="Delete attachment"
                        onClick={() => setAttachmentToDelete(attachment)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No attachments yet.
                </p>
              )}
              <form className="grid gap-2" onSubmit={handleAttachmentSubmit}>
                <Input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.txt,.doc,.docx,.xls,.xlsx"
                  onChange={(e) =>
                    setAttachmentFile(e.target.files?.[0] ?? null)
                  }
                  aria-label="Upload attachment"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!attachmentFile}
                  className="justify-self-start"
                >
                  <Plus data-slot="icon" /> Upload
                </Button>
                <p className="text-xs text-muted-foreground">PDF, images, text, Word, or Excel files up to 10 MB.</p>
              </form>
            </div>
          </>
        )}
      </SheetContent>
      <AlertDialog
        open={!!attachmentToDelete}
        onOpenChange={(open) => {
          if (!open && !deletingAttachment) setAttachmentToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete attachment?</AlertDialogTitle>
            <AlertDialogDescription>
              “{attachmentToDelete?.original_name}” will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingAttachment}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletingAttachment}
              onClick={() => void handleAttachmentDelete()}
            >
              {deletingAttachment ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
