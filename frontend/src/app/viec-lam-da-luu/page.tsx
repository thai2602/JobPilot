import type { Metadata } from "next";
import SavedJobsPage from "../../features/jobs/SavedJobsPage";

export const metadata: Metadata = {
  title: "Việc làm đã lưu | JobPilot",
  description: "Quản lý và xem lại những cơ hội việc làm bạn đã lưu trên JobPilot.",
};

export default function Page() {
  return <SavedJobsPage />;
}
