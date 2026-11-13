import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/api';
import { Button } from '@/components/ui/button';
import type { Sprint, Task, SprintForm } from '@/types';
import { toast } from '@/components/ToastContext';

interface SprintPageProps {
  projectId: number;
  projectName: string;
  onRefresh: () => void;
}

interface SprintWithTasks extends Sprint {
  tasks: Task[];
}

function formatDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRange(start: string, end: string): string {
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function SprintPage({ projectId, projectName }: SprintPageProps) {

  const { data: sprintsData, isLoading, isError, error, refetch } = useQuery<SprintWithTasks[]>({
    queryKey: ['/projects', projectId, 'sprints'],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/sprints`);
      return res.data.data.map((s) => ({
        ...s,
        tasks: s.tasks ?? [],
      })) as SprintWithTasks[];
    },
    enabled: !!projectId,
  });

  const sprints = sprintsData ?? [];
  const [showCreate, setShowCreate] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Sprint | null>(null);
  const [taskSearch, setTaskSearch] = useState('');
  const [taskSelections, setTaskSelections] = useState<Set<number>>(new Set());

  const projectTasks = useQuery<Task[]>({
    queryKey: ['/projects', projectId, 'tasks'],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/tasks?per_page=100`);
      return res.data.data;
    },
    enabled: !!projectId,
  });

  const tasks = projectTasks.data ?? [];
  const filteredTasks = tasks.filter((t) =>
    t.title.toLowerCase().includes(taskSearch.toLowerCase())
  );

  const totalSprints = sprints.length;
  const activeSprints = sprints.filter((s) => s.status === 'active').length;
  const completedSprints = sprints.filter((s) => s.status === 'completed').length;

  const handleCreate = useMutation({
    mutationFn: async (form: SprintForm) => {
      const res = await api.post(`/projects/${projectId}/sprints`, form);
      return res.data.data;
    },
    onSuccess: () => {
      setShowCreate(false);
      setTaskSelections(new Set());
      refetch();
      toast('success', 'Sprint created', `Added to project "${projectName}"`);
    },
    onError: () => {
      toast('error', 'Failed to create sprint', 'Check the form and try again.');
    },
  });

  const handleUpdate = useMutation({
    mutationFn: async (form: SprintForm & { id: number }) => {
      const res = await api.patch(`/sprints/${form.id}`, form);
      return res.data.data;
    },
    onSuccess: () => {
      setEditingSprint(null);
      refetch();
      toast('success', 'Sprint updated');
    },
    onError: () => {
      toast('error', 'Failed to update sprint', 'Check the form and try again.');
    },
  });

  const handleDelete = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/sprints/${id}`);
    },
    onSuccess: () => {
      setDeleteTarget(null);
      refetch();
      toast('success', 'Sprint deleted');
    },
    onError: () => {
      toast('error', 'Failed to delete sprint', 'Please try again.');
    },
  });

  const openCreate = () => {
    setEditingSprint(null);
    setTaskSelections(new Set());
    setShowCreate(true);
  };

  const openEdit = (sprint: Sprint) => {
    setEditingSprint(sprint);
    setTaskSelections(new Set(sprint.tasks?.map((t) => t.id) ?? []));
    setShowCreate(true);
  };

  const openDelete = (sprint: Sprint) => {
    setDeleteTarget(sprint);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    handleDelete.mutate(deleteTarget.id);
  };

  const updateTaskSelection = (id: number, checked: boolean) => {
    setTaskSelections((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const submitForm = async (form: SprintForm) => {
    if (editingSprint) {
      handleUpdate.mutate({ ...form, id: editingSprint.id });
    } else {
      handleCreate.mutate(form);
    }
  };

  const closeModal = () => {
    setShowCreate(false);
    setEditingSprint(null);
    setDeleteTarget(null);
    setTaskSearch('');
    setTaskSelections(new Set());
  };

  return (
    <div>
      <div className="tf-page-head">
        <div className="tf-page-head-text">
          <p className="tf-page-head-eyebrow">{projectName}</p>
          <h1 className="tf-page-head-title">Sprints</h1>
          <p className="tf-page-head-desc">Plan, track, and ship work in time-boxed iterations.</p>
        </div>
        <Button variant="default" onClick={openCreate}>
          <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          New sprint
        </Button>
      </div>

      {/* Project overview stats */}
      <div className="tf-stats">
        <div className="tf-stat">
          <span className="tf-stat-value">{totalSprints}</span>
          <span className="tf-stat-label">Total sprints</span>
        </div>
        <div className="tf-stat">
          <span className="tf-stat-value">{activeSprints}</span>
          <span className="tf-stat-label">Active</span>
        </div>
        <div className="tf-stat">
          <span className="tf-stat-value">{completedSprints}</span>
          <span className="tf-stat-label">Completed</span>
        </div>
        <div className="tf-stat">
          <span className="tf-stat-value">
            {sprints.reduce((sum, s) => sum + s.tasks_count, 0)}
          </span>
          <span className="tf-stat-label">Total tasks</span>
        </div>
      </div>

      {/* Sprint list */}
      {isLoading ? (
        <div className="tf-skeleton-list">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="tf-skeleton-row" />
          ))}
        </div>
      ) : isError ? (
        <div className="tf-error-banner" role="alert">
          Could not load sprints. {error instanceof Error ? error.message : 'Please try again.'}{' '}
          <button type="button" className="tf-error-banner__retry" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      ) : sprints.length === 0 ? (
        <div className="tf-empty">
          <div className="tf-empty-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
              <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M3 10h18M8 4v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h3 className="tf-empty-title">No sprints yet</h3>
          <p className="tf-empty-desc">Create a sprint to start tracking work in time-boxed iterations.</p>
          <button type="button" className="tf-empty-btn" onClick={openCreate}>
            <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            New sprint
          </button>
        </div>
      ) : (
        <div className="tf-sprint-list">
          {(sprints ?? []).map((sprint) => (
            <div key={sprint.id} className="tf-sprint-card">
              <div className="tf-sprint-card-main">
                <div className="tf-sprint-card-head">
                  <h3 className="tf-sprint-card-name">{sprint.name}</h3>
                  <span className={`tf-sprint-status ${sprint.status}`}>{formatStatus(sprint.status)}</span>
                </div>
                <p className="tf-sprint-card-date">{formatRange(sprint.starts_at, sprint.ends_at)}</p>
                <p className="tf-sprint-card-tasks">
                  <span className="tf-sprint-count">{sprint.tasks_count}</span> tasks ·{' '}
                  <span className="tf-sprint-completed">{sprint.completed_tasks_count}</span> done
                </p>
              </div>
              <div className="tf-sprint-card-actions">
                <button
                  type="button"
                  className="tf-sprint-action"
                  onClick={() => openEdit(sprint)}
                  aria-label={`Edit ${sprint.name}`}
                >
                  <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
                    <path d="M4 4h5M4 9h5M4 14h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                  Edit
                </button>
                <button
                  type="button"
                  className="tf-sprint-action tf-sprint-action--danger"
                  onClick={() => openDelete(sprint)}
                  aria-label={`Delete ${sprint.name}`}
                >
                  <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
                    <path d="M4 4h5M10.5 4l4 4-4 4M10 14H4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit modal */}
      {(showCreate || editingSprint) && (
        <div className="tf-modal-backdrop" onClick={closeModal} role="dialog" aria-modal="true">
          <div className="tf-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tf-modal-header">
              <h2>{editingSprint ? 'Edit sprint' : 'Create sprint'}</h2>
              <button type="button" className="tf-modal-close" onClick={closeModal} aria-label="Close">
                <svg viewBox="0 0 12 12" fill="none" className="h-4 w-4" aria-hidden="true">
                  <path d="M2.5 2.5l7 7M2.5 9.5l7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="tf-modal-body">
              <div className="tf-form-group">
                <label htmlFor="sprint-name">Sprint name</label>
                <input
                  id="sprint-name"
                  type="text"
                  className="tf-form-input"
                  placeholder="Sprint 1"
                  defaultValue={editingSprint?.name ?? ''}
                  required
                />
              </div>

              <div className="tf-form-row">
                <div className="tf-form-group">
                  <label htmlFor="sprint-starts-at">Starts at</label>
                  <input
                    id="sprint-starts-at"
                    type="date"
                    className="tf-form-input"
                    defaultValue={editingSprint?.starts_at ?? ''}
                    required
                  />
                </div>
                <div className="tf-form-group">
                  <label htmlFor="sprint-ends-at">Ends at</label>
                  <input
                    id="sprint-ends-at"
                    type="date"
                    className="tf-form-input"
                    defaultValue={editingSprint?.ends_at ?? ''}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="tf-form-label" htmlFor="sprint-status">Status</label>
                <select
                  id="sprint-status"
                  className="tf-form-select"
                  defaultValue={editingSprint?.status ?? 'planned'}
                >
                  <option value="planned">Planned</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Task association */}
              <div>
                <label className="tf-form-label">Associate tasks</label>
                <div className="tf-form-input-wrap">
                  <input
                    type="text"
                    className="tf-form-input"
                    placeholder="Search tasks to add…"
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
                  />
                  <div className="tf-tag-list">
                    {Array.from(taskSelections).map((id) => {
                      const task = tasks.find((t) => t.id === id);
                      if (!task) return null;
                      return (
                        <span key={id} className="tf-tag">
                          {task.title}
                          <button
                            type="button"
                            className="tf-tag-remove"
                            onClick={() => updateTaskSelection(id, false)}
                            aria-label={`Remove ${task.title}`}
                          >
                            <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3" aria-hidden="true">
                              <path d="M2.5 2.5l7 7M2.5 9.5l7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="tf-task-list">
                  {filteredTasks.map((task) => (
                    <label key={task.id} className="tf-task-row">
                      <input
                        type="checkbox"
                        checked={taskSelections.has(task.id)}
                        onChange={(e) => updateTaskSelection(task.id, e.target.checked)}
                      />
                      <span className="tf-task-check" aria-hidden="true" />
                      <span className="tf-task-name">{task.title}</span>
                      <span className="tf-task-meta">
                        {task.estimate_minutes > 0 ? `${Math.round(task.estimate_minutes / 60)}h` : ''}
                        {task.priority !== 'medium' ? `· ${task.priority}` : ''}
                        {task.deadline ? `· ${new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}
                      </span>
                    </label>
                  ))}
                  {filteredTasks.length === 0 && (
                    <p className="tf-empty-title" style={{ marginTop: 0 }}>No tasks match</p>
                  )}
                </div>
              </div>
            </div>
            <div className="tf-modal-footer">
              <Button variant="ghost" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                variant="default"
                onClick={() => {
                  const name = (document.getElementById('sprint-name') as HTMLInputElement).value;
                  const starts_at = (document.getElementById('sprint-starts-at') as HTMLInputElement).value;
                  const ends_at = (document.getElementById('sprint-ends-at') as HTMLInputElement).value;
                  const status = (document.getElementById('sprint-status') as HTMLSelectElement).value;
                  if (!name || !starts_at || !ends_at) return;
                  submitForm({ name, starts_at, ends_at, status, task_ids: Array.from(taskSelections) });
                }}
                disabled={handleCreate.isPending || handleUpdate.isPending}
              >
                {editingSprint ? 'Save changes' : 'Create sprint'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="tf-modal-backdrop" onClick={() => setDeleteTarget(null)} role="alertdialog" aria-modal="true">
          <div className="tf-modal tf-modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="tf-modal-header">
              <h2 className="tf-modal-title">Delete sprint</h2>
              <button type="button" className="tf-modal-close" onClick={() => setDeleteTarget(null)} aria-label="Close">
                <svg viewBox="0 0 12 12" fill="none" className="h-4 w-4" aria-hidden="true">
                  <path d="M2.5 2.5l7 7M2.5 9.5l7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <p className="tf-modal-body">
              Delete <strong>{deleteTarget.name}</strong>? This action cannot be undone.
            </p>
            <div className="tf-modal-footer">
              <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={handleDelete.isPending}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
