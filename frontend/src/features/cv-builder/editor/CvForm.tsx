import type React from "react";
import { Briefcase, Code, FolderGit2, GraduationCap, Mail, MapPin, Phone, Sparkles, User } from "lucide-react";
import { useCvContext, type CvData } from "../CvContext";
import { AutoGrowTextarea, Field, ListSection, inputCls, labelCls, useCvList } from "./formParts";

function PersonalInfoSection() {
  const { cvData, setCvData } = useCvContext();
  const set = (field: keyof CvData) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setCvData((p) => ({ ...p, [field]: e.target.value }));

  const iconInput = (Icon: typeof Mail, props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div className="relative">
      <Icon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
      <input className={`${inputCls} pl-11`} {...props} />
    </div>
  );

  return (
    <section className="mb-8 group">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="p-2 bg-violet-50 rounded-xl text-violet-600 group-hover:bg-violet-100 transition-colors"><User className="w-4 h-4" /></div>
        <h2 className="text-lg font-extrabold text-slate-800">Thông tin cá nhân</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-1.5 md:col-span-2">
          <label className={labelCls}>Họ và tên</label>
          <input className={inputCls} type="text" placeholder="Nguyễn Văn A" value={cvData.fullName} onChange={set("fullName")} />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <label className={labelCls}>Vị trí / Nghề nghiệp</label>
          <input className={inputCls} type="text" placeholder="Frontend Developer" value={cvData.jobTitle} onChange={set("jobTitle")} />
        </div>
        <div className="space-y-1.5 relative">
          <label className={labelCls}>Email</label>
          {iconInput(Mail, { type: "email", placeholder: "example@email.com", value: cvData.email, onChange: set("email") })}
        </div>
        <div className="space-y-1.5 relative">
          <label className={labelCls}>Điện thoại</label>
          {iconInput(Phone, { type: "tel", placeholder: "0901 234 567", value: cvData.phone, onChange: set("phone") })}
        </div>
        <div className="space-y-1.5 md:col-span-2 relative">
          <label className={labelCls}>Địa chỉ</label>
          {iconInput(MapPin, { type: "text", placeholder: "Hà Nội, Việt Nam", value: cvData.location, onChange: set("location") })}
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <label className={labelCls}>Tóm tắt bản thân</label>
          <AutoGrowTextarea
            className="min-h-[120px]"
            rows={3}
            placeholder="Mô tả ngắn về bản thân, mục tiêu nghề nghiệp..."
            value={cvData.summary}
            onValueChange={(summary) => setCvData((p) => ({ ...p, summary }))}
          />
        </div>
      </div>
    </section>
  );
}

function SkillsSection() {
  const { items, add, update, remove } = useCvList("skills", () => ({ skillName: "", level: "Intermediate" }));
  return (
    <ListSection
      icon={Code} iconClass="border-blue-100/40 text-blue-600"
      title="Kỹ năng" addLabel="Thêm kỹ năng"
      emptyText="Chưa có kỹ năng nào. Hãy thêm vài kỹ năng để làm nổi bật hồ sơ của bạn."
      items={items} onAdd={add} onRemove={remove} layout="grid"
      renderItem={(s, i) => (
        <>
          <input className={inputCls} placeholder="Tên kỹ năng (VD: React, Java...)" value={s.skillName}
            onChange={(e) => update(i, "skillName", e.target.value)} />
          <select className={`${inputCls} mt-3`} value={s.level} onChange={(e) => update(i, "level", e.target.value)}>
            <option value="Beginner">Beginner (Mới học)</option>
            <option value="Intermediate">Intermediate (Khá)</option>
            <option value="Advanced">Advanced (Tốt)</option>
            <option value="Expert">Expert (Chuyên gia)</option>
          </select>
        </>
      )}
    />
  );
}

