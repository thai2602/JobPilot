import type { Metadata } from "next";
import AuthenticatedRoute from "../../components/AuthenticatedRoute";
import CvEditorPage from "../../features/cv-builder/CvEditorPage";

export const metadata: Metadata = {
  title: "Chỉnh sửa CV | JobPilot",
  description: "Tạo, chỉnh sửa, xem trước và tối ưu CV trong không gian CV Studio của JobPilot.",
};

export default function Page() {
  return <AuthenticatedRoute><CvEditorPage /></AuthenticatedRoute>;
}
