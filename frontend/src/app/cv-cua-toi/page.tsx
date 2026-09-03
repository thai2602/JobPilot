import AuthenticatedRoute from "../../components/AuthenticatedRoute";
import MyCvsPage from "../../features/cv-builder/MyCvsPage";

export default function Page() {
  return <AuthenticatedRoute><MyCvsPage /></AuthenticatedRoute>;
}
