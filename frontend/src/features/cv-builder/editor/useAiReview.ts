import { useEffect, useRef, useState } from "react";
import { streamChat } from "../../../services/chatbotApi";
import type { CvData } from "../CvContext";
import { hasCvContent } from "./cvEditorData";
import { useStagedProgress } from "./progress";

/** AI chấm điểm CV qua chatbot stream; mỗi lần chấm dùng một hội thoại riêng. */
export function useAiReview() {
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const progress = useStagedProgress();
  const abortRef = useRef<(() => void) | null>(null);

  useEffect(() => () => abortRef.current?.(), []);

  const stop = () => {
    abortRef.current?.();
    abortRef.current = null;
    setIsStreaming(false);
    setIsLoading(false);
    progress.reset();
  };

  /** Bắt đầu hiện trạng thái chờ trước khi gửi (ví dụ trong lúc tự lưu CV). */
  const prepare = () => {
    setFeedback("");
    setIsLoading(true);
    progress.start();
  };

  const fail = (message: string) => {
    setFeedback(message);
    setIsLoading(false);
    progress.reset();
  };

  /**
   * @param cvId CV đang mở; backend tự đọc CV này vào ngữ cảnh AI
   * @param keepProgress true khi đã gọi prepare() trước đó
   */
  const score = (cvData: CvData, cvId: number | undefined, keepProgress = false) => {
    abortRef.current?.();
    abortRef.current = null;
    if (!keepProgress) progress.start();
    setIsLoading(true);
    setFeedback("");
    setIsStreaming(true);

    // Hội thoại tạm, mới mỗi lần: không lẫn với chatbot chính, không tích luỹ lịch sử
    const scoringSessionId = `cv-score-${Date.now()}`;
    const message = hasCvContent(cvData)
      ? `Hãy chấm điểm CV này của tôi dựa trên dữ liệu sau (JSON): ${JSON.stringify(cvData)}\n\nPhân tích điểm mạnh, điểm yếu và gợi ý cải thiện chi tiết theo tiêu chuẩn ATS và nhà tuyển dụng.`
      : "Hãy chấm điểm CV và gợi ý cách cải thiện để CV trông chuyên nghiệp hơn với nhà tuyển dụng.";

    let firstToken = true;
    abortRef.current = streamChat(
      message,
      (token) => {
        if (firstToken) {
          setIsLoading(false);
          firstToken = false;
        }
        setFeedback((prev) => prev + token);
      },
      () => {
        abortRef.current = null;
        setIsStreaming(false);
        setIsLoading(false);
        progress.complete();
      },
      () => {
        abortRef.current = null;
        setFeedback("Xin lỗi, đã có lỗi xảy ra khi gọi AI nhận xét. Vui lòng thử lại sau.");
        setIsStreaming(false);
        setIsLoading(false);
        progress.reset();
      },
      scoringSessionId,
      cvId,
    );
  };

  return { feedback, isLoading, isStreaming, isBusy: isLoading || isStreaming, progress, score, stop, prepare, fail };
}
