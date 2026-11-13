import { createContext, useContext, type ReactNode } from "react";
import type { Project } from "@/types";

type User = {
  id: number;
  name: string;
  email: string;
  avatar_url?: string | null;
  has_custom_avatar?: boolean;
  oauth_provider?: "google" | "github" | null;
};
type Workspace = { id: number; name: string; slug?: string };

type AppDialog =
  { kind: "project"; project?: Project } | { kind: "task" } | null;

export type AppContextValue = {
  user: User;
  setUser: (user: User) => void;
  signOut: () => Promise<void>;
  workspace: Workspace;
  workspaces: Workspace[];
  setWorkspaceId: (id: number) => void;
  project?: Project;
  projects: Project[];
  setProjectId: (id: number) => void;
  projectScopeId: number | null;
  setProjectScopeId: (id: number | null) => void;
  search: string;
  setSearch: (query: string) => void;
  dialog: AppDialog;
  openProjectDialog: (project?: Project) => void;
  openTaskDialog: () => void;
  requestTaskDelete: (id: number, name: string) => void;
  closeDialog: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  settingsOpen: boolean;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({
  value,
  children,
}: {
  value: AppContextValue;
  children: ReactNode;
}) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppShell>");
  return ctx;
}

export type { AppDialog, Project, User, Workspace };
export type { User as AppUser, Workspace as AppWorkspace };
