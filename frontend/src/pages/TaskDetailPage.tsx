import { useNavigate, useParams } from "react-router-dom";
import { TaskDetails } from "@/components/tasks/TaskDetails";

export function TaskDetailPage() {
  const navigate = useNavigate();
  const { taskId } = useParams();
  return <TaskDetails taskId={Number(taskId)} onClose={() => navigate(-1)} />;
}
