import { useTaskDetail } from '@/lib/task';
import { useProjectMembers } from '@/lib/project';
import { TaskDetail } from '@/components/task/TaskDetail';
import { Loader, AlertTriangle } from 'lucide-react';

function PageLoading() {
  return (
    <div className="drawer-backdrop">
      <aside className="task-drawer">
        <div className="drawer-top">
          <Loader className="animate-spin h-4 w-4" />
        </div>
        <div className="drawer-loading">Loading task…</div>
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
          <p>Could not load task.</p>
          <button type="button" className="secondary" onClick={retry}>Retry</button>
        </div>
      </aside>
    </div>
  );
}

export function TaskDetailPage({
  workspaceId,
  projectId,
  taskId,
  onClose,
  onUpdated,
  onCreateSubTask,
}: {
  workspaceId: number;
  projectId: number;
  taskId: number;
  onClose: () => void;
  onUpdated: () => void;
  onCreateSubTask: () => void;
}) {
  const { data: task, isLoading, isError, error, refetch } = useTaskDetail(taskId);
  const { data: members } = useProjectMembers(workspaceId);

  if (isLoading) return <PageLoading />;
  if (isError) return <PageError error={error} retry={() => refetch()} />;
  if (!task) return <PageLoading />;

  return (
    <TaskDetail
      task={task}
      projectId={projectId}
      workspaceId={workspaceId}
      members={members ?? []}
      onClose={onClose}
      onUpdated={onUpdated}
      onCreateSubTask={onCreateSubTask}
    />
  );
}
