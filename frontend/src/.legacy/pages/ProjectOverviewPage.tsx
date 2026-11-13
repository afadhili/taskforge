import { useProjectDetail, useProjectMembers, useProjectLabels } from '@/lib/project';
import type { ProjectDetail } from '@/types';
import { ProjectOverview } from '@/components/project/ProjectOverview';
import { Loader, AlertTriangle } from 'lucide-react';

function PageLoading() {
  return (
    <div className="drawer-backdrop">
      <aside className="task-drawer">
        <div className="drawer-top">
          <Loader className="animate-spin h-4 w-4" />
        </div>
        <div className="drawer-loading">Loading project…</div>
      </aside>
    </div>
  );
}

function PageError({ error: _error, retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="drawer-backdrop">
      <aside className="task-drawer">
        <div className="drawer-top">
          <AlertTriangle className="icon-plain" />
        </div>
        <div className="drawer-error">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <p>Could not load project.</p>
          <button type="button" className="secondary" onClick={retry}>Retry</button>
        </div>
      </aside>
    </div>
  );
}

export function ProjectOverviewPage({
  workspaceId,
  projectId,
  onOpenBoard,
  onCreateTask,
  onEditProject,
}: {
  workspaceId: number;
  projectId: number;
  onOpenBoard: () => void;
  onCreateTask: () => void;
  onEditProject: () => void;
}) {
  const { data: project, isLoading, isError, error, refetch } = useProjectDetail(projectId, workspaceId);
  const { data: members } = useProjectMembers(workspaceId);
  const { data: labels } = useProjectLabels(workspaceId);

  if (isLoading) return <PageLoading />;
  if (isError) return <PageError error={error} retry={() => refetch()} />;

  return (
    <ProjectOverview
      project={project as ProjectDetail}
      workspaceId={workspaceId}
      members={members ?? []}
      labels={labels ?? []}
      onOpenBoard={onOpenBoard}
      onCreateTask={onCreateTask}
      onEditProject={onEditProject}
    />
  );
}
