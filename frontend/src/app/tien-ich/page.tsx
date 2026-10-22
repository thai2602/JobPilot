import type { Metadata } from "next";
import UtilitiesPage from "../../features/utilities/UtilitiesPage";

export const metadata: Metadata = {
  title: "Công cụ tiện ích | JobPilot",
  description: "Tính lương Gross – Net, so sánh mức lương theo ngành và cấp bậc.",
};

export default function Page() {
  return <UtilitiesPage />;
}
