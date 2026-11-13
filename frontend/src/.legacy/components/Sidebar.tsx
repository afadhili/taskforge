import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Check, Users, Activity, Settings } from 'lucide-react';
import type { Project } from '@/types';

interface SidebarProps {
  workspaceId: number;
  workspaces: { id: number; name: string }[];
  projects: Project[];
  currentProjectId: number;
  page: string;
  onWorkspaceChange: (id: number) => void;
  onNavigate: (to: string) => void;
  onProjectSelect: (id: number) => void;
  onSettingsClick: () => void;
  onSearchChange: (value: string) => void;
  searchValue: string;
  onMobileClose: () => void;
  mobileDrawerOpen: boolean;
  onDrawerToggle: () => void;
}

export function Sidebar({
  workspaceId,
  workspaces,
  projects,
  currentProjectId,
  page,
  onWorkspaceChange,
  onNavigate,
  onProjectSelect,
  onSettingsClick,
  onSearchChange,
  searchValue,
  onMobileClose,
  mobileDrawerOpen,
  onDrawerToggle,
}: SidebarProps) {
  const navigate = useNavigate();

  const navItems = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'projects', label: 'Projects', icon: FolderKanban },
    { key: 'board', label: 'My tasks', icon: Check },
    { key: 'team', label: 'Team workload', icon: Users },
    { key: 'analytics', label: 'Analytics', icon: Activity },
  ];

  return (
    <>
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={onMobileClose} aria-hidden="true" />
      )}
      <aside
        className="sidebar"
        style={{ transform: mobileDrawerOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.2s ease' }}
      >
        <div className="brand">
          <span className="brand-icon">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
              <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </span>
          <span className="brand-text">taskforge</span>
          <button
            type="button"
            className="icon-plain"
            onClick={onDrawerToggle}
            aria-label={mobileDrawerOpen ? 'Close navigation' : 'Open navigation'}
            style={{ display: 'none' }}
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
              <path d="M7 5h10M7 10h10M7 15h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <select
          className="workspace-button"
          value={workspaceId}
          onChange={(e) => onWorkspaceChange(Number(e.target.value))}
          aria-label="Select workspace"
        >
          {(workspaces ?? []).map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>

        <label className="search-box">
          <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
            <circle cx="7" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            placeholder="Search tasks"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
           aria-label="Search tasks"
          />
          <kbd>⌘K</kbd>
        </label>

        <p className="nav-label">Workspace</p>
        <nav className="nav-list">
          {navItems.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className={`nav-button ${page === key ? 'active' : ''}`}
              onClick={() => {
                onNavigate(key);
                onMobileClose();
              }}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="side-projects">
          <div className="project-label">
            <span>Projects</span>
            <button
              type="button"
              className="icon-plain"
              onClick={() => {
                navigate('/projects');
                onMobileClose();
              }}
            >
              <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          {(projects ?? []).length === 0 ? (
            <small className="muted">No projects yet</small>
          ) : (
            (projects ?? []).map((p) => (
              <button
                key={p.id}
                className={`project-link ${p.id === currentProjectId ? 'chosen' : ''}`}
                onClick={() => onProjectSelect(p.id)}
              >
                <i />
                {p.name}
              </button>
            ))
          )}
        </div>

        <div className="sidebar-footer">
          <button
            type="button"
            className="nav-button"
            onClick={() => {
              onSettingsClick();
              onMobileClose();
            }}
          >
            <Settings size={18} aria-hidden="true" />
            <span>Settings</span>
          </button>
          <div className="profile">
            <span className="avatar">{workspaces[workspaceId]?.name?.charAt(0) ?? 'U'}</span>
            <span className="profile-name">{workspaces[workspaceId]?.name ?? 'Workspace'}</span>
          </div>
        </div>
      </aside>
    </>
  );
}
