import type { Metadata } from "next";
import LoginPage from "../../features/auth/LoginPage";

export const metadata: Metadata = {
  title: "Đăng nhập | JobPilot",
  description: "Đăng nhập JobPilot để quản lý CV, ứng tuyển và việc làm đã lưu.",
};

export default function Page() {
  return <LoginPage />;
}
