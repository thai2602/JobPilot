'use client';

import Link from "next/link";
import {
  Bookmark,
  Briefcase,
  Building2,
  CalendarClock,
  Clock3,
  ExternalLink,
  Loader2,
  LogIn,
  MapPin,
  RefreshCw,
  Trash2,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { savedJobsApi, type ApiSavedJob } from "../../services/savedJobsApi";
import { readAuthUser, subscribeAuthUserChange } from "../../utils/auth";
import { toVietnameseJobTitle } from "../../utils/jobTitle";
import { generateSlug } from "../../utils/slug";

const SAVED_JOBS_STORAGE_KEY = "jobpilot_saved_jobs";
const DATA_UPDATED_EVENT = "jobpilot-data-updated";

type AuthState = "checking" | "authenticated" | "guest";

type SavedJobItem = {
  id: string;
  serverId?: number;
  jobId?: number;
  slug?: string;
  title: string;
  company: string;
  place?: string;
  salary?: string;
  type?: string;
  savedAt?: string;
};

const asNonEmptyString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const asNumber = (value: unknown): number | undefined => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseServerId = (id: string): number | undefined => {
  if (!id.startsWith("api-saved-")) return undefined;
  const parsed = Number(id.slice("api-saved-".length));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

const formatJobType = (value?: string): string | undefined => {
  if (!value) return undefined;

  const labels: Record<string, string> = {
    FULL_TIME: "Toàn thời gian",
    PART_TIME: "Bán thời gian",
    CONTRACT: "Hợp đồng",
    INTERNSHIP: "Thực tập",
    REMOTE: "Làm việc từ xa",
    HYBRID: "Làm việc linh hoạt",
  };

  return labels[value.toUpperCase()] ?? value;
};

const formatSalary = (minimum?: number, maximum?: number): string => {
  const formatMillions = (value: number) => {
    const millions = value / 1_000_000;
    return Number.isInteger(millions) ? String(millions) : millions.toFixed(1).replace(".", ",");
  };

  if (minimum && maximum) return `${formatMillions(minimum)}–${formatMillions(maximum)} triệu`;
  if (minimum) return `Từ ${formatMillions(minimum)} triệu`;
  if (maximum) return `Đến ${formatMillions(maximum)} triệu`;
  return "Thỏa thuận";
};

const normalizeCachedJob = (value: unknown, index: number): SavedJobItem | null => {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const title = asNonEmptyString(raw.title);
  if (!title) return null;

  const company = asNonEmptyString(raw.company) ?? "Công ty chưa cập nhật";
  const suppliedId = asNonEmptyString(raw.id) ?? (typeof raw.id === "number" ? String(raw.id) : undefined);
  const generatedId = `local-${generateSlug(`${title}-${company}`) || "saved-job"}-${index}`;
  const id = suppliedId ?? generatedId;

  return {
    id,
    serverId: parseServerId(id),
    jobId: asNumber(raw.jobId),
    slug: asNonEmptyString(raw.slug),
    title,
    company,
    place: asNonEmptyString(raw.place) ?? asNonEmptyString(raw.locationCity),
    salary: asNonEmptyString(raw.salary),
    type: formatJobType(asNonEmptyString(raw.type) ?? asNonEmptyString(raw.jobType)),
    savedAt: asNonEmptyString(raw.savedAt),
  };
};

const readCachedSavedJobs = (): SavedJobItem[] => {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(SAVED_JOBS_STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((value, index) => {
      const item = normalizeCachedJob(value, index);
      return item ? [item] : [];
    });
  } catch {
    return [];
  }
};

const mapApiSavedJob = (savedJob: ApiSavedJob): SavedJobItem => ({
  id: `api-saved-${savedJob.id}`,
  serverId: savedJob.id,
  jobId: savedJob.job.id,
  slug: savedJob.job.slug,
  title: savedJob.job.title,
  company: savedJob.job.company?.name?.trim() || "Công ty chưa cập nhật",
  place: savedJob.job.locationCity,
  salary: formatSalary(savedJob.job.salaryMin, savedJob.job.salaryMax),
  type: formatJobType(savedJob.job.jobType),
  savedAt: savedJob.savedAt,
});

const jobIdentity = (item: SavedJobItem): string =>
  item.jobId
    ? `job:${item.jobId}`
    : `text:${item.title.trim().toLowerCase()}::${item.company.trim().toLowerCase()}`;

const mergeServerAndLocalJobs = (serverJobs: SavedJobItem[], localJobs: SavedJobItem[]): SavedJobItem[] => {
  const identities = new Set(serverJobs.map(jobIdentity));
  const localOnlyJobs = localJobs.filter((item) => {
    if (item.serverId) return false;
    const identity = jobIdentity(item);
    if (identities.has(identity)) return false;
    identities.add(identity);
    return true;
  });

  return [...serverJobs, ...localOnlyJobs];
};

const writeCachedSavedJobs = (items: SavedJobItem[]) => {
  const cacheItems = items.map(({ serverId: _serverId, ...item }) => item);
  localStorage.setItem(SAVED_JOBS_STORAGE_KEY, JSON.stringify(cacheItems));
};

const formatSavedDate = (value?: string): string => {
  if (!value) return "Chưa xác định thời gian";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getJobHref = (item: SavedJobItem): string => {
  const slug = item.slug || generateSlug(`${item.title} ${item.company}`);
  return slug ? `/tim-viec/${slug}` : "/tim-viec";
};

function LoadingCards() {
  return (
    <div className="grid gap-5 md:grid-cols-2" aria-label="Đang tải việc làm đã lưu">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="animate-pulse rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-11 w-11 rounded-2xl bg-slate-100" />
          <div className="mt-5 h-5 w-2/3 rounded bg-slate-100" />
          <div className="mt-3 h-4 w-1/2 rounded bg-slate-100" />
          <div className="mt-6 flex gap-2">
            <div className="h-7 w-24 rounded-full bg-slate-100" />
            <div className="h-7 w-28 rounded-full bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SavedJobsPage() {
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [savedJobs, setSavedJobs] = useState<SavedJobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const loadSavedJobs = useCallback(async (authenticated: boolean) => {
    const requestId = ++requestIdRef.current;
    const cachedJobs = readCachedSavedJobs();
    setSavedJobs(cachedJobs);
    setLoadError("");
    setActionError("");

    if (!authenticated) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await savedJobsApi.listMine();
      if (requestId !== requestIdRef.current) return;

      const serverJobs = Array.isArray(response) ? response.map(mapApiSavedJob) : [];
      const mergedJobs = mergeServerAndLocalJobs(serverJobs, cachedJobs);
      setSavedJobs(mergedJobs);
      writeCachedSavedJobs(mergedJobs);
      window.dispatchEvent(new Event(DATA_UPDATED_EVENT));
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setLoadError(
        error instanceof Error && error.message.trim()
          ? `Không thể đồng bộ với máy chủ: ${error.message}`
          : "Không thể đồng bộ việc làm đã lưu. Dữ liệu trên thiết bị vẫn được giữ nguyên.",
      );
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const refreshForUser = (user = readAuthUser()) => {
      const authenticated = Boolean(user && localStorage.getItem("accessToken"));
      setAuthState(authenticated ? "authenticated" : "guest");
      void loadSavedJobs(authenticated);
    };

    refreshForUser();
    return subscribeAuthUserChange((user) => refreshForUser(user));
  }, [loadSavedJobs]);

  useEffect(() => {
    const syncFromCache = () => setSavedJobs(readCachedSavedJobs());
    const handleStorage = (event: StorageEvent) => {
      if (event.key === SAVED_JOBS_STORAGE_KEY || event.key === null) syncFromCache();
    };

    window.addEventListener(DATA_UPDATED_EVENT, syncFromCache);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(DATA_UPDATED_EVENT, syncFromCache);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    if (!announcement) return;
    const timeoutId = window.setTimeout(() => setAnnouncement(""), 2600);
    return () => window.clearTimeout(timeoutId);
  }, [announcement]);

  const handleRemove = async (item: SavedJobItem) => {
    if (removingId) return;

    setRemovingId(item.id);
    setActionError("");
    try {
      if (authState === "authenticated" && item.serverId) {
        await savedJobsApi.remove(item.serverId);
      }

      const updatedJobs = savedJobs.filter((savedJob) => savedJob.id !== item.id);
      setSavedJobs(updatedJobs);
      writeCachedSavedJobs(updatedJobs);
      window.dispatchEvent(new Event(DATA_UPDATED_EVENT));
      setAnnouncement(`Đã bỏ lưu “${toVietnameseJobTitle(item.title)}”.`);
    } catch (error) {
      setActionError(
        error instanceof Error && error.message.trim()
          ? `Không thể bỏ lưu: ${error.message}`
          : "Không thể bỏ lưu công việc. Vui lòng thử lại.",
      );
    } finally {
      setRemovingId(null);
    }
  };

  const retry = () => void loadSavedJobs(authState === "authenticated");
  const showInitialLoading = (authState === "checking" || loading) && savedJobs.length === 0;

  return (
    <section className="space-y-7" aria-busy={loading}>
      <div className="overflow-hidden rounded-[32px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 px-6 py-9 text-slate-900 shadow-[0_24px_60px_-36px_rgba(15,118,110,0.35)] md:px-10 md:py-11">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3.5 py-2 text-xs font-bold text-emerald-700 shadow-sm">
              <Bookmark className="h-4 w-4" />
              Không bỏ lỡ cơ hội phù hợp
            </span>
            <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">Việc làm đã lưu</h1>
            <p className="mt-3 text-sm leading-7 text-slate-600 md:text-base">
              Xem lại các vị trí bạn quan tâm, so sánh thông tin và tiếp tục ứng tuyển khi đã sẵn sàng.
            </p>
          </div>

          <div className="flex flex-wrap items-stretch gap-3 sm:flex-nowrap lg:justify-end">
            <div className="min-w-28 rounded-2xl border border-emerald-200 bg-white/85 px-5 py-3 text-center shadow-sm backdrop-blur-sm">
              <p className="text-2xl font-black text-slate-950">{savedJobs.length}</p>
              <p className="text-xs font-semibold text-slate-500">vị trí đã lưu</p>
            </div>
            <Link
              href="/tim-viec"
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white shadow-sm transition hover:bg-emerald-500"
            >
              Tìm thêm việc
              <Briefcase className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {authState === "guest" && (
        <div className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-amber-950">Danh sách đang được lưu trên thiết bị này</p>
            <p className="mt-1 text-sm leading-6 text-amber-800">
              Đăng nhập để đồng bộ việc làm giữa các phiên và lưu dữ liệu trên tài khoản của bạn.
            </p>
          </div>
          <Link
            href="/dang-nhap?next=%2Fviec-lam-da-luu"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-amber-800"
          >
            <LogIn className="h-4 w-4" />
            Đăng nhập
          </Link>
        </div>
      )}

      {loading && savedJobs.length > 0 && (
        <div role="status" className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang đồng bộ danh sách với tài khoản của bạn…
        </div>
      )}

      {loadError && savedJobs.length > 0 && (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold leading-6 text-amber-900">{loadError} Đang hiển thị dữ liệu gần nhất trên thiết bị.</p>
          <button
            type="button"
            onClick={retry}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-sm font-bold text-amber-900 transition hover:bg-amber-100"
          >
            <RefreshCw className="h-4 w-4" />
            Thử lại
          </button>
        </div>
      )}

      {actionError && (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-800">
          {actionError}
        </div>
      )}

      <p className="sr-only" aria-live="polite">{announcement}</p>

      {showInitialLoading ? (
        <LoadingCards />
      ) : loadError && savedJobs.length === 0 ? (
        <div className="rounded-[28px] border border-rose-200 bg-rose-50 px-6 py-12 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-rose-600 shadow-sm">
            <RefreshCw className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-xl font-black text-slate-950">Chưa thể tải danh sách đã lưu</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-600">{loadError}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" />
            Thử tải lại
          </button>
        </div>
      ) : savedJobs.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white text-slate-400 shadow-sm">
            <Bookmark className="h-7 w-7" />
          </div>
          <h2 className="mt-5 text-xl font-black text-slate-950">Bạn chưa lưu công việc nào</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-slate-600">
            Nhấn biểu tượng lưu tại một tin tuyển dụng để quay lại xem và ứng tuyển sau.
          </p>
          <Link
            href="/tim-viec"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-700"
          >
            Khám phá việc làm
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {savedJobs.map((item) => {
            const jobHref = getJobHref(item);
            const isRemoving = removingId === item.id;
            const companyInitial = item.company.charAt(0).toUpperCase() || "C";

            return (
              <article
                key={item.id}
                className="group flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg md:p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-50 text-base font-black text-emerald-800 ring-1 ring-emerald-200">
                    {companyInitial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link href={jobHref} className="text-lg font-black leading-7 text-slate-950 transition group-hover:text-emerald-700">
                      {toVietnameseJobTitle(item.title)}
                    </Link>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                      <Building2 className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.company}</span>
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {item.place && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700">
                      <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                      {item.place}
                    </span>
                  )}
                  {item.salary && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700">
                      <Wallet className="h-3.5 w-3.5 text-emerald-600" />
                      {item.salary}
                    </span>
                  )}
                  {item.type && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700">
                      <Clock3 className="h-3.5 w-3.5 text-emerald-600" />
                      {item.type}
                    </span>
                  )}
                </div>

                <div className="mt-auto flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <CalendarClock className="h-4 w-4" />
                    Đã lưu: {formatSavedDate(item.savedAt)}
                  </p>
                  <div className="flex items-center gap-2">
                    <Link
                      href={jobHref}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-black text-white transition hover:bg-emerald-700 sm:flex-none"
                    >
                      Xem chi tiết
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleRemove(item)}
                      disabled={Boolean(removingId)}
                      aria-label={`Bỏ lưu ${item.title}`}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
