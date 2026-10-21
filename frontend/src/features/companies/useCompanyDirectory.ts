import { useCallback, useEffect, useRef, useState } from "react";
import { companiesApi } from "../../services/companiesApi";
import { mapApiCompany, type CompanyItem } from "./companyMapping";

const PAGE_SIZE = 6;

/** Danh bạ công ty từ API: tìm kiếm phía server, tải thêm theo trang, có trạng thái lỗi để thử lại. */
export function useCompanyDirectory() {
   const [companies, setCompanies] = useState<CompanyItem[]>([]);
   const [activeSearch, setActiveSearch] = useState("");
   const [hasMore, setHasMore] = useState(true);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [reloadKey, setReloadKey] = useState(0);
   // Bỏ kết quả của request cũ khi từ khoá đã đổi
   const requestId = useRef(0);

   const fetchPage = useCallback((offset: number) => companiesApi.list({
      offset,
      limit: PAGE_SIZE,
      search: activeSearch || undefined,
      completeOnly: true,
   }), [activeSearch]);

   useEffect(() => {
      const id = ++requestId.current;
      setLoading(true);
      setError(null);
      fetchPage(0)
         .then((data) => {
            if (id !== requestId.current) return;
            setCompanies(data.map(mapApiCompany));
            setHasMore(data.length === PAGE_SIZE);
         })
         .catch((err: unknown) => {
            if (id !== requestId.current) return;
            console.error("Không tải được danh sách công ty:", err);
            setCompanies([]);
            setHasMore(false);
            setError(err instanceof Error ? err.message : "Không tải được danh sách công ty.");
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
      fetchPage(companies.length)
         .then((data) => {
            if (id !== requestId.current) return;
            setCompanies((current) => [...current, ...data.map(mapApiCompany)]);
            setHasMore(data.length === PAGE_SIZE);
         })
         .catch((err: unknown) => {
            if (id !== requestId.current) return;
            console.error("Không tải thêm được công ty:", err);
            setError(err instanceof Error ? err.message : "Không tải thêm được công ty.");
         })
         .finally(() => {
            if (id === requestId.current) setLoading(false);
         });
   };

   const search = (query: string) => {
      setActiveSearch(query.trim());
      // Cùng từ khoá vẫn tải lại, ví dụ khi bấm "Tìm" lần nữa sau lỗi
      setReloadKey((key) => key + 1);
   };
   const retry = () => (companies.length ? loadMore() : setReloadKey((key) => key + 1));

   return { companies, activeSearch, search, loading, hasMore, loadMore, error, retry };
}
