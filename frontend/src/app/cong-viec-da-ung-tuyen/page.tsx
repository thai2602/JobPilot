import AuthenticatedRoute from "../../components/AuthenticatedRoute";
import AppliedJobsPage from "../../features/jobs/AppliedJobsPage";

export default function Page() {
  return <AuthenticatedRoute><AppliedJobsPage /></AuthenticatedRoute>;
}
