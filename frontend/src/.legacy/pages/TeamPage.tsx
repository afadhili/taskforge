import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import type { Task } from '@/types';

interface TeamPageProps {
  workspaceId: number;
  projectId: number;
  projectName: string;
}

interface MemberWorkload {
  user: { id: number; name: string };
  open_tasks: number;
  estimate_minutes: number;
}

function formatHours(minutes: number): string {
  if (minutes <= 0) return '—';
  const h = Math.round(minutes / 60);
  return h === 1 ? '1h' : `${h}h`;
}

export function TeamPage({ projectId, projectName }: TeamPageProps) {
  const [sortBy, setSortBy] = useState<'open_tasks' | 'estimate'>('open_tasks');

  const { data: tasksData, isLoading, error } = useQuery<{ data: Task[] }>({
    queryKey: ['/projects', projectId, 'tasks'],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/tasks?per_page=100`);
      return res.data;
    },
    enabled: !!projectId,
  });

  const tasks = useMemo(() => tasksData?.data ?? [], [tasksData]);

  const workload = useMemo<MemberWorkload[]>(() => {
    const map = new Map<number, { user: { id: number; name: string }; open_tasks: number; estimate_minutes: number }>();
    for (const task of tasks) {
      if (!task.assignee?.id || task.status === 'done') continue;
      const existing = map.get(task.assignee.id);
      if (existing) {
        existing.open_tasks += 1;
        existing.estimate_minutes += task.estimate_minutes ?? 0;
      } else {
        map.set(task.assignee.id, {
          user: { id: task.assignee.id, name: task.assignee.name },
          open_tasks: 1,
          estimate_minutes: task.estimate_minutes ?? 0,
        });
      }
    }
    return Array.from(map.values());
  }, [tasks]);

  const sorted = useMemo(() => {
    return [...workload].sort((a, b) => {
      if (sortBy === 'open_tasks') return b.open_tasks - a.open_tasks;
      return b.estimate_minutes - a.estimate_minutes;
    });
  }, [workload, sortBy]);

  const totalOpen = sorted.reduce((sum, m) => sum + m.open_tasks, 0);
  const totalEstimate = sorted.reduce((sum, m) => sum + m.estimate_minutes, 0);

  return (
    <div>
      <div className="tf-page-head">
        <div className="tf-page-head-text">
          <p className="tf-page-head-eyebrow">{projectName}</p>
          <h1 className="tf-page-head-title">Team workload</h1>
          <p className="tf-page-head-desc">Open work assigned across your project team, with estimated effort.</p>
        </div>
        <div className="tf-page-head-actions">
          <label className="tf-filter-chip">
            Sort
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'open_tasks' | 'estimate')}
              className="tf-form-select"
            >
              <option value="open_tasks">Most open tasks</option>
              <option value="estimate">Most hours</option>
            </select>
          </label>
        </div>
      </div>

      {/* Summary stats */}
      <div className="tf-stats">
        <div className="tf-stat">
          <span className="tf-stat-value">{workload.length}</span>
          <span className="tf-stat-label">Team members</span>
        </div>
        <div className="tf-stat">
          <span className="tf-stat-value">{totalOpen}</span>
          <span className="tf-stat-label">Open tasks</span>
        </div>
        <div className="tf-stat">
          <span className="tf-stat-value">{formatHours(totalEstimate)}</span>
          <span className="tf-stat-label">Est. effort</span>
        </div>
        <div className="tf-stat">
          <span className="tf-stat-value">
            {tasks.length - tasks.filter((t) => t.status === 'done').length}
          </span>
          <span className="tf-stat-label">Tasks in flight</span>
        </div>
      </div>

      {/* Members table */}
      {isLoading ? (
        <div className="tf-skeleton-list">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="tf-skeleton-row" />
          ))}
        </div>
      ) : error ? (
        <div className="tf-error-banner" role="alert">
          Could not load workload. Please try again.
        </div>
      ) : sorted.length === 0 ? (
        <div className="tf-empty">
          <div className="tf-empty-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
              <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h3 className="tf-empty-title">No open work</h3>
          <p className="tf-empty-desc">Assign tasks to your team to see workload distribution.</p>
        </div>
      ) : (
        <div className="tf-member-list">
          {sorted.map((member) => (
            <div key={member.user.id} className="tf-member-row">
              <div className="tf-member-avatar" aria-hidden="true">
                {member.user.name.charAt(0).toUpperCase()}
              </div>
              <div className="tf-member-info">
                <span className="tf-member-name">{member.user.name}</span>
                <span className="tf-member-email">{member.user.email}</span>
              </div>
              <div className="tf-member-stats">
                <span className="tf-member-stat">
                  <span className="tf-member-stat-value">{member.open_tasks}</span>
                  <span className="tf-member-stat-label">open tasks</span>
                </span>
                <span className="tf-member-stat">
                  <span className="tf-member-stat-value">{formatHours(member.estimate_minutes)}</span>
                  <span className="tf-member-stat-label">estimated</span>
                </span>
              </div>
              <div className="tf-member-bar">
                <div
                  className="tf-member-bar-fill"
                  style={{ width: `${workload.length ? Math.min((member.estimate_minutes / totalEstimate) * 100, 100) : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {sorted.length > 0 && (
        <div className="tf-footer-stats">
          <div className="tf-footer-stat">
            <span>Total open tasks</span>
            <strong>{formatNumber(totalOpen)}</strong>
          </div>
          <div className="tf-footer-stat">
            <span>Total estimated effort</span>
            <strong>{formatHours(totalEstimate)}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
