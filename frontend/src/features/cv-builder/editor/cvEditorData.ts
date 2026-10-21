import { Briefcase, Code, FileText, Sparkles } from "lucide-react";
import type { ApiUserCv, ExtractedCv, SaveCvPayload } from "../../../services/cvApi";
import { defaultCvData, type CvData } from "../CvContext";

export const TEMPLATE_OPTIONS = [
  { id: "chuan", name: "CV Chuẩn Mực", color: "#10b981", desc: "Thanh lịch, cổ điển, phù hợp mọi ngành", icon: FileText },
  { id: "cong-nghe", name: "CV Tech Pro", color: "#6366f1", desc: "Hiện đại, tối ưu cho IT & Kỹ thuật", icon: Code },
  { id: "sang-tao", name: "CV Sáng Tạo", color: "#f43f5e", desc: "Phá cách, dành cho Marketing & Design", icon: Sparkles },
  { id: "quan-ly", name: "CV Executive", color: "#f59e0b", desc: "Sang trọng, tôn vinh số liệu lãnh đạo", icon: Briefcase },
];

export const ACCENT_COLORS = [
  { hex: "#2563eb", name: "Deep Blue" },
  { hex: "#1d4ed8", name: "Royal Blue" },
  { hex: "#0ea5e9", name: "Sky Blue" },
  { hex: "#06b6d4", name: "Cyan" },
  { hex: "#10b981", name: "Emerald Green" },
  { hex: "#22c55e", name: "Lime Green" },
  { hex: "#84cc16", name: "Olive Green" },
  { hex: "#6366f1", name: "Indigo Purple" },
  { hex: "#8b5cf6", name: "Violet" },
  { hex: "#a855f7", name: "Purple" },
  { hex: "#d946ef", name: "Magenta" },
  { hex: "#ec4899", name: "Pink" },
  { hex: "#f43f5e", name: "Rose Red" },
  { hex: "#ef4444", name: "Red" },
  { hex: "#f97316", name: "Orange" },
  { hex: "#f59e0b", name: "Amber" },
  { hex: "#eab308", name: "Yellow" },
  { hex: "#14b8a6", name: "Teal" },
  { hex: "#64748b", name: "Slate Gray" },
  { hex: "#6b7280", name: "Cool Gray" },
  { hex: "#111827", name: "Dark Black" },
];

/** CV cũ chưa lưu template thì suy ra từ màu chủ đạo. */
const getTemplateFromColor = (color: string) => {
  if (color === "#6366f1") return "cong-nghe";
  if (color === "#f43f5e") return "sang-tao";
  if (color === "#f59e0b") return "quan-ly";
  return "chuan";
};

export const emptyCvData = (): CvData => ({ ...defaultCvData });

export const mapSavedCvToEditorData = (cv: ApiUserCv): CvData => {
  const color = cv.settings?.themeColor || "#10b981";
  return {
    fullName: cv.fullName || "",
    jobTitle: cv.jobTitle || "",
    email: cv.email || "",
    phone: cv.phone || "",
    location: cv.location || "",
    summary: cv.summary || "",
    color,
    template: cv.settings?.template || getTemplateFromColor(color),
    skills: (cv.skills || []).map((skill) => ({
      skillName: skill.skillName || "",
      level: skill.level || "Intermediate",
    })),
    experiences: (cv.experiences || []).map((experience) => ({
      company: experience.company || "",
      position: experience.position || "",
      startDate: experience.startDate || "",
      endDate: experience.endDate || "",
      description: experience.description || "",
    })),
    educations: (cv.educations || []).map((education) => ({
      school: education.school || education.institution || "",
      major: education.major || education.degree || "",
      startDate: education.startDate || "",
      endDate: education.endDate || "",
    })),
    projects: (cv.projects || []).map((project) => ({
      name: project.name || project.projectName || "",
      description: project.description || "",
      technologies: Array.isArray(project.technologies)
        ? project.technologies.join(", ")
        : project.techStack || "",
      link: project.link || "",
    })),
    attachments: (cv.attachments || []).map((attachment) => ({
      type: attachment.type || "CERTIFICATE",
      name: attachment.name || "",
      organization: attachment.organization || "",
      yearOrLevel: attachment.yearOrLevel || "",
      description: attachment.description || "",
    })),
    socials: (cv.socials || []).map((social) => ({
      platform: social.platform || "LinkedIn",
      url: social.url || "",
    })),
  };
};

/** Gộp dữ liệu trích xuất từ PDF vào CV đang sửa; mục nào PDF không có thì giữ nguyên. */
export const mergeExtractedCv = (prev: CvData, d: ExtractedCv): CvData => ({
  ...prev,
  fullName: d.fullName || prev.fullName,
  jobTitle: d.jobTitle || prev.jobTitle,
  email: d.email || prev.email,
  phone: d.phone || prev.phone,
  location: d.location || prev.location,
  summary: d.summary || prev.summary,
  skills: d.skills?.length
    ? d.skills.map((s) => ({ skillName: s.skillName || "", level: s.level || "Intermediate" }))
    : prev.skills,
  experiences: d.experiences?.length
    ? d.experiences.map((x) => ({
      company: x.company || "", position: x.position || "",
      startDate: x.startDate || "", endDate: x.endDate || "",
      description: x.description || "",
    }))
    : prev.experiences,
  educations: d.educations?.length
    ? d.educations.map((x) => ({
      school: x.school || "", major: x.major || "",
      startDate: x.startDate || "", endDate: x.endDate || "",
    }))
    : prev.educations,
  projects: d.projects?.length
    ? d.projects.map((x) => ({
      name: x.name || "", description: x.description || "",
      technologies: Array.isArray(x.technologies) ? x.technologies.join(", ") : (x.technologies || ""),
      link: x.link || "",
    }))
    : prev.projects,
  attachments: d.attachments?.length
    ? d.attachments.map((a) => ({
      type: a.type || "CERTIFICATE", name: a.name || "",
      organization: a.organization || "", yearOrLevel: a.yearOrLevel || "",
      description: a.description || "",
    }))
    : prev.attachments,
  socials: d.socials?.length
    ? d.socials.map((s) => ({ platform: s.platform || "LinkedIn", url: s.url || "" }))
    : prev.socials,
});

export const buildSavePayload = (cvData: CvData): SaveCvPayload => ({
  cvName: cvData.fullName ? `${cvData.fullName} - CV` : "CV của tôi",
  fullName: cvData.fullName,
  jobTitle: cvData.jobTitle,
  email: cvData.email,
  phone: cvData.phone,
  location: cvData.location,
  summary: cvData.summary,
  settings: { themeColor: cvData.color, template: cvData.template || "chuan" },
  cvData: { skills: cvData.skills, color: cvData.color, template: cvData.template || "chuan" },
  skills: cvData.skills.map((s) => ({ skillName: s.skillName, level: s.level })),
  experiences: cvData.experiences,
  educations: cvData.educations,
  projects: cvData.projects.map((p) => ({
    ...p,
    technologies: p.technologies.split(",").map((t) => t.trim()).filter(Boolean),
  })),
  attachments: cvData.attachments || [],
  socials: cvData.socials || [],
});

export const hasCvContent = (cvData: CvData): boolean =>
  Boolean(cvData.fullName?.trim() || cvData.jobTitle?.trim() || cvData.summary?.trim())
  || cvData.skills.length > 0
  || cvData.experiences.length > 0
  || cvData.projects.length > 0
  || cvData.educations.length > 0;
