import { useMemo, useState } from 'react';
import { Plus, AlertTriangle, User, Calendar, Flag } from 'lucide-react';

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done';

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deadline?: string;
  estimate_minutes: number;
  assignee?: { id: number; name: string; email: string } | null;
  dependencies: number[];
  position?: number;
}

export interface BoardProps {
  tasks: Task[];
  loading: boolean;
  newTask: () => void;
  openTask: (task: Task) => void;
  onStatusChange: (task: Task, status: TaskStatus) => Promise<void>;
}

const LANES: { id: TaskStatus; label: string }[] = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'todo', label: 'To do' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'in_review', label: 'In review' },
  { id: 'done', label: 'Done' },
];

function formatDeadline(deadline: string): string {
  const match = deadline.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return deadline;
  return `${match[2]}/${match[3]}`;
}

function formatEstimate(minutes: number): string {
  if (minutes <= 0) return '';
  if (minutes < 60) return `${minutes}m`;
  return `${Math.round(minutes / 60)}h`;
}

function TaskMeta({ task }: { task: Task }) {
  const parts: React.ReactNode[] = [];
  if (task.assignee?.name) {
    parts.push(
      <span key="assignee" className="assignee" title={task.assignee.name}>
        <User size={12} aria-hidden="true" />
        {task.assignee.name.charAt(0).toUpperCase()}
      </span>,
    );
  }
  if (task.deadline) {
    parts.push(
      <span key="deadline" className="meta-item" title={`Deadline ${task.deadline}`}>
        <Calendar size={12} aria-hidden="true" />
        {formatDeadline(task.deadline)}
      </span>,
    );
  }
  if (formatEstimate(task.estimate_minutes)) {
    parts.push(
      <span key="estimate" className="meta-item" title={`${task.estimate_minutes} minutes`}>
        <Flag size={12} aria-hidden="true" />
        {formatEstimate(task.estimate_minutes)}
      </span>,
    );
  }
  return <div className="task-meta">{parts}</div>;
}

interface BoardCardProps {
  task: Task;
  dependencies: ReadonlyMap<number, Task>;
  dragging: boolean;
  onDragStart: (event: React.DragEvent<HTMLElement>, task: Task) => void;
  onDragEnd: () => void;
  onOpen: (task: Task) => void;
}

function BoardCard({ task, dependencies, dragging, onDragStart, onDragEnd, onOpen }: BoardCardProps) {
  return (
    <article
      className={`task-card${dragging ? ' task-card--dragging' : ''}`}
      draggable
      onDragStart={(event) => onDragStart(event, task)}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(task)}
      tabIndex={0}
      role="button"
      aria-label={`Open task ${task.id}: ${task.title}`}
    >
      <div className="task-top">
        <span className={`priority ${task.priority}`} aria-label={`Priority ${task.priority}`} />
        <div className="task-body">
          <h3 className="task-title">{task.title}</h3>
          {task.dependencies.length > 0 ? (
            <div className="task-banner" role="alert">
              <AlertTriangle size={12} aria-hidden="true" />
              <span>
                Blocked by
                <span className="dependency-chips">
                  {task.dependencies.map((id) => {
                    const dependency = dependencies.get(id);
                    if (!dependency) return null;
                    return (
                      <span key={dependency.id} className="dependency-chip" title={dependency.title}>
                        {dependency.title}
                      </span>
                    );
                  })}
                </span>
              </span>
            </div>
          ) : null}
        </div>
      </div>
      <TaskMeta task={task} />
    </article>
  );
}

export function Board({ tasks, newTask, openTask, onStatusChange }: BoardProps) {
  const [dragging, setDragging] = useState<number | null>(null);

  const dependencyMap = useMemo(() => new Map<number, Task>(tasks.map((task) => [task.id, task])), [tasks]);

  const handleDragStart = (event: React.DragEvent<HTMLElement>, task: Task) => {
    setDragging(task.id);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(task.id));
  };

  const handleDragEnd = () => {
    setDragging(null);
  };

  const handleDrop = async (event: React.DragEvent<HTMLElement>, toStatus: TaskStatus) => {
    event.preventDefault();
    if (dragging === null) return;
    const task = tasks.find((candidate) => candidate.id === dragging);
    if (!task) {
      setDragging(null);
      return;
    }
    if (task.status === toStatus) {
      setDragging(null);
      return;
    }
    try {
      await onStatusChange(task, toStatus);
    } finally {
      setDragging(null);
    }
  };

  return (
    <div className="board-wrap">
      <div className="kanban" aria-label="Task board">
        {LANES.map((lane) => {
          const items = tasks.filter((task) => task.status === lane.id);
          return (
            <section
              key={lane.id}
              className="lane"
              aria-label={`${lane.label} column`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDrop(event, lane.id)}
            >
              <div className="lane-head">
                <span className={`lane-dot ${lane.id}`} aria-hidden="true" />
                <span className="lane-name">{lane.label}</span>
                <span className="lane-count">{items.length}</span>
                <button
                  type="button"
                  className="icon-plain"
                  aria-label={`Add task to ${lane.label}`}
                  onClick={() => newTask()}
                >
                  <Plus size={14} aria-hidden="true" />
                </button>
              </div>
              {items.length === 0 ? (
                <div className="lane-empty">
                  <span>Drop tasks here</span>
                  <span className="lane-empty-hint">or click + to add</span>
                </div>
              ) : null}
              {items.map((task) => (
                <BoardCard
                  key={task.id}
                  task={task}
                  dependencies={dependencyMap}
                  dragging={dragging === task.id}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onOpen={openTask}
                />
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}