function ExperienceSection() {
  const { items, add, update, remove } = useCvList("experiences", () => ({ company: "", position: "", startDate: "", endDate: "", description: "" }));
  return (
    <ListSection
      icon={Briefcase} iconClass="border-emerald-100/40 text-emerald-600"
      title="Kinh nghiệm làm việc" addLabel="Thêm kinh nghiệm"
      emptyText="Chưa có kinh nghiệm làm việc nào được thêm vào."
      items={items} onAdd={add} onRemove={remove}
      renderItem={(x, i) => (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Tên công ty"><input className={inputCls} placeholder="VD: FPT Software" value={x.company} onChange={(e) => update(i, "company", e.target.value)} /></Field>
            <Field label="Vị trí"><input className={inputCls} placeholder="VD: Software Engineer" value={x.position} onChange={(e) => update(i, "position", e.target.value)} /></Field>
            <Field label="Bắt đầu"><input className={inputCls} placeholder="VD: 06/2022" value={x.startDate} onChange={(e) => update(i, "startDate", e.target.value)} /></Field>
            <Field label="Kết thúc"><input className={inputCls} placeholder="VD: Hiện tại" value={x.endDate} onChange={(e) => update(i, "endDate", e.target.value)} /></Field>
          </div>
          <Field label="Mô tả công việc" className="mt-4">
            <AutoGrowTextarea className="min-h-[100px]" rows={2} placeholder="Mô tả chi tiết công việc và thành tựu đạt được..."
              value={x.description} onValueChange={(v) => update(i, "description", v)} />
          </Field>
        </>
      )}
    />
  );
}

function EducationSection() {
  const { items, add, update, remove } = useCvList("educations", () => ({ school: "", major: "", startDate: "", endDate: "" }));
  return (
    <ListSection
      icon={GraduationCap} iconClass="border-amber-100/40 text-amber-600"
      title="Học vấn" addLabel="Thêm học vấn"
      emptyText="Chưa có thông tin học vấn."
      items={items} onAdd={add} onRemove={remove}
      renderItem={(x, i) => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Tên trường"><input className={inputCls} placeholder="VD: ĐH Công nghệ Thông tin" value={x.school} onChange={(e) => update(i, "school", e.target.value)} /></Field>
          <Field label="Chuyên ngành"><input className={inputCls} placeholder="VD: Khoa học máy tính" value={x.major} onChange={(e) => update(i, "major", e.target.value)} /></Field>
          <Field label="Bắt đầu"><input className={inputCls} placeholder="Năm bắt đầu" value={x.startDate} onChange={(e) => update(i, "startDate", e.target.value)} /></Field>
          <Field label="Kết thúc"><input className={inputCls} placeholder="Năm tốt nghiệp" value={x.endDate} onChange={(e) => update(i, "endDate", e.target.value)} /></Field>
        </div>
      )}
    />
  );
}

function ProjectsSection() {
  const { items, add, update, remove } = useCvList("projects", () => ({ name: "", description: "", technologies: "", link: "" }));
  return (
    <ListSection
      icon={FolderGit2} iconClass="border-rose-100/40 text-rose-600"
      title="Dự án cá nhân" addLabel="Thêm dự án"
      emptyText="Các dự án thực tế sẽ làm CV của bạn nổi bật hơn."
      items={items} onAdd={add} onRemove={remove}
      renderItem={(x, i) => (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Tên dự án"><input className={inputCls} placeholder="Tên dự án" value={x.name} onChange={(e) => update(i, "name", e.target.value)} /></Field>
            <Field label="Link dự án"><input className={inputCls} placeholder="GitHub, Live URL..." value={x.link} onChange={(e) => update(i, "link", e.target.value)} /></Field>
            <Field label="Công nghệ sử dụng" className="md:col-span-2">
              <input className={inputCls} placeholder="VD: React, Spring Boot, MySQL" value={x.technologies} onChange={(e) => update(i, "technologies", e.target.value)} />
            </Field>
          </div>
          <Field label="Mô tả dự án" className="mt-4">
            <AutoGrowTextarea className="min-h-[80px]" rows={2} placeholder="Mô tả dự án và vai trò của bạn..."
              value={x.description} onValueChange={(v) => update(i, "description", v)} />
          </Field>
        </>
      )}
    />
  );
}

