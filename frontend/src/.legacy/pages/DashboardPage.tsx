import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, FolderKanban, Users } from 'lucide-react';
import { api } from '@/api';
import { ProjectCard } from '@/components/ProjectCard';
import type { Member, ProjectsResponse } from '@/types';

interface DashboardPageProps {
  workspaceId: number;
  user: { name: string };
}

export function DashboardPage({ workspaceId, user }: DashboardPageProps) {
  const { data: projectsData, isLoading: projectsLoading, error: projectsError } = useQuery<ProjectsResponse>({
    queryKey: ['/workspaces', workspaceId, 'projects', 'dashboard'],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/projects?per_page=12`);
      return res.data;
    },
  });

  const { data: membersData } = useQuery<Member[]>({
    queryKey: ['/workspaces', workspaceId, 'members'],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/members`);
      return res.data.data;
    },
  });

  const recentProjects = projectsData?.data.slice(0, 6) ?? [];
  const totalProjects = projectsData?.total ?? 0;
  const totalMembers = membersData?.length ?? 0;

  const handleCreateProject = () => {
    window.location.href = '/projects';
  };

  return (
    <div className="tf-page">
      <div className="tf-page-head">
        <div className="tf-page-head-text">
          <p className="tf-page-head-eyebrow">Dashboard</p>
          <h1 className="tf-page-head-title">Welcome back, {user.name.split(' ')[0]}</h1>
          <p className="tf-page-head-desc">Here is what is happening across your workspace.</p>
        </div>
        <button type="button" className="tf-page-head-action" onClick={handleCreateProject}>
          <Plus className="tf-page-head-action-icon" aria-hidden="true" />
          <span className="tf-page-head-action-label">New project</span>
        </button>
      </div>

      <div className="tf-stats">
        <div className="tf-stat">
          <Link to={`/workspace/${workspaceId}`} className="tf-stat-value">
            {totalProjects}
          </Link>
          <span className="tf-stat-label">Total projects</span>
        </div>
        <div className="tf-stat">
          <Link to={`/workspace/${workspaceId}`} className="tf-stat-value">
            {totalMembers}
          </Link>
          <span className="tf-stat-label">Members</span>
        </div>
        <div className="tf-stat">
          <Link to={`/workspace/${workspaceId}`} className="tf-stat-value">
            {recentProjects.length}
          </Link>
          <span className="tf-stat-label">Recent projects</span>
        </div>
      </div>

      <div className="tf-quick-actions">
        <button type="button" className="tf-quick-action" onClick={handleCreateProject}>
          <Plus className="tf-quick-action-icon" aria-hidden="true" />
          <span>Create project</span>
        </button>
        <button type="button" className="tf-quick-action" onClick={() => { window.location.href = '/projects'; }}>
          <FolderKanban className="tf-quick-action-icon" aria-hidden="true" />
          <span>View projects</span>
        </button>
        <button type="button" className="tf-quick-action" onClick={() => { window.location.href = `/workspace/${workspaceId}`; }}>
          <Users className="tf-quick-action-icon" aria-hidden="true" />
          <span>View team</span>
        </button>
      </div>

      <section className="tf-section">
        <div className="tf-section-head">
          <h2 className="tf-section-title">Recent projects</h2>
          <Link to="/projects" className="tf-section-link">View all</Link>
        </div>

        {projectsLoading ? (
          <div className="tf-skeleton-list">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="tf-skeleton-row" />
            ))}
          </div>
        ) : projectsError ? (
          <div className="tf-error-banner" role="alert">
            Something went wrong loading projects. Please try again.
          </div>
        ) : recentProjects.length === 0 ? (
          <div className="tf-empty">
            <div className="tf-empty-icon" aria-hidden="true">
              <FolderKanban className="h-7 w-7" />
            </div>
            <h3 className="tf-empty-title">No projects yet</h3>
            <p className="tf-empty-desc">Create a project to organize tasks, plan sprints, and keep everyone aligned.</p>
            <button type="button" className="tf-empty-btn" onClick={handleCreateProject}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create your first project
            </button>
          </div>
        ) : (
          <div className="tf-project-list">
            {recentProjects.map((project) => (
              <ProjectCard key={project.id} project={project} onClick={() => {}} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
