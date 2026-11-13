import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, FolderKanban, Users } from 'lucide-react';
import { api } from '@/api';
import { ProjectCard } from '@/components/ProjectCard';
import type { Member, ProjectsResponse, Workspace } from '@/types';

interface WorkspacePageProps {
  workspaceId: number;
}

function MemberRow({ member }: { member: Member }) {
  return (
    <div className="tf-member-row">
      <div className="tf-member-avatar" aria-hidden="true">
        {member.name.charAt(0).toUpperCase()}
      </div>
      <div className="tf-member-info">
        <span className="tf-member-name">{member.name}</span>
        <span className="tf-member-email">{member.email}</span>
      </div>
    </div>
  );
}

export function WorkspacePage({ workspaceId }: WorkspacePageProps) {
  const navigate = useNavigate();

  const {
    data: membersData,
    isLoading: membersLoading,
    error: membersError,
  } = useQuery<Member[]>({
    queryKey: ['/workspaces', workspaceId, 'members'],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/members`);
      return res.data.data;
    },
  });

  const {
    data: projectsData,
    isLoading: projectsLoading,
    error: projectsError,
  } = useQuery<ProjectsResponse>({
    queryKey: ['/workspaces', workspaceId, 'projects', 'workspace'],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/projects?per_page=20`);
      return res.data;
    },
  });

  const { data: workspaceData } = useQuery<Workspace>({
    queryKey: ['/workspaces', workspaceId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}`);
      return res.data;
    },
  });

  const members = membersData ?? [];
  const projects = projectsData?.data ?? [];
  const totalMembers = workspaceData?.members_count ?? members.length;
  const totalProjects = workspaceData?.projects_count ?? projectsData?.total ?? projects.length;
  const title = workspaceData?.name ?? `Workspace ${workspaceId}`;

  const handleCreateProject = () => {
    navigate('/projects');
  };

  return (
    <div className="tf-page">
      <div className="tf-page-head">
        <div className="tf-page-head-text">
          <p className="tf-page-head-eyebrow">Workspace</p>
          <h1 className="tf-page-head-title">{title}</h1>
          <p className="tf-page-head-desc">
            {totalMembers} member{totalMembers !== 1 ? 's' : ''} · {totalProjects} project{totalProjects !== 1 ? 's' : ''}
          </p>
        </div>
        <button type="button" className="tf-page-head-action" onClick={handleCreateProject}>
          <Plus className="tf-page-head-action-icon" aria-hidden="true" />
          <span className="tf-page-head-action-label">New project</span>
        </button>
      </div>

      <section className="tf-section">
        <div className="tf-section-head">
          <h2 className="tf-section-title">Members</h2>
        </div>

        {membersLoading ? (
          <div className="tf-skeleton-list">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="tf-skeleton-row" />
            ))}
          </div>
        ) : membersError ? (
          <div className="tf-error-banner" role="alert">
            Something went wrong loading members. Please try again.
          </div>
        ) : members.length === 0 ? (
          <div className="tf-empty">
            <div className="tf-empty-icon" aria-hidden="true">
              <Users className="h-7 w-7" />
            </div>
            <h3 className="tf-empty-title">No members yet</h3>
            <p className="tf-empty-desc">Invite your team to collaborate on projects here.</p>
          </div>
        ) : (
          <div className="tf-member-list">
            {members.map((member) => (
              <MemberRow key={member.id} member={member} />
            ))}
          </div>
        )}
      </section>

      <section className="tf-section">
        <div className="tf-section-head">
          <h2 className="tf-section-title">Projects</h2>
          <Link to="/projects" className="tf-section-link">View all</Link>
        </div>

        {projectsLoading ? (
          <div className="tf-skeleton-list">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="tf-skeleton-row" />
            ))}
          </div>
        ) : projectsError ? (
          <div className="tf-error-banner" role="alert">
            Something went wrong loading projects. Please try again.
          </div>
        ) : projects.length === 0 ? (
          <div className="tf-empty">
            <div className="tf-empty-icon" aria-hidden="true">
              <FolderKanban className="h-7 w-7" />
            </div>
            <h3 className="tf-empty-title">No projects yet</h3>
            <p className="tf-empty-desc">Create a project to keep related tasks and people together.</p>
            <button type="button" className="tf-empty-btn" onClick={handleCreateProject}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create a project
            </button>
          </div>
        ) : (
          <div className="tf-project-list">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} onClick={() => {}} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
