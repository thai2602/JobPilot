'use client';

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MessageSquare, X, Send, Bot, User, Loader2, Sparkles, Trash2, ArrowUpRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { chatApi, streamChat } from "../services/chatbotApi";
import { readAuthUser, subscribeAuthUserChange, type AuthUser } from "../utils/auth";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

function uid() {
  return Math.random().toString(36).slice(2);
}

const SUGGESTIONS = [
  "Làm sao viết CV chuẩn ATS?",
  "Cần chuẩn bị gì trước khi phỏng vấn?",
  "Cách đàm phán lương hiệu quả?",
  "Xu hướng tuyển dụng hiện nay?",
];

export default function FloatingChatbot() {
  const pathname = usePathname();
  const router = useRouter();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const isLoggedIn = Boolean(authUser);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const userId = authUser?.email;

  useEffect(() => {
    setAuthUser(readAuthUser());
    return subscribeAuthUserChange((user) => {
      setAuthUser(user);
      if (!user) {
        cleanupRef.current?.();
        setIsOpen(false);
        setMessages([]);
        setInput("");
        setError(null);
      }
    });
  }, []);

  // Quyết định trang nào hiển thị bong bóng
  const allowedPaths = [
    "/",
    "/tim-viec",
    "/cong-ty",
    "/tien-ich",
    "/cam-nang",
    "/cv-mau",
    "/dang-nhap",
    "/dang-ky",
    "/ho-so-nguoi-dung",
  ];
  const isAllowedPath = allowedPaths.includes(pathname) ||
    pathname.startsWith("/tim-viec/") ||
    pathname.startsWith("/cong-ty/");

  // Tự động scroll xuống dưới
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 80);
    }
  }, [messages, isOpen]);

  // Dọn dẹp stream khi đóng hoặc unmount
  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      setError(null);
      setInput("");
      setTimeout(() => inputRef.current?.focus(), 50);

      const userMsg: Message = { id: uid(), role: "user", content: trimmed };
      const aiMsg: Message = { id: uid(), role: "assistant", content: "", isStreaming: true };

      setMessages(prev => [...prev, userMsg, aiMsg]);
      setIsLoading(true);

      if (cleanupRef.current) {
        cleanupRef.current();
      }

      try {
        const cleanup = streamChat(
          trimmed,
          (token) => {
            setMessages(prev =>
              prev.map(m =>
                m.id === aiMsg.id
                  ? { ...m, content: m.content + token }
                  : m
              )
            );
          },
          () => {
            setMessages(prev =>
              prev.map(m =>
                m.id === aiMsg.id ? { ...m, isStreaming: false } : m
              )
            );
            setIsLoading(false);
            cleanupRef.current = null;
          },
          (err) => {
            setError(err || "Kết nối bị gián đoạn.");
            setMessages(prev =>
              prev.map(m =>
                m.id === aiMsg.id
                  ? { ...m, content: m.content || "⚠️ Có lỗi xảy ra.", isStreaming: false }
                  : m
              )
            );
            setIsLoading(false);
            cleanupRef.current = null;
          },
          userId
        );

        cleanupRef.current = cleanup;
      } catch (err) {
        setError("Không thể kết nối tới chatbot.");
        setIsLoading(false);
      }
    },
    [isLoading, userId]
  );

  const clearHistory = async () => {
    cleanupRef.current?.();
    setMessages([]);
    setError(null);
    await chatApi.clearHistory(userId).catch(() => { });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 100) + "px";
  };

  if (!isAllowedPath) return null;

  return (
    <>
      <style>{`
        .chatbot-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .chatbot-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .chatbot-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.2);
          border-radius: 99px;
        }
        .chatbot-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.35);
        }
        @keyframes chatbot-pulse-ring {
          0% { transform: scale(0.95); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 0.3; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        .animate-pulse-ring {
          animation: chatbot-pulse-ring 2.2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }
        .chatbot-user-bubble p, 
        .chatbot-user-bubble span, 
        .chatbot-user-bubble li, 
        .chatbot-user-bubble strong,
        .chatbot-user-bubble ul,
        .chatbot-user-bubble ol,
        .chatbot-user-bubble div {
          color: #ffffff !important;
        }
      `}</style>

      {/* ── Chatbot Bubble Toggle Button ── */}
      {!isOpen && (
        <div
          className="chatbot-toggle flex items-center justify-center transition-all duration-300"
        >
          {/* Pulsing ring backdrop */}
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-pulse-ring pointer-events-none" />

          <button
            onClick={() => {
              if (!isLoggedIn) {
                router.push("/dang-nhap?next=/chatbot");
                return;
              }
              setIsOpen(true);
            }}
            className="w-full h-full rounded-full text-white flex items-center justify-center cursor-pointer shadow-[0_10px_35px_rgba(16,185,129,0.25)] transition-all duration-300 hover:scale-105 group bg-gradient-to-tr from-emerald-500 to-teal-600 relative overflow-hidden"
            title="Trò chuyện với AI Assistant"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <MessageSquare className="w-6 h-6 group-hover:rotate-6 transition-transform duration-300" />
          </button>
        </div>
      )}

      {/* ── Chatbot Dialog Panel ── */}
      {isOpen && (
        <div
          className="chatbot-panel bg-white rounded-[28px] border border-slate-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden transition-all duration-500"
        >
          {/* Header */}
          <div className="border-b border-slate-100 bg-white px-5 py-4 flex items-center justify-between text-slate-800 relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/15">
                <Bot className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-[15px] tracking-tight text-slate-800">AI Assistant</h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                </div>
                <p className="text-[10.5px] text-slate-400 font-bold mt-0.5">Trợ lý định hướng nghề nghiệp</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="p-2 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer text-slate-400 hover:text-rose-500"
                  title="Xóa cuộc trò chuyện"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer text-slate-450 hover:text-slate-700"
                title="Đóng chat"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          {/* Message Area */}
          <div className="flex-1 overflow-y-auto p-5 bg-slate-50/40 space-y-4 chatbot-scrollbar">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-4 space-y-5 px-3">
                <div className="w-14 h-14 rounded-[20px] bg-emerald-500/10 flex items-center justify-center text-emerald-650 shadow-inner">
                  <Sparkles className="w-7 h-7 text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-[15px] font-black text-slate-800 tracking-tight">Xin chào! Tôi là AI Assistant</h4>
                  <p className="text-[11.5px] text-slate-450 max-w-[260px] mx-auto mt-1.5 leading-relaxed font-semibold">
                    Tôi có thể tư vấn kinh nghiệm phỏng vấn, tối ưu hóa CV chuẩn ATS và định hướng nghề nghiệp của bạn.
                  </p>
                </div>

                <div className="flex flex-col gap-2.5 w-full pt-1">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="w-full text-left text-[11.5px] px-4 py-3 rounded-2xl border border-slate-200/60 bg-white hover:border-emerald-500/40 hover:bg-emerald-500/5 text-slate-650 transition-all duration-300 shadow-sm font-extrabold flex items-center justify-between group cursor-pointer"
                    >
                      <span>{s}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center mt-0.5 border ${msg.role === "assistant"
                    ? "bg-slate-50 border-slate-100 text-emerald-600"
                    : "bg-slate-100 border-slate-200 text-slate-500"
                    }`}
                >
                  {msg.role === "assistant" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${msg.role === "user"
                    ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-tr-sm shadow-md shadow-emerald-500/10 chatbot-user-bubble"
                    : "bg-white border border-slate-100 text-slate-700 shadow-sm rounded-tl-sm font-semibold"
                    }`}
                >
                  {msg.content ? (
                    <div className="chatbot-markdown-content text-inherit">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0 leading-normal">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                          li: ({ children }) => <li className="mb-0.5">{children}</li>,
                          strong: ({ children }) => <strong className="font-black text-inherit">{children}</strong>,
                          code: ({ children }) => (
                            <code className={`px-1 py-0.5 rounded text-[11.5px] font-mono ${msg.role === 'user' ? 'bg-white/20 text-white' : 'bg-slate-100 text-emerald-700'}`}>
                              {children}
                            </code>
                          )
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : msg.isStreaming ? (
                    <span className="flex items-center gap-2 text-slate-400 py-0.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                      <span className="text-[11.5px] font-bold">Đang soạn câu trả lời...</span>
                    </span>
                  ) : null}

                  {msg.isStreaming && msg.content && (
                    <span className="inline-block w-0.5 h-3.5 bg-emerald-450 ml-0.5 animate-pulse align-middle" />
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Error Banner */}
          {error && (
            <div className="px-4 py-2.5 text-[11px] font-bold text-rose-600 bg-rose-50 border-t border-rose-100 flex justify-between items-center">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 font-extrabold cursor-pointer">Đóng</button>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t border-slate-100 bg-white">
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200/80 rounded-[20px] px-3.5 py-3 focus-within:border-emerald-500/50 focus-within:ring-4 focus-within:ring-emerald-500/5 focus-within:bg-white transition-all">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Hỏi AI Assistant..."
                disabled={isLoading}
                className="flex-1 resize-none bg-transparent text-[13px] font-bold text-slate-800 placeholder:text-slate-400 !outline-none !border-none !ring-0 !shadow-none disabled:opacity-50 max-h-auto leading-normal overflow-hidden"
                style={{ height: "20px", outline: "none", border: "none", boxShadow: "none" }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="w-8 h-8 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0 transition-all shadow-[0_4px_12px_rgba(16,185,129,0.2)] cursor-pointer active:scale-95"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <Send className="w-4 h-4 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
