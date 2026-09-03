import type { Metadata } from "next";
import RegisterPage from "../../features/auth/RegisterPage";

export const metadata: Metadata = {
  title: "Đăng ký | JobPilot",
  description: "Tạo tài khoản JobPilot để quản lý hành trình tìm việc của bạn.",
};

export default function Page() {
  return <RegisterPage />;
}
