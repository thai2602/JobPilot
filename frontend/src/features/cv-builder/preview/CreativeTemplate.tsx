import { Mail, MapPin, Phone } from "lucide-react";
import SocialIcon from "./SocialIcon";
import type { TemplateProps } from "./templateShared";

/** Mẫu "sang-tao" (CV Sáng Tạo): header gradient lớn, bố cục phá cách. */
export default function CreativeTemplate({ cvData }: TemplateProps) {
  const accentColor = cvData.color || "#10b981";
  return (
    <div className="bg-white rounded-[24px]">
      {/* Colorful Huge Header */}
      <div className="px-8 py-10 text-white rounded-t-[24px] relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-6"
        style={{ backgroundImage: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}dd 100%)` }}
      >
        <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="space-y-2 relative z-10">
          <h2 className="text-[34px] font-black tracking-tight leading-none uppercase">{cvData.fullName || "HỌ VÀ TÊN"}</h2>
          <span className="inline-block bg-white/20 backdrop-blur-md px-3 py-1 rounded-lg text-[13px] font-extrabold tracking-wider uppercase">
            🚀 {cvData.jobTitle || "Vị trí ứng tuyển"}
          </span>
        </div>
        {/* Avatar Mock */}
        <div className="w-20 h-20 rounded-full border-4 border-white/30 bg-white/10 flex items-center justify-center text-4xl font-black shrink-0 relative z-10 shadow-lg uppercase backdrop-blur-sm">
          {cvData.fullName ? cvData.fullName[0] : "?"}
        </div>
      </div>

      <div className="p-8 flex flex-col gap-6 bg-white rounded-b-[24px]">
        {/* Contact Quick Bar */}
        <div className="flex flex-wrap gap-4 items-center justify-between border-b border-slate-100 pb-4 text-[12.5px] font-bold text-slate-500">
          {cvData.email && <span className="flex items-center gap-1.5"><Mail className="w-4 h-4 text-slate-500" /> {cvData.email}</span>}
          {cvData.phone && <span className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-slate-500" /> {cvData.phone}</span>}
          {cvData.location && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-slate-500" /> {cvData.location}</span>}
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-8">
          <div className="space-y-6">
            {/* Summary */}
            {cvData.summary && (
              <div className="space-y-2.5">
                <h3 className="text-[14px] font-extrabold uppercase tracking-widest border-b-2 pb-1 inline-block" style={{ color: accentColor, borderColor: accentColor + '20' }}>Về tôi</h3>
                <p className="text-[13px] text-slate-600 leading-relaxed font-semibold text-justify whitespace-pre-wrap">{cvData.summary}</p>
              </div>
            )}

            {/* Experience */}
            {cvData.experiences.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-[14px] font-extrabold uppercase tracking-widest border-b-2 pb-1 inline-block" style={{ color: accentColor, borderColor: accentColor + '20' }}>Kinh nghiệm</h3>
                <div className="space-y-5">
                  {cvData.experiences.map((x, i) => (
                    <div key={i} className="space-y-1 relative pl-4 border-l-2 border-slate-100">
                      <div className="absolute -left-[5.5px] top-1.5 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accentColor }} />
                      <div className="flex justify-between items-baseline gap-2">
                        <p className="font-extrabold text-[13.5px] text-slate-900">{x.position}</p>
                        <span className="text-[10.5px] font-bold text-slate-500 shrink-0">{x.startDate}–{x.endDate}</span>
                      </div>
                      <p className="text-[11.5px] font-extrabold" style={{ color: accentColor }}>{x.company}</p>
                      {x.description && <p className="text-[12.5px] text-slate-500 leading-relaxed whitespace-pre-wrap">{x.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* Skills */}
            {cvData.skills.length > 0 && (
              <div className="space-y-2.5">
                <h3 className="text-[14px] font-extrabold uppercase tracking-widest border-b-2 pb-1 inline-block" style={{ color: accentColor, borderColor: accentColor + '20' }}>Kỹ năng</h3>
                <div className="flex flex-wrap gap-1.5">
                  {cvData.skills.map((s, i) => (
                    <span key={i} className="px-3 py-1 rounded-xl text-[11px] font-bold text-slate-700 border border-slate-200 bg-slate-50 shadow-sm"
                      style={{ borderLeft: `3px solid ${accentColor}` }}
                    >
                      {s.skillName}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {cvData.educations.length > 0 && (
              <div className="space-y-2.5">
                <h3 className="text-[14px] font-extrabold uppercase tracking-widest border-b-2 pb-1 inline-block" style={{ color: accentColor, borderColor: accentColor + '20' }}>Học vấn</h3>
                <div className="space-y-3">
                  {cvData.educations.map((x, i) => (
                    <div key={i} className="space-y-0.5">
                      <p className="font-extrabold text-[13px] text-slate-900 leading-tight">{x.school}</p>
                      <p className="text-[11.5px] text-slate-500 font-semibold">{x.major}</p>
                      <p className="text-[10px] text-slate-500 font-bold">{x.startDate} – {x.endDate}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attachments */}
            {cvData.attachments && cvData.attachments.length > 0 && (
              <div className="space-y-2.5">
                <h3 className="text-[14px] font-extrabold uppercase tracking-widest border-b-2 pb-1 inline-block" style={{ color: accentColor, borderColor: accentColor + '20' }}>Thành tích</h3>
                <ul className="space-y-2 text-[12.5px] font-bold text-slate-600">
                  {cvData.attachments.map((x, i) => (
                    <li key={i} className="flex gap-2 items-start">
                      <span className="text-amber-500 shrink-0">★</span>
                      <div>
                        <p className="text-slate-800 leading-normal">{x.name}</p>
                        <p className="text-[10.5px] text-slate-500 font-medium">{x.organization}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
