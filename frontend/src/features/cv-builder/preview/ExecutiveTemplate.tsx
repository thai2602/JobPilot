import { Mail, MapPin, Phone } from "lucide-react";
import SocialIcon from "./SocialIcon";
import type { TemplateProps } from "./templateShared";

/** Mẫu "quan-ly" (CV Executive): tối giản, không header màu. */
export default function ExecutiveTemplate({ cvData }: TemplateProps) {
  const accentColor = cvData.color || "#10b981";
  return (
    <div className="bg-white rounded-[24px] p-8 sm:p-10 space-y-6 border border-slate-200/60 shadow-lg min-h-[800px] transition-all duration-300">
      {/* Centered Minimalist Header */}
      <div className="text-center space-y-3 pb-6 border-b-2" style={{ borderColor: accentColor }}>
        <h2 className="text-[32px] font-black text-slate-900 tracking-tight leading-none uppercase">{cvData.fullName || "HỌ VÀ TÊN"}</h2>
        <p className="text-[15px] font-bold uppercase tracking-widest" style={{ color: accentColor }}>{cvData.jobTitle || "VỊ TRÍ ỨNG TUYỂN"}</p>

        {/* Inline contact info with divider dots */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[12.5px] font-bold text-slate-500 pt-1">
          {cvData.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {cvData.email}</span>}
          {cvData.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {cvData.phone}</span>}
          {cvData.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {cvData.location}</span>}
        </div>

        {/* Socials quick link list */}
        {(cvData.socials || []).length > 0 && (
          <div className="flex flex-wrap justify-center gap-4 text-[12px] font-extrabold text-slate-600">
            {(cvData.socials || []).map((s, idx) => s.url && (
              <a key={idx} href={s.url} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1 hover:text-slate-900 transition-colors">
                <SocialIcon platform={s.platform} /> <span>{s.platform}</span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* 1. Summary section */}
      {cvData.summary && (
        <div className="space-y-2">
          <h3 className="text-[13px] font-black uppercase tracking-wider border-b pb-1" style={{ color: accentColor, borderColor: accentColor + '30' }}>Tóm lược chuyên môn</h3>
          <p className="text-[13px] text-slate-600 leading-relaxed font-semibold text-justify whitespace-pre-wrap">{cvData.summary}</p>
        </div>
      )}

      {/* 2. Experience */}
      {cvData.experiences.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-[13px] font-black uppercase tracking-wider border-b pb-1" style={{ color: accentColor, borderColor: accentColor + '30' }}>Lịch sử nghề nghiệp</h3>
          <div className="space-y-4">
            {cvData.experiences.map((x, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between items-baseline gap-2">
                  <p className="font-extrabold text-[14.5px] text-slate-900">{x.position}</p>
                  <span className="text-[11.5px] font-bold text-slate-500 shrink-0">{x.startDate} – {x.endDate}</span>
                </div>
                <div className="flex justify-between items-center text-[12.5px] font-bold text-slate-500">
                  <span>{x.company}</span>
                </div>
                {x.description && <p className="text-[13px] text-slate-600 leading-relaxed pt-1.5 text-justify whitespace-pre-wrap">{x.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Education & Skills grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Education */}
        {cvData.educations.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-[13px] font-black uppercase tracking-wider border-b pb-1" style={{ color: accentColor, borderColor: accentColor + '30' }}>Học vấn & Bằng cấp</h3>
            <div className="space-y-3">
              {cvData.educations.map((x, i) => (
                <div key={i} className="space-y-0.5">
                  <div className="flex justify-between items-baseline gap-2">
                    <p className="font-extrabold text-[13px] text-slate-900 leading-snug">{x.school}</p>
                    <span className="text-[10px] font-bold text-slate-500 shrink-0">{x.startDate} – {x.endDate}</span>
                  </div>
                  {x.major && <p className="text-[11.5px] text-slate-500 font-semibold">{x.major}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        {cvData.skills.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-[13px] font-black uppercase tracking-wider border-b pb-1" style={{ color: accentColor, borderColor: accentColor + '30' }}>Kỹ năng cốt lõi</h3>
            <div className="flex flex-wrap gap-1.5">
              {cvData.skills.map((s, i) => (
                <span key={i} className="px-2.5 py-1 rounded bg-slate-50 border border-slate-100 text-[11px] font-bold text-slate-700 shadow-sm">
                  {s.skillName}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. Certifications & Projects */}
      {cvData.attachments && cvData.attachments.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-[13px] font-black uppercase tracking-wider border-b pb-1" style={{ color: accentColor, borderColor: accentColor + '30' }}>Chứng chỉ & Thành tích</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-[12.5px]">
            {cvData.attachments.map((x, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-slate-500 mt-0.5">•</span>
                <div>
                  <p className="font-extrabold text-slate-800 leading-tight">{x.name}</p>
                  <p className="text-[11px] text-slate-500 font-bold">{x.organization} {x.yearOrLevel ? `| ${x.yearOrLevel}` : ""}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
