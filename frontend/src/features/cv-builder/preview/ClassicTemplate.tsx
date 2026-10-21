import { Mail, MapPin, Phone } from "lucide-react";
import SocialIcon from "./SocialIcon";
import { accentH3, type TemplateProps } from "./templateShared";

/** Mẫu "chuan" (CV Chuẩn Mực): một cột truyền thống, header màu. */
export default function ClassicTemplate({ cvData }: TemplateProps) {
  const accentColor = cvData.color || "#10b981";
  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-6 px-8 py-8 text-white transition-all duration-500 rounded-t-[24px]" style={{ backgroundColor: accentColor }}>
        <div className="w-16 h-16 rounded-[16px] bg-white/20 flex items-center justify-center text-3xl font-black shrink-0 shadow-inner backdrop-blur-sm uppercase">
          {cvData.fullName ? cvData.fullName[0] : "?"}
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[26px] font-black tracking-tight leading-none">{cvData.fullName || "Họ và tên"}</p>
          <p className="text-base font-semibold opacity-95">{cvData.jobTitle || "Vị trí ứng tuyển"}</p>
        </div>
      </div>

      <div className="px-8 py-8 flex flex-col gap-8 bg-white rounded-b-[24px]">
        {/* Contact */}
        <section>
          <h3 className={accentH3} style={{ color: accentColor }}>Thông tin liên hệ</h3>
          <ul className="list-none p-0 m-0 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px] text-slate-600 font-semibold">
            {cvData.email && <li className="flex items-center gap-2.5"><div className="p-1.5 rounded-lg bg-slate-50 text-slate-400"><Mail className="w-4 h-4" /></div> {cvData.email}</li>}
            {cvData.phone && <li className="flex items-center gap-2.5"><div className="p-1.5 rounded-lg bg-slate-50 text-slate-400"><Phone className="w-4 h-4" /></div> {cvData.phone}</li>}
            {cvData.location && <li className="flex items-center gap-2.5"><div className="p-1.5 rounded-lg bg-slate-50 text-slate-400"><MapPin className="w-4 h-4" /></div> {cvData.location}</li>}
            {(cvData.socials || []).map((s, idx) => s.url && (
              <li key={idx} className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-slate-50"><SocialIcon platform={s.platform} /></div>
                <a href={s.url} target="_blank" rel="noreferrer" className="hover:underline text-slate-600 truncate">{s.platform}</a>
              </li>
            ))}
          </ul>
        </section>

        {/* Summary */}
        {cvData.summary && (
          <section>
            <h3 className={accentH3} style={{ color: accentColor }}>Giới thiệu bản thân</h3>
            <p className="text-[13.5px] text-slate-700 leading-[1.75] font-medium text-justify whitespace-pre-wrap">{cvData.summary}</p>
          </section>
        )}

        {/* Skills */}
        {cvData.skills.length > 0 && (
          <section>
            <h3 className={accentH3} style={{ color: accentColor }}>Kỹ năng chuyên môn</h3>
            <div className="flex flex-wrap gap-2">
              {cvData.skills.map((s, i) => (
                <span key={i} className="px-3.5 py-1.5 rounded-xl text-[12px] font-bold bg-slate-50 text-slate-700 border border-slate-200/60 shadow-sm">
                  {s.skillName}{s.level ? <span className="opacity-50 ml-1.5 font-medium">| {s.level}</span> : ""}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Experience */}
        {cvData.experiences.length > 0 && (
          <section>
            <h3 className={accentH3} style={{ color: accentColor }}>Kinh nghiệm làm việc</h3>
            <div className="flex flex-col gap-6 border-l-2 border-slate-100 pl-4 ml-1.5">
              {cvData.experiences.map((x, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: accentColor }}></div>
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <p className="text-[15px] font-extrabold text-slate-900 leading-tight">{x.position || "Vị trí"}</p>
                      <p className="text-[13px] font-bold text-slate-500 mt-1">{x.company}</p>
                    </div>
                    {(x.startDate || x.endDate) && (
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded border border-slate-100 shrink-0">
                        {x.startDate}{x.endDate ? ` – ${x.endDate}` : ""}
                      </span>
                    )}
                  </div>
                  {x.description && <p className="text-[13px] text-slate-600 mt-2.5 leading-[1.65] font-medium whitespace-pre-wrap">{x.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Education */}
        {cvData.educations.length > 0 && (
          <section>
            <h3 className={accentH3} style={{ color: accentColor }}>Học vấn</h3>
            <div className="flex flex-col gap-5 border-l-2 border-slate-100 pl-4 ml-1.5">
              {cvData.educations.map((x, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: accentColor }}></div>
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <p className="text-[14.5px] font-extrabold text-slate-900 leading-tight">{x.school || "Tên trường"}</p>
                      {x.major && <p className="text-[13px] font-semibold text-slate-500 mt-1">{x.major}</p>}
                    </div>
                    {(x.startDate || x.endDate) && (
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded border border-slate-100 shrink-0">
                        {x.startDate}{x.endDate ? ` – ${x.endDate}` : ""}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Projects */}
        {cvData.projects.length > 0 && (
          <section>
            <h3 className={accentH3} style={{ color: accentColor }}>Dự án nổi bật</h3>
            <div className="flex flex-col gap-5">
              {cvData.projects.map((x, i) => (
                <div key={i} className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-[15px] font-extrabold text-slate-900 leading-tight">{x.name || "Tên dự án"}</p>
                    {x.link && <a href={x.link} target="_blank" rel="noreferrer" className="text-[12px] font-bold underline" style={{ color: accentColor }}>Xem dự án ↗</a>}
                  </div>
                  {x.description && <p className="text-[13px] text-slate-600 mb-3 leading-[1.6] font-medium whitespace-pre-wrap">{x.description}</p>}
                  {x.technologies && (
                    <div className="flex flex-wrap gap-1.5">
                      {x.technologies.split(',').map(t => t.trim()).filter(Boolean).map((t, j) => (
                        <span key={j} className="px-2.5 py-0.5 rounded bg-white border border-slate-100 text-slate-500 text-[11px] font-bold">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Certifications & Awards */}
        {cvData.attachments && cvData.attachments.length > 0 && (
          <section>
            <h3 className={accentH3} style={{ color: accentColor }}>Chứng chỉ & Giải thưởng</h3>
            <div className="flex flex-col gap-5 border-l-2 border-slate-100 pl-4 ml-1.5">
              {cvData.attachments.map((x, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: accentColor }}></div>
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <p className="text-[14.5px] font-extrabold text-slate-900 leading-tight">
                        <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded mr-2 bg-slate-100 text-slate-500 border border-slate-200">
                          {x.type}
                        </span>
                        {x.name || "Tên chứng chỉ / giải thưởng"}
                      </p>
                      {x.organization && <p className="text-[13px] font-bold text-slate-500 mt-1">{x.organization}</p>}
                    </div>
                    {x.yearOrLevel && (
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded border border-slate-100 shrink-0">
                        {x.yearOrLevel}
                      </span>
                    )}
                  </div>
                  {x.description && <p className="text-[13px] text-slate-600 mt-2 leading-[1.55] font-medium whitespace-pre-wrap">{x.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
