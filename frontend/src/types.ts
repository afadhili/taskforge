// Shared types matching the TaskForge API v1 contract (reviewed by the reviewer).

export type User = {
  id: number;
  name: string;
  email: string;
  avatar_url?: string | null;
  has_custom_avatar?: boolean;
  oauth_provider?: "google" | "github" | null;
};

export type Member = Pick<User, "id" | "name" | "email" | "avatar_url">;

export type Workspace = {
  id: number;
  name: string;
  slug: string;
  members_count?: number;
  projects_count?: number;
};

export type Project = {
  id: number;
  workspace_id: number;
  name: string;
  key: string;
  description?: string;
  status: "active" | "paused" | "completed";
  start_date?: string;
  due_date?: string;
  progress?: number;
  tasks_count?: number;
  created_at: string;
};

export type ProjectsResponse = {
  data: Project[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  next_page_url: string | null;
  prev_page_url: string | null;
};

export type MembersResponse = {
  data: Member[];
};

// Sprint — SprintController + Slack-like SprintResource
export type SprintStatus = "planned" | "active" | "completed" | "cancelled";

export type Sprint = {
  id: number;
  project_id: number;
  name: string;
  starts_at: string;
  ends_at: string;
  status: SprintStatus;
  tasks_count: number;
  completed_tasks_count: number;
  tasks?: Task[]; // eager loaded when fetching a single sprint
};

export type SprintForm = {
  name: string;
  starts_at: string;
  ends_at: string;
  task_ids?: number[];
};

// Sprint-task association pair returned by /projects/{project}/sprints
export type SprintRow = {
  id: number;
  project_id: number;
  name: string;
  starts_at: string;
  ends_at: string;
  status: SprintStatus;
  tasks_count: number;
  completed_tasks_count: number;
};

// Notification — NotificationController + Slack-like NotificationResource
export type Notification = {
  id: string; // UUID string per API contract
  type: string;
  data: Record<string, unknown>;
  created_at: string;
  read_at?: string | null;
};

export type NotificationsResponse = {
  data: Notification[];
  unread_count: number;
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  next_page_url: string | null;
  prev_page_url: string | null;
};

// Toast — used by the global toast system
export type ToastType = "success" | "error" | "info" | "warning";

export type Toast = {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
};

export type Task = {
  id: number;
  project_id: number;
  title: string;
  description?: string;
  status: "backlog" | "todo" | "in_progress" | "in_review" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  deadline?: string;
  estimate_minutes: number;
  assignee?: Pick<User, "id" | "name" | "email" | "avatar_url"> | null;
  dependencies: number[];
  position?: number;
  labels?: { id: number; name: string; color: string }[];
  comments?: {
    id: number;
    body: string;
    user?: { id: number; name: string; email: string };
  }[];
  attachments?: { id: number; original_name: string; download_url: string }[];
};

// ── Project detail ────────────────────────────────────────────────────

export type ProjectLabel = {
  id: number;
  name: string;
  color: string;
};

export type ProjectMember = Member;

export type ProjectDetail = Project & {
  members?: ProjectMember[];
  labels?: ProjectLabel[];
  tasks_count?: number;
  done_tasks_count?: number;
};

// ── Task detail ───────────────────────────────────────────────────────

export type TaskComment = {
  id: number;
  body: string;
  user?: Member;
  created_at: string;
};

export type TaskAttachment = {
  id: number;
  original_name: string;
  mime_type: string;
  size: number;
  download_url: string;
  uploader?: Member;
  created_at: string;
};

export type TaskLabel = {
  id: number;
  name: string;
  color: string;
};

export type TaskDetail = Task & {
  project_id: number;
  labels?: TaskLabel[];
  comments?: TaskComment[];
  attachments?: TaskAttachment[];
  created_at: string;
};

// ── Analytics ─────────────────────────────────────────────────────────

export type Analytics = {
  completion_rate: number;
  total_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  status_breakdown: Record<string, number>;
  workload: {
    user: Pick<User, "id" | "name" | "avatar_url">;
    open_tasks: number;
  }[];
  sprint_velocity: { sprint: string; completed: number }[];
  health: "on_track" | "at_risk";
};

// ── Sprint ────────────────────────────────────────────────────────────
