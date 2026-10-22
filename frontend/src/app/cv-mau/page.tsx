import type { Metadata } from "next";
import CvTemplatesPage from "../../features/cv-builder/CvTemplatesPage";

export const metadata: Metadata = {
  title: "Mẫu CV | JobPilot",
  description: "Chọn mẫu CV chuyên nghiệp và tạo CV trực tuyến miễn phí.",
};

export default function Page() {
  return <CvTemplatesPage />;
}
