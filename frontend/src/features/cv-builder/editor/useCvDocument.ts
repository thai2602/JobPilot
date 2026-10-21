import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { cvApi, type ApiUserCv } from "../../../services/cvApi";
import { ApiError } from "../../../services/httpClient";
import { readAuthUser } from "../../../utils/auth";
import { saveCvsToLocalStorage } from "../../../utils/cv";
import { useCvContext } from "../CvContext";
import { buildSavePayload, emptyCvData, mapSavedCvToEditorData, mergeExtractedCv } from "./cvEditorData";
import { useStagedProgress } from "./progress";

export type SaveStatus = "idle" | "saving" | "success" | "error";

const UNSAVED_CHANGES = "Bạn có thay đổi CV chưa lưu.";

/**
 * CV đang mở trong editor: danh sách CV đã lưu, chọn CV theo URL hoặc dropdown,
 * lưu (tạo mới hoặc cập nhật), tạo CV trống và nhập dữ liệu từ PDF.
 */
export function useCvDocument() {
  const { cvData, setCvData, dirtyRef, markClean } = useCvContext();
  const router = useRouter();
  const { id: urlCvId } = useParams<{ id?: string }>();

  const [savedCvs, setSavedCvs] = useState<ApiUserCv[]>([]);
  const [selectedCvId, setSelectedCvId] = useState<number | "">("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [isUploading, setIsUploading] = useState(false);
  const uploadProgress = useStagedProgress();
  const hydratedUrlCvIdRef = useRef<string | null>(null);

  const fetchCvs = useCallback(async () => {
    if (!readAuthUser()?.email) return;
    try {
      const cvs = await cvApi.listMine();
      const sorted = [...cvs].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setSavedCvs(sorted);
      saveCvsToLocalStorage(sorted);
    } catch (err) {
      console.error("Failed to fetch CVs", err);
    }
  }, []);

  useEffect(() => {
    fetchCvs();
  }, [fetchCvs]);

  // Mở CV khi vào từ route /cv-cua-toi/chinh-sua/:id
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

  const selectCv = (nextId: number) => {
    if (nextId === selectedCvId) return;
    if (dirtyRef.current && !window.confirm(`${UNSAVED_CHANGES} Bạn có chắc muốn mở CV khác?`)) return;
    const selected = savedCvs.find((cv) => cv.id === nextId);
    if (!selected) return;
    hydratedUrlCvIdRef.current = String(nextId);
    setSelectedCvId(nextId);
    setCvData(mapSavedCvToEditorData(selected));
    markClean();
    router.replace(`/cv-cua-toi/chinh-sua/${nextId}`);
  };

  /** @returns id của CV vừa lưu (hoặc true nếu chưa biết id), false nếu lưu thất bại. */
  const save = async (e?: React.FormEvent): Promise<number | boolean> => {
    e?.preventDefault();
    if (!readAuthUser()?.email) {
      setSaveStatus("error");
      return false;
    }
    setSaveStatus("saving");
    const isUpdate = Boolean(selectedCvId);

    try {
      const payload = buildSavePayload(cvData);
      const saved = isUpdate
        ? await cvApi.update(Number(selectedCvId), payload)
        : await cvApi.create(payload);
      let finalId: number | undefined = selectedCvId ? Number(selectedCvId) : undefined;
      // Vừa tạo mới thì nhớ id để lần lưu sau là cập nhật, không tạo thêm bản
      if (!isUpdate && saved?.id) {
        setSelectedCvId(saved.id);
        finalId = saved.id;
      }
      setSaveStatus("success");
      markClean();
      await fetchCvs();
      setTimeout(() => setSaveStatus("idle"), 3000);
      return finalId || true;
    } catch (err) {
      console.error("Save error:", err);
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        alert("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại để lưu CV.");
      }
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
      return false;
    }
  };

  /** @returns false nếu người dùng huỷ vì còn thay đổi chưa lưu. */
  const createNew = (): boolean => {
    if (dirtyRef.current && !window.confirm(`${UNSAVED_CHANGES} Bạn có chắc muốn tạo CV mới?`)) return false;
    hydratedUrlCvIdRef.current = null;
    setSelectedCvId("");
    setCvData(emptyCvData());
    markClean();
    if (urlCvId) router.replace("/cv-editor");
    return true;
  };

  const importPdf = async (file: File) => {
    setIsUploading(true);
    uploadProgress.start();
    try {
      const extracted = await cvApi.extract(file);
      setCvData((prev) => mergeExtractedCv(prev, extracted));
      uploadProgress.complete();
    } catch (err) {
      console.error("Extract CV error:", err);
      uploadProgress.reset();
      if (err instanceof ApiError) {
        alert(`Lỗi khi trích xuất dữ liệu CV${err.status ? ` (${err.status})` : ""}. ${err.message}${err.status === 401 || err.status === 403 ? " Vui lòng đăng nhập lại." : ""}`);
      } else {
        alert("Lỗi kết nối khi tải CV.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  return { savedCvs, selectedCvId, selectCv, save, saveStatus, createNew, importPdf, isUploading, uploadProgress };
}