function AttachmentsSection() {
  const { items, add, update, remove } = useCvList("attachments", () => ({ type: "CERTIFICATE", name: "", organization: "", yearOrLevel: "", description: "" }));
  return (
    <ListSection
      icon={Sparkles} iconClass="border-amber-100/40 text-amber-600"
      title="Chứng chỉ & Giải thưởng" addLabel="Thêm chứng chỉ"
      emptyText="Chưa có chứng chỉ hay giải thưởng nào được thêm vào."
      items={items} onAdd={add} onRemove={remove}
      renderItem={(x, i) => (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Loại">
              <select className={inputCls} value={x.type} onChange={(e) => update(i, "type", e.target.value)}>
                <option value="CERTIFICATE">CERTIFICATE (Chứng chỉ)</option>
                <option value="AWARD">AWARD (Giải thưởng)</option>
                <option value="SCHOLARSHIP">SCHOLARSHIP (Học bổng)</option>
                <option value="OTHER">OTHER (Khác)</option>
              </select>
            </Field>
            <Field label="Tên chứng chỉ / giải thưởng"><input className={inputCls} placeholder="VD: JLPT N3, IELTS 7.5..." value={x.name} onChange={(e) => update(i, "name", e.target.value)} /></Field>
            <Field label="Tổ chức cấp"><input className={inputCls} placeholder="VD: Japan Foundation, IDP..." value={x.organization} onChange={(e) => update(i, "organization", e.target.value)} /></Field>
            <Field label="Năm / Cấp độ"><input className={inputCls} placeholder="VD: 2024, N3, 7.5..." value={x.yearOrLevel} onChange={(e) => update(i, "yearOrLevel", e.target.value)} /></Field>
          </div>
          <Field label="Mô tả ngắn gọn" className="mt-4">
            <AutoGrowTextarea className="min-h-[80px]" rows={2} placeholder="Mô tả chi tiết giải thưởng hoặc chứng chỉ (nếu có)..."
              value={x.description} onValueChange={(v) => update(i, "description", v)} />
          </Field>
        </>
      )}
    />
  );
}

function SocialsSection() {
  const { items, add, update, remove } = useCvList("socials", () => ({ platform: "LinkedIn", url: "" }));
  return (
    <ListSection
      icon={Mail} iconClass="border-sky-100/40 text-sky-600"
      title="Mạng xã hội & Liên kết" addLabel="Thêm liên kết"
      emptyText="Chưa có liên kết mạng xã hội nào được thêm vào."
      items={items} onAdd={add} onRemove={remove}
      renderItem={(x, i) => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nền tảng">
            <select className={inputCls} value={x.platform} onChange={(e) => update(i, "platform", e.target.value)}>
              <option value="LinkedIn">LinkedIn</option>
              <option value="GitHub">GitHub</option>
              <option value="Portfolio">Portfolio (Trang cá nhân)</option>
              <option value="Facebook">Facebook</option>
              <option value="Twitter">Twitter</option>
              <option value="Other">Khác</option>
            </select>
          </Field>
          <Field label="Đường dẫn liên kết (URL)">
            <input className={inputCls} placeholder="VD: https://github.com/username..." value={x.url} onChange={(e) => update(i, "url", e.target.value)} />
          </Field>
        </div>
      )}
    />
  );
}

const Divider = () => <hr className="border-slate-100 mb-10" />;

export default function CvForm({ onSubmit }: { onSubmit: (e: React.FormEvent) => void }) {
  return (
    <form className="flex-1 bg-white rounded-[20px] border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-5 lg:p-7" onSubmit={onSubmit}>
      <PersonalInfoSection />
      <Divider />
      <SkillsSection />
      <Divider />
      <ExperienceSection />
      <Divider />
      <EducationSection />
      <Divider />
      <ProjectsSection />
      <Divider />
      <AttachmentsSection />
      <Divider />
      <SocialsSection />
    </form>
  );
}
