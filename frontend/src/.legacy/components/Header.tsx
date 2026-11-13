import { Bell, X } from 'lucide-react';
import type { Notification, User } from '@/types';

interface NotificationItem extends Notification {
  unread: boolean;
}

interface HeaderProps {
  user: User;
  notificationsOpen: boolean;
  onNotificationsToggle: () => void;
  onOpenSettings: () => void;
  loading: boolean;
  notifications: NotificationItem[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onNavigateToNotifications: () => void;
}

export function Header({
  user,
  notificationsOpen,
  onNotificationsToggle,
  onOpenSettings,
  loading,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onNavigateToNotifications,
}: HeaderProps) {
  const unread = notifications.filter((n) => n.unread).length;

  return (
    <header className="header">
      <div className="hamburger" onClick={onNotificationsToggle} aria-label="Toggle notifications">
        <Bell size={20} aria-hidden="true" />
      </div>
      <div className="profile">
        <span className="avatar mini">{user.name?.charAt(0) ?? 'U'}</span>
        <span className="profile-name">{user.name ?? 'User'}</span>
        <button
          type="button"
          className="icon-plain"
          onClick={onOpenSettings}
          aria-label="Open settings"
        >
          <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
            <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 2.5v3M8 10.5v3M2.5 8h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {notificationsOpen && (
        <>
          <div className="notification-backdrop" onClick={onNotificationsToggle} aria-hidden="true" />
          <section className="notification-menu">
            <div className="notification-menu-head">
              <strong>Notifications</strong>
              <div className="notification-menu-actions">
                {unread > 0 && (
                  <button
                    type="button"
                    onClick={onMarkAllAsRead}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    Mark all as read
                  </button>
                )}
                <button type="button" className="icon-plain" onClick={onNotificationsToggle} aria-label="Close notifications">
                  <X size={18} />
                </button>
              </div>
            </div>
            {loading ? (
              <p className="notification-empty">Loading…</p>
            ) : unread === 0 ? (
              <p className="notification-empty">You're all caught up.</p>
            ) : (
              <ul className="notification-list">
                {notifications.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`notification-row ${item.unread ? 'unread' : ''}`}
                      onClick={() => {
                        onMarkAsRead(item.id);
                        onNavigateToNotifications();
                        onNotificationsToggle();
                      }}
                    >
                      <span className={`badge ${item.unread ? 'unread' : ''}`} aria-hidden="true" />
                      <div className="notification-content">
                        <span className="notification-type">{item.type.replace(/_/g, ' ')}</span>
                      <span className="notification-title">{String(item.data?.title ?? 'You have a new update.')}</span>
                      </div>
                      <time className="notification-time" dateTime={item.created_at}>
                        {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </time>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </header>
  );
}
