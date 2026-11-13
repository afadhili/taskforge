import { Navigate, Route, Routes, useLocation } from "react-router-dom";
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
import { LandingPage } from "@/pages/LandingPage";
import { GuestOnlyRoute } from "@/components/auth/GuestOnlyRoute";

export default function App() {
  const location = useLocation();
  const backgroundLocation = (location.state as { backgroundLocation?: typeof location } | null)
    ?.backgroundLocation;
  const isTaskDetail = /^\/projects\/\d+\/tasks\/\d+$/.test(location.pathname);
  const fallbackLocation = isTaskDetail
    ? { ...location, pathname: "/board", search: "", hash: "", state: null }
    : undefined;

  return (
    <Routes location={backgroundLocation ?? fallbackLocation ?? location}>
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
      <Route element={<AppShell modalLocation={isTaskDetail ? location : null} />}>
        <Route path="/board" element={<BoardPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/tasks" element={<TasksListPage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/assistant" element={<AssistantPage />} />
        <Route path="/projects/:projectId/overview" element={<ProjectOverviewPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
