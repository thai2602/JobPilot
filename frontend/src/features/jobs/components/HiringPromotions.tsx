import { Award } from "lucide-react";

type PromotionAction = "search-it" | "filter-hybrid" | "register-fair";

const promotions: Array<{
   title: string;
   subtitle: string;
   description: string;
   cta: string;
   accent: string;
   textAccent: string;
   action: PromotionAction;
}> = [
   {
      title: "Tuần lễ tuyển dụng IT 2026",
      subtitle: "200+ vị trí Frontend, Backend, Product",
      description: "Kết nối trực tiếp với nhà tuyển dụng công nghệ lớn, phỏng vấn nhanh trong 24h và nhận phản hồi hồ sơ ngay trong sự kiện. Ứng viên còn được tư vấn định hướng nghề nghiệp, chuẩn hóa CV theo từng vị trí và tham gia phiên hỏi đáp cùng các trưởng nhóm kỹ thuật.",
      cta: "Khám phá sự kiện",
      accent: "from-indigo-600 to-violet-600",
      textAccent: "text-indigo-600",
      action: "search-it",
   },
   {
      title: "Top công ty hybrid linh hoạt",
      subtitle: "Mô hình làm việc 2-3 ngày tại văn phòng",
      description: "Danh sách doanh nghiệp có chính sách hybrid rõ ràng, phù hợp ứng viên trẻ muốn cân bằng hiệu suất và trải nghiệm cá nhân. Mỗi tin tuyển dụng đi kèm thông tin về thời gian làm việc, phúc lợi và lộ trình tăng trưởng trong 6-12 tháng. Đây có lẽ sẽ là xu hướng làm việc chính trong năm 2026.",
      cta: "Xem danh sách",
      accent: "from-emerald-600 to-teal-600",
      textAccent: "text-emerald-600",
      action: "filter-hybrid",
   },
   {
      title: "Mega Career Fair tháng 5",
      subtitle: "Workshop CV + phỏng vấn thử miễn phí",
      description: "Được review CV 1-1 bởi recruiter, tham gia chuỗi mini talk kỹ năng nghề nghiệp và thực hành phỏng vấn thử với bộ câu hỏi bám sát nhu cầu doanh nghiệp. Sự kiện ưu tiên các vị trí IT, Marketing, Sales và nhóm công việc đang tăng trưởng mạnh.",
      cta: "Đăng ký ngay",
      accent: "from-pink-600 to-rose-600",
      textAccent: "text-pink-600",
      action: "register-fair",
   },
];

type Props = {
   onAction: (action: PromotionAction) => void;
};

export type { PromotionAction };

export default function HiringPromotions({ onAction }: Props) {
   return (
      <section className="bg-gradient-to-br from-slate-50 to-emerald-50/30 rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-inner space-y-6">
         <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
               <Award className="w-6 h-6 text-emerald-500" /> Quảng cáo tuyển dụng nổi bật
            </h2>
            <span className="text-[12.5px] text-slate-400 font-extrabold uppercase tracking-wider">Đối tác tin cậy của JobPilot</span>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {promotions.map((promo) => (
               <article key={promo.title} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:border-emerald-500/20 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
                  <div className="space-y-3">
                     <span className={`text-[9.5px] font-extrabold px-2.5 py-1 rounded bg-slate-50 border border-slate-200/50 tracking-wider uppercase ${promo.textAccent}`}>
                        SPONSORED
                     </span>
                     <h3 className="text-lg font-black text-slate-900 leading-snug group-hover:text-emerald-600 transition-colors pt-2">{promo.title}</h3>
                     <p className="text-[13px] text-slate-700 font-extrabold">{promo.subtitle}</p>
                     <p className="text-[13px] text-slate-500 leading-relaxed font-medium">{promo.description}</p>
                  </div>
                  <button
                     onClick={() => onAction(promo.action)}
                     className={`mt-6 w-full py-3 bg-gradient-to-r ${promo.accent} text-white font-extrabold text-[13px] rounded-xl hover:opacity-90 shadow-md active:scale-95 cursor-pointer transition-all`}
                  >
                     {promo.cta}
                  </button>
               </article>
            ))}
         </div>
      </section>
   );
}
