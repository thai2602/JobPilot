'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { readAuthUser } from "../../utils/auth";
import { saveCvsToLocalStorage } from "../../utils/cv";
import { cvApi, type ApiUserCv } from "../../services/cvApi";
import { userApi } from "../../services/userApi";

type UserCv = ApiUserCv;

async function fetchUserId(email: string): Promise<number | null> {
  try {
    const data = await userApi.getByEmail(email);
    return data.userId ?? null;
  } catch {
    return null;
  }
}

async function fetchUserCvs(userId: number): Promise<UserCv[]> {
  return cvApi.listByUser(userId);
}

async function deleteCvById(id: number): Promise<void> {
  return cvApi.remove(id);
}

export default function MyCvsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [cvs, setCvs] = useState<UserCv[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [previewCv, setPreviewCv] = useState<UserCv | null>(null);

  useEffect(() => {
    setCurrentUser(readAuthUser());
  }, []);

  useEffect(() => {
    if (!currentUser?.email) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    fetchUserId(currentUser.email)
      .then((userId) => {
        if (!userId) throw new Error("Không tìm thấy tài khoản. Vui lòng đăng nhập lại.");
        return fetchUserCvs(userId);
      })
      .then((data) => {
        setCvs(data);
        saveCvsToLocalStorage(data);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Có lỗi xảy ra khi tải CV.");
      })
      .finally(() => setLoading(false));
  }, [currentUser?.email]);

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc muốn xóa CV này?")) return;
    setDeletingId(id);
    try {
      await deleteCvById(id);
      const updated = cvs.filter((cv) => cv.id !== id);
      setCvs(updated);
      saveCvsToLocalStorage(updated);
      if (previewCv?.id === id) setPreviewCv(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Xóa thất bại.");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch { return iso; }
  };

  if (!currentUser) {
    return (
      <section className="mx-auto max-w-3xl rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-black text-gray-900">CV của tôi</h1>
        <p className="mt-2 text-sm text-gray-600">Bạn cần đăng nhập để xem danh sách CV.</p>
        <Link
          href="/dang-nhap?next=/cv-cua-toi"
          className="mt-5 inline-flex rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
        >
          Đến trang đăng nhập
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div
        style={{
          borderRadius: "20px",
          background: "linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)",
          padding: "36px 40px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: "-40px", right: "-30px", width: "180px", height: "180px", borderRadius: "50%", background: "rgba(167,243,208,0.15)", filter: "blur(40px)" }} />
        <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: "8px" }}>
          CV của tôi
        </h1>
        <p style={{ color: "#ffffff", fontSize: "14px" }}>
          Xin chào, <strong>{currentUser.name}</strong> — quản lý toàn bộ CV của bạn tại đây.
        </p>
        <button
          onClick={() => router.push("/cv-mau")}
          style={{
            marginTop: "18px",
            display: "inline-flex", alignItems: "center", gap: "6px",
            background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.35)",
            color: "#fff", borderRadius: "12px", padding: "9px 18px",
            fontSize: "13px", fontWeight: 700, cursor: "pointer", backdropFilter: "blur(6px)",
          }}
        >
          + Tạo CV mới
        </button>
      </div>

      {/* Content */}
      <div style={{ background: "#fff", borderRadius: "20px", border: "1px solid #e2e8f0", padding: "28px", boxShadow: "0 4px 20px rgba(15,23,42,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <p style={{ fontSize: "11px", fontWeight: 800, color: "#10b981", letterSpacing: "0.08em", textTransform: "uppercase" }}>Danh sách</p>
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>Các CV đã tạo</h2>
          </div>
          {!loading && (
            <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>
              {cvs.length} CV
            </span>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 0", gap: "12px" }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "50%",
              border: "3px solid #e2e8f0", borderTopColor: "#10b981",
              animation: "spin 0.8s linear infinite",
            }} />
            <p style={{ fontSize: "13px", color: "#64748b" }}>Đang tải danh sách CV...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{ borderRadius: "14px", background: "#fef2f2", border: "1px solid #fecaca", padding: "16px 20px" }}>
            <p style={{ fontSize: "13px", fontWeight: 700, color: "#dc2626" }}>⚠ {error}</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && cvs.length === 0 && (
          <div style={{ borderRadius: "14px", border: "1.5px dashed #cbd5e1", background: "#f8fafc", padding: "36px", textAlign: "center" }}>
            <p style={{ fontSize: "32px", marginBottom: "12px" }}>📄</p>
            <p style={{ fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>Bạn chưa có CV nào.</p>
            <p style={{ fontSize: "13px", color: "#64748b", marginTop: "6px" }}>Hãy tạo CV đầu tiên từ trang CV mẫu.</p>
            <button
              onClick={() => router.push("/cv-mau")}
              style={{ marginTop: "16px", background: "#10b981", color: "#fff", borderRadius: "10px", padding: "10px 20px", fontSize: "13px", fontWeight: 700, border: "none", cursor: "pointer" }}
            >
              Tạo CV ngay
            </button>
          </div>
        )}

        {/* CV List */}
        {!loading && !error && cvs.length > 0 && (
          <div style={{ display: "grid", gap: "14px", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {cvs.map((cv) => (
              <article
                key={cv.id}
                style={{
                  border: "1px solid #e2e8f0", borderRadius: "16px",
                  background: "#fff", padding: "18px 20px",
                  boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
                  transition: "box-shadow 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 6px 24px rgba(15,23,42,0.10)")}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(15,23,42,0.04)")}
              >
                {/* Avatar + name row */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                  {cv.avatarUrl ? (
                    <img src={cv.avatarUrl} alt={cv.fullName ?? "Avatar"} style={{ width: "44px", height: "44px", borderRadius: "12px", objectFit: "cover", border: "1px solid #e2e8f0" }} />
                  ) : (
                    <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "linear-gradient(135deg, #d1fae5, #a7f3d0)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: 800, color: "#047857" }}>
                      {(cv.fullName ?? cv.cvName).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {cv.cvName}
                    </p>
                    {cv.jobTitle && <p style={{ fontSize: "12px", color: "#10b981", fontWeight: 600, marginTop: "2px" }}>{cv.jobTitle}</p>}
                  </div>
                </div>

                {/* Meta */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
                  {cv.skills.length > 0 && (
                    <span style={{ fontSize: "11px", background: "#ecfdf5", color: "#047857", borderRadius: "999px", padding: "3px 10px", fontWeight: 700 }}>
                      {cv.skills.length} kỹ năng
                    </span>
                  )}
                  {cv.experiences.length > 0 && (
                    <span style={{ fontSize: "11px", background: "#eff6ff", color: "#1d4ed8", borderRadius: "999px", padding: "3px 10px", fontWeight: 700 }}>
                      {cv.experiences.length} kinh nghiệm
                    </span>
                  )}
                  {cv.educations.length > 0 && (
                    <span style={{ fontSize: "11px", background: "#f5f3ff", color: "#7c3aed", borderRadius: "999px", padding: "3px 10px", fontWeight: 700 }}>
                      {cv.educations.length} học vấn
                    </span>
                  )}
                </div>

                <p style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "14px" }}>
                  Tạo: {formatDate(cv.createdAt)}
                  {cv.updatedAt && cv.updatedAt !== cv.createdAt && ` · Sửa: ${formatDate(cv.updatedAt)}`}
                </p>

                {/* Actions */}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => setPreviewCv(cv)}
                    style={{ flex: 1, background: "#ecfdf5", color: "#047857", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "8px 0", fontSize: "12px", fontWeight: 700, cursor: "pointer", transition: "background 0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#d1fae5")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#ecfdf5")}
                  >
                    Xem chi tiết
                  </button>
                  <button
                    onClick={() => router.push(`/cv-cua-toi/chinh-sua/${cv.id}`)}
                    style={{ flex: 1, background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: "10px", padding: "8px 0", fontSize: "12px", fontWeight: 700, cursor: "pointer", transition: "background 0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#dbeafe")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#eff6ff")}
                  >
                    Chỉnh sửa
                  </button>
                  <button
                    disabled={deletingId === cv.id}
                    onClick={() => void handleDelete(cv.id)}
                    style={{ background: "#fff", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "10px", padding: "8px 12px", fontSize: "12px", fontWeight: 700, cursor: "pointer", opacity: deletingId === cv.id ? 0.6 : 1, transition: "background 0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                  >
                    {deletingId === cv.id ? "..." : "Xóa"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewCv && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 50, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "40px 16px", overflowY: "auto" }}
          onClick={() => setPreviewCv(null)}
        >
          <section
            style={{ width: "min(780px, 100%)", background: "#fff", borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: "0 20px 60px rgba(15,23,42,0.25)", overflow: "hidden" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
              <div>
                <h3 style={{ fontSize: "17px", fontWeight: 800, color: "#0f172a" }}>{previewCv.cvName}</h3>
                <p style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>Chi tiết CV</p>
              </div>
              <button
                onClick={() => setPreviewCv(null)}
                style={{ border: "1px solid #cbd5e1", background: "#fff", color: "#334155", borderRadius: "10px", padding: "8px 14px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
              >
                Đóng
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: "24px", display: "grid", gap: "16px" }}>
              {/* Identity */}
              <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                {previewCv.avatarUrl ? (
                  <img src={previewCv.avatarUrl} alt={previewCv.fullName} style={{ width: "80px", height: "80px", borderRadius: "14px", objectFit: "cover", border: "1px solid #e2e8f0", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: "80px", height: "80px", borderRadius: "14px", background: "linear-gradient(135deg, #d1fae5, #a7f3d0)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: 800, color: "#047857", flexShrink: 0 }}>
                    {(previewCv.fullName ?? previewCv.cvName).charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a" }}>{previewCv.fullName ?? "—"}</h2>
                  {previewCv.jobTitle && <p style={{ fontSize: "14px", color: "#10b981", fontWeight: 600, marginTop: "4px" }}>{previewCv.jobTitle}</p>}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                    {previewCv.email && <span style={{ fontSize: "12px", color: "#64748b" }}>✉ {previewCv.email}</span>}
                    {previewCv.phone && <span style={{ fontSize: "12px", color: "#64748b" }}>📞 {previewCv.phone}</span>}
                    {previewCv.location && <span style={{ fontSize: "12px", color: "#64748b" }}>📍 {previewCv.location}</span>}
                  </div>
                </div>
              </div>

              {/* Summary */}
              {previewCv.summary && (
                <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "14px 16px", border: "1px solid #e2e8f0" }}>
                  <p style={{ fontSize: "11px", fontWeight: 800, color: "#94a3b8", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Tóm tắt</p>
                  <p style={{ fontSize: "13px", color: "#334155", lineHeight: 1.7 }}>{previewCv.summary}</p>
                </div>
              )}

              {/* Skills */}
              {previewCv.skills.length > 0 && (
                <div>
                  <p style={{ fontSize: "12px", fontWeight: 800, color: "#0f172a", marginBottom: "8px" }}>Kỹ năng</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {previewCv.skills.map((s) => (
                      <span key={s.id} style={{ fontSize: "12px", background: "#ecfdf5", color: "#047857", borderRadius: "999px", padding: "4px 12px", fontWeight: 600, border: "1px solid #bbf7d0" }}>
                        {s.skillName}{s.level ? ` · ${s.level}` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience */}
              {previewCv.experiences.length > 0 && (
                <div>
                  <p style={{ fontSize: "12px", fontWeight: 800, color: "#0f172a", marginBottom: "8px" }}>Kinh nghiệm</p>
                  <div style={{ display: "grid", gap: "8px" }}>
                    {previewCv.experiences.map((exp) => (
                      <div key={exp.id} style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "12px 14px", background: "#fff" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
                          <div>
                            <p style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a" }}>{exp.position}</p>
                            <p style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>{exp.company}</p>
                          </div>
                          {(exp.startDate ?? exp.endDate) && (
                            <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600, whiteSpace: "nowrap" }}>
                              {formatDate(exp.startDate)} – {exp.endDate ? formatDate(exp.endDate) : "Nay"}
                            </span>
                          )}
                        </div>
                        {exp.description && <p style={{ fontSize: "12px", color: "#475569", marginTop: "8px", lineHeight: 1.6 }}>{exp.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {previewCv.educations.length > 0 && (
                <div>
                  <p style={{ fontSize: "12px", fontWeight: 800, color: "#0f172a", marginBottom: "8px" }}>Học vấn</p>
                  <div style={{ display: "grid", gap: "8px" }}>
                    {previewCv.educations.map((edu) => (
                      <div key={edu.id} style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "12px 14px", background: "#fff" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
                          <div>
                            <p style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a" }}>{edu.school || edu.institution}</p>
                            <p style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>{edu.major || edu.degree}</p>
                          </div>
                          {(edu.startDate ?? edu.endDate) && (
                            <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600, whiteSpace: "nowrap" }}>
                              {formatDate(edu.startDate)} – {edu.endDate ? formatDate(edu.endDate) : "Nay"}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects */}
              {previewCv.projects.length > 0 && (
                <div>
                  <p style={{ fontSize: "12px", fontWeight: 800, color: "#0f172a", marginBottom: "8px" }}>Dự án</p>
                  <div style={{ display: "grid", gap: "8px" }}>
                    {previewCv.projects.map((proj) => (
                      <div key={proj.id} style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "12px 14px", background: "#fff" }}>
                        <p style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a" }}>{proj.name || proj.projectName}</p>
                        {(proj.technologies?.length || proj.techStack) && <p style={{ fontSize: "11px", color: "#10b981", fontWeight: 600, marginTop: "3px" }}>{proj.technologies?.join(", ") || proj.techStack}</p>}
                        {proj.description && <p style={{ fontSize: "12px", color: "#475569", marginTop: "6px", lineHeight: 1.6 }}>{proj.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Socials */}
              {previewCv.socials.length > 0 && (
                <div>
                  <p style={{ fontSize: "12px", fontWeight: 800, color: "#0f172a", marginBottom: "8px" }}>Mạng xã hội</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {previewCv.socials.map((s) => (
                      <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", background: "#f1f5f9", color: "#334155", borderRadius: "999px", padding: "5px 14px", fontWeight: 600, textDecoration: "none", border: "1px solid #e2e8f0" }}>
                        {s.platform}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
