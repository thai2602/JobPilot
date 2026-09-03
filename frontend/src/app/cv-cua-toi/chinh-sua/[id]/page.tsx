import type { Metadata } from "next";
import AuthenticatedRoute from "../../../../components/AuthenticatedRoute";
import CvEditorPage from "../../../../features/cv-builder/CvEditorPage";

export const metadata: Metadata = {
  title: "Cập nhật CV | JobPilot",
  description: "Cập nhật nội dung và giao diện CV đã lưu trên JobPilot.",
};

export default function Page() {
  return <AuthenticatedRoute><CvEditorPage /></AuthenticatedRoute>;
}
