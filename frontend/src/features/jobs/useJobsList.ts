import { useCallback, useEffect, useRef, useState } from "react";
import { jobsApi } from "../../services/jobsApi";
import { mapApiJob, type Job } from "./jobMapping";

const PAGE_SIZE = 6;

export type JobFilters = {
   search: string;
   location: string | null;
   jobType: string | null;
   level: string | null;
};

const EMPTY_FILTERS: JobFilters = { search: "", location: null, jobType: null, level: null };

/** Danh sách việc làm từ API: lọc phía server, tải thêm theo trang, có trạng thái lỗi để thử lại. */
export function useJobsList() {
   const [filters, setFilters] = useState<JobFilters>(EMPTY_FILTERS);
   const [debouncedSearch, setDebouncedSearch] = useState("");
   const [jobs, setJobs] = useState<Job[]>([]);
   const [hasMore, setHasMore] = useState(true);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [reloadKey, setReloadKey] = useState(0);
   // Bỏ kết quả của request cũ khi bộ lọc đã đổi
   const requestId = useRef(0);

   useEffect(() => {
      const timer = setTimeout(() => setDebouncedSearch(filters.search), 300);
      return () => clearTimeout(timer);
   }, [filters.search]);

   const fetchPage = useCallback((offset: number) => jobsApi.list({
      offset,
      limit: PAGE_SIZE,
      search: debouncedSearch || undefined,
      location: filters.location || undefined,
      jobType: filters.jobType || undefined,
      jobLevel: filters.level || undefined,
   }), [debouncedSearch, filters.location, filters.jobType, filters.level]);

   useEffect(() => {
      const id = ++requestId.current;
      setLoading(true);
      setError(null);
      fetchPage(0)
         .then((data) => {
            if (id !== requestId.current) return;
            setJobs(data.map(mapApiJob));
            setHasMore(data.length === PAGE_SIZE);
         })
         .catch((err: unknown) => {
            if (id !== requestId.current) return;
            console.error("Không tải được danh sách việc làm:", err);
            setJobs([]);
            setHasMore(false);
            setError(err instanceof Error ? err.message : "Không tải được danh sách việc làm.");
         })
         .finally(() => {
            if (id === requestId.current) setLoading(false);
         });
   }, [fetchPage, reloadKey]);

   const loadMore = () => {
      if (loading || !hasMore) return;
      const id = requestId.current;
      setLoading(true);
      setError(null);
      fetchPage(jobs.length)
         .then((data) => {
            if (id !== requestId.current) return;
            setJobs((current) => [...current, ...data.map(mapApiJob)]);
            setHasMore(data.length === PAGE_SIZE);
         })
         .catch((err: unknown) => {
            if (id !== requestId.current) return;
            console.error("Không tải thêm được việc làm:", err);
            setError(err instanceof Error ? err.message : "Không tải thêm được việc làm.");
         })
         .finally(() => {
            if (id === requestId.current) setLoading(false);
         });
   };

   const updateFilters = (patch: Partial<JobFilters>) => setFilters((current) => ({ ...current, ...patch }));
   const clearFilters = () => setFilters(EMPTY_FILTERS);
   const retry = () => setReloadKey((key) => key + 1);
   const hasActiveFilters = Boolean(filters.search || filters.location || filters.jobType || filters.level);

   return { jobs, filters, updateFilters, clearFilters, hasActiveFilters, loading, hasMore, loadMore, error, retry };
}
