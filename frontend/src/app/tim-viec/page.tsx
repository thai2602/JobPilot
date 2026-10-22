import type { Metadata } from "next";
import JobsPage from "../../features/jobs/JobsPage";

export const metadata: Metadata = {
  title: "Tìm việc làm | JobPilot",
  description: "Tìm kiếm việc làm theo từ khóa, địa điểm, cấp bậc và hình thức làm việc.",
};

export default function Page() {
  return <JobsPage />;
}
