'use client';

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./cv-builder.css";
import { CvProvider, useCvContext } from "./CvContext";
import CvEditorShell from "./CvEditorShell";
import AiReviewPanel from "./editor/AiReviewPanel";
import CvForm from "./editor/CvForm";
import EditorHeader from "./editor/EditorHeader";
import EditorSidebar from "./editor/EditorSidebar";
import { useAiReview } from "./editor/useAiReview";
import { useCvDocument } from "./editor/useCvDocument";
import CvPreview from "./preview/CvPreview";

function CvEditorContent() {
  const { cvData } = useCvContext();
  const doc = useCvDocument();
  const ai = useAiReview();
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [isAiReviewVisible, setIsAiReviewVisible] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    previewRef.current?.style.setProperty("--cv-accent", cvData.color);
  }, [cvData.color]);

  const currentCvId = () => (doc.selectedCvId ? Number(doc.selectedCvId) : undefined);

  // Dưới xl khung xem trước / AI nằm dưới form dài; vừa mở thì cuộn tới để người dùng thấy ngay
  const sidePanelRef = useRef<HTMLDivElement>(null);
  const sidePanelOpen = isPreviewVisible || isAiReviewVisible;
  useEffect(() => {
    if (!sidePanelOpen || window.matchMedia("(min-width: 1280px)").matches) return;
    sidePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [sidePanelOpen]);

  const handleToggleAiReview = async () => {
    setIsPreviewVisible(false);
    if (isAiReviewVisible) {
      ai.stop();
      setIsAiReviewVisible(false);
      return;
    }
    setIsAiReviewVisible(true);
    ai.prepare();
    // Lưu trước khi chấm để AI đọc đúng nội dung mới nhất trong DB
    const saveResult = await doc.save();
    if (saveResult) {
      ai.score(cvData, typeof saveResult === "number" ? saveResult : currentCvId(), true);
    } else {
      ai.fail("Không thể tự động lưu CV. Vui lòng kiểm tra lại thông tin và thử lại.");
    }
  };

  const handleTogglePreview = () => {
    ai.stop();
    setIsAiReviewVisible(false);
    setIsPreviewVisible((visible) => !visible);
  };

  const handleCreateNew = () => {
    if (!doc.createNew()) return;
    ai.stop();
    setIsPreviewVisible(false);
    setIsAiReviewVisible(false);
  };


  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 rounded-[28px]">
      {/* Application navigation is provided by CvEditorShell. */}
      <div className="w-full p-2 sm:p-4 lg:p-6 transition-all duration-500 ease-in-out">
        <div className="w-full max-w-none">
          <EditorHeader
            savedCvs={doc.savedCvs}
            selectedCvId={doc.selectedCvId}
            onSelectCv={doc.selectCv}
            onCreateNew={handleCreateNew}
          />

          <div className={`grid grid-cols-1 ${sidePanelOpen ? "xl:grid-cols-[minmax(0,1fr)_minmax(420px,560px)]" : ""} gap-6 items-start`}>
            <div className="flex flex-col 2xl:flex-row gap-6">
              <EditorSidebar
                isUploading={doc.isUploading}
                uploadProgress={doc.uploadProgress}
                onUploadPdf={doc.importPdf}
                isAiReviewVisible={isAiReviewVisible}
                isAiBusy={ai.isBusy}
                aiProgress={ai.progress}
                onToggleAiReview={handleToggleAiReview}
                isPreviewVisible={isPreviewVisible}
                onTogglePreview={handleTogglePreview}
                saveStatus={doc.saveStatus}
                isExistingCv={Boolean(doc.selectedCvId)}
                onSave={() => void doc.save()}
              />
              <CvForm onSubmit={(e) => void doc.save(e)} />
            </div>

            {sidePanelOpen && (
              <div ref={sidePanelRef} className="w-full h-fit flex flex-col scroll-mt-4 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto" aria-label={isPreviewVisible ? "Xem trước CV" : "AI Nhận xét"} role="region">
                {isPreviewVisible && (
                  <div ref={previewRef} className="cv-preview bg-white rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-slate-100 overflow-hidden min-h-[850px] print:shadow-none print:border-none origin-top transition-transform h-fit">
                    <CvPreview cvData={cvData} />
                  </div>
                )}
                {isAiReviewVisible && (
                  <AiReviewPanel
                    feedback={ai.feedback}
                    isLoading={ai.isLoading}
                    isStreaming={ai.isStreaming}
                    progress={ai.progress}
                    onRescore={() => ai.score(cvData, currentCvId())}
                  />
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
