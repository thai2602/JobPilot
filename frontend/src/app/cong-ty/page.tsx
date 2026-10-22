import type { Metadata } from "next";
import CompaniesPage from "../../features/companies/CompaniesPage";

export const metadata: Metadata = {
  title: "Danh bạ công ty | JobPilot",
  description: "Khám phá các công ty đang tuyển dụng và vị trí mở trên JobPilot.",
};

export default function Page() {
  return <CompaniesPage />;
}
