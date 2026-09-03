'use client';

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { BadgeDollarSign, Gift, Banknote, Store, Columns, TrendingUp, Info, CheckCircle } from "lucide-react";
import { jobsApi } from "../../services/jobsApi";

// input in millions (VND)
function calculateGrossToNet(grossInMillions: number, dependents: number, basis: "full" | "min", regionVal: number) {
   const gross = grossInMillions * 1_000_000;

   // Determine minimum regional wage for region 1, 2, 3, 4
   let minWage = 4_960_000;
   if (regionVal === 2) minWage = 4_410_000;
   else if (regionVal === 3) minWage = 3_860_000;
   else if (regionVal === 4) minWage = 3_450_000;

   const insSalary = basis === "full" ? gross : minWage;

   // BHXH (8% cap at 20 times basic wage of 1.8M = 36M)
   const bhxhSalary = Math.min(insSalary, 36_000_000);
   const bhxh = bhxhSalary * 0.08;

   // BHYT (1.5% cap at 20 times basic wage of 1.8M = 36M)
   const bhytSalary = Math.min(insSalary, 36_000_000);
   const bhyt = bhytSalary * 0.015;

   // BHTN (1% cap at 20 times regional minimum wage)
   const bhtnSalary = Math.min(insSalary, 20 * minWage);
   const bhtn = bhtnSalary * 0.01;

   const totalInsurance = bhxh + bhyt + bhtn;

   // Deductions
   const selfDeduction = 11_000_000;
   const dependentDeduction = dependents * 4_400_000;
   const totalDeduction = selfDeduction + dependentDeduction;

   // Taxable income
   const taxableIncome = Math.max(0, gross - totalInsurance - totalDeduction);

   // PIT calculation based on progressive brackets
   let pit = 0;
   if (taxableIncome <= 5_000_000) {
      pit = taxableIncome * 0.05;
   } else if (taxableIncome <= 10_000_000) {
      pit = taxableIncome * 0.10 - 250_000;
   } else if (taxableIncome <= 18_000_000) {
      pit = taxableIncome * 0.15 - 750_000;
   } else if (taxableIncome <= 32_000_000) {
      pit = taxableIncome * 0.20 - 1_650_000;
   } else if (taxableIncome <= 52_000_000) {
      pit = taxableIncome * 0.25 - 3_250_000;
   } else if (taxableIncome <= 80_000_000) {
      pit = taxableIncome * 0.30 - 5_850_000;
   } else {
      pit = taxableIncome * 0.35 - 9_850_000;
   }

   const net = gross - totalInsurance - pit;

   return {
      gross: gross / 1_000_000,
      bhxh: bhxh / 1_000_000,
      bhyt: bhyt / 1_000_000,
      bhtn: bhtn / 1_000_000,
      totalInsurance: totalInsurance / 1_000_000,
      taxableIncome: taxableIncome / 1_000_000,
      pit: pit / 1_000_000,
      net: net / 1_000_000,
   };
}

function calculateNetToGross(netInMillions: number, dependents: number, basis: "full" | "min", regionVal: number) {
   if (netInMillions <= 0) return calculateGrossToNet(0, dependents, basis, regionVal);

   let low = netInMillions;
   let high = netInMillions * 3;
   let mid = 0;
   let iterations = 0;
   const epsilon = 0.0001;

   while (low <= high && iterations < 50) {
      mid = (low + high) / 2;
      const res = calculateGrossToNet(mid, dependents, basis, regionVal);
      if (Math.abs(res.net - netInMillions) < epsilon) {
         return res;
      }
      if (res.net < netInMillions) {
         low = mid;
      } else {
         high = mid;
      }
      iterations++;
   }
   return calculateGrossToNet(mid, dependents, basis, regionVal);
}

