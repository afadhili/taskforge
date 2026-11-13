import { FolderKanban } from 'lucide-react';
import type { Project } from '@/types';

interface ProjectCardProps {
  project: Project;
  active?: boolean;
  onClick: () => void;
}

export function ProjectCard({ project, active = false, onClick }: ProjectCardProps) {
  return (
    <button
      type="button"
      className="tf-project-card"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
    >
      <div className="tf-project-card-head">
        <span className="tf-project-card-icon" aria-hidden="true">
          <FolderKanban className="h-4 w-4" />
        </span>
        <span className="tf-project-card-key">{project.key}</span>
      </div>
      <h3 className="tf-project-card-name">{project.name}</h3>
      {project.description ? <p className="tf-project-card-desc">{project.description}</p> : null}
      <div className="tf-project-card-progress-wrap">
        <span className="tf-project-card-progress-label">{project.progress ?? 0}% complete</span>
        <div className="tf-project-card-progress">
          <div
            className="tf-project-card-progress-fill"
            style={{ width: `${project.progress ?? 0}%` }}
          />
        </div>
      </div>
    </button>
  );
}
