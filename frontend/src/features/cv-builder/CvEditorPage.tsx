'use client';

import { useLayoutEffect, useRef, useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import "./cv-builder.css";
import { CvProvider, useCvContext, CvData, Skill, Experience, Education, Project, Attachment, Social } from "./CvContext";
import { readAuthUser } from "../../utils/auth";
import { saveCvsToLocalStorage } from "../../utils/cv";
import { streamChat } from "../../services/chatbotApi";
import { cvApi, type ApiUserCv, type SaveCvPayload } from "../../services/cvApi";
import { userApi } from "../../services/userApi";
import { ApiError } from "../../services/httpClient";
import CvEditorShell from "./CvEditorShell";
import { Plus, Trash2, Upload, FileText, Bot, Eye, EyeOff, User, Briefcase, GraduationCap, Code, FolderGit2, Save, Palette, Mail, Phone, MapPin, ChevronDown, Sparkles, RefreshCw, Linkedin, Github, Globe, ExternalLink } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const TEMPLATE_OPTIONS = [
  { id: "chuan", name: "CV Chuẩn Mực", color: "#10b981", desc: "Thanh lịch, cổ điển, phù hợp mọi ngành", icon: FileText },
  { id: "cong-nghe", name: "CV Tech Pro", color: "#6366f1", desc: "Hiện đại, tối ưu cho IT & Kỹ thuật", icon: Code },
  { id: "sang-tao", name: "CV Sáng Tạo", color: "#f43f5e", desc: "Phá cách, dành cho Marketing & Design", icon: Sparkles },
  { id: "quan-ly", name: "CV Executive", color: "#f59e0b", desc: "Sang trọng, tôn vinh số liệu lãnh đạo", icon: Briefcase },
];

const ACCENT_COLORS = [
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

const getTemplateFromColor = (color: string) => {
  if (color === "#6366f1") return "cong-nghe";
  if (color === "#f43f5e") return "sang-tao";
  if (color === "#f59e0b") return "quan-ly";
  return "chuan";
};

const mapSavedCvToEditorData = (cv: ApiUserCv): CvData => {
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

const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[13.5px] font-medium text-slate-900 outline-none transition-all focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 focus:bg-white placeholder:text-slate-400";
const labelCls = "block text-[12.5px] font-bold text-slate-700 mb-1.5";
const addBtnCls = "px-3.5 py-2 text-[12.5px] font-bold text-violet-700 bg-violet-50 rounded-xl hover:bg-violet-100 hover:scale-105 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95";
const removeBtnCls = "absolute top-3 right-3 p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer";
const cardCls = "border border-slate-100 rounded-[16px] p-4 bg-white shadow-sm relative group hover:border-violet-200 transition-colors";

const accentH3 = "text-[12px] font-extrabold uppercase tracking-widest mb-4 transition-colors duration-300";

function useStagedProgress() {
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const resetTimeoutRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    if (resetTimeoutRef.current !== null) window.clearTimeout(resetTimeoutRef.current);
    intervalRef.current = null;
    resetTimeoutRef.current = null;
  }, []);

  const start = useCallback(() => {
    clearTimers();
    setProgress(1);
    intervalRef.current = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 95) return 95;
        if (current < 35) return Math.min(95, current + 7);
        if (current < 70) return Math.min(95, current + 4);
        return Math.min(95, current + 1);
      });
    }, 320);
  }, [clearTimers]);

  const complete = useCallback(() => {
    clearTimers();
    setProgress(100);
    resetTimeoutRef.current = window.setTimeout(() => {
      setProgress(0);
      resetTimeoutRef.current = null;
    }, 1200);
  }, [clearTimers]);

  const reset = useCallback(() => {
    clearTimers();
    setProgress(0);
  }, [clearTimers]);

  useEffect(() => clearTimers, [clearTimers]);

  return { progress, start, complete, reset };
}

