import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X,
  User,
  ListTodo,
  Paperclip,
  AlertTriangle,
  Loader,
  MoreHorizontal,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { api } from '@/api';
import { Button } from '@/components/ui/button';
import { useAddComment, useAddAttachment } from '@/lib/task';
import type {
  Task,
  TaskDetail,
  TaskComment,
  TaskAttachment,
  Member,
} from '@/types';

interface TaskDetailProps {
  task: Task;
  projectId: number;
  workspaceId: number;
  members: Member[];
  onClose: () => void;
  onUpdated: () => void;
  onCreateSubTask: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'To do',
  in_progress: 'In progress',
  in_review: 'In review',
  done: 'Done',
};

// Editable fields are free-form strings while editing (the select values are
// validated again on the API), so the draft keeps them loose instead of the
// TaskDetail unions.
interface TaskDraft {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee_id?: number | '';
  deadline?: string;
  estimate_minutes?: number;
}

export function TaskDetail({
  task,
  projectId,
  members,
  onClose,
  onUpdated,
  onCreateSubTask,
}: TaskDetailProps) {
  const qc = useQueryClient();

  const { data: taskData, isLoading, isError, error, refetch } = useQuery<TaskDetail>({
    queryKey: ['/tasks', task.id],
    queryFn: async () => {
      const res = await api.get(`/tasks/${task.id}`);
      return res.data;
    },
    enabled: !!task.id,
  });

  const { data: projectTasks } = useQuery<{ data: Task[] }>({
    queryKey: ['/projects', projectId, 'tasks'],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/tasks?per_page=100`);
      return res.data;
    },
    enabled: !!projectId,
  });

  const addComment = useAddComment();
  const addAttachment = useAddAttachment();

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  // Local draft for the editable fields so edits are reflected before the save.
  const [draft, setDraft] = useState<TaskDraft>({});
  useEffect(() => {
    if (!taskData) return;
    setDraft({
      title: taskData.title,
      description: taskData.description ?? '',
      status: taskData.status,
      priority: taskData.priority,
      assignee_id: taskData.assignee?.id ?? '',
      deadline: taskData.deadline ?? '',
      estimate_minutes: taskData.estimate_minutes ?? 0,
    });
  }, [taskData]);

  const assigneeId = (draft?.assignee_id as number | '' | undefined) ?? '';
  const estimateMinutes = (draft?.estimate_minutes as number) ?? 0;

  // Title map for looking up parent/subtask names.
  const taskList = useMemo(() => projectTasks?.data ?? [], [projectTasks]);
  const taskById = useMemo(() => {
    const map: Record<number, { id: number; title: string }> = {};
    for (const t of taskList) map[t.id] = { id: t.id, title: t.title };
    return map;
  }, [taskList]);

  // Subtasks = tasks in this project that list this task in their dependencies.
  const subtasks = useMemo(() => {
    if (!task.id) return [];
    return taskList
      .filter((t) => Array.isArray(t.dependencies) && t.dependencies.includes(task.id))
      .map((t) => ({ id: t.id, title: t.title, status: t.status }));
  }, [taskList, task.id]);

  // Parent tasks = this task depends on these.
  const parents = taskData?.dependencies ?? [];

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await api.patch(`/tasks/${task.id}`, {
        title: draft?.title,
        description: draft?.description,
        status: draft?.status,
        priority: draft?.priority,
        assignee_id: assigneeId === '' ? null : assigneeId,
        deadline: draft?.deadline || null,
        estimate_minutes: estimateMinutes,
      });
      await refetch();
      onUpdated();
    } catch {
      setSaveError('Failed to save task. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }, [task.id, draft, assigneeId, estimateMinutes, onUpdated, refetch]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentBody.trim()) return;
    try {
      await addComment.mutateAsync({ taskId: task.id, body: commentBody });
      setCommentBody('');
      qc.invalidateQueries({ queryKey: ['/tasks', task.id, 'comments'] });
    } catch {
      setSaveError('Failed to add comment. Please try again.');
    }
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAttachmentFile(file);
  };

  const handleAttachmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attachmentFile) return;
    try {
      await addAttachment.mutateAsync({ taskId: task.id, file: attachmentFile });
      setAttachmentFile(null);
      qc.invalidateQueries({ queryKey: ['/tasks', task.id, 'attachments'] });
    } catch {
      setSaveError('Failed to upload attachment. Please try again.');
    }
  };

  const handleDependencyToggle = async (depId: number) => {
    const current = new Set(taskData?.dependencies ?? []);
    const next = new Set(current);
    if (next.has(depId)) next.delete(depId);
    else next.add(depId);
    try {
      await api.put(`/tasks/${task.id}/dependencies`, { dependency_ids: Array.from(next) });
      await refetch();
    } catch {
      setSaveError('Failed to update dependencies. Please try again.');
    }
  };

  // Empty / loading states
  if (isLoading) {
    return (
      <div className="drawer-backdrop">
        <aside className="task-drawer">
          <div className="drawer-top"><Loader className="animate-spin h-4 w-4" /></div>
          <div className="drawer-loading">Loading task…</div>
        </aside>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="drawer-backdrop">
        <aside className="task-drawer">
          <div className="drawer-top"><X className="icon-plain" onClick={onClose} aria-label="Close" /></div>
          <div className="drawer-error">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <p>{(error as Error)?.message ?? 'Could not load task.'}</p>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>Retry</Button>
          </div>
        </aside>
      </div>
    );
  }

  return (
    <div className="drawer-backdrop" onMouseDown={onClose}>
      <aside className="task-drawer" onMouseDown={(e) => e.stopPropagation()}>
        <div className="drawer-top">
          <small className="drawer-id">TF-{task.id}</small>
          <button className="icon-plain" onClick={onClose} aria-label="Close task details">
            <X size={18} />
          </button>
        </div>

        {saveError && (
          <div className="drawer-error" role="alert">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <p>{saveError}</p>
          </div>
        )}

        <header className="drawer-header">
          <input
            className="drawer-title"
            value={draft?.title ?? task.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="Task title"
            aria-label="Task title"
          />
          <div className="drawer-header-actions">
            <Button variant="ghost" size="sm" onClick={onCreateSubTask} disabled={saving}>
              <ListTodo size={14} aria-hidden="true" />
              Subtask
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              disabled={saving || !draft?.title}
            >
              {saving ? <Loader size={14} className="animate-spin" /> : <>Save</>}
            </Button>
          </div>
        </header>

        <label className="drawer-field">
          <span className="drawer-field-label">Description</span>
          <textarea
            className="drawer-field-input"
            value={draft?.description ?? task.description ?? ''}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            placeholder="Add a description…"
            aria-label="Task description"
          />
        </label>

        <div className="drawer-fields">
          <div className="drawer-field-row">
            <div className="drawer-field">
              <span className="drawer-field-label">Status</span>
              <select
                value={draft?.status ?? task.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                className="drawer-field-select"
                aria-label="Status"
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="drawer-field">
              <span className="drawer-field-label">Priority</span>
              <select
                value={draft?.priority ?? task.priority}
                onChange={(e) => setDraft({ ...draft, priority: e.target.value })}
                className="drawer-field-select"
                aria-label="Priority"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div className="drawer-field-row">
            <div className="drawer-field">
              <span className="drawer-field-label">Assignee</span>
              <select
                value={assigneeId}
                onChange={(e) => {
                  const value = e.target.value;
                  setDraft({ ...draft, assignee_id: value === '' ? '' : Number(value) });
                }}
                className="drawer-field-select"
                aria-label="Assignee"
              >
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
            </div>
            <div className="drawer-field">
              <span className="drawer-field-label">Due date</span>
              <input
                type="date"
                value={draft?.deadline ?? ''}
                onChange={(e) => setDraft({ ...draft, deadline: e.target.value })}
                className="drawer-field-input"
              />
            </div>
          </div>
          <div className="drawer-field-row">
            <div className="drawer-field">
              <span className="drawer-field-label">Estimate</span>
              <input
                type="number"
                value={estimateMinutes}
                onChange={(e) => setDraft({ ...draft, estimate_minutes: Number(e.target.value) })}
                className="drawer-field-input"
                min="0"
                placeholder="Minutes"
              />
            </div>
          </div>
        </div>

        {/* Labels */}
        {taskData?.labels && taskData.labels.length > 0 && (
          <div className="drawer-section">
            <span className="drawer-section-title">Labels</span>
            <div className="drawer-tags">
              {taskData.labels.map((label) => (
                <span key={label.id} className="drawer-tag" style={{ backgroundColor: label.color }}>
                  {label.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Parents — tasks this task depends on */}
        {parents.length > 0 && (
          <div className="drawer-section">
            <span className="drawer-section-title">
              <AlertTriangle size={14} aria-hidden="true" />
              Blocks
            </span>
            <div className="drawer-dependencies">
              {parents.map((depId) => {
                const parent = taskById[depId];
                return (
                  <div key={depId} className="drawer-dependency">
                    <span className="drawer-dependency-dot" aria-hidden="true" />
                    <span>Task {depId}</span>
                    {parent ? <span className="drawer-dependency-badge">{parent.title}</span> : null}
                    <span className="drawer-dependency-badge">blocked</span>
                    <button
                      className="icon-plain"
                      onClick={() => handleDependencyToggle(depId)}
                      aria-label={`Remove ${depId} as a blocking task`}
                    >
                      <MoreHorizontal size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Subtasks — tasks that depend on this task */}
        {subtasks.length > 0 && (
          <div className="drawer-section">
            <span className="drawer-section-title">
              <ListTodo size={14} aria-hidden="true" />
              Subtasks
            </span>
            <div className="drawer-dependents">
              {subtasks.map((sub) => (
                <a
                  key={sub.id}
                  href={`/projects/${projectId}/tasks/${sub.id}`}
                  className="drawer-dependency"
                >
                  <span className="drawer-dependency-dot" aria-hidden="true" />
                  <span>{sub.title}</span>
                  <span className="drawer-dependency-badge">{STATUS_LABELS[sub.status] || sub.status}</span>
                  <ChevronRight size={14} aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="drawer-section">
          <div className="drawer-section-head">
            <span className="drawer-section-title">
              <User size={14} aria-hidden="true" />
              Comments
              <span className="drawer-section-count">{taskData?.comments?.length ?? 0}</span>
            </span>
          </div>
          {taskData?.comments && taskData.comments.length > 0 ? (
            <div className="drawer-comments">
              {taskData.comments.map((comment: TaskComment) => (
                <div key={comment.id} className="drawer-comment">
                  <div className="drawer-comment-header">
                    <span className="drawer-comment-author">{comment.user?.name || 'Unknown'}</span>
                    <span className="drawer-comment-date">
                      {comment.created_at ? new Date(comment.created_at).toLocaleDateString() : ''}
                    </span>
                  </div>
                  <p className="drawer-comment-body">{comment.body}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="drawer-empty">No comments yet. Start the discussion.</p>
          )}
          <form className="drawer-comment-form" onSubmit={handleCommentSubmit}>
            <input
              type="text"
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="Add a comment…"
              aria-label="Add a comment"
            />
            <Button type="submit" size="sm" disabled={addComment.isPending}>
              <Plus size={14} aria-hidden="true" />
              Comment
            </Button>
          </form>
        </div>

        {/* Attachments */}
        <div className="drawer-section">
          <div className="drawer-section-head">
            <span className="drawer-section-title">
              <Paperclip size={14} aria-hidden="true" />
              Attachments
              <span className="drawer-section-count">{taskData?.attachments?.length ?? 0}</span>
            </span>
          </div>
          {taskData?.attachments && taskData.attachments.length > 0 ? (
            <div className="drawer-attachments">
              {taskData.attachments.map((attachment: TaskAttachment) => (
                <a
                  key={attachment.id}
                  href={attachment.download_url}
                  className="drawer-attachment"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="drawer-attachment-icon">
                    <Paperclip size={14} />
                  </span>
                  <span className="drawer-attachment-info">
                    <span className="drawer-attachment-name">{attachment.original_name}</span>
                    <span className="drawer-attachment-size">{(attachment.size / 1024).toFixed(1)} KB</span>
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <p className="drawer-empty">No attachments yet.</p>
          )}
          <form className="drawer-attachment-form" onSubmit={handleAttachmentSubmit}>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleAttachmentChange}
              aria-label="Upload attachment"
            />
            <Button type="submit" size="sm" disabled={!attachmentFile || addAttachment.isPending}>
              <Plus size={14} aria-hidden="true" />
              Upload
            </Button>
          </form>
        </div>
      </aside>
    </div>
  );
}
