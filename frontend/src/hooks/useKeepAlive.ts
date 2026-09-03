'use client';

import { useEffect, useRef } from "react";
import { jobsApi } from "../services/jobsApi";

/**
 * Hook giữ cho Render backend không bao giờ bị tắt (spin down) do idle.
 * Gửi một request nhẹ (HEAD /api/jobs?limit=1) tới backend mỗi 60 giây.
 * Chạy ngay khi component mount và tự dọn dẹp khi unmount.
 */
const KEEP_ALIVE_INTERVAL_MS = 60_000; // 60 giây

function pingBackend() {
   jobsApi.ping()
      .then(() => {
         if (process.env.NODE_ENV === 'development') {
            console.log(`[KeepAlive] Ping OK @ ${new Date().toLocaleTimeString("vi-VN")}`);
         }
      })
      .catch(() => {
         // Im lặng – không cần làm gì khi ping thất bại
      });
}

export default function useKeepAlive() {
   const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

   useEffect(() => {
      // Ping ngay lập tức khi app khởi động
      pingBackend();

      // Thiết lập interval mỗi 60 giây
      intervalRef.current = setInterval(pingBackend, KEEP_ALIVE_INTERVAL_MS);

      return () => {
         if (intervalRef.current) {
            clearInterval(intervalRef.current);
         }
      };
   }, []);
}
