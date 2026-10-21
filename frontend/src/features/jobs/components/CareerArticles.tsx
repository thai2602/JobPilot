import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { companyAvatars, imageSrc } from "../../companies/companyAssets";

const articles = [
   {
      title: "5 cách tối ưu CV cho vị trí Frontend React Developer",
      category: "CV & Portfolio",
      readTime: "8 phút đọc",
      summary: "Các mục cần nhấn mạnh trong CV công nghệ để tăng tỉ lệ qua vòng lọc hồ sơ, từ cấu trúc dự án đến cách mô tả impact bằng số liệu. Bài viết kèm ví dụ thực tế cho Fresher và Mid-level.",
      image: companyAvatars[0],
   },
   {
      title: "Checklist chuẩn bị phỏng vấn cho ứng viên trái ngành",
      category: "Phỏng vấn",
      readTime: "6 phút đọc",
      summary: "Danh sách các câu hỏi thường gặp và cách trả lời thuyết phục với recruiter, đặc biệt cho ứng viên chuyển ngành. Có mẫu câu trả lời STAR, checklist luyện tập và lỗi cần tránh trước vòng phỏng vấn cuối.",
      image: companyAvatars[1],
   },
   {
      title: "Xu hướng lương ngành IT, Marketing, Sales năm 2026",
      category: "Báo cáo thị trường",
      readTime: "10 phút đọc",
      summary: "Tổng hợp mức lương theo vị trí và kinh nghiệm tại các thành phố lớn, bao gồm biên độ lương theo cấp bậc và kỹ năng. Dữ liệu cập nhật theo nhóm ngành để bạn đặt kỳ vọng đàm phán phù hợp hơn.",
      image: companyAvatars[2],
   },
];

export default function CareerArticles() {
   return (
      <section className="space-y-6">
         <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
               <CalendarClock className="w-6 h-6 text-slate-500" /> Bài viết cẩm nang sự nghiệp
            </h2>
            <Link href="/cam-nang" className="text-[13px] font-extrabold text-sky-600 hover:text-sky-700 hover:underline">Xem tất cả bài viết ↗</Link>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {articles.map((article) => (
               <article key={article.title} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all duration-300 flex flex-col group">
                  <div className="h-44 w-full bg-slate-100 overflow-hidden relative">
                     <img src={imageSrc(article.image)} alt={article.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                     <span className="absolute top-4 left-4 text-[10.5px] font-extrabold bg-sky-50 border border-sky-100 text-sky-600 px-3 py-1 rounded-xl shadow-md uppercase tracking-wider">
                        {article.category}
                     </span>
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                     <div className="space-y-2">
                        <span className="text-[11px] text-slate-400 font-bold">{article.readTime}</span>
                        <h3 className="text-[15.5px] font-black text-slate-900 leading-snug group-hover:text-sky-600 transition-colors">{article.title}</h3>
                        <p className="text-[13px] text-slate-500 leading-relaxed font-medium">{article.summary}</p>
                     </div>
                  </div>
               </article>
            ))}
         </div>
      </section>
   );
}
