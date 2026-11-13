import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { AuthPage } from "@/components/auth/AuthPage";
import { OAuthCallback } from "@/components/auth/OAuthCallback";
import { AcceptInvitePage } from "@/components/auth/AcceptInvitePage";
import { BoardPage } from "@/pages/BoardPage";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { OverviewPage } from "@/pages/OverviewPage";
import { TasksListPage } from "@/pages/TasksListPage";
import { TeamPage } from "@/pages/TeamPage";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import { AssistantPage } from "@/pages/AssistantPage";
import { ProjectOverviewPage } from "@/pages/ProjectOverviewPage";
import { TaskDetailPage } from "@/pages/TaskDetailPage";
import { LandingPage } from "@/pages/LandingPage";
import { GuestOnlyRoute } from "@/components/auth/GuestOnlyRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/login"
        element={
          <GuestOnlyRoute>
            <AuthPage />
          </GuestOnlyRoute>
        }
      />
      <Route path="/oauth/:provider/callback" element={<OAuthCallback />} />
      <Route path="/invite/:token" element={<AcceptInvitePage />} />
      <Route element={<AppShell />}>
        <Route path="/board" element={<BoardPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/tasks" element={<TasksListPage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/assistant" element={<AssistantPage />} />
        <Route path="/projects/:projectId/overview" element={<ProjectOverviewPage />} />
        <Route path="/projects/:projectId/tasks/:taskId" element={<TaskDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
