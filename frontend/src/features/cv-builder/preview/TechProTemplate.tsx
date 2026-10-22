import { Mail, MapPin, Phone } from "lucide-react";
import SocialIcon from "./SocialIcon";
import type { TemplateProps } from "./templateShared";

/** Mẫu "cong-nghe" (CV Tech Pro): hai cột, cột trái nhỏ nền xám. */
export default function TechProTemplate({ cvData }: TemplateProps) {
  const accentColor = cvData.color || "#10b981";
  return (
    <div className="bg-white rounded-[24px]">
      {/* Flat Elegant Header */}
      <div className="p-8 border-b border-slate-100 flex items-center justify-between gap-6">
        <div>
          <h2 className="text-[28px] font-black text-slate-900 tracking-tight leading-none">{cvData.fullName || "Họ và tên"}</h2>
          <p className="text-[14.5px] font-extrabold tracking-widest uppercase mt-2" style={{ color: accentColor }}>{cvData.jobTitle || "Vị trí ứng tuyển"}</p>
        </div>
        <div className="w-16 h-16 rounded-[16px] flex items-center justify-center text-3xl font-black text-white shrink-0 shadow-md uppercase" style={{ backgroundColor: accentColor }}>
          {cvData.fullName ? cvData.fullName[0] : "?"}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_1.7fr] min-h-[600px]">
        {/* Left Column (Sidebar) */}
        <div className="bg-slate-50/80 p-6 space-y-6 border-r border-slate-100 rounded-bl-[24px]">
          {/* Contact */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-extrabold uppercase tracking-widest border-b border-slate-200 pb-1 text-slate-500">Liên hệ</h4>
            <ul className="space-y-2.5 text-[12px] font-bold text-slate-600 break-all">
              {cvData.email && <li className="flex gap-2"><Mail className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: accentColor }} /> <span>{cvData.email}</span></li>}
              {cvData.phone && <li className="flex gap-2"><Phone className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: accentColor }} /> <span>{cvData.phone}</span></li>}
              {cvData.location && <li className="flex gap-2"><MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: accentColor }} /> <span>{cvData.location}</span></li>}
              {(cvData.socials || []).map((s, idx) => s.url && (
                <li key={idx} className="flex gap-2">
                  <span className="shrink-0 mt-0.5"><SocialIcon platform={s.platform} /></span>
                  <a href={s.url} target="_blank" rel="noreferrer" className="hover:underline truncate">{s.platform}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Skills */}
          {cvData.skills.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-[11px] font-extrabold uppercase tracking-widest border-b border-slate-200 pb-1 text-slate-500">Kỹ năng</h4>
              <div className="flex flex-wrap gap-1.5">
                {cvData.skills.map((s, i) => (
                  <span key={i} className="px-2 py-1 rounded-lg text-[11px] font-bold bg-white border border-slate-200/50 text-slate-700 shadow-sm">
                    {s.skillName}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {cvData.attachments && cvData.attachments.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-[11px] font-extrabold uppercase tracking-widest border-b border-slate-200 pb-1 text-slate-500">Chứng chỉ</h4>
              <div className="flex flex-col gap-2">
                {cvData.attachments.map((x, i) => (
                  <div key={i} className="text-[11.5px] leading-relaxed">
                    <p className="font-extrabold text-slate-800">{x.name}</p>
                    <p className="text-[10px] text-slate-500 font-bold">{x.organization} {x.yearOrLevel ? `(${x.yearOrLevel})` : ""}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (Main) */}
        <div className="p-6 space-y-6">
          {/* Summary */}
          {cvData.summary && (
            <div className="space-y-2">
              <h3 className="text-[13px] font-black uppercase tracking-wider" style={{ color: accentColor }}>Về bản thân</h3>
              <p className="text-[13px] text-slate-600 leading-relaxed font-semibold text-justify whitespace-pre-wrap">{cvData.summary}</p>
            </div>
          )}

          {/* Experience */}
          {cvData.experiences.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[13px] font-black uppercase tracking-wider" style={{ color: accentColor }}>Kinh nghiệm làm việc</h3>
              <div className="space-y-4">
                {cvData.experiences.map((x, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-extrabold text-[14px] text-slate-900 leading-tight">{x.position}</p>
                      <span className="text-[10.5px] font-bold text-slate-500 shrink-0">{x.startDate} – {x.endDate}</span>
                    </div>
                    <p className="text-[12px] font-bold text-slate-500">{x.company}</p>
                    {x.description && <p className="text-[12.5px] text-slate-600 leading-relaxed pt-1 whitespace-pre-wrap">{x.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {cvData.educations.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[13px] font-black uppercase tracking-wider" style={{ color: accentColor }}>Học vấn</h3>
              <div className="space-y-3">
                {cvData.educations.map((x, i) => (
                  <div key={i} className="space-y-0.5">
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-extrabold text-[13.5px] text-slate-900 leading-tight">{x.school}</p>
                      <span className="text-[10.5px] font-bold text-slate-500 shrink-0">{x.startDate} – {x.endDate}</span>
                    </div>
                    {x.major && <p className="text-[12px] font-bold text-slate-500">{x.major}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {cvData.projects.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[13px] font-black uppercase tracking-wider" style={{ color: accentColor }}>Dự án cá nhân</h3>
              <div className="grid grid-cols-1 gap-3">
                {cvData.projects.map((x, i) => (
                  <div key={i} className="border border-slate-100 p-3.5 rounded-xl space-y-1.5">
                    <div className="flex justify-between items-center gap-2">
                      <p className="font-extrabold text-[13.5px] text-slate-900 leading-tight">{x.name}</p>
                      {x.link && <a href={x.link} target="_blank" rel="noreferrer" className="text-[11px] font-extrabold underline" style={{ color: accentColor }}>Link ↗</a>}
                    </div>
                    {x.description && <p className="text-[12px] text-slate-600 leading-relaxed line-clamp-2">{x.description}</p>}
                    {x.technologies && (
                      <p className="text-[10.5px] font-extrabold text-slate-500 truncate">Tech: {x.technologies}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
