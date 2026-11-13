import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { Button } from '@/components/ui/button';

interface AnalyticsData {
  completion_rate: number;
  total_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  status_breakdown: Record<string, number>;
  workload: { user: { id: number; name: string }; open_tasks: number }[];
  sprint_velocity: { sprint: string; completed: number }[];
  health: 'on_track' | 'at_risk';
}

interface AnalyticsPageProps {
  projectId: number;
  projectName: string;
  onRefresh: () => void;
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat().format(n);
}

function formatPercent(n: number): string {
  return `${n.toFixed(1)}%`;
}

function formatHours(minutes: number): string {
  if (minutes <= 0) return '—';
  const h = Math.round(minutes / 60);
  return h === 1 ? '1h' : `${h}h`;
}

export function AnalyticsPage({ projectId, projectName }: AnalyticsPageProps) {
  const {
    data: analytics,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<AnalyticsData>({
    queryKey: ['/projects', projectId, 'analytics'],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/analytics`);
      return res.data.data;
    },
    enabled: !!projectId,
  });

  const statusBreakdown = useMemo(() => {
    const breakdown = analytics?.status_breakdown ?? {};
    return Object.entries(breakdown).map(([key, val]) => ({ status: key, count: val })) ?? [];
  }, [analytics?.status_breakdown]);

  const totalOpenTasks = statusBreakdown.reduce((sum, r) => sum + r.count, 0);

  const maxStatus = useMemo(() => {
    return Math.max(1, ...statusBreakdown.map((r) => r.count));
  }, [statusBreakdown]);

  const workload = analytics?.workload ?? [];

  const velocity = analytics?.sprint_velocity ?? [];

  const healthLabel = analytics?.health === 'on_track' ? 'On track' : 'At risk';
  const healthClass = analytics?.health === 'on_track' ? 'tf-health--on-track' : 'tf-health--at-risk';

  return (
    <div>
      <div className="tf-page-head">
        <div className="tf-page-head-text">
          <p className="tf-page-head-eyebrow">{projectName}</p>
          <h1 className="tf-page-head-title">Analytics</h1>
          <p className="tf-page-head-desc">Insights into progress, risk, and team capacity.</p>
        </div>
        <div className="tf-page-head-actions">
          <Button variant="outline" size="sm" onClick={refetch} disabled={isLoading}>
            <svg viewBox="0 0 14 14" fill="none" className="h-4 w-4" aria-hidden="true">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M7 3.5v5M7 9.5v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="tf-skeleton-list">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="tf-skeleton-row" />
          ))}
        </div>
      ) : isError ? (
        <div className="tf-error-banner" role="alert">
          Could not load analytics. {error instanceof Error ? error.message : 'Please try again.'}{' '}
          <button type="button" className="tf-error-banner__retry" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Health score */}
          <div className={`tf-health-card ${healthClass}`}>
            <div className="tf-health-icon" aria-hidden="true">
              {analytics?.health === 'on_track' ? (
                <svg viewBox="0 0 20 20" fill="none" className="h-6 w-6" aria-hidden="true">
                  <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M8.5 11.5l2.5 2.5M11.5 8.5l-2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 20 20" fill="none" className="h-6 w-6" aria-hidden="true">
                  <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M10 7.5v5M10 12.5v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="10" cy="10" r="1.5" fill="currentColor" />
                </svg>
              )}
            </div>
            <div className="tf-health-body">
              <span className={`tf-health-label ${healthClass}`}>{healthLabel}</span>
              <span className="tf-health-sub">Overall project health</span>
            </div>
          </div>

          {/* Stats row */}
          <div className="tf-stats">
            <div className="tf-stat">
              <span className="tf-stat-value">{formatPercent(analytics?.completion_rate ?? 0)}</span>
              <span className="tf-stat-label">Completion rate</span>
            </div>
            <div className="tf-stat">
              <span className="tf-stat-value">{formatNumber(analytics?.completed_tasks ?? 0)}</span>
              <span className="tf-stat-label">Completed / {formatNumber(analytics?.total_tasks ?? 0)} total</span>
            </div>
            <div className="tf-stat">
              <span className="tf-stat-value tf-stat-value--warn">{formatNumber(analytics?.overdue_tasks ?? 0)}</span>
              <span className="tf-stat-label">Overdue tasks</span>
            </div>
            <div className="tf-stat">
              <span className="tf-stat-value">{formatNumber(totalOpenTasks)}</span>
              <span className="tf-stat-label">Open tasks</span>
            </div>
          </div>

          {/* Charts */}
          <div className="tf-analytics-grid">
            {/* Tasks by status */}
            <section className="tf-panel">
              <h2 className="tf-panel-title">Tasks by status</h2>
              <div className="tf-chart">
                {statusBreakdown.map((row) => (
                  <div key={row.status} className="tf-chart-row">
                    <span className="tf-chart-label">{row.status.replace(/_/g, ' ')}</span>
                    <div className="tf-chart-track">
                      <div
                        className="tf-chart-fill"
                        style={{ width: `${Math.max((row.count / maxStatus) * 100, 3)}%` }}
                      />
                    </div>
                    <span className="tf-chart-value">{formatNumber(row.count)}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Team workload */}
            <section className="tf-panel">
              <h2 className="tf-panel-title">Team workload</h2>
              {workload.length === 0 ? (
                <p className="tf-empty-title" style={{ marginTop: 0 }}>No workload data yet</p>
              ) : (
                <div className="tf-table-wrap">
                  <table className="tf-table">
                    <thead>
                      <tr>
                        <th>Member</th>
                        <th>Open tasks</th>
                        <th>Est. effort</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workload.map((row) => (
                        <tr key={row.user.id}>
                          <td className="tf-table-cell--name">{row.user.name}</td>
                          <td className="tf-table-cell--num">{formatNumber(row.open_tasks)}</td>
                          <td className="tf-table-cell--num">{formatHours(row.open_tasks * 25)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Sprint velocity */}
            <section className="tf-panel">
              <h2 className="tf-panel-title">Sprint velocity</h2>
              {velocity.length === 0 ? (
                <p className="tf-empty-title" style={{ marginTop: 0 }}>Complete a sprint to track velocity</p>
              ) : (
                <div className="tf-chart">
                  {velocity.map((row) => (
                    <div key={row.sprint} className="tf-chart-row">
                      <span className="tf-chart-label">{row.sprint}</span>
                      <div className="tf-chart-track">
                        <div
                          className="tf-chart-fill tf-chart-fill--bar"
                          style={{ width: `${Math.max((row.completed / Math.max(1, velocity.reduce((s, v) => s + v.completed, 0))) * 100, 2)}%` }}
                        />
                      </div>
                      <span className="tf-chart-value">{formatNumber(row.completed)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