function TaskProgress({ value, label, tone }: { value: number; label: string; tone: "violet" | "emerald" }) {
  const normalizedValue = Math.max(1, Math.min(100, Math.round(value)));
  const fillClass = tone === "violet" ? "bg-violet-600" : "bg-emerald-500";
  const textClass = tone === "violet" ? "text-violet-700" : "text-emerald-700";

  return (
    <div className="mt-2" aria-live="polite">
      <div className={`mb-1 flex items-center justify-between text-[11px] font-bold ${textClass}`}>
        <span>{label}</span>
        <span>{normalizedValue}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={1}
        aria-valuemax={100}
        aria-valuenow={normalizedValue}
        className="h-2 overflow-hidden rounded-full bg-slate-100"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 ease-out ${fillClass}`}
          style={{ width: `${normalizedValue}%` }}
        />
      </div>
    </div>
  );
}

function CvEditorContent() {
  const { cvData, setCvData, dirtyRef, markClean } = useCvContext();
  const router = useRouter();

  const renderSocialIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "linkedin": return <Linkedin className="w-4 h-4 text-sky-600" />;
      case "github": return <Github className="w-4 h-4 text-slate-800" />;
      case "facebook": return <Globe className="w-4 h-4 text-blue-600" />;
      case "twitter": return <Globe className="w-4 h-4 text-sky-400" />;
      default: return <ExternalLink className="w-4 h-4 text-slate-500" />;
    }
  };
  const [isUploading, setIsUploading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  const [isAiReviewVisible, setIsAiReviewVisible] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const uploadProgress = useStagedProgress();
  const aiProgress = useStagedProgress();

  const [savedCvs, setSavedCvs] = useState<ApiUserCv[]>([]);
  const [selectedCvId, setSelectedCvId] = useState<number | "">("");
  const hydratedUrlCvIdRef = useRef<string | null>(null);
  const aiAbortRef = useRef<(() => void) | null>(null);

  const fetchCvs = useCallback(async () => {
    const currentUser = readAuthUser();
    if (!currentUser?.email) return;
    try {
      const { userId } = await userApi.getByEmail(currentUser.email);
      const cvs = await cvApi.listByUser(userId);
      const sorted = [...cvs].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setSavedCvs(sorted);
      saveCvsToLocalStorage(sorted);
    } catch (err) {
      console.error("Failed to fetch CVs", err);
    }
  }, []);

  const { id: urlCvId } = useParams<{ id?: string }>();

  // Auto-load CV khi vào từ route /cv-cua-toi/chinh-sua/:id
  useEffect(() => {
    fetchCvs();
  }, [fetchCvs]);

  useEffect(() => {
    if (!urlCvId) {
      hydratedUrlCvIdRef.current = null;
      return;
    }
    if (hydratedUrlCvIdRef.current === urlCvId || savedCvs.length === 0) return;
    const targetId = Number(urlCvId);
    const found = savedCvs.find((cv) => cv.id === targetId);
    if (!found) return;
    hydratedUrlCvIdRef.current = urlCvId;
    setSelectedCvId(targetId);
    setCvData(mapSavedCvToEditorData(found));
    markClean();
  }, [markClean, savedCvs, setCvData, urlCvId]);

  const handleSelectCv = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) return;
    const nextId = Number(val);
    if (nextId === selectedCvId) return;
    if (dirtyRef.current && !window.confirm("Bạn có thay đổi CV chưa lưu. Bạn có chắc muốn mở CV khác?")) return;

    const selected = savedCvs.find(cv => cv.id === nextId);
    if (selected) {
      hydratedUrlCvIdRef.current = val;
      setSelectedCvId(nextId);
      setCvData(mapSavedCvToEditorData(selected));
      markClean();
      router.replace(`/cv-cua-toi/chinh-sua/${nextId}`);
    }
  };

  const set = (field: keyof CvData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setCvData(p => ({ ...p, [field]: e.target.value }));

  // ── Skills ──
  const addSkill = () => setCvData(p => ({ ...p, skills: [...p.skills, { skillName: "", level: "Intermediate" }] }));
  const updateSkill = (i: number, f: keyof Skill, v: string) =>
    setCvData(p => { const s = [...p.skills]; s[i] = { ...s[i], [f]: v }; return { ...p, skills: s }; });
  const removeSkill = (i: number) => setCvData(p => ({ ...p, skills: p.skills.filter((_, j) => j !== i) }));

  // ── Experiences ──
  const blankExp = (): Experience => ({ company: "", position: "", startDate: "", endDate: "", description: "" });
  const addExp = () => setCvData(p => ({ ...p, experiences: [...p.experiences, blankExp()] }));
  const updateExp = (i: number, f: keyof Experience, v: string) =>
    setCvData(p => { const a = [...p.experiences]; a[i] = { ...a[i], [f]: v }; return { ...p, experiences: a }; });
  const removeExp = (i: number) => setCvData(p => ({ ...p, experiences: p.experiences.filter((_, j) => j !== i) }));

  // ── Educations ──
  const blankEdu = (): Education => ({ school: "", major: "", startDate: "", endDate: "" });
  const addEdu = () => setCvData(p => ({ ...p, educations: [...p.educations, blankEdu()] }));
  const updateEdu = (i: number, f: keyof Education, v: string) =>
    setCvData(p => { const a = [...p.educations]; a[i] = { ...a[i], [f]: v }; return { ...p, educations: a }; });
  const removeEdu = (i: number) => setCvData(p => ({ ...p, educations: p.educations.filter((_, j) => j !== i) }));

  // ── Projects ──
  const blankProj = (): Project => ({ name: "", description: "", technologies: "", link: "" });
  const addProj = () => setCvData(p => ({ ...p, projects: [...p.projects, blankProj()] }));
  const updateProj = (i: number, f: keyof Project, v: string) =>
    setCvData(p => { const a = [...p.projects]; a[i] = { ...a[i], [f]: v }; return { ...p, projects: a }; });
  const removeProj = (i: number) => setCvData(p => ({ ...p, projects: p.projects.filter((_, j) => j !== i) }));

  // ── Attachments ──
  const blankAtt = (): Attachment => ({ type: "CERTIFICATE", name: "", organization: "", yearOrLevel: "", description: "" });
  const addAtt = () => setCvData(p => ({ ...p, attachments: [...(p.attachments || []), blankAtt()] }));
  const updateAtt = (i: number, f: keyof Attachment, v: string) =>
    setCvData(p => { const a = [...(p.attachments || [])]; a[i] = { ...a[i], [f]: v }; return { ...p, attachments: a }; });
  const removeAtt = (i: number) => setCvData(p => ({ ...p, attachments: (p.attachments || []).filter((_, j) => j !== i) }));

  // ── Socials ──
  const blankSocial = (): Social => ({ platform: "LinkedIn", url: "" });
  const addSocial = () => setCvData(p => ({ ...p, socials: [...(p.socials || []), blankSocial()] }));
  const updateSocial = (i: number, f: keyof Social, v: string) =>
    setCvData(p => { const a = [...(p.socials || [])]; a[i] = { ...a[i], [f]: v }; return { ...p, socials: a }; });
  const removeSocial = (i: number) => setCvData(p => ({ ...p, socials: (p.socials || []).filter((_, j) => j !== i) }));

  const stopAiStream = () => {
    aiAbortRef.current?.();
    aiAbortRef.current = null;
    setIsStreaming(false);
    setIsAiLoading(false);
    aiProgress.reset();
  };

  useEffect(() => () => aiAbortRef.current?.(), []);

  const fetchAiScore = (currentCvId?: number, keepCurrentProgress = false) => {
    aiAbortRef.current?.();
    aiAbortRef.current = null;
    if (!keepCurrentProgress) aiProgress.start();
    setIsAiLoading(true);
    setAiFeedback(''); // reset để hiển thị loading khi fetch lại
    setIsStreaming(true);

    // Dùng một session ID tạm thời, mới mỗi lần chấm điểm
    // → tách hoàn toàn khỏi memory chatbot thông thường, tránh tích lũy lịch sử
    const scoringSessionId = `cv-score-${Date.now()}`;
    // activeCvId = CV đang được chọn trong editor → backend tự inject vào context AI
    const activeCvId = currentCvId || (selectedCvId ? Number(selectedCvId) : undefined);

    const hasData =
      (cvData.fullName && cvData.fullName.trim() !== '') ||
      (cvData.jobTitle && cvData.jobTitle.trim() !== '') ||
      (cvData.summary && cvData.summary.trim() !== '') ||
      (cvData.skills && cvData.skills.length > 0) ||
      (cvData.experiences && cvData.experiences.length > 0) ||
      (cvData.projects && cvData.projects.length > 0) ||
      (cvData.educations && cvData.educations.length > 0);

    const apiMessage = hasData
      ? `Hãy chấm điểm CV này của tôi dựa trên dữ liệu sau (JSON): ${JSON.stringify(cvData)}\n\nPhân tích điểm mạnh, điểm yếu và gợi ý cải thiện chi tiết theo tiêu chuẩn ATS và nhà tuyển dụng.`
      : "Hãy chấm điểm CV và gợi ý cách cải thiện để CV trông chuyên nghiệp hơn với nhà tuyển dụng.";

    let firstTokenReceived = false;

    aiAbortRef.current = streamChat(
      apiMessage,
      (token) => {
        if (!firstTokenReceived) {
          setIsAiLoading(false);
          firstTokenReceived = true;
        }
        setAiFeedback((prev) => prev + token);
      },
      () => {
        aiAbortRef.current = null;
        setIsStreaming(false);
        setIsAiLoading(false);
        aiProgress.complete();
      },
      () => {
        aiAbortRef.current = null;
        setAiFeedback("Xin lỗi, đã có lỗi xảy ra khi gọi AI nhận xét. Vui lòng thử lại sau.");
        setIsStreaming(false);
        setIsAiLoading(false);
        aiProgress.reset();
      },
      scoringSessionId,  // ← session riêng, không trùng với chatbot chính
      activeCvId
    );
  };


  const handleScoreCv = async () => {
    setIsPreviewVisible(false);
    if (!isAiReviewVisible) {
      setIsAiReviewVisible(true);
      setAiFeedback('');
      setIsAiLoading(true);
      aiProgress.start();

      // Tự động lưu CV trước khi thực hiện chấm điểm để đảm bảo AI đọc đúng nội dung mới nhất trong DB
      const saveResult = await handleSaveCv();
      if (saveResult) {
        const cvIdToScore = typeof saveResult === 'number' ? saveResult : (selectedCvId ? Number(selectedCvId) : undefined);
        fetchAiScore(cvIdToScore, true);
      } else {
        setAiFeedback("Không thể tự động lưu CV. Vui lòng kiểm tra lại thông tin và thử lại.");
        setIsAiLoading(false);
        aiProgress.reset();
      }
    } else {
      stopAiStream();
      setIsAiReviewVisible(false);
    }
  };

  const handleTogglePreview = () => {
    stopAiStream();
    setIsAiReviewVisible(false);
    setIsPreviewVisible(!isPreviewVisible);
  };

  const handleUploadCv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    uploadProgress.start();
    try {
        const d = await cvApi.extract(file);
        setCvData(prev => ({
          ...prev,
          fullName: d.fullName || prev.fullName,
          jobTitle: d.jobTitle || prev.jobTitle,
          email: d.email || prev.email,
          phone: d.phone || prev.phone,
          location: d.location || prev.location,
          summary: d.summary || prev.summary,
          skills: d.skills?.length ? d.skills.map((s: any) => ({ skillName: s.skillName || "", level: s.level || "Intermediate" })) : prev.skills,
          experiences: d.experiences?.length ? d.experiences.map((x: any) => ({
            company: x.company || "", position: x.position || "",
            startDate: x.startDate || "", endDate: x.endDate || "",
            description: x.description || ""
          })) : prev.experiences,
          educations: d.educations?.length ? d.educations.map((x: any) => ({
            school: x.school || "", major: x.major || "",
            startDate: x.startDate || "", endDate: x.endDate || ""
          })) : prev.educations,
          projects: d.projects?.length ? d.projects.map((x: any) => ({
            name: x.name || "", description: x.description || "",
            technologies: Array.isArray(x.technologies) ? x.technologies.join(", ") : (x.technologies || ""),
            link: x.link || ""
          })) : prev.projects,
          attachments: d.attachments?.length ? d.attachments.map((a: any) => ({
            type: a.type || "CERTIFICATE", name: a.name || "",
            organization: a.organization || "", yearOrLevel: a.yearOrLevel || "",
            description: a.description || ""
          })) : prev.attachments,
          socials: d.socials?.length ? d.socials.map((s: any) => ({
            platform: s.platform || "LinkedIn", url: s.url || ""
           })) : prev.socials,
         }));
        uploadProgress.complete();
    } catch (err) {
      console.error('Extract CV error:', err);
      uploadProgress.reset();
      if (err instanceof ApiError) {
        alert(`Lỗi khi trích xuất dữ liệu CV${err.status ? ` (${err.status})` : ""}. ${err.message}${err.status === 401 || err.status === 403 ? " Vui lòng đăng nhập lại." : ""}`);
      } else {
        alert("Lỗi kết nối khi tải CV.");
      }
    }
    finally { setIsUploading(false); if (e.target) e.target.value = ''; }
  };

  const handleSaveCv = async (e?: React.FormEvent): Promise<number | boolean> => {
    if (e) e.preventDefault();
    const currentUser = readAuthUser();
    if (!currentUser?.email) { setSaveStatus('error'); return false; }
    setSaveStatus('saving');
    const isUpdate = !!selectedCvId; // PUT nếu đang chỉnh CV có sẵn, POST nếu tạo mới

    try {
      const { userId } = await userApi.getByEmail(currentUser.email);

      const cvPayload: SaveCvPayload = {
        userId,
        cvName: cvData.fullName ? cvData.fullName + ' - CV' : 'CV của tôi',
        fullName: cvData.fullName, jobTitle: cvData.jobTitle,
        email: cvData.email, phone: cvData.phone,
        location: cvData.location, summary: cvData.summary,
        settings: { themeColor: cvData.color, template: cvData.template || "chuan" },
        cvData: { skills: cvData.skills, color: cvData.color, template: cvData.template || "chuan" },
        skills: cvData.skills.map(s => ({ skillName: s.skillName, level: s.level })),
        experiences: cvData.experiences,
        educations: cvData.educations,
        projects: cvData.projects.map(p => ({
          ...p,
          technologies: Array.isArray(p.technologies)
            ? p.technologies
            : p.technologies.split(',').map(t => t.trim()).filter(Boolean)
        })),
        attachments: cvData.attachments || [],
        socials: cvData.socials || [],
      };

      const saved = isUpdate
        ? await cvApi.update(Number(selectedCvId), cvPayload)
        : await cvApi.create(cvPayload);
      // Nếu vừa tạo mới, lưu lại ID để lần sau sẽ update thay vì tạo tiếp
      let finalId: number | undefined = selectedCvId ? Number(selectedCvId) : undefined;
      if (!isUpdate) {
        if (saved?.id) {
          setSelectedCvId(saved.id);
          finalId = saved.id;
        }
      }
      setSaveStatus('success');
      markClean();
      await fetchCvs(); // Refresh danh sách CV sau khi lưu thành công
      setTimeout(() => setSaveStatus('idle'), 3000);
      return finalId || true;
    } catch (err) {
      console.error('Save error:', err);
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        alert('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại để lưu CV.');
      }
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
      return false;
    }
  };

  const handleCreateNew = () => {
    if (dirtyRef.current && !window.confirm("Bạn có thay đổi CV chưa lưu. Bạn có chắc muốn tạo CV mới?")) return;
    stopAiStream();
    hydratedUrlCvIdRef.current = null;
    setSelectedCvId("");
    setCvData({
      fullName: '', jobTitle: '', email: '', phone: '',
      location: '', summary: '', color: '#10b981', template: 'chuan',
      skills: [], experiences: [], educations: [], projects: [],
      attachments: [], socials: [],
    });
    markClean();
    setIsPreviewVisible(false);
    setIsAiReviewVisible(false);
    if (urlCvId) router.replace("/cv-editor");
  };

  const renderTemplatePreview = () => {
    const template = cvData.template || "chuan";
    const accentColor = cvData.color || "#10b981";

    const hasData = cvData.skills.length > 0 || cvData.experiences.length > 0 || cvData.educations.length > 0 || cvData.projects.length > 0 || (cvData.attachments && cvData.attachments.length > 0);

    if (!hasData && !cvData.fullName && !cvData.jobTitle && !cvData.summary) {
      return (
        <div className="flex flex-col items-center justify-center py-32 opacity-40">
          <FileText className="w-20 h-20 mb-5 text-slate-400" />
          <p className="text-slate-400 text-[14px] font-semibold text-center leading-relaxed">
            Bản xem trước CV<br />Hãy điền thông tin ở biểu mẫu bên trái để hiển thị.
          </p>
        </div>
      );
    }

    // ── TEMPLATE 1: "chuan" (CV Chuẩn Mực - 1 cột truyền thống có header màu) ──
    if (template === "chuan") {
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
                    <div className="p-1.5 rounded-lg bg-slate-50">{renderSocialIcon(s.platform)}</div>
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

    // ── TEMPLATE 2: "cong-nghe" (CV Tech Pro - 2 cột bất đối xứng, cột trái nhỏ nền xám, cột phải lớn nền trắng) ──
    if (template === "cong-nghe") {
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
                <h4 className="text-[11px] font-extrabold uppercase tracking-widest border-b border-slate-200 pb-1 text-slate-400">Liên hệ</h4>
                <ul className="space-y-2.5 text-[12px] font-bold text-slate-600 break-all">
                  {cvData.email && <li className="flex gap-2"><Mail className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: accentColor }} /> <span>{cvData.email}</span></li>}
                  {cvData.phone && <li className="flex gap-2"><Phone className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: accentColor }} /> <span>{cvData.phone}</span></li>}
                  {cvData.location && <li className="flex gap-2"><MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: accentColor }} /> <span>{cvData.location}</span></li>}
                  {(cvData.socials || []).map((s, idx) => s.url && (
                    <li key={idx} className="flex gap-2">
                      <span className="shrink-0 mt-0.5">{renderSocialIcon(s.platform)}</span>
                      <a href={s.url} target="_blank" rel="noreferrer" className="hover:underline truncate">{s.platform}</a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Skills */}
              {cvData.skills.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[11px] font-extrabold uppercase tracking-widest border-b border-slate-200 pb-1 text-slate-400">Kỹ năng</h4>
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
                  <h4 className="text-[11px] font-extrabold uppercase tracking-widest border-b border-slate-200 pb-1 text-slate-400">Chứng chỉ</h4>
                  <div className="flex flex-col gap-2">
                    {cvData.attachments.map((x, i) => (
                      <div key={i} className="text-[11.5px] leading-relaxed">
                        <p className="font-extrabold text-slate-800">{x.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold">{x.organization} {x.yearOrLevel ? `(${x.yearOrLevel})` : ""}</p>
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
                          <span className="text-[10.5px] font-bold text-slate-400 shrink-0">{x.startDate} – {x.endDate}</span>
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
                          <span className="text-[10.5px] font-bold text-slate-400 shrink-0">{x.startDate} – {x.endDate}</span>
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
                          <p className="text-[10.5px] font-extrabold text-slate-400 truncate">Tech: {x.technologies}</p>
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

    // ── TEMPLATE 3: "sang-tao" (CV Sáng Tạo - Header gradient to bản rực rỡ, bố cục phá cách) ──
    if (template === "sang-tao") {
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
              {cvData.email && <span className="flex items-center gap-1.5"><Mail className="w-4 h-4 text-slate-400" /> {cvData.email}</span>}
              {cvData.phone && <span className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-slate-400" /> {cvData.phone}</span>}
              {cvData.location && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-slate-400" /> {cvData.location}</span>}
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
                            <span className="text-[10.5px] font-bold text-slate-400 shrink-0">{x.startDate}–{x.endDate}</span>
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
                          <p className="text-[10px] text-slate-400 font-bold">{x.startDate} – {x.endDate}</p>
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
                            <p className="text-[10.5px] text-slate-400 font-medium">{x.organization}</p>
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

    // ── TEMPLATE 4: "quan-ly" (CV Executive - Tối giản hoàng gia, không header màu, sang trọng) ──
    if (template === "quan-ly") {
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
                    {renderSocialIcon(s.platform)} <span>{s.platform}</span>
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
                        <span className="text-[10px] font-bold text-slate-400 shrink-0">{x.startDate} – {x.endDate}</span>
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
                    <span className="text-slate-400 mt-0.5">•</span>
                    <div>
                      <p className="font-extrabold text-slate-800 leading-tight">{x.name}</p>
                      <p className="text-[11px] text-slate-400 font-bold">{x.organization} {x.yearOrLevel ? `| ${x.yearOrLevel}` : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  const previewRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    previewRef.current?.style.setProperty("--cv-accent", cvData.color);
  }, [cvData.color]);

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 rounded-[28px]">
      {/* Application navigation is provided by CvEditorShell. */}
      <div className="w-full p-2 sm:p-4 lg:p-6 transition-all duration-500 ease-in-out">
        <div className="w-full max-w-none">

          {/* Header / Top Bar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-3 bg-white p-5 rounded-[20px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-100">
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                <div className="p-2 bg-violet-100 rounded-xl text-violet-600">
                  <FileText className="w-5 h-5" />
                </div>
                Trình chỉnh sửa CV
              </h1>
              <p className="text-slate-500 text-[13.5px] mt-1.5 font-medium">Tạo ấn tượng chuyên nghiệp với mẫu CV được tối ưu hóa</p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              {savedCvs.length > 0 && (
                <div className="relative flex-1 md:w-64">
                  <select
                    aria-label="Mở một CV đã lưu"
                    value={selectedCvId}
                    onChange={handleSelectCv}
                    className="w-full appearance-none pl-4 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[14px] font-semibold text-slate-700 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all cursor-pointer"
                  >
                    <option value="">-- Mở CV đã lưu --</option>
                    {savedCvs.map(cv => (
                      <option key={cv.id} value={cv.id}>
                        {cv.cvName || cv.fullName || "CV không tên"} {cv.createdAt ? `(${new Date(cv.createdAt).toLocaleDateString('vi-VN')})` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
              )}

              <button
                type="button"
                onClick={handleCreateNew}
                className="px-5 py-3 bg-slate-100 text-slate-700 rounded-xl text-[14px] font-bold hover:bg-slate-200 hover:text-slate-900 transition-all flex items-center gap-2 shrink-0 active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo mới</span>
              </button>
            </div>
          </div>

          <div className={`grid grid-cols-1 ${isPreviewVisible || isAiReviewVisible ? 'min-[1760px]:grid-cols-[minmax(0,1fr)_minmax(480px,620px)]' : ''} gap-6 items-start`}>

            {/* Main Content Area (Tools + Editor) */}
            <div className="flex flex-col 2xl:flex-row gap-6">

              {/* Left: Tools Sidebar */}
              <aside className="grid shrink-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] 2xl:sticky 2xl:top-3 2xl:flex 2xl:max-h-[calc(100vh-24px)] 2xl:w-[240px] 2xl:flex-col 2xl:overflow-y-auto">
                {/* Support Tools Card */}
                <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-5">
                  <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">Công cụ hỗ trợ</h2>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 2xl:flex 2xl:flex-col">
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => document.getElementById('cv-upload-input')?.click()}
                        aria-controls="cv-upload-input"
                        disabled={isUploading}
                        className="group relative flex w-full items-center gap-3 overflow-hidden rounded-xl bg-violet-50 px-4 py-3.5 text-[14px] font-bold text-violet-700 transition-all hover:bg-violet-100 disabled:cursor-wait disabled:opacity-70"
                      >
                        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-violet-200/0 via-violet-200/50 to-violet-200/0 group-hover:animate-[shimmer_1.5s_infinite]"></div>
                        <Upload className={`w-5 h-5 transition-transform ${isUploading ? 'animate-pulse' : 'group-hover:-translate-y-0.5'}`} />
                        {isUploading ? `Đang xử lý ${Math.max(1, uploadProgress.progress)}%` : 'Tải CV có sẵn (PDF)'}
                      </button>
                      <input id="cv-upload-input" type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleUploadCv} />
                      {uploadProgress.progress > 0 && (
                        <TaskProgress
                          value={uploadProgress.progress}
                          label={uploadProgress.progress === 100 ? "Đã nhập dữ liệu CV" : "Tải lên & trích xuất PDF"}
                          tone="violet"
                        />
                      )}
                    </div>

                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={handleScoreCv}
                        aria-pressed={isAiReviewVisible}
                        className={`flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-[14px] font-bold transition-all cursor-pointer ${isAiReviewVisible
                          ? 'bg-emerald-600 text-white shadow-[0_8px_20px_rgba(5,150,105,0.25)] hover:bg-emerald-700'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                      >
                        <Bot className={`w-5 h-5 ${isAiLoading || isStreaming ? 'animate-bounce' : ''}`} />
                        {isAiLoading || isStreaming
                          ? `AI đang chấm ${Math.max(1, aiProgress.progress)}%`
                          : isAiReviewVisible ? 'Đóng AI Nhận xét' : 'AI Chấm điểm CV'}
                      </button>
                      {aiProgress.progress > 0 && (
                        <TaskProgress
                          value={aiProgress.progress}
                          label={aiProgress.progress === 100 ? "AI đã hoàn tất nhận xét" : "AI đang phân tích CV"}
                          tone="emerald"
                        />
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleTogglePreview}
                      aria-pressed={isPreviewVisible}
                      className={`w-full px-4 py-3.5 rounded-xl text-[14px] font-bold transition-all flex items-center gap-3 cursor-pointer ${isPreviewVisible
                        ? 'bg-blue-600 text-white shadow-[0_8px_20px_rgba(37,99,235,0.25)] hover:bg-blue-700'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        }`}
                    >
                      {isPreviewVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      {isPreviewVisible ? 'Ẩn Xem trước' : 'Xem trước CV'}
                    </button>

                    <div className="hidden h-px bg-slate-100 my-3 2xl:block"></div>

                    <button
                      type="button"
                      onClick={handleSaveCv}
                      disabled={saveStatus === 'saving'}
                      className="w-full px-4 py-4 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-[14px] font-bold shadow-[0_8px_20px_rgba(0,0,0,0.15)] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                    >
                      {saveStatus === 'saving' ? (
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      ) : <Save className="w-5 h-5" />}
                      {saveStatus === 'saving' && 'Đang lưu...'}
                      {saveStatus === 'success' && 'Đã lưu thành công!'}
                      {saveStatus === 'error' && 'Lỗi lưu CV'}
                      {saveStatus === 'idle' && (selectedCvId ? 'Lưu thay đổi' : 'Tạo & Lưu CV')}
                    </button>
                    <span className="sr-only" role="status" aria-live="polite">
                      {saveStatus === 'saving' ? 'Đang lưu CV' : saveStatus === 'success' ? 'Đã lưu CV thành công' : saveStatus === 'error' ? 'Lưu CV thất bại' : ''}
                    </span>
                  </div>
                </div>

                {/* Templates & Colors Selector Card */}
                <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-5">
                  <div className="flex items-center gap-2 mb-4 px-1">
                    <Palette className="w-4 h-4 text-violet-600" />
                    <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Mẫu giao diện</h2>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 2xl:flex 2xl:flex-col" role="radiogroup" aria-label="Chọn mẫu giao diện CV">
                    {TEMPLATE_OPTIONS.map(opt => {
                      const active = (cvData.template || "chuan") === opt.id;
                      const IconComponent = opt.icon;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => setCvData(p => ({ ...p, template: opt.id }))}
                          className={`group relative flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-300 cursor-pointer bg-white ${active
                            ? 'border-slate-900 -translate-y-1 shadow-[0_12px_24px_rgba(0,0,0,0.06)] scale-[1.02] border-2 z-10'
                            : 'border-slate-100 hover:border-slate-300 hover:-translate-y-0.5 hover:shadow-sm'
                            }`}
                        >
                          <div className={`p-2 rounded-lg shrink-0 transition-colors ${active ? 'bg-slate-100 text-slate-800' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-600'}`}>
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1.5">
                              <p className="font-extrabold text-slate-800 text-[13px] leading-tight group-hover:text-slate-900 transition-colors">{opt.name}</p>
                              {active && (
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-900 text-white leading-none shrink-0 scale-90 font-mono">
                                  Đang dùng
                                </span>
                              )}
                            </div>
                            <p className="text-slate-400 text-[10px] truncate mt-0.5 font-medium">{opt.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="h-px bg-slate-100 my-4"></div>

                  {/* Accent Colors */}
                  <div className="px-1">
                    <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Màu sắc chủ đạo</h2>
                    <div className="flex flex-wrap gap-2 items-center" role="group" aria-label="Chọn màu chủ đạo của CV">
                      {ACCENT_COLORS.map(c => {
                        const active = cvData.color === c.hex;
                        return (
                          <button
                            key={c.hex}
                            type="button"
                            aria-label={`Chọn màu ${c.name}`}
                            aria-pressed={active}
                            onClick={() => setCvData(p => ({ ...p, color: c.hex }))}
                            className={`relative w-6 h-6 rounded-full cursor-pointer transition-all duration-300 ${active
                              ? '-translate-y-1 scale-110'
                              : 'hover:-translate-y-0.5 hover:shadow-md'
                              }`}
                            style={{
                              backgroundColor: c.hex,
                              boxShadow: active ? `0 0 0 2px #fff, 0 0 0 4px ${c.hex}, 0 6px 12px rgba(0,0,0,0.15)` : 'none'
                            }}
                            title={c.name}
                          >
                            {active && (
                              <span className="absolute inset-0 flex items-center justify-center text-white text-[9px] font-bold leading-none">
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </aside>

              {/* Middle: Editor Form */}
              <form className="flex-1 bg-white rounded-[20px] border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-5 lg:p-7" onSubmit={handleSaveCv}>

                {/* Personal info */}
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
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input className={`${inputCls} pl-11`} type="email" placeholder="example@email.com" value={cvData.email} onChange={set("email")} />
                      </div>
                    </div>
                    <div className="space-y-1.5 relative">
                      <label className={labelCls}>Điện thoại</label>
                      <div className="relative">
                        <Phone className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input className={`${inputCls} pl-11`} type="tel" placeholder="0901 234 567" value={cvData.phone} onChange={set("phone")} />
                      </div>
                    </div>
                    <div className="space-y-1.5 md:col-span-2 relative">
                      <label className={labelCls}>Địa chỉ</label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input className={`${inputCls} pl-11`} type="text" placeholder="Hà Nội, Việt Nam" value={cvData.location} onChange={set("location")} />
                      </div>
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className={labelCls}>Tóm tắt bản thân</label>
                      <textarea className={`${inputCls} resize-none min-h-[120px] leading-relaxed overflow-hidden`} rows={3} placeholder="Mô tả ngắn về bản thân, mục tiêu nghề nghiệp..." value={cvData.summary} onChange={e => { set("summary")(e); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }} />
                    </div>
                  </div>
                </section>

                <hr className="border-slate-100 mb-10" />

                {/* Skills */}
                <section className="mb-10 group">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-transparent border border-blue-100/40 rounded-[14px] text-blue-600 transition-colors"><Code className="w-5 h-5" /></div>
                      <h2 className="text-xl font-extrabold text-slate-800">Kỹ năng</h2>
                    </div>
                    <button type="button" className={addBtnCls} onClick={addSkill}>
                      <Plus className="w-4 h-4" /> Thêm kỹ năng
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {cvData.skills.map((s, i) => (
                      <div key={i} className={cardCls}>
                        <button type="button" className={removeBtnCls} onClick={() => removeSkill(i)} title="Xóa">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <input className={inputCls} placeholder="Tên kỹ năng (VD: React, Java...)" value={s.skillName}
                          onChange={e => updateSkill(i, "skillName", e.target.value)} />
                        <select className={`${inputCls} mt-3`} value={s.level} onChange={e => updateSkill(i, "level", e.target.value)}>
                          <option value="Beginner">Beginner (Mới học)</option>
                          <option value="Intermediate">Intermediate (Khá)</option>
                          <option value="Advanced">Advanced (Tốt)</option>
                          <option value="Expert">Expert (Chuyên gia)</option>
                        </select>
                      </div>
                    ))}
                  </div>
                  {cvData.skills.length === 0 && (
                    <div className="text-center py-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 text-[14px] font-medium">
                      Chưa có kỹ năng nào. Hãy thêm vài kỹ năng để làm nổi bật hồ sơ của bạn.
                    </div>
                  )}
                </section>

                <hr className="border-slate-100 mb-10" />

                {/* Experience */}
                <section className="mb-10 group">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-transparent border border-emerald-100/40 rounded-[14px] text-emerald-600 transition-colors"><Briefcase className="w-5 h-5" /></div>
                      <h2 className="text-xl font-extrabold text-slate-800">Kinh nghiệm làm việc</h2>
                    </div>
                    <button type="button" className={addBtnCls} onClick={addExp}>
                      <Plus className="w-4 h-4" /> Thêm kinh nghiệm
                    </button>
                  </div>

                  <div className="flex flex-col gap-4">
                    {cvData.experiences.map((x, i) => (
                      <div key={i} className={cardCls}>
                        <button type="button" className={removeBtnCls} onClick={() => removeExp(i)} title="Xóa">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="block text-[12px] font-bold text-slate-500 uppercase">Tên công ty</label>
                            <input className={inputCls} placeholder="VD: FPT Software" value={x.company} onChange={e => updateExp(i, "company", e.target.value)} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-[12px] font-bold text-slate-500 uppercase">Vị trí</label>
                            <input className={inputCls} placeholder="VD: Software Engineer" value={x.position} onChange={e => updateExp(i, "position", e.target.value)} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-[12px] font-bold text-slate-500 uppercase">Bắt đầu</label>
                            <input className={inputCls} placeholder="VD: 06/2022" value={x.startDate} onChange={e => updateExp(i, "startDate", e.target.value)} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-[12px] font-bold text-slate-500 uppercase">Kết thúc</label>
                            <input className={inputCls} placeholder="VD: Hiện tại" value={x.endDate} onChange={e => updateExp(i, "endDate", e.target.value)} />
                          </div>
                        </div>
                        <div className="mt-4 space-y-1.5">
                          <label className="block text-[12px] font-bold text-slate-500 uppercase">Mô tả công việc</label>
                          <textarea className={`${inputCls} resize-none min-h-[100px] leading-relaxed overflow-hidden`} rows={2} placeholder="Mô tả chi tiết công việc và thành tựu đạt được..." value={x.description} onChange={e => { updateExp(i, "description", e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }} />
                        </div>
                      </div>
                    ))}
                    {cvData.experiences.length === 0 && (
                      <div className="text-center py-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 text-[14px] font-medium">
                        Chưa có kinh nghiệm làm việc nào được thêm vào.
                      </div>
                    )}
                  </div>
                </section>

                <hr className="border-slate-100 mb-10" />

                {/* Education */}
                <section className="mb-10 group">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-transparent border border-amber-100/40 rounded-[14px] text-amber-600 transition-colors"><GraduationCap className="w-5 h-5" /></div>
                      <h2 className="text-xl font-extrabold text-slate-800">Học vấn</h2>
                    </div>
                    <button type="button" className={addBtnCls} onClick={addEdu}>
                      <Plus className="w-4 h-4" /> Thêm học vấn
                    </button>
                  </div>

                  <div className="flex flex-col gap-4">
                    {cvData.educations.map((x, i) => (
                      <div key={i} className={cardCls}>
                        <button type="button" className={removeBtnCls} onClick={() => removeEdu(i)} title="Xóa">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="block text-[12px] font-bold text-slate-500 uppercase">Tên trường</label>
                            <input className={inputCls} placeholder="VD: ĐH Công nghệ Thông tin" value={x.school} onChange={e => updateEdu(i, "school", e.target.value)} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-[12px] font-bold text-slate-500 uppercase">Chuyên ngành</label>
                            <input className={inputCls} placeholder="VD: Khoa học máy tính" value={x.major} onChange={e => updateEdu(i, "major", e.target.value)} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-[12px] font-bold text-slate-500 uppercase">Bắt đầu</label>
                            <input className={inputCls} placeholder="Năm bắt đầu" value={x.startDate} onChange={e => updateEdu(i, "startDate", e.target.value)} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-[12px] font-bold text-slate-500 uppercase">Kết thúc</label>
                            <input className={inputCls} placeholder="Năm tốt nghiệp" value={x.endDate} onChange={e => updateEdu(i, "endDate", e.target.value)} />
                          </div>
                        </div>
                      </div>
                    ))}
                    {cvData.educations.length === 0 && (
                      <div className="text-center py-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 text-[14px] font-medium">
                        Chưa có thông tin học vấn.
                      </div>
                    )}
                  </div>
                </section>

                <hr className="border-slate-100 mb-10" />

                {/* Projects */}
                <section className="mb-10 group">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-transparent border border-rose-100/40 rounded-[14px] text-rose-600 transition-colors"><FolderGit2 className="w-5 h-5" /></div>
                      <h2 className="text-xl font-extrabold text-slate-800">Dự án cá nhân</h2>
                    </div>
                    <button type="button" className={addBtnCls} onClick={addProj}>
                      <Plus className="w-4 h-4" /> Thêm dự án
                    </button>
                  </div>

                  <div className="flex flex-col gap-4">
                    {cvData.projects.map((x, i) => (
                      <div key={i} className={cardCls}>
                        <button type="button" className={removeBtnCls} onClick={() => removeProj(i)} title="Xóa">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="block text-[12px] font-bold text-slate-500 uppercase">Tên dự án</label>
                            <input className={inputCls} placeholder="Tên dự án" value={x.name} onChange={e => updateProj(i, "name", e.target.value)} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-[12px] font-bold text-slate-500 uppercase">Link dự án</label>
                            <input className={inputCls} placeholder="GitHub, Live URL..." value={x.link} onChange={e => updateProj(i, "link", e.target.value)} />
                          </div>
                          <div className="md:col-span-2 space-y-1.5">
                            <label className="block text-[12px] font-bold text-slate-500 uppercase">Công nghệ sử dụng</label>
                            <input className={inputCls} placeholder="VD: React, Spring Boot, MySQL" value={x.technologies} onChange={e => updateProj(i, "technologies", e.target.value)} />
                          </div>
                        </div>
                        <div className="mt-4 space-y-1.5">
                          <label className="block text-[12px] font-bold text-slate-500 uppercase">Mô tả dự án</label>
                          <textarea className={`${inputCls} resize-none min-h-[80px] leading-relaxed overflow-hidden`} rows={2} placeholder="Mô tả dự án và vai trò của bạn..." value={x.description} onChange={e => { updateProj(i, "description", e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }} />
                        </div>
                      </div>
                    ))}
                    {cvData.projects.length === 0 && (
                      <div className="text-center py-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 text-[14px] font-medium">
                        Các dự án thực tế sẽ làm CV của bạn nổi bật hơn.
                      </div>
                    )}
                  </div>
                </section>

                <hr className="border-slate-100 mb-10" />

                {/* Certifications */}
                <section className="mb-10 group">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-transparent border border-amber-100/40 rounded-[14px] text-amber-600 transition-colors"><Sparkles className="w-5 h-5" /></div>
                      <h2 className="text-xl font-extrabold text-slate-800">Chứng chỉ & Giải thưởng</h2>
                    </div>
                    <button type="button" className={addBtnCls} onClick={addAtt}>
                      <Plus className="w-4 h-4" /> Thêm chứng chỉ
                    </button>
                  </div>

                  <div className="flex flex-col gap-4">
                    {(cvData.attachments || []).map((x, i) => (
                      <div key={i} className={cardCls}>
                        <button type="button" className={removeBtnCls} onClick={() => removeAtt(i)} title="Xóa">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="block text-[12px] font-bold text-slate-500 uppercase">Loại</label>
                            <select className={inputCls} value={x.type} onChange={e => updateAtt(i, "type", e.target.value)}>
                              <option value="CERTIFICATE">CERTIFICATE (Chứng chỉ)</option>
                              <option value="AWARD">AWARD (Giải thưởng)</option>
                              <option value="SCHOLARSHIP">SCHOLARSHIP (Học bổng)</option>
                              <option value="OTHER">OTHER (Khác)</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-[12px] font-bold text-slate-500 uppercase">Tên chứng chỉ / giải thưởng</label>
                            <input className={inputCls} placeholder="VD: JLPT N3, IELTS 7.5..." value={x.name} onChange={e => updateAtt(i, "name", e.target.value)} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-[12px] font-bold text-slate-500 uppercase">Tổ chức cấp</label>
                            <input className={inputCls} placeholder="VD: Japan Foundation, IDP..." value={x.organization} onChange={e => updateAtt(i, "organization", e.target.value)} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-[12px] font-bold text-slate-500 uppercase">Năm / Cấp độ</label>
                            <input className={inputCls} placeholder="VD: 2024, N3, 7.5..." value={x.yearOrLevel} onChange={e => updateAtt(i, "yearOrLevel", e.target.value)} />
                          </div>
                        </div>
                        <div className="mt-4 space-y-1.5">
                          <label className="block text-[12px] font-bold text-slate-500 uppercase">Mô tả ngắn gọn</label>
                          <textarea className={`${inputCls} resize-none min-h-[80px] leading-relaxed overflow-hidden`} rows={2} placeholder="Mô tả chi tiết giải thưởng hoặc chứng chỉ (nếu có)..." value={x.description} onChange={e => { updateAtt(i, "description", e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }} />
                        </div>
                      </div>
                    ))}
                    {(cvData.attachments || []).length === 0 && (
                      <div className="text-center py-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 text-[14px] font-medium">
                        Chưa có chứng chỉ hay giải thưởng nào được thêm vào.
                      </div>
                    )}
                  </div>
                </section>

                <hr className="border-slate-100 mb-10" />

                {/* Socials */}
                <section className="mb-10 group">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-transparent border border-sky-100/40 rounded-[14px] text-sky-600 transition-colors"><Mail className="w-5 h-5" /></div>
                      <h2 className="text-xl font-extrabold text-slate-800">Mạng xã hội & Liên kết</h2>
                    </div>
                    <button type="button" className={addBtnCls} onClick={addSocial}>
                      <Plus className="w-4 h-4" /> Thêm liên kết
                    </button>
                  </div>

                  <div className="flex flex-col gap-4">
                    {(cvData.socials || []).map((x, i) => (
                      <div key={i} className={cardCls}>
                        <button type="button" className={removeBtnCls} onClick={() => removeSocial(i)} title="Xóa">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="block text-[12px] font-bold text-slate-500 uppercase">Nền tảng</label>
                            <select className={inputCls} value={x.platform} onChange={e => updateSocial(i, "platform", e.target.value)}>
                              <option value="LinkedIn">LinkedIn</option>
                              <option value="GitHub">GitHub</option>
                              <option value="Portfolio">Portfolio (Trang cá nhân)</option>
                              <option value="Facebook">Facebook</option>
                              <option value="Twitter">Twitter</option>
                              <option value="Other">Khác</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-[12px] font-bold text-slate-500 uppercase">Đường dẫn liên kết (URL)</label>
                            <input className={inputCls} placeholder="VD: https://github.com/username..." value={x.url} onChange={e => updateSocial(i, "url", e.target.value)} />
                          </div>
                        </div>
                      </div>
                    ))}
                    {(cvData.socials || []).length === 0 && (
                      <div className="text-center py-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 text-[14px] font-medium">
                        Chưa có liên kết mạng xã hội nào được thêm vào.
                      </div>
                    )}
                  </div>
                </section>
              </form>
            </div>

            {/* ── Right: preview or AI ── */}
            {(isPreviewVisible || isAiReviewVisible) && (
              <div className="w-full h-fit flex flex-col" aria-label={isPreviewVisible ? "Xem trước CV" : "AI Nhận xét"} role="region">

                {/* Preview View */}
                {isPreviewVisible && (
                  <div ref={previewRef} className="bg-white rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-slate-100 overflow-hidden min-h-[850px] print:shadow-none print:border-none origin-top transition-transform h-fit">
                    {renderTemplatePreview()}
                  </div>
                )}

                {/* AI Chat View */}
                {isAiReviewVisible && (
                  <div className="bg-white rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-slate-100 overflow-hidden flex flex-col min-h-[600px] h-fit">
                    <div className="bg-emerald-600 px-6 py-5 flex justify-between items-center text-white shrink-0 relative overflow-hidden">
                      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 bg-white/20 rounded-[14px] flex items-center justify-center backdrop-blur-md shadow-inner">
                          <Sparkles className="w-6 h-6 text-emerald-50" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-[17px] tracking-tight">Trợ lý AI</h3>
                          <p className="text-[13px] text-emerald-100 font-semibold mt-0.5">Phân tích & Tối ưu CV</p>
                        </div>
                      </div>
                      <button
                        onClick={() => fetchAiScore()}
                        disabled={isAiLoading || isStreaming}
                        className="relative z-10 flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 ${isAiLoading ? 'animate-spin' : ''}`} />
                        Chấm lại
                      </button>
                    </div>
                    <div className="p-6 lg:p-8 bg-slate-50 relative">
                      {aiProgress.progress > 0 && (
                        <div className="mb-6 rounded-2xl border border-emerald-100 bg-white px-4 py-3 shadow-sm">
                          <TaskProgress
                            value={aiProgress.progress}
                            label={aiProgress.progress === 100 ? "Hoàn tất chấm điểm CV" : "Tiến độ phân tích của AI"}
                            tone="emerald"
                          />
                        </div>
                      )}
                      {isAiLoading ? (
                        <div className="flex flex-col items-center justify-center h-full text-emerald-600 gap-5">
                          <div className="relative">
                            <div className="w-14 h-14 border-4 border-emerald-500/20 rounded-full"></div>
                            <div className="w-14 h-14 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin absolute inset-0"></div>
                          </div>
                          <span className="text-[15px] font-bold animate-pulse tracking-wide">AI đang phân tích độ chuyên nghiệp... {Math.max(1, aiProgress.progress)}%</span>
                        </div>
                      ) : (
                        <div className="ai-markdown-body">
                          {aiFeedback ? (
                            <>
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  h1: ({ children }) => <h1 className="text-2xl font-extrabold text-slate-900 mb-4 mt-2 pb-2 border-b border-slate-200">{children}</h1>,
                                  h2: ({ children }) => <h2 className="text-lg font-extrabold text-slate-800 mb-3 mt-6">{children}</h2>,
                                  h3: ({ children }) => <h3 className="text-[15px] font-bold text-slate-700 mb-2 mt-4">{children}</h3>,
                                  p: ({ children }) => <p className="text-[14.5px] text-slate-700 leading-[1.85] mb-3 font-medium">{children}</p>,
                                  ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1.5">{children}</ul>,
                                  ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1.5">{children}</ol>,
                                  li: ({ children }) => <li className="text-[14px] text-slate-700 leading-[1.75] font-medium">{children}</li>,
                                  strong: ({ children }) => <strong className="font-bold text-slate-900">{children}</strong>,
                                  em: ({ children }) => <em className="italic text-slate-600">{children}</em>,
                                  blockquote: ({ children }) => <blockquote className="border-l-4 border-emerald-400 pl-4 py-1 my-3 bg-emerald-50 rounded-r-xl text-slate-600 italic">{children}</blockquote>,
                                  code: ({ children }) => <code className="bg-slate-100 text-emerald-700 px-1.5 py-0.5 rounded text-[13px] font-mono">{children}</code>,
                                  hr: () => <hr className="border-slate-200 my-5" />,
                                }}
                              >
                                {aiFeedback}
                              </ReactMarkdown>
                              {isStreaming && (
                                <span className="inline-block w-2 h-4 ml-1 align-middle bg-emerald-500 animate-pulse rounded-sm"></span>
                              )}
                            </>
                          ) : (
                            <p className="text-slate-400 italic text-[14px] text-center pt-10">
                              Chưa có nhận xét nào. Nhấn <strong>AI Chấm điểm CV</strong> để bắt đầu.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CvEditorPage() {
  return (
    <CvProvider>
      <CvEditorShell>
        <CvEditorContent />
      </CvEditorShell>
    </CvProvider>
  );
}
