import { FileText } from "lucide-react";
import ClassicTemplate from "./ClassicTemplate";
import CreativeTemplate from "./CreativeTemplate";
import ExecutiveTemplate from "./ExecutiveTemplate";
import TechProTemplate from "./TechProTemplate";
import type { TemplateProps } from "./templateShared";

const templates: Record<string, (props: TemplateProps) => JSX.Element> = {
  "chuan": ClassicTemplate,
  "cong-nghe": TechProTemplate,
  "sang-tao": CreativeTemplate,
  "quan-ly": ExecutiveTemplate,
};

/** Bản xem trước CV theo mẫu đang chọn; CV trống thì hiện hướng dẫn. */
export default function CvPreview({ cvData }: TemplateProps) {
  const hasSections = cvData.skills.length > 0 || cvData.experiences.length > 0 || cvData.educations.length > 0
    || cvData.projects.length > 0 || (cvData.attachments?.length ?? 0) > 0;

  if (!hasSections && !cvData.fullName && !cvData.jobTitle && !cvData.summary) {
    return (
      <div className="flex flex-col items-center justify-center py-32 opacity-40">
        <FileText className="w-20 h-20 mb-5 text-slate-400" />
        <p className="text-slate-400 text-[14px] font-semibold text-center leading-relaxed">
          Bản xem trước CV<br />Hãy điền thông tin ở biểu mẫu bên trái để hiển thị.
        </p>
      </div>
    );
  }

  const Template = templates[cvData.template || "chuan"];
  return Template ? <Template cvData={cvData} /> : null;
}
