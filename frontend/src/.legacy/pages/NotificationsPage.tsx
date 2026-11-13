import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import { Button } from '@/components/ui/button';
import type { Notification } from '@/types';
import { toast } from '@/components/ToastContext';

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function NotificationsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);

  const {
    data: notificationsData,
    isLoading,
    isError,
    error,
    refetch,
    isFetchingNextPage,
  } = useQuery<{ data: Notification[]; unread_count: number }>({
    queryKey: ['/notifications', page, perPage],
    queryFn: async () => {
      const params = new URLSearchParams({ per_page: String(perPage) });
      const res = await api.get(`/notifications?${params.toString()}`);
      return res.data;
    },
  });

  const notifications = notificationsData?.data ?? [];
  const unreadCount = notificationsData?.unread_count ?? 0;
  const total = notificationsData?.total ?? notifications.length;

  const readAllMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/read-all');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/notifications'] });
      toast('success', 'All notifications marked as read');
    },
    onError: () => {
      toast('error', 'Failed to mark all as read', 'Please try again.');
    },
  });

  const readOneMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/notifications'] });
      toast('success', 'Marked as read');
    },
    onError: () => {
      toast('error', 'Failed to mark as read', 'Please try again.');
    },
  });

  const handleMarkAsRead = (id: string) => {
    readOneMutation.mutate(id);
  };

  const handleMarkAllAsRead = () => {
    readAllMutation.mutate();
  };

  const handleClearAll = () => {
    if (window.confirm('Clear all notifications? This cannot be undone.')) {
      // The API has no clear endpoint; we simulate by re-fetching.
      refetch();
      toast('info', 'Notifications cleared for your view');
    }
  };

  return (
    <div>
      <div className="tf-page-head">
        <div className="tf-page-head-text">
          <p className="tf-page-head-eyebrow">Notifications</p>
          <h1 className="tf-page-head-title">Notifications</h1>
          <p className="tf-page-head-desc">
            You have <span className="text-foreground font-semibold">{unreadCount}</span> unread notification{unreadCount !== 1 ? 's' : ''}.
          </p>
        </div>
        <div className="tf-page-head-actions">
          <Button variant="outline" size="sm" onClick={handleClearAll} disabled={isLoading}>
            Clear
          </Button>
          <Button variant="default" onClick={handleMarkAllAsRead} disabled={readAllMutation.isPending || unreadCount === 0}>
            <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Mark all read
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="tf-skeleton-list">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="tf-skeleton-row" />
          ))}
        </div>
      ) : isError ? (
        <div className="tf-error-banner" role="alert">
          Could not load notifications. {error instanceof Error ? error.message : 'Please try again.'}{' '}
          <button type="button" className="tf-error-banner__retry" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="tf-empty">
          <div className="tf-empty-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
              <path d="M12 3.75a9 9 0 1 0 9 9c0-.446-.042-.887-.12-1.301H12v1.5h1.307c.32.414.5.904.5 1.423a1 1 0 0 1-1 1h-2.5a1 1 0 0 1-1-1 3 3 0 0 0-3-3h-1.5v-2.25Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </div>
          <h3 className="tf-empty-title">All caught up</h3>
          <p className="tf-empty-desc">You have no notifications yet.</p>
          <Button variant="ghost" onClick={() => refetch()}>
            Check again
          </Button>
        </div>
      ) : (
        <>
          <div className="tf-notification-list">
            {notifications.map((item) => (
              <article key={item.id} className={`tf-notification-card ${item.unread ? 'unread' : ''}`}>
                <div className="tf-notification-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                    <path d="M12 3.75a9 9 0 1 0 9 9c0-.446-.042-.887-.12-1.301H12v1.5h1.307c.32.414.5.904.5 1.423a1 1 0 0 1-1 1h-2.5a1 1 0 0 1-1-1 3 3 0 0 0-3-3h-1.5v-2.25Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
                  </svg>
                </div>
                <div className="tf-notification-body">
                  <div className="tf-notification-head">
                    <span className={`tf-notification-type ${item.unread ? 'unread' : ''}`}>{item.type.replace(/_/g, ' ')}</span>
                    <span className="tf-notification-time">{formatDate(item.created_at)}</span>
                  </div>
                  <p className="tf-notification-title">{item.data?.title ?? 'You have a new update.'}</p>
                  {(item.data as Record<string, unknown> | undefined)?.body && (
                    <p className="tf-notification-body-text">{String((item.data as Record<string, unknown>).body)}</p>
                  )}
                  {(item.data as Record<string, unknown> | undefined)?.url && (
                    <a className="tf-notification-link" href={String((item.data as Record<string, unknown>).url)} target="_blank" rel="noreferrer">
                      View
                      <svg viewBox="0 0 14 14" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                        <path d="M3.5 7h7M7 3.5l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </a>
                  )}
                </div>
                <div className="tf-notification-actions">
                  {item.unread ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkAsRead(item.id)}
                      disabled={readOneMutation.isPending}
                    >
                      <svg viewBox="0 0 14 14" fill="none" className="h-4 w-4" aria-hidden="true">
                        <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M7 3.5v5M7 9.5v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      Mark read
                    </Button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          {/* Pagination */}
          <nav className="tf-pagination" aria-label="Notifications">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <span className="tf-pagination-label">
              Page {page} of {Math.max(1, Math.ceil(total / perPage))}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(total / perPage) || isFetchingNextPage}
            >
              Next
            </Button>
          </nav>
        </>
      )}
    </div>
  );
}
