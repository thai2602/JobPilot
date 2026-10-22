import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { RefreshCw, Sparkles } from "lucide-react";
import { TaskProgress, type StagedProgress } from "./progress";

const markdownComponents: Components = {
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
};

type Props = {
  feedback: string;
  isLoading: boolean;
  isStreaming: boolean;
  progress: StagedProgress;
  onRescore: () => void;
};

export default function AiReviewPanel({ feedback, isLoading, isStreaming, progress, onRescore }: Props) {
  return (
    <div className="bg-white rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-slate-100 overflow-hidden flex flex-col min-h-[600px] h-fit">
      <div className="bg-emerald-700 px-6 py-5 flex justify-between items-center text-white shrink-0 relative overflow-hidden">
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
          onClick={onRescore}
          disabled={isLoading || isStreaming}
          className="relative z-10 flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          Chấm lại
        </button>
      </div>
      <div className="p-6 lg:p-8 bg-slate-50 relative">
        {progress.progress > 0 && (
          <div className="mb-6 rounded-2xl border border-emerald-100 bg-white px-4 py-3 shadow-sm">
            <TaskProgress
              value={progress.progress}
              label={progress.progress === 100 ? "Hoàn tất chấm điểm CV" : "Tiến độ phân tích của AI"}
              tone="emerald"
            />
          </div>
        )}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-emerald-700 gap-5">
            <div className="relative">
              <div className="w-14 h-14 border-4 border-emerald-500/20 rounded-full"></div>
              <div className="w-14 h-14 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin absolute inset-0"></div>
            </div>
            <span className="text-[15px] font-bold animate-pulse tracking-wide">AI đang phân tích độ chuyên nghiệp... {Math.max(1, progress.progress)}%</span>
          </div>
        ) : (
          <div className="ai-markdown-body">
            {feedback ? (
              <>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {feedback}
                </ReactMarkdown>
                {isStreaming && (
                  <span className="inline-block w-2 h-4 ml-1 align-middle bg-emerald-500 animate-pulse rounded-sm"></span>
                )}
              </>
            ) : (
              <p className="text-slate-500 italic text-[14px] text-center pt-10">
                Chưa có nhận xét nào. Nhấn <strong>AI Chấm điểm CV</strong> để bắt đầu.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
