import Link from "next/link";
import { ArrowRight, Briefcase, Building2, Compass, FileText, ShieldCheck, Wallet } from "lucide-react";

const highlights = [
   { title: "Tin tổng hợp, có nguồn", desc: "Tin tuyển dụng được tổng hợp từ các trang việc làm công khai, ghi rõ hạn nộp.", accent: "#047857", icon: ShieldCheck },
   { title: "Lọc theo địa điểm", desc: "Tìm nhanh việc làm theo tỉnh thành, cấp bậc và hình thức làm việc.", accent: "#0369a1", icon: Compass },
   { title: "Minh bạch thu nhập", desc: "Hiển thị khoảng lương khi nhà tuyển dụng công bố, kèm thống kê lương theo ngành.", accent: "#7c3aed", icon: Wallet },
];

const quickLinks = [
   {
      title: "Tìm việc nhanh",
      desc: "Tìm đúng cơ hội theo vị trí, cấp bậc, hình thức làm việc và mức thu nhập kỳ vọng.",
      to: "/tim-viec",
      icon: Briefcase,
      accent: "#059669",
   },
   {
      title: "Danh sách công ty",
      desc: "Đánh giá doanh nghiệp theo văn hóa, phúc lợi và nhu cầu tuyển dụng theo từng ngành.",
      to: "/cong-ty",
      icon: Building2,
      accent: "#0284c7",
   },
   {
      title: "Kho CV mẫu",
      desc: "Lựa chọn mẫu CV chuyên nghiệp theo ngành nghề và cấp độ kinh nghiệm của bạn.",
      to: "/cv-mau",
      icon: FileText,
      accent: "#7c3aed",
   },
];

/** "Tại sao nên tìm việc qua JobPilot?" */
export function WhyJobPilot() {
   return (
      <>
         <div className="flex items-start gap-3 mb-4">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Tại sao nên tìm việc qua JobPilot?</h2>
         </div>
         <section className="rounded-[12px] border border-gray-200/80 bg-white px-6 py-8 md:px-8">
            <div className="grid gap-6 md:grid-cols-3">
               {highlights.map(({ title, desc, accent, icon: Icon }) => (
                  <article key={title} className="rounded-[12px] border border-gray-200/80 bg-white p-6 shadow-sm text-center">
                     <div className="flex flex-col items-center gap-4">
                        <div className="h-16 w-16 flex items-center justify-center rounded-full border border-slate-200">
                           <Icon className="h-8 w-8" style={{ color: accent }} />
                        </div>
                        <div>
                           <h4 className="text-lg font-semibold text-slate-900">{title}</h4>
                           <p className="mt-2 text-sm text-slate-600 max-w-[22rem] mx-auto">{desc}</p>
                        </div>
                     </div>
                  </article>
               ))}
            </div>
         </section>
      </>
   );
}

export function SignUpCta() {
   return (
      <section className="rounded-[16px] border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white px-6 py-8 shadow-[0_4px_16px_rgba(16,185,129,0.08)] md:px-10 md:py-12">
         <div className="space-y-6 lg:space-y-4 lg:flex lg:items-center lg:justify-between">
            <div className="max-w-2xl">
               <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                  Bắt đầu hành trình tìm việc
               </h2>
               <p className="mt-4 text-base leading-7 text-emerald-800 max-w-xl">
                  Đăng ký miễn phí để lưu việc làm, theo dõi công ty yêu thích và sử dụng công cụ hỗ trợ tìm việc của JobPilot.
               </p>
            </div>
            <Link
               href="/dang-ky"
               className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 px-6 py-3 text-sm font-semibold text-white shadow transition-colors lg:shrink-0"
            >
               Đăng ký tài khoản
            </Link>
         </div>
      </section>
   );
}

export function QuickLinks() {
   return (
      <section>
         <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
               Khám phá các chuyên mục
            </h2>
         </div>
         <div className="grid gap-5 md:grid-cols-3">
            {quickLinks.map(({ title, desc, to, accent, icon: Icon }) => (
               <Link key={to} href={to} className="group">
                  <article className="rounded-[12px] border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition">
                     <div className="flex flex-col items-center text-center gap-4">
                        <div className="h-14 w-14 flex items-center justify-center rounded-full border border-slate-200">
                           <Icon className="h-7 w-7" style={{ color: accent }} />
                        </div>
                        <div>
                           <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                           <p className="mt-2 text-sm leading-6 text-slate-600">{desc}</p>
                        </div>
                        <span className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition-transform duration-200 group-hover:translate-x-1">
                           Xem ngay <ArrowRight className="h-4 w-4" />
                        </span>
                     </div>
                  </article>
               </Link>
            ))}
         </div>
      </section>
   );
}
