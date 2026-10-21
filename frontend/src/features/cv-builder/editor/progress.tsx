import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Tiến độ "ước lượng" cho tác vụ không báo % thật (tải PDF, AI chấm điểm):
 * tăng nhanh rồi chậm dần, dừng ở 95% cho tới khi complete().
 */
export function useStagedProgress() {
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

export type StagedProgress = ReturnType<typeof useStagedProgress>;

export function TaskProgress({ value, label, tone }: { value: number; label: string; tone: "violet" | "emerald" }) {
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