const tools = [
   {
      id: "salary-estimate",
      title: "Ước tính lương",
      desc: "So sánh mức lương theo cấp bậc, khu vực và ngành nghề với dữ liệu thực tế.",
      icon: BadgeDollarSign,
      accent: "#10b981",
      badge: "Phổ biến nhất",
   },
   {
      id: "benefit-compare",
      title: "So sánh đãi ngộ",
      desc: "Tổng hợp bảo hiểm, thưởng và phúc lợi theo công ty.",
      icon: Gift,
      accent: "#10b981",
      badge: "Mới cập nhật",
   },
   {
      id: "net-gross",
      title: "Công cụ lương Net/Gross",
      desc: "Tính nhanh lương take-home hoặc quy đổi từ lương net sang gross.",
      icon: Banknote,
      accent: "#10b981",
      badge: "Tiện lợi",
   },
   {
      id: "salary-jobs",
      title: "Gợi ý việc làm",
      desc: "Nhập mức lương mong muốn để nhận gợi ý ngành và vị trí phù hợp.",
      icon: Store,
      accent: "#10b981",
      badge: "Tùy chỉnh",
   },
   {
      id: "industry-compare",
      title: "So sánh lương ngành",
      desc: "Nhận diện ngành nào đang trả lương tốt hơn cho bạn.",
      icon: Columns,
      accent: "#10b981",
      badge: "Phân tích",
   },
   {
      id: "market-trends",
      title: "Xu hướng thị trường",
      desc: "Theo dõi biến động tuyển dụng và xu hướng lương.",
      icon: TrendingUp,
      accent: "#10b981",
      badge: "Realtime",
   },
];

const salaryAverages = [
   { title: "Frontend Developer", avg: "28 triệu", range: "22-35 triệu" },
   { title: "Backend Developer", avg: "30 triệu", range: "24-40 triệu" },
   { title: "Nhân viên tài chính", avg: "18 triệu", range: "14-25 triệu" },
   { title: "Chuyên viên kinh doanh", avg: "20 triệu", range: "15-30 triệu" },
   { title: "HR Recruiter", avg: "16 triệu", range: "12-22 triệu" },
   { title: "Marketing Specialist", avg: "19 triệu", range: "15-28 triệu" },
];

const benefitPolicies = [
   { title: "Bảo hiểm sức khỏe toàn diện", desc: "Bảo hiểm y tế 24/7, khám chữa bệnh miễn phí với gói doanh nghiệp." },
   { title: "Chính sách lương thưởng", desc: "Thưởng hiệu suất, lương tháng 13 và review lương 6 tháng/lần." },
   { title: "Ngày nghỉ và phúc lợi", desc: "PCC, nghỉ phép năm, hỗ trợ du lịch và team-building." },
];

const industrySalaryComparison = [
   { industry: "Công nghệ thông tin", avg: 32, color: "#0f766e" },
   { industry: "Tài chính - Ngân hàng", avg: 24, color: "#2563eb" },
   { industry: "Kinh doanh - Buôn bán", avg: 20, color: "#c026d3" },
   { industry: "Marketing", avg: 19, color: "#dc2626" },
   { industry: "Thiết kế", avg: 18, color: "#0ea5e9" },
];

const marketTrends = [
   { label: "Tăng tuyển dụng", value: "14%", desc: "Ngành CNTT vẫn dẫn đầu nhu cầu tuyển dụng." },
   { label: "Lương cạnh tranh", value: "12%", desc: "Nhân sự tài chính và sales tăng lương nhanh." },
   { label: "Uy tín doanh nghiệp", value: "75%", desc: "Doanh nghiệp ưu tiên phúc lợi linh hoạt." },
];

const jobSuggestions = [
   { title: "Frontend React Developer", company: "NovaTech", salary: 32 },
   { title: "Chuyên viên tín dụng", company: "FinBank", salary: 24 },
   { title: "Nhân viên kinh doanh", company: "SalesPro", salary: 22 },
   { title: "DevOps Engineer", company: "CloudTech", salary: 38 },
   { title: "Marketing Specialist", company: "AdFlex", salary: 21 },
];

