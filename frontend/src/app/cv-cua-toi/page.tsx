import type { Metadata } from "next";
import AuthenticatedRoute from "../../components/AuthenticatedRoute";
import MyCvsPage from "../../features/cv-builder/MyCvsPage";

export const metadata: Metadata = {
  title: "CV của tôi | JobPilot",
  description: "Quản lý, chỉnh sửa và tải xuống các CV bạn đã tạo.",
};

export default function Page() {
  return <AuthenticatedRoute><MyCvsPage /></AuthenticatedRoute>;
}
