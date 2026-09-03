import {
  ApiError,
  apiRequest,
  buildApiUrl,
  extractErrorMessage,
  getAccessToken,
} from "./httpClient";

export interface ChatRequest {
  message: string;
  userId?: string;
  activeCvId?: number;
}

export interface ChatResponse {
  reply: string;
}

export interface ChatHistoryMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatEvalResponse {
  answer: string;
  contexts: string[];
}

/** Blocking POST — fallback khi SSE không khả dụng */
export const chatApi = {
  sendMessage: async (message: string, userId?: string, activeCvId?: number): Promise<string> => {
    const body: ChatRequest = { message };
    if (userId) body.userId = userId;
    if (activeCvId !== undefined) body.activeCvId = activeCvId;

    const data = await apiRequest<ChatResponse>("/api/chatbot/chat", {
      method: 'POST',
      json: body,
    });
    return data.reply;
  },

  getHistory: (userId?: string): Promise<ChatHistoryMessage[]> =>
    apiRequest<ChatHistoryMessage[]>(
      `/api/chatbot/history${userId ? `?userId=${encodeURIComponent(userId)}` : ""}`,
    ),

  clearHistory: async (userId?: string): Promise<void> => {
    await apiRequest<void>(
      `/api/chatbot/history${userId ? `?userId=${encodeURIComponent(userId)}` : ""}`,
      {
      method: "DELETE",
      responseType: "void",
      },
    );
  },

  auditCv: async (cvContent: string): Promise<string> => {
    const data = await apiRequest<ChatResponse>("/api/chatbot/audit", {
      method: "POST",
      json: { cvContent },
    });
    return data.reply;
  },

  rewriteBullets: async (bulletPoints: string): Promise<string> => {
    const data = await apiRequest<ChatResponse>("/api/chatbot/rewrite", {
      method: "POST",
      json: { bulletPoints },
    });
    return data.reply;
  },

  evaluate: (message: string, userId?: string, activeCvId?: number): Promise<ChatEvalResponse> =>
    apiRequest<ChatEvalResponse>("/api/chatbot/eval", {
      method: "POST",
      json: { message, userId, activeCvId },
    }),
};

/**
 * SSE streaming helper dùng fetch POST để gửi prompt trong request body.
 *
 * @param message   Nội dung tin nhắn
 * @param onToken   Callback mỗi khi nhận được token mới
 * @param onDone    Callback khi stream hoàn thành
 * @param onError   Callback khi có lỗi
 * @param userId    Memory ID phân tách per-user
 * @param activeCvId  CV đang mở — backend sẽ inject vào context AI
 * @returns Hàm cleanup để hủy request/đóng stream
 */
export function streamChat(
  message: string,
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (err: string) => void,
  userId?: string,
  activeCvId?: number,
): () => void {
  const abortController = new AbortController();
  const body: ChatRequest = { message };
  if (userId) body.userId = userId;
  if (activeCvId !== undefined) body.activeCvId = activeCvId;

  const token = getAccessToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let settled = false;

  const finish = (kind: "done" | "error", errorMessage?: string) => {
    if (settled || abortController.signal.aborted) return;
    settled = true;
    if (kind === "done") onDone();
    else onError(errorMessage || "Lỗi kết nối.");
  };

  const processEvent = (rawEvent: string): boolean => {
    if (!rawEvent.trim()) return false;

    let eventName = "message";
    const dataLines: string[] = [];

    for (const rawLine of rawEvent.split(/\r?\n/)) {
      const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        const value = line.slice(5);
        dataLines.push(value.startsWith(" ") ? value.slice(1) : value);
      }
    }

    const data = dataLines.join("\n");
    if (eventName === "done" || data === "[END]") {
      finish("done");
      return true;
    }
    if (eventName === "error") {
      finish("error", data);
      return true;
    }
    if ((eventName === "token" || eventName === "message") && data) {
      onToken(data);
    }
    return false;
  };

  void (async () => {
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      const response = await fetch(buildApiUrl("/api/chatbot/stream"), {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const raw = await response.text();
        const { message, details } = extractErrorMessage(
          raw,
          `Stream API error: ${response.status}`,
        );
        throw new ApiError(message, response.status, details);
      }

      reader = response.body?.getReader();
      if (!reader) throw new ApiError("Backend không trả về dữ liệu stream.", response.status);

      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (!settled) {
        const { value, done } = await reader.read();
        if (done) {
          buffer += decoder.decode();
          break;
        }
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() ?? "";
        for (const event of events) {
          if (processEvent(event)) break;
        }
      }

      if (!settled && buffer.trim()) processEvent(buffer);
      if (!settled) finish("done");
    } catch (error) {
      if (abortController.signal.aborted) return;
      finish("error", error instanceof Error ? error.message : "Không thể kết nối tới chatbot.");
    } finally {
      if (settled) {
        try {
          await reader?.cancel();
        } catch {
          // Stream may already be closed by the server.
        }
      }
    }
  })();

  return () => {
    settled = true;
    abortController.abort();
  };
}