export default function UtilitiesPage() {
   const [calculatorMode, setCalculatorMode] = useState<"gross" | "net">("gross");
   const [salaryInput, setSalaryInput] = useState("25");
   const [salaryQuery, setSalaryQuery] = useState("25");
   const [activeUtility, setActiveUtility] = useState<string>(tools[0].id);

   // Calculator details states
   const [dependents, setDependents] = useState(0);
   const [insuranceBasis, setInsuranceBasis] = useState<"full" | "min">("full");
   const [region, setRegion] = useState<1 | 2 | 3 | 4>(1);

   // Industry comparison states
   const [compareSource, setCompareSource] = useState(industrySalaryComparison[0].industry);
   const [compareTarget, setCompareTarget] = useState(industrySalaryComparison[1].industry);

   // Live jobs state
   const [apiJobs, setApiJobs] = useState<any[]>([]);

   // Fetch jobs on mount for suggestions
   useEffect(() => {
      jobsApi.list()
         .then((apiData) => {
            if (apiData && apiData.length > 0) {
               const mapped = apiData.map((item: any) => ({
                  title: item.title,
                  company: item.company?.name || "Công ty ẩn",
                  salary: Math.round((item.salaryMax ? item.salaryMax : (item.salaryMin || 0)) / 1_000_000) || 15,
               }));
               setApiJobs(mapped);
            }
         })
         .catch((err) => {
            console.error("Failed to fetch jobs for utilities page", err);
         });
   }, []);

   const salaryNumber = useMemo(() => {
      const cleanStr = salaryInput.replace(/,/g, ".");
      const num = parseFloat(cleanStr);
      return isNaN(num) ? 0 : num;
   }, [salaryInput]);

   const salaryQueryNumber = useMemo(() => {
      const cleanStr = salaryQuery.replace(/,/g, ".");
      const num = parseFloat(cleanStr);
      return isNaN(num) ? 0 : num;
   }, [salaryQuery]);

   const salaryBreakdown = useMemo(() => {
      if (salaryNumber <= 0) return null;
      if (calculatorMode === "gross") {
         return calculateGrossToNet(salaryNumber, dependents, insuranceBasis, region);
      } else {
         return calculateNetToGross(salaryNumber, dependents, insuranceBasis, region);
      }
   }, [salaryNumber, calculatorMode, dependents, insuranceBasis, region]);

   const finalJobSuggestions = useMemo(() => {
      return apiJobs.length > 0 ? apiJobs : jobSuggestions;
   }, [apiJobs]);

   const salarySuggestions = useMemo(() => {
      if (salaryQueryNumber <= 0) {
         return finalJobSuggestions.slice(0, 3);
      }
      const filtered = finalJobSuggestions.filter((job) => Math.abs(job.salary - salaryQueryNumber) <= 6);
      return filtered.length > 0 ? filtered.slice(0, 5) : [];
   }, [salaryQueryNumber, finalJobSuggestions]);

   const comparisonResult = useMemo(() => {
      const source = industrySalaryComparison.find(x => x.industry === compareSource);
      const target = industrySalaryComparison.find(x => x.industry === compareTarget);
      if (!source || !target) return null;
      const diff = source.avg - target.avg;
      const percent = ((source.avg / target.avg - 1) * 100).toFixed(0);
      return {
         diff: Math.abs(diff),
         percent: Math.abs(Number(percent)),
         isSourceHigher: diff > 0,
         isEqual: diff === 0
      };
   }, [compareSource, compareTarget]);

   const openUtility = (utilityId: string) => {
      setActiveUtility(utilityId);
      const section = document.getElementById(`utility-${utilityId}`);
      if (section) {
         section.scrollIntoView({ behavior: "smooth", block: "start" });
      }
   };

   return (
      <div className="space-y-10 pb-16">
         {/* ── Hero Banner Section ── */}
         <section className="relative overflow-hidden rounded-[20px] border border-slate-200 bg-white px-6 py-16 shadow-[0_4px_20px_rgba(0,0,0,0.06)] md:px-12 md:py-20 min-h-[400px] md:min-h-[520px]">
            {/* Blurry abstract glow items */}
            <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-emerald-500/15 blur-3xl" />
            <div className="absolute -bottom-20 left-1/4 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl" />

            <div className="relative max-w-4xl mx-auto text-center space-y-6">
               <div className="flex justify-center mb-4">
                  <div className="p-3 rounded-full bg-emerald-100">
                     <BadgeDollarSign className="w-8 h-8 text-emerald-600" />
                  </div>
               </div>
               <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                  Tiện ích tìm việc thông minh
               </h1>
               <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
                  Ước tính lương net/gross, so sánh phúc lợi giữa công ty và theo dõi xu hướng thị trường nhân sự chỉ trong vài giây.
               </p>
               <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
                     Khám phá tiện ích <TrendingUp className="h-4 w-4" />
                  </button>
                  <Link href="/cv-mau" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm hover:shadow-md transition-all hover:border-slate-400">
                     Xem mẫu CV
                  </Link>
               </div>
            </div>
         </section>

         {/* ── Main Layout: Tools sidebar + Utilities grid ── */}
         <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-start">

            {/* 1. Left Sidebar: Tools Navigation */}
            <aside className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4 lg:sticky lg:top-8 z-10">
               <h2 className="text-[15px] font-black text-slate-900">Công cụ tiện ích</h2>
               <hr className="border-slate-100" />
               <div className="space-y-2">
                  {tools.map((tool) => {
                     const Icon = tool.icon;
                     const isActive = activeUtility === tool.id;
                     return (
                        <button
                           key={tool.id}
                           onClick={() => openUtility(tool.id)}
                           className={`w-full px-3.5 py-2.5 rounded-xl text-[13px] font-bold text-left transition-all duration-300 cursor-pointer border ${isActive
                              ? "border-emerald-600 bg-emerald-50 text-emerald-950 shadow-md"
                              : "border-slate-100 bg-white text-slate-600 hover:bg-slate-50"
                              }`}
                        >
                           <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              <span>{tool.title}</span>
                           </div>
                        </button>
                     );
                  })}
               </div>
            </aside>

            {/* 2. Right: Main Content Area */}
            <main className="space-y-6">
               {/* Salary average by position */}
               <section id="utility-salary-estimate" className="space-y-6 rounded-[28px] border border-slate-100/80 bg-white p-8 shadow-sm">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                     <div>
                        <h2 className="text-3xl font-extrabold tracking-tight text-slate-950">Mức lương trung bình theo vị trí</h2>
                        <p className="mt-2 text-[15px] text-slate-600 font-medium">Thống kê lương thực tế cho các vị trí phổ biến trên thị trường.</p>
                     </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                     {salaryAverages.map((item) => (
                        <div key={item.title} className="rounded-[20px] border border-slate-100 bg-slate-50 p-6">
                           <p className="text-[13px] font-bold text-slate-600 uppercase tracking-wide">{item.title}</p>
                           <p className="mt-4 text-4xl font-black text-emerald-700">{item.avg}</p>
                           <p className="mt-2 text-[13.5px] text-slate-600">Khoảng: {item.range}</p>
                        </div>
                     ))}
                  </div>
               </section>

               {/* Benefit policy section */}
               <section id="utility-benefit-compare" className="space-y-6 rounded-[28px] border border-slate-100/80 bg-white p-8 shadow-sm">
                  <div>
                     <h2 className="text-3xl font-extrabold tracking-tight text-slate-950">Chính sách đãi ngộ của công ty</h2>
                     <p className="mt-2 text-[15px] text-slate-600 font-medium">Tìm hiểu nhanh những phúc lợi quan trọng khi nhận việc.</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                     {benefitPolicies.map((item) => (
                        <div key={item.title} className="rounded-[20px] border border-slate-100 bg-slate-50 p-6">
                           <h3 className="text-[15px] font-bold text-slate-950">{item.title}</h3>
                           <p className="mt-3 text-[13.5px] text-slate-600 leading-relaxed">{item.desc}</p>
                        </div>
                     ))}
                  </div>
               </section>

               {/* Net/Gross calculator */}
               <section id="utility-net-gross" className="space-y-6 rounded-[28px] border border-slate-100/80 bg-white p-8 shadow-sm">
                  <div>
                     <h2 className="text-3xl font-extrabold tracking-tight text-slate-950">Công cụ tính lương net / gross chuyên nghiệp</h2>
                     <p className="mt-2 text-[15px] text-slate-600 font-medium">Áp dụng mức giảm trừ gia cảnh và các quy định bảo hiểm mới nhất tại Việt Nam.</p>
                  </div>
                  <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                     {/* Left Column: Form Inputs */}
                     <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-6 shadow-sm space-y-5">
                        <div className="flex items-center gap-3">
                           <button
                              type="button"
                              className={`rounded-full px-5 py-2.5 text-xs font-bold transition-all cursor-pointer ${calculatorMode === "gross" ? "bg-emerald-600 text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)]" : "bg-white text-slate-700 hover:bg-slate-100"}`}
                              onClick={() => setCalculatorMode("gross")}
                           >
                              Gross → Net (Tính lương thực nhận)
                           </button>
                           <button
                              type="button"
                              className={`rounded-full px-5 py-2.5 text-xs font-bold transition-all cursor-pointer ${calculatorMode === "net" ? "bg-emerald-600 text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)]" : "bg-white text-slate-700 hover:bg-slate-100"}`}
                              onClick={() => setCalculatorMode("net")}
                           >
                              Net → Gross (Quy đổi ngược)
                           </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <div className="space-y-1.5">
                              <label className="text-[12.5px] font-bold text-slate-700">Mức lương ({calculatorMode === "gross" ? "Gross" : "Net"})</label>
                              <input
                                 type="text"
                                 value={salaryInput}
                                 onChange={(e) => setSalaryInput(e.target.value)}
                                 placeholder="Ví dụ: 25"
                                 className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 text-sm font-semibold outline-none transition focus:border-emerald-500 focus:bg-white"
                              />
                           </div>

                           <div className="space-y-1.5">
                              <label className="text-[12.5px] font-bold text-slate-700">Số người phụ thuộc</label>
                              <select
                                 value={dependents}
                                 onChange={(e) => setDependents(Number(e.target.value))}
                                 className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 text-sm font-semibold outline-none transition focus:border-emerald-500 focus:bg-white cursor-pointer"
                              >
                                 {[0, 1, 2, 3, 4, 5, 6].map(n => (
                                    <option key={n} value={n}>{n} người</option>
                                 ))}
                              </select>
                           </div>

                           <div className="space-y-1.5">
                              <label className="text-[12.5px] font-bold text-slate-700">Mức đóng bảo hiểm</label>
                              <select
                                 value={insuranceBasis}
                                 onChange={(e) => setInsuranceBasis(e.target.value as "full" | "min")}
                                 className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 text-sm font-semibold outline-none transition focus:border-emerald-500 focus:bg-white cursor-pointer"
                              >
                                 <option value="full">Đóng trên lương thực tế</option>
                                 <option value="min">Đóng mức tối thiểu vùng</option>
                              </select>
                           </div>

                           <div className="space-y-1.5">
                              <label className="text-[12.5px] font-bold text-slate-700">Vùng bảo hiểm tối thiểu</label>
                              <select
                                 value={region}
                                 onChange={(e) => setRegion(Number(e.target.value) as 1 | 2 | 3 | 4)}
                                 className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 text-sm font-semibold outline-none transition focus:border-emerald-500 focus:bg-white cursor-pointer"
                              >
                                 <option value={1}>Vùng I (4.96M)</option>
                                 <option value={2}>Vùng II (4.41M)</option>
                                 <option value={3}>Vùng III (3.86M)</option>
                                 <option value={4}>Vùng IV (3.45M)</option>
                              </select>
                           </div>
                        </div>
                     </div>

                     {/* Right Column: Calculations Breakdown */}
                     <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-6 shadow-sm flex flex-col justify-between">
                        {salaryBreakdown ? (
                           <div className="space-y-5">
                              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                                 <p className="text-xs font-bold text-emerald-800 uppercase tracking-widest">
                                    {calculatorMode === "gross" ? "Thực nhận ước tính (NET)" : "Mức lương quy đổi (GROSS)"}
                                 </p>
                                 <p className="text-3xl sm:text-4xl font-extrabold text-emerald-700 mt-2">
                                    {(calculatorMode === "gross" ? salaryBreakdown.net : salaryBreakdown.gross).toFixed(2)} triệu <span className="text-base font-bold text-emerald-600">/ tháng</span>
                                 </p>
                              </div>

                              <div className="space-y-2 text-sm">
                                 <h3 className="font-extrabold text-slate-800 text-[13.5px] flex items-center gap-1.5 border-b pb-1.5">
                                    <Info className="w-4 h-4 text-emerald-600" /> Bảng chi tiết lương tháng (VND)
                                 </h3>
                                 <div className="divide-y divide-slate-100 font-medium">
                                    <div className="flex justify-between py-2">
                                       <span className="text-slate-500 font-bold">Lương Gross</span>
                                       <span className="text-slate-950 font-extrabold">{(salaryBreakdown.gross * 1_000_000).toLocaleString('vi-VN')} đ</span>
                                    </div>
                                    <div className="flex justify-between py-2 text-xs">
                                       <span className="text-slate-500 pl-3">↳ BH Xã hội (8.0%)</span>
                                       <span className="text-slate-700">- {(salaryBreakdown.bhxh * 1_000_000).toLocaleString('vi-VN')} đ</span>
                                    </div>
                                    <div className="flex justify-between py-2 text-xs">
                                       <span className="text-slate-500 pl-3">↳ BH Y tế (1.5%)</span>
                                       <span className="text-slate-700">- {(salaryBreakdown.bhyt * 1_000_000).toLocaleString('vi-VN')} đ</span>
                                    </div>
                                    <div className="flex justify-between py-2 text-xs">
                                       <span className="text-slate-500 pl-3">↳ BH Thất nghiệp (1.0%)</span>
                                       <span className="text-slate-700">- {(salaryBreakdown.bhtn * 1_000_000).toLocaleString('vi-VN')} đ</span>
                                    </div>
                                    <div className="flex justify-between py-2">
                                       <span className="text-slate-500 font-bold">Tổng tiền bảo hiểm</span>
                                       <span className="text-rose-600 font-bold">- {(salaryBreakdown.totalInsurance * 1_000_000).toLocaleString('vi-VN')} đ</span>
                                    </div>
                                    <div className="flex justify-between py-2">
                                       <span className="text-slate-500 font-bold">Thuế thu nhập cá nhân (PIT)</span>
                                       <span className="text-rose-600 font-bold">
                                          {salaryBreakdown.pit > 0
                                             ? `- ${(salaryBreakdown.pit * 1_000_000).toLocaleString('vi-VN')} đ`
                                             : "0 đ (Miễn thuế)"
                                          }
                                       </span>
                                    </div>
                                    <div className="flex justify-between py-2.5 border-t border-dashed bg-white px-2 rounded-xl mt-1.5 font-bold">
                                       <span className="text-emerald-800">Lương NET thực nhận</span>
                                       <span className="text-emerald-700 font-black">{(salaryBreakdown.net * 1_000_000).toLocaleString('vi-VN')} đ</span>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        ) : (
                           <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center space-y-3">
                              <Banknote className="w-12 h-12 text-slate-300 animate-pulse" />
                              <p className="text-[13.5px] font-bold">Nhập mức lương ở cột bên trái<br />để xem bảng tính chi tiết BHXH & Thuế TNCN.</p>
                           </div>
                        )}

                        <div className="mt-4 border-t pt-3 flex items-start gap-2 text-[11px] text-slate-500 leading-normal">
                           <span className="text-amber-500">★</span>
                           <p>
                              Dữ liệu được cập nhật dựa trên quy định giảm trừ gia cảnh (bản thân 11M, người phụ thuận 4.4M) và lương cơ sở 1.8M đóng bảo hiểm. BHXH tối đa 36M, BHYT tối đa 36M, BHTN tối đa 20 lần mức tối thiểu vùng.
                           </p>
                        </div>
                     </div>
                  </div>
               </section>

               {/* Salary-based job suggestions */}
               <section id="utility-salary-jobs" className="space-y-6 rounded-[28px] border border-slate-100/80 bg-white p-8 shadow-sm">
                  <div>
                     <h2 className="text-3xl font-extrabold tracking-tight text-slate-950">Gợi ý việc làm theo mức lương</h2>
                     <p className="mt-2 text-[15px] text-slate-600 font-medium">Nhập mức lương mong muốn để nhận đề xuất vị trí phù hợp.</p>
                  </div>
                  <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                     <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-6 shadow-sm">
                        <label className="text-[13px] font-bold text-slate-700 uppercase tracking-wide">Mức lương mong muốn (triệu)</label>
                        <input
                           type="text"
                           value={salaryQuery}
                           onChange={(e) => setSalaryQuery(e.target.value)}
                           placeholder="Ví dụ: 25"
                           className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 text-[14px] font-medium outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                        <div className="mt-6 space-y-3">
                           {salarySuggestions.length > 0 ? (
                              salarySuggestions.map((job) => (
                                 <div key={job.title} className="rounded-2xl border border-slate-100 bg-white p-4 hover:border-emerald-200 hover:shadow-sm transition-all">
                                    <div className="flex items-center justify-between gap-3">
                                       <div>
                                          <p className="font-bold text-slate-900 text-[14px]">{job.title}</p>
                                          <p className="mt-1 text-[13px] text-slate-500">{job.company}</p>
                                       </div>
                                       <span className="rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-bold text-emerald-700 whitespace-nowrap">{job.salary}M</span>
                                    </div>
                                 </div>
                              ))
                           ) : (
                              <p className="text-[13.5px] text-slate-500 text-center py-8">Không tìm thấy gợi ý phù hợp. Hãy thử mức lương khác.</p>
                           )}
                        </div>
                     </div>
                     <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-6 shadow-sm">
                        <h3 className="text-[15px] font-bold text-slate-950">Cách chọn mức lương</h3>
                        <p className="mt-3 text-[13.5px] text-slate-600 leading-relaxed">Chọn mức lương dựa trên kinh nghiệm, ngành nghề và địa điểm làm việc để nhanh chốt offer.</p>
                        <div className="mt-5 space-y-3">
                           <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-[13px] text-emerald-800 font-medium">Ưu tiên mức lương trong khoảng 10-15% trên mức hiện có nếu bạn muốn thuyết phục nhà tuyển dụng.</div>
                           <div className="rounded-xl bg-slate-100 border border-slate-200 p-4 text-[13px] text-slate-700 font-medium">Ngành CNTT và tài chính thường có biên độ lương rộng, nên chọn mức trung bình để tăng tỷ lệ trúng tuyển.</div>
                        </div>
                     </div>
                  </div>
               </section>

               {/* Industry salary comparison */}
               <section id="utility-industry-compare" className="space-y-6 rounded-[28px] border border-slate-100/80 bg-white p-8 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                     <div>
                        <h2 className="text-3xl font-extrabold tracking-tight text-slate-950">So sánh mức lương giữa các ngành</h2>
                        <p className="mt-2 text-[15px] text-slate-600 font-medium">Xem ngành nào đang trả lương cao hơn và đâu là xu hướng nổi bật.</p>
                     </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
                     {/* Left: Salary Bars */}
                     <div className="space-y-3.5">
                        {industrySalaryComparison.map((item) => (
                           <div key={item.industry} className="rounded-[20px] border border-slate-100 bg-slate-50 p-4 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex items-center justify-between gap-4">
                                 <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{item.industry}</p>
                                    <p className="mt-0.5 text-xs text-slate-400 font-semibold">Mức trung bình: {item.avg} triệu</p>
                                 </div>
                                 <span className="text-base font-black text-slate-800">{item.avg} triệu</span>
                              </div>
                              <div className="mt-3.5 h-2.5 overflow-hidden rounded-full bg-white">
                                 <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(item.avg * 3, 100)}%`, backgroundColor: item.color }} />
                              </div>
                           </div>
                        ))}
                     </div>

                     {/* Right: Interactive Direct Comparer */}
                     <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-6 shadow-sm flex flex-col justify-between">
                        <div className="space-y-4">
                           <h3 className="font-extrabold text-[14px] text-slate-800 flex items-center gap-1.5 border-b pb-2">
                              <Columns className="w-4 h-4 text-emerald-600" /> So sánh trực quan 2 ngành
                           </h3>

                           <div className="space-y-3.5">
                              <div className="space-y-1">
                                 <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Ngành thứ nhất</label>
                                 <select
                                    value={compareSource}
                                    onChange={(e) => setCompareSource(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold outline-none transition focus:border-emerald-500 focus:bg-white cursor-pointer"
                                 >
                                    {industrySalaryComparison.map(x => (
                                       <option key={x.industry} value={x.industry}>{x.industry}</option>
                                    ))}
                                 </select>
                              </div>

                              <div className="space-y-1">
                                 <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Ngành thứ hai</label>
                                 <select
                                    value={compareTarget}
                                    onChange={(e) => setCompareTarget(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold outline-none transition focus:border-emerald-500 focus:bg-white cursor-pointer"
                                 >
                                    {industrySalaryComparison.map(x => (
                                       <option key={x.industry} value={x.industry}>{x.industry}</option>
                                    ))}
                                 </select>
                              </div>
                           </div>

                           {comparisonResult && (
                              <div className="mt-5 rounded-2xl bg-emerald-50 border border-emerald-100/50 p-4 text-[12.5px] text-emerald-900 leading-relaxed font-semibold">
                                 {comparisonResult.isEqual ? (
                                    <div className="flex items-start gap-2">
                                       <span className="text-emerald-600 font-bold">✓</span>
                                       <p>Mức lương trung bình của hai ngành này bằng nhau.</p>
                                    </div>
                                 ) : (
                                    <div className="flex items-start gap-2.5">
                                       <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
                                       <p>
                                          Ngành <strong className="text-emerald-950">{comparisonResult.isSourceHigher ? compareSource : compareTarget}</strong> có lương trung bình cao hơn ngành <strong className="text-emerald-950">{comparisonResult.isSourceHigher ? compareTarget : compareSource}</strong> khoảng <strong className="text-emerald-950 text-sm font-black">{comparisonResult.percent}%</strong>, tương đương <strong className="text-emerald-950 text-sm font-black">{comparisonResult.diff.toFixed(1)} triệu</strong> mỗi tháng.
                                       </p>
                                    </div>
                                 )}
                              </div>
                           )}
                        </div>

                        <div className="mt-5 text-[11px] text-slate-400 font-medium">
                           * Dữ liệu dựa trên khảo sát thực tế và phân tích của chúng tôi đối với 1,500+ doanh nghiệp trong năm 2025.
                        </div>
                     </div>
                  </div>
               </section>

               {/* Market trends */}
               <section id="utility-market-trends" className="space-y-6 rounded-[28px] border border-slate-100/80 bg-white p-8 shadow-sm">
                  <div>
                     <h2 className="text-3xl font-extrabold tracking-tight text-slate-950">Thống kê xu hướng thị trường</h2>
                     <p className="mt-2 text-[15px] text-slate-600 font-medium">Theo dõi các xu hướng tuyển dụng, lương và phúc lợi nổi bật hiện nay.</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                     {marketTrends.map((item) => (
                        <div key={item.label} className="rounded-[24px] border border-slate-100 bg-slate-50 p-6 shadow-sm">
                           <div className="flex items-center gap-3">
                              <h3 className="text-[15px] font-bold text-slate-950">{item.label}</h3>
                           </div>
                           <p className="mt-4 text-5xl font-black text-emerald-700">{item.value}</p>
                           <p className="mt-3 text-[13.5px] text-slate-600 leading-relaxed">{item.desc}</p>
                        </div>
                     ))}
                  </div>
               </section>
            </main>
         </div>

         {/* Bottom banner */}
         <div className="rounded-[28px] border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-6 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
            <div>
               <p className="text-[14px] text-emerald-900 leading-relaxed font-medium">
                  Không cần tài khoản để sử dụng tiện ích. Đăng ký để lưu kết quả và nhận báo cáo cá nhân hóa.
               </p>
            </div>
            <button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6 py-3 text-[14px] font-bold shadow-md transition-all active:scale-95 whitespace-nowrap cursor-pointer">
               Đăng ký miễn phí
            </button>
         </div>
      </div>
   );
}
