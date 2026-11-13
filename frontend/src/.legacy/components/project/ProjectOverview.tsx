import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Clock,
  Users,
  TrendingUp,
  Flag,
  ListTodo,
  MoreHorizontal,
  FileText,
} from 'lucide-react'
import { api } from '@/api'
import { Button } from '@/components/ui/button'
import type { ProjectDetail, Member, ProjectLabel, Analytics } from '@/types'

interface ProjectOverviewProps {
  project: ProjectDetail
  workspaceId: number
  members: Member[]
  labels: ProjectLabel[]
  onOpenBoard: () => void
  onCreateTask: () => void
  onEditProject: () => void
}

const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'To do',
  in_progress: 'In progress',
  in_review: 'In review',
  done: 'Done',
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatDuration(start?: string, end?: string): string {
  if (!start || !end) return '—'
  const days = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24))
  if (days <= 1) return '1 day'
  return `${days} days`
}

export function ProjectOverview({
  project,
  members,
  labels,
  onCreateTask,
  onEditProject,
}: ProjectOverviewProps) {
  const { data: analytics } = useQuery<Analytics>({
    queryKey: ['/projects', project.id, 'analytics'],
    queryFn: async () => {
      const res = await api.get(`/projects/${project.id}/analytics`)
      return res.data.data
    },
    enabled: !!project.id,
  })

  const memberCount = members.length
  const labelCount = labels.length
  const { progress: projectProgress, start_date, due_date } = project

  const statusCounts = useMemo(() => {
    if (!analytics) return {}
    const counts: Record<string, number> = {}
    for (const [status, count] of Object.entries(analytics.status_breakdown)) {
      counts[status] = count
    }
    return counts
  }, [analytics])

  const totalTasks = analytics?.total_tasks ?? 0
  const completedTasks = analytics?.completed_tasks ?? 0
  const overdueTasks = analytics?.overdue_tasks ?? 0

  const progress = projectProgress ?? (totalTasks > 0 ? Math.round(100 * completedTasks / totalTasks) : 0)

  return (
    <div className="tf-page">
      <div className="tf-page-head">
        <div className="tf-page-head-text">
          <p className="tf-page-head-eyebrow">Project overview</p>
          <h1 className="tf-page-head-title">{project.name}</h1>
          <p className="tf-page-head-desc">
            {project.key} · {project.status} · {totalTasks} tasks · {progress}% complete
          </p>
        </div>
        <div className="tf-page-head-actions">
          <Button variant="secondary" onClick={onEditProject}>
            <MoreHorizontal size={15} aria-hidden="true" />
            Project settings
          </Button>
          <Button onClick={onCreateTask}>
            <ListTodo size={15} aria-hidden="true" />
            Add task
          </Button>
        </div>
      </div>

      {/* Metadata card */}
      <section className="tf-section">
        <div className="tf-section-head">
          <h2 className="tf-section-title">Project details</h2>
        </div>
        <div className="tf-card">
          <div className="tf-metadata-grid">
            <div className="tf-metadata-item">
              <span className="tf-metadata-label">Key</span>
              <span className="tf-metadata-value">{project.key}</span>
            </div>
            <div className="tf-metadata-item">
              <span className="tf-metadata-label">Status</span>
              <span className="tf-metadata-value tf-metadata-value--status">
                <span className={`tf-status-badge ${project.status}`}>{STATUS_LABELS[project.status] || project.status}</span>
              </span>
            </div>
            <div className="tf-metadata-item">
              <span className="tf-metadata-label">Start date</span>
              <span className="tf-metadata-value">{formatDate(start_date)}</span>
            </div>
            <div className="tf-metadata-item">
              <span className="tf-metadata-label">Due date</span>
              <span className="tf-metadata-value">{formatDate(due_date)}</span>
            </div>
            <div className="tf-metadata-item">
              <span className="tf-metadata-label">Duration</span>
              <span className="tf-metadata-value">{formatDuration(start_date, due_date)}</span>
            </div>
            <div className="tf-metadata-item tf-metadata-item--full">
              <span className="tf-metadata-label">Progress</span>
              <div className="tf-metadata-progress-wrap">
                <div className="tf-metadata-progress">
                  <div
                    className="tf-metadata-progress-fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="tf-metadata-progress-label">{progress}%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Member roster card */}
      {memberCount > 0 && (
        <section className="tf-section">
          <div className="tf-section-head">
            <h2 className="tf-section-title">
              <Users size={16} aria-hidden="true" />
              Member roster
              <span className="tf-section-count">{memberCount}</span>
            </h2>
          </div>
          <div className="tf-member-list">
            {members.map((member) => (
              <div className="tf-member-row" key={member.id}>
                <div className="tf-member-avatar" aria-hidden="true">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div className="tf-member-info">
                  <span className="tf-member-name">{member.name}</span>
                  <span className="tf-member-email">{member.email}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Project labels card */}
      {labelCount > 0 && (
        <section className="tf-section">
          <div className="tf-section-head">
            <h2 className="tf-section-title">
              <Flag size={16} aria-hidden="true" />
              Project labels
              <span className="tf-section-count">{labelCount}</span>
            </h2>
          </div>
          <div className="tf-label-list">
            {labels.map((label) => (
              <span
                className="tf-label-chip"
                key={label.id}
                style={{ backgroundColor: label.color }}
                aria-label={`Label: ${label.name}`}
              >
                {label.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Progress card */}
      <section className="tf-section">
        <div className="tf-section-head">
          <h2 className="tf-section-title">
            <TrendingUp size={16} aria-hidden="true" />
            Progress
          </h2>
        </div>
        <div className="tf-progress-card">
          <div className="tf-progress-top">
            <div className="tf-progress-stat">
              <span className="tf-progress-stat-value">{totalTasks}</span>
              <span className="tf-progress-stat-label">Total tasks</span>
            </div>
            <div className="tf-progress-stat">
              <span className="tf-progress-stat-value">{completedTasks}</span>
              <span className="tf-progress-stat-label">Completed</span>
            </div>
            <div className="tf-progress-stat">
              <span className="tf-progress-stat-value">{overdueTasks}</span>
              <span className="tf-progress-stat-label">Overdue</span>
            </div>
          </div>

          <div className="tf-progress-bar-wrap">
            <div className="tf-progress-bar">
              <div
                className="tf-progress-bar-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="tf-progress-bar-labels">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          <div className="tf-progress-legend">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div className="tf-progress-legend-item" key={status}>
                <span
                  className="tf-progress-legend-dot"
                  style={{
                    backgroundColor:
                      status === 'done'
                        ? '#22c55e'
                        : status === 'in_progress'
                        ? '#f59e0b'
                        : status === 'in_review'
                        ? '#8b5cf6'
                        : status === 'todo'
                        ? '#3b82f6'
                        : '#94a3b8',
                  }}
                />
                <span className="tf-progress-legend-label">
                  {STATUS_LABELS[status] || status}
                </span>
                <span className="tf-progress-legend-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent activity placeholder */}
      <section className="tf-section">
        <div className="tf-section-head">
          <h2 className="tf-section-title">
            <FileText size={16} aria-hidden="true" />
            Recent activity
          </h2>
        </div>
        <div className="tf-empty">
          <div className="tf-empty-icon" aria-hidden="true">
            <Clock size={20} />
          </div>
          <h3 className="tf-empty-title">No activity yet</h3>
          <p className="tf-empty-desc">Start adding tasks and comments to see recent activity here.</p>
        </div>
      </section>
    </div>
  )
}
