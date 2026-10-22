import { useCallback, useEffect, useRef, useState } from "react";
import {
   companiesApi,
   type CompanyDirectoryResponse,
   type CompanyRegion,
   type CompanySizeGroup,
   type CompanySort,
} from "../../services/companiesApi";
import { mapApiCompany, type CompanyItem } from "./companyMapping";

const PAGE_SIZE = 12;

export type CompanyFilters = {
   search: string;
   industry: string | null;
   size: CompanySizeGroup | null;
   region: CompanyRegion | null;
   hiring: boolean;
   sort: CompanySort;
};

export const emptyCompanyFilters: CompanyFilters = {
   search: "",
   industry: null,
   size: null,
   region: null,
   hiring: false,
   sort: "featured",
};

const SIZES: CompanySizeGroup[] = ["SMALL", "MEDIUM", "LARGE"];
const REGIONS: CompanyRegion[] = ["HA_NOI", "HO_CHI_MINH", "DA_NANG", "OTHER"];
const SORTS: CompanySort[] = ["featured", "name", "recent"];

const pick = <T extends string>(value: string | null, allowed: T[]): T | null =>
   allowed.find((item) => item === value) ?? null;

/** Đọc bộ lọc từ query string; giá trị lạ thì bỏ qua. */
export const filtersFromSearch = (search: string): CompanyFilters => {
   const params = new URLSearchParams(search);
   return {
      search: params.get("q")?.trim() ?? "",
      industry: params.get("nganh") || null,
      size: pick(params.get("quy-mo"), SIZES),
      region: pick(params.get("khu-vuc"), REGIONS),
      hiring: params.get("dang-tuyen") === "1",
      sort: pick(params.get("sap-xep"), SORTS) ?? "featured",
   };
};

export const filtersToSearch = (filters: CompanyFilters): string => {
   const params = new URLSearchParams();
   if (filters.search) params.set("q", filters.search);
   if (filters.industry) params.set("nganh", filters.industry);
   if (filters.size) params.set("quy-mo", filters.size);
   if (filters.region) params.set("khu-vuc", filters.region);
   if (filters.hiring) params.set("dang-tuyen", "1");
   if (filters.sort !== "featured") params.set("sap-xep", filters.sort);
   const query = params.toString();
   return query ? `?${query}` : "";
};

const toParams = (filters: CompanyFilters, offset: number) => ({
   offset,
   limit: PAGE_SIZE,
   search: filters.search || undefined,
   industry: filters.industry ?? undefined,
   size: filters.size ?? undefined,
   region: filters.region ?? undefined,
   hiring: filters.hiring || undefined,
   sort: filters.sort,
});

/**
 * Danh bạ công ty lọc phía server. Mỗi lần đổi bộ lọc tải lại trang đầu kèm số lượng từng lựa chọn;
 * "Xem thêm" nối thêm trang sau với cùng bộ lọc.
 */
export function useCompanyDirectory(filters: CompanyFilters | null) {
   const [companies, setCompanies] = useState<CompanyItem[]>([]);
   const [total, setTotal] = useState(0);
   const [facets, setFacets] = useState<CompanyDirectoryResponse["facets"] | null>(null);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [reloadKey, setReloadKey] = useState(0);
   // Bỏ kết quả của request cũ khi bộ lọc đã đổi
   const requestId = useRef(0);

   const fetchPage = useCallback(
      (offset: number) => companiesApi.directory(toParams(filters!, offset)),
      [filters],
   );

   useEffect(() => {
      if (!filters) return;
      const id = ++requestId.current;
      setLoading(true);
      setError(null);
      fetchPage(0)
         .then((data) => {
            if (id !== requestId.current) return;
            setCompanies(data.items.map(mapApiCompany));
            setTotal(data.total);
            setFacets(data.facets);
         })
         .catch((err: unknown) => {
            if (id !== requestId.current) return;
            console.error("Không tải được danh sách công ty:", err);
            setCompanies([]);
            setTotal(0);
            setError(err instanceof Error ? err.message : "Không tải được danh sách công ty.");
         })
         .finally(() => {
            if (id === requestId.current) setLoading(false);
         });
   }, [filters, fetchPage, reloadKey]);

   const hasMore = companies.length < total;

   const loadMore = () => {
      if (loading || !hasMore) return;
      const id = requestId.current;
      setLoading(true);
      setError(null);
      fetchPage(companies.length)
         .then((data) => {
            if (id !== requestId.current) return;
            setCompanies((current) => [...current, ...data.items.map(mapApiCompany)]);
            setTotal(data.total);
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

   const retry = () => (companies.length ? loadMore() : setReloadKey((key) => key + 1));

   return { companies, total, facets, loading, hasMore, loadMore, error, retry };
}
