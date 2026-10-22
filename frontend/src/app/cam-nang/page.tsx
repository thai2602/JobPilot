import type { Metadata } from "next";
import HandbookPage from "../../features/blog/HandbookPage";

export const metadata: Metadata = {
  title: "Cẩm nang nghề nghiệp | JobPilot",
  description: "Bài viết hướng dẫn viết CV, phỏng vấn, thương lượng lương và kỹ năng đi làm.",
};

export default function Page() {
  return <HandbookPage />;
}
