import type { Metadata } from "next";
import UserProfilePage from "../../features/auth/UserProfilePage";

export const metadata: Metadata = {
  title: "Trung tâm tài khoản | JobPilot",
  description: "Quản lý hồ sơ cá nhân, phiên đăng nhập và dữ liệu tài khoản JobPilot.",
};

export default function Page() {
  return <UserProfilePage />;
}
