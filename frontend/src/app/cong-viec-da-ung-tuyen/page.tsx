import type { Metadata } from "next";
import AuthenticatedRoute from "../../components/AuthenticatedRoute";
import AppliedJobsPage from "../../features/jobs/AppliedJobsPage";

export const metadata: Metadata = {
  title: "Việc đã ứng tuyển | JobPilot",
  description: "Theo dõi trạng thái các hồ sơ bạn đã nộp.",
};

export default function Page() {
  return <AuthenticatedRoute><AppliedJobsPage /></AuthenticatedRoute>;
}
