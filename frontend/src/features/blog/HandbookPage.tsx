'use client';

import { useState, useMemo } from "react";
import Link from "next/link";
import { CheckCircle, Clock, ChevronRight, TrendingUp, Lightbulb, MessageSquare, Shield, Search, Building, Users, Heart, BookOpen, X } from "lucide-react";
import articleBanner1 from "../../assets/banner/company/image_1.png";
import articleBanner2 from "../../assets/banner/company/image_2.png";
import articleBanner3 from "../../assets/banner/company/image_3.png";

const guides = [
   {
      title: "Cách viết CV ngắn gọn, đúng từ khóa ATS",
      category: "CV & Hồ sơ",
      tags: ["CV", "ATS", "Từ khóa"],
      readTime: "5 phút",
      icon: CheckCircle,
      color: "#10b981",
      featured: true,
      type: "guide",
   },
   {
      title: "5 bước chuẩn bị cho phỏng vấn đầu tiên",
      category: "Phỏng vấn",
      tags: ["Phỏng vấn", "Chuẩn bị", "Kinh nghiệm"],
      readTime: "7 phút",
      icon: MessageSquare,
      color: "#10b981",
      featured: false,
      type: "guide",
   },
   {
      title: "Cách đàm phán lương mà vẫn lịch sự",
      category: "Thương lượng",
      tags: ["Lương", "Đàm phán", "Kỹ năng"],
      readTime: "6 phút",
      icon: TrendingUp,
      color: "#10b981",
      featured: false,
      type: "guide",
   },
   {
      title: "Những dấu hiệu môi trường làm việc tích cực",
      category: "Văn hóa công ty",
      tags: ["Môi trường", "Văn hóa", "Làm việc"],
      readTime: "4 phút",
      icon: Shield,
      color: "#10b981",
      featured: false,
      type: "guide",
   },
   {
      title: "Kinh nghiệm phỏng vấn: Trả lời câu hỏi hành vi",
      category: "Phỏng vấn",
      tags: ["Phỏng vấn", "STAR", "Kinh nghiệm"],
      readTime: "8 phút",
      icon: MessageSquare,
      color: "#10b981",
      featured: false,
      type: "guide",
   },
   {
      title: "Cách viết CV hiệu quả cho ngành CNTT",
      category: "CV & Hồ sơ",
      tags: ["CV", "CNTT", "Hiệu quả"],
      readTime: "6 phút",
      icon: CheckCircle,
      color: "#10b981",
      featured: false,
      type: "guide",
   },
   {
      title: "Kỹ năng mềm cần thiết cho nhân viên văn phòng",
      category: "Kỹ năng mềm",
      tags: ["Kỹ năng mềm", "Văn phòng", "Giao tiếp"],
      readTime: "9 phút",
      icon: Lightbulb,
      color: "#10b981",
      featured: false,
      type: "guide",
   },
   {
      title: "Review công ty NovaTech: Môi trường làm việc",
      category: "Review công ty",
      tags: ["NovaTech", "Review", "Môi trường"],
      readTime: "5 phút",
      icon: Building,
      color: "#10b981",
      featured: false,
      type: "review",
   },
   {
      title: "Văn hóa doanh nghiệp tại BluePixel",
      category: "Văn hóa doanh nghiệp",
      tags: ["BluePixel", "Văn hóa", "Doanh nghiệp"],
      readTime: "7 phút",
      icon: Heart,
      color: "#10b981",
      bg: "linear-gradient(135deg, #ecfdf5, #d1fae5)",
      featured: false,
      type: "review",
   },
   {
      title: "Môi trường làm việc tại ScaleHub",
      category: "Môi trường làm việc",
      tags: ["ScaleHub", "Môi trường", "Làm việc"],
      readTime: "6 phút",
      icon: Users,
      color: "#10b981",
      bg: "linear-gradient(135deg, #ecfdf5, #a7f3d0)",
      featured: false,
      type: "review",
   },
];

const articleContents: Record<string, { intro: string; sections: { heading: string; body: string }[]; conclusion: string }> = {
   "Cách viết CV ngắn gọn, đúng từ khóa ATS": {
      intro: "CV tối ưu ATS cần rõ ràng, đúng từ khóa và tập trung vào kết quả công việc thay vì mô tả chung chung.",
      sections: [
         {
            heading: "1. Đọc kỹ mô tả công việc",
            body: "Lấy các từ khóa về kỹ năng, công cụ, vị trí và kinh nghiệm từ JD. Đưa chúng vào CV một cách tự nhiên ở phần Kỹ năng, Kinh nghiệm và Tóm tắt bản thân.",
         },
         {
            heading: "2. Viết theo cấu trúc dễ quét",
            body: "Dùng các mục chuẩn: Thông tin, Mục tiêu, Kỹ năng, Kinh nghiệm, Học vấn. Tránh bảng quá phức tạp hoặc icon dày đặc để ATS không đọc sai.",
         },
         {
            heading: "3. Ưu tiên thành tựu đo được",
            body: "Mỗi kinh nghiệm nên có kết quả cụ thể như tăng % chuyển đổi, giảm thời gian xử lý, hoặc số dự án đã triển khai.",
         },
      ],
      conclusion: "Một CV ngắn gọn, đúng từ khóa và có số liệu sẽ tăng tỷ lệ qua vòng lọc tự động và được HR chú ý nhanh hơn.",
   },
   "5 bước chuẩn bị cho phỏng vấn đầu tiên": {
      intro: "Phỏng vấn đầu tiên dễ áp lực, nhưng bạn có thể làm tốt nếu chuẩn bị theo quy trình rõ ràng.",
      sections: [
         { heading: "1. Nghiên cứu công ty", body: "Tìm hiểu sản phẩm, văn hóa, mô hình kinh doanh và tin tức gần đây của công ty." },
         { heading: "2. So khớp hồ sơ với JD", body: "Xác định 3 điểm mạnh phù hợp nhất để nhấn mạnh khi trả lời." },
         { heading: "3. Luyện câu trả lời", body: "Chuẩn bị phần giới thiệu bản thân 60-90 giây và các tình huống thường gặp." },
      ],
      conclusion: "Chuẩn bị tốt giúp bạn tự tin hơn và thể hiện tư duy chuyên nghiệp ngay từ vòng đầu.",
   },
   "Cách đàm phán lương mà vẫn lịch sự": {
      intro: "Đàm phán lương là trao đổi giá trị hai chiều, không phải mặc cả một chiều.",
      sections: [
         { heading: "1. Có dữ liệu thị trường", body: "Dùng mức lương trung vị theo vị trí/khu vực để đặt kỳ vọng hợp lý." },
         { heading: "2. Trình bày theo giá trị", body: "Nêu kỹ năng, kết quả và kinh nghiệm giúp bạn tạo tác động cho doanh nghiệp." },
         { heading: "3. Mở rộng phạm vi thương lượng", body: "Ngoài lương cơ bản, có thể trao đổi thêm về thưởng, phụ cấp, hybrid hoặc lộ trình tăng lương." },
      ],
      conclusion: "Giữ thái độ tôn trọng và rõ ràng sẽ giúp buổi đàm phán đi đến kết quả tích cực cho cả hai bên.",
   },
   "Những dấu hiệu môi trường làm việc tích cực": {
      intro: "Một môi trường tốt giúp bạn phát triển lâu dài, không chỉ dừng ở mức lương.",
      sections: [
         { heading: "1. Minh bạch mục tiêu", body: "Đội ngũ có mục tiêu rõ, KPI cụ thể và phản hồi định kỳ." },
         { heading: "2. Tôn trọng con người", body: "Lãnh đạo lắng nghe, ghi nhận đóng góp và xử lý xung đột công bằng." },
         { heading: "3. Học tập liên tục", body: "Có văn hóa chia sẻ kiến thức, mentoring và tạo cơ hội nâng cấp kỹ năng." },
      ],
      conclusion: "Chọn đúng môi trường sẽ quyết định tốc độ trưởng thành nghề nghiệp của bạn.",
   },
   "Kinh nghiệm phỏng vấn: Trả lời câu hỏi hành vi": {
      intro: "Câu hỏi hành vi đánh giá cách bạn xử lý tình huống thực tế, không chỉ kiến thức chuyên môn.",
      sections: [
         { heading: "1. Dùng STAR", body: "Trả lời theo cấu trúc Situation, Task, Action, Result để mạch lạc và thuyết phục." },
         { heading: "2. Chọn ví dụ có kết quả", body: "Ưu tiên ví dụ có số liệu hoặc thay đổi cụ thể sau hành động của bạn." },
         { heading: "3. Kết nối với vị trí ứng tuyển", body: "Nhấn mạnh kỹ năng liên quan trực tiếp đến vai trò đang ứng tuyển." },
      ],
      conclusion: "Trả lời hành vi tốt cho thấy bạn có kinh nghiệm thực chiến và tư duy giải quyết vấn đề.",
   },
   "Cách viết CV hiệu quả cho ngành CNTT": {
      intro: "CV ngành CNTT cần thể hiện stack kỹ thuật, dự án tiêu biểu và tác động kinh doanh.",
      sections: [
         { heading: "1. Tách rõ kỹ năng kỹ thuật", body: "Nhóm kỹ năng theo ngôn ngữ, framework, database, cloud và công cụ." },
         { heading: "2. Mô tả dự án theo vai trò", body: "Nêu rõ bạn phụ trách phần nào, công nghệ nào và kết quả đạt được." },
         { heading: "3. Đưa link chứng minh năng lực", body: "Thêm GitHub, portfolio hoặc sản phẩm thực tế để tăng độ tin cậy." },
      ],
      conclusion: "Một CV CNTT hiệu quả là CV cho thấy bạn có thể triển khai giải pháp thật, không chỉ biết lý thuyết.",
   },
   "Kỹ năng mềm cần thiết cho nhân viên văn phòng": {
      intro: "Kỹ năng mềm quyết định hiệu quả phối hợp và khả năng thăng tiến trong môi trường công sở.",
      sections: [
         { heading: "1. Giao tiếp rõ ràng", body: "Truyền đạt ngắn gọn, đúng trọng tâm và đúng đối tượng nhận thông tin." },
         { heading: "2. Quản lý thời gian", body: "Ưu tiên việc quan trọng, chia nhỏ mục tiêu và theo dõi tiến độ hằng ngày." },
         { heading: "3. Hợp tác liên phòng ban", body: "Lắng nghe, thống nhất kỳ vọng và xử lý khác biệt theo hướng xây dựng." },
      ],
      conclusion: "Nâng cấp kỹ năng mềm giúp bạn làm việc hiệu quả hơn và tạo ấn tượng chuyên nghiệp bền vững.",
   },
   "Review công ty NovaTech: Môi trường làm việc": {
      intro: "NovaTech có nhịp làm việc nhanh, chú trọng sản phẩm và văn hóa phản hồi liên tục.",
      sections: [
         { heading: "1. Điểm mạnh", body: "Đội ngũ kỹ thuật mạnh, quy trình agile rõ ràng, cơ hội học từ dự án thực tế." },
         { heading: "2. Lưu ý", body: "Khối lượng công việc có thể cao theo sprint, cần tự quản lý thời gian tốt." },
         { heading: "3. Phù hợp với ai", body: "Ứng viên thích môi trường tăng trưởng nhanh và chủ động trong công việc." },
      ],
      conclusion: "NovaTech phù hợp với người muốn phát triển năng lực chuyên môn trong môi trường sản phẩm năng động.",
   },
   "Văn hóa doanh nghiệp tại BluePixel": {
      intro: "BluePixel nổi bật ở văn hóa sáng tạo, tôn trọng cá tính và chất lượng trải nghiệm người dùng.",
      sections: [
         { heading: "1. Môi trường", body: "Cởi mở, khuyến khích thảo luận ý tưởng và thử nghiệm các phương án thiết kế mới." },
         { heading: "2. Quy trình", body: "Làm việc chặt với team sản phẩm và kỹ thuật, review thiết kế định kỳ." },
         { heading: "3. Cơ hội", body: "Thích hợp cho UI/UX muốn nâng năng lực research và design system." },
      ],
      conclusion: "BluePixel phù hợp với ứng viên đề cao sáng tạo và muốn làm sản phẩm có trải nghiệm tinh chỉnh.",
   },
   "Môi trường làm việc tại ScaleHub": {
      intro: "ScaleHub tập trung vào cloud và backend với tiêu chuẩn vận hành ổn định, bảo mật cao.",
      sections: [
         { heading: "1. Đặc thù công việc", body: "Nhiều bài toán hạ tầng, tối ưu hiệu năng và xử lý sự cố hệ thống." },
         { heading: "2. Văn hóa kỹ thuật", body: "Ưu tiên automation, monitoring và cải tiến quy trình liên tục." },
         { heading: "3. Phát triển nghề nghiệp", body: "Phù hợp cho backend/devops muốn nâng trình độ ở hệ thống lớn." },
      ],
      conclusion: "ScaleHub là môi trường tốt cho ứng viên thích kỹ thuật chuyên sâu và tính ổn định hệ thống.",
   },
};

const articleIllustrations: Record<string, any> = {
   "Cách viết CV ngắn gọn, đúng từ khóa ATS": articleBanner1,
   "5 bước chuẩn bị cho phỏng vấn đầu tiên": articleBanner2,
   "Cách đàm phán lương mà vẫn lịch sự": articleBanner3,
   "Những dấu hiệu môi trường làm việc tích cực": articleBanner1,
   "Kinh nghiệm phỏng vấn: Trả lời câu hỏi hành vi": articleBanner2,
   "Cách viết CV hiệu quả cho ngành CNTT": articleBanner3,
   "Kỹ năng mềm cần thiết cho nhân viên văn phòng": articleBanner1,
   "Review công ty NovaTech: Môi trường làm việc": articleBanner2,
   "Văn hóa doanh nghiệp tại BluePixel": articleBanner3,
   "Môi trường làm việc tại ScaleHub": articleBanner1,
};

const categories = [
   { label: "CV & Hồ sơ", count: 12, color: "#0f4c51" },
   { label: "Phỏng vấn", count: 8, color: "#0f4c51" },
   { label: "Thương lượng", count: 6, color: "#0f4c51" },
   { label: "Phát triển sự nghiệp", count: 15, color: "#0f4c51" },
   { label: "Kỹ năng mềm", count: 10, color: "#0f4c51" },
   { label: "Review công ty", count: 20, color: "#0f4c51" },
   { label: "Môi trường làm việc", count: 18, color: "#0f4c51" },
   { label: "Văn hóa doanh nghiệp", count: 14, color: "#0f4c51" },
];

export default function HandbookPage() {
   const [searchQuery, setSearchQuery] = useState("");
   const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
   const [selectedArticleTitle, setSelectedArticleTitle] = useState<string | null>(null);

   const filteredGuides = useMemo(() => {
      return guides.filter((guide) => {
         const matchesSearch = guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            guide.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
            guide.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

         const matchesCategory = !selectedCategory || guide.category === selectedCategory;

         return matchesSearch && matchesCategory;
      });
   }, [searchQuery, selectedCategory]);

   const featuredGuides = filteredGuides.filter(guide => guide.featured);
   const regularGuides = filteredGuides.filter(guide => !guide.featured);
   const selectedGuide = guides.find((guide) => guide.title === selectedArticleTitle) ?? null;
   const selectedContent = selectedGuide ? articleContents[selectedGuide.title] : null;
   const selectedIllustration = selectedGuide ? articleIllustrations[selectedGuide.title] : null;

   return (
      <div className="space-y-8" style={{ fontFamily: 'var(--font-body)' }}>
         {/* Hero */}
         <section className="relative overflow-hidden rounded-[20px] border border-slate-200 bg-white px-6 py-16 shadow-[0_4px_20px_rgba(0,0,0,0.06)] md:px-12 md:py-20 min-h-[400px] md:min-h-[520px]">
            {/* Blurry abstract glow items */}
            <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-emerald-500/15 blur-3xl" />
            <div className="absolute -bottom-20 left-1/4 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl" />

            <div className="relative max-w-4xl mx-auto text-center space-y-6">
               <div className="flex justify-center mb-4">
                  <div className="p-3 rounded-full bg-emerald-100">
                     <BookOpen className="w-8 h-8 text-emerald-600" />
                  </div>
               </div>
               <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                  Cẩm nang việc làm toàn diện
               </h1>
               <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
                  Bộ nội dung hướng dẫn từ viết CV đến phỏng vấn, đàm phán lương và phát triển sự nghiệp thành công.
               </p>
               <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
                     Đọc bài viết nổi bật <Lightbulb className="h-4 w-4" />
                  </button>
                  <Link href="/tim-viec" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm hover:shadow-md transition-all hover:border-slate-400">
                     Tìm việc ngay
                  </Link>
               </div>
            </div>
         </section>

         {/* Main layout: Sidebar + Content */}
         <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-start">
            <aside className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm lg:sticky lg:top-8 z-10">
               <div className="mb-4">
                  <div className="relative">
                     <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                     <input
                        type="text"
                        placeholder="Tìm kiếm bài viết..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     />
                  </div>
               </div>

               <div className="mb-6">
                  <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">Danh mục</h3>
                  <div className="flex flex-col gap-2">
                     {categories.map((cat) => (
                        <button
                           key={cat.label}
                           onClick={() => setSelectedCategory(cat.label)}
                           className={`w-full text-left px-3 py-2 rounded-xl text-sm font-bold transition-colors ${selectedCategory === cat.label ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border border-slate-100 hover:bg-slate-50'}`}
                        >
                           <div className="flex items-center justify-between">
                              <span>{cat.label}</span>
                              <span className="text-xs font-bold bg-gray-100 px-2 py-0.5 rounded-full">{cat.count}</span>
                           </div>
                        </button>
                     ))}
                  </div>
               </div>

               {/* Quick tags removed per design request */}

               {featuredGuides.length > 0 && (
                  <div>
                     <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Nổi bật</h3>
                     <div className="space-y-3">
                        {featuredGuides.slice(0, 3).map(f => (
                           <div key={f.title} className="flex items-start gap-3">
                              <div className="w-12 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden">
                                 <img src={typeof articleIllustrations[f.title] === 'string' ? articleIllustrations[f.title] : articleIllustrations[f.title]?.src} alt={f.title} className="w-full h-full object-cover" />
                              </div>
                              <div>
                                 <h4 className="text-sm font-bold text-slate-900 line-clamp-2" style={{ fontFamily: 'var(--font-heading)' }}>{f.title}</h4>
                                 <p className="text-xs text-slate-500">{f.readTime}</p>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               )}
            </aside>

            <main className="space-y-6">

               {/* Featured articles */}
               {featuredGuides.length > 0 && (
                  <div className="space-y-4">
                     <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>Bài viết nổi bật</h2>
                     {featuredGuides.map((featured) => (
                        <div
                           key={featured.title}
                           className="rounded-lg bg-white border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
                           onClick={() => setSelectedArticleTitle(featured.title)}
                        >
                           <div className="flex flex-col sm:flex-row gap-6">
                              <div className="flex-1">
                                 <div className="flex items-center gap-3 mb-3">
                                    <span className="px-2 py-1 bg-[#0f4c51] text-white text-xs font-bold rounded-full">
                                       ✦ NỔI BẬT
                                    </span>
                                    <span className="flex items-center gap-1 text-xs text-gray-600">
                                       <Clock className="w-3 h-3" /> {featured.readTime}
                                    </span>
                                 </div>
                                 <h3 className="text-2xl font-bold text-gray-900 mb-3 line-clamp-2">{featured.title}</h3>
                                 <p className="text-gray-600 mb-4 text-sm">Hướng dẫn chi tiết giúp bạn tối ưu cơ hội xin việc và thành công trong sự nghiệp.</p>
                                 <div className="flex flex-wrap gap-2">
                                    {featured.tags.map((tag) => (
                                       <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                                          {tag}
                                       </span>
                                    ))}
                                 </div>
                              </div>
                              <button
                                 className="px-4 py-2 bg-[#0f4c51] hover:bg-[#1b7377] text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
                              >
                                 Đọc ngay
                              </button>
                           </div>
                        </div>
                     ))}
                  </div>
               )}

               {/* Article list */}
               <div className="space-y-3">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                     {regularGuides.length > 0 ? `Bài viết khác (${regularGuides.length})` : "Không tìm thấy bài viết nào"}
                  </h3>
                  {regularGuides.map((item) => {
                     const Icon = item.icon;
                     return (
                        <div
                           key={item.title}
                           className="flex items-center gap-4 bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer"
                           onClick={() => setSelectedArticleTitle(item.title)}
                        >
                           <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                              <Icon className="w-5 h-5 text-[#0f4c51]" />
                           </div>
                           <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 text-sm" style={{ fontFamily: 'var(--font-heading)' }}>{item.title}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                 <span className="text-xs text-gray-600">{item.category}</span>
                                 <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {item.readTime}
                                 </span>
                              </div>
                           </div>
                           <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                     );
                  })}
               </div>

            </main>
         </div>

         {selectedGuide && selectedContent && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
               <button
                  type="button"
                  aria-label="Đóng nội dung bài viết"
                  className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
                  onClick={() => setSelectedArticleTitle(null)}
               />
               <section className="relative z-10 w-full max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl md:p-8">
                  <button
                     type="button"
                     onClick={() => setSelectedArticleTitle(null)}
                     className="absolute right-4 top-4 z-20 flex rounded-lg border border-gray-200 bg-white p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                     aria-label="Đóng"
                  >
                     <X className="h-4 w-4" />
                  </button>

                  <div className="max-h-[62vh] overflow-y-auto pr-1 md:max-h-[68vh] md:pr-2">
                     <div className="mt-1 flex items-start justify-between gap-4 pr-12">
                        <div className="flex flex-wrap items-center gap-2">
                           <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: `${selectedGuide.color}18`, color: selectedGuide.color }}>
                              {selectedGuide.category}
                           </span>
                           <span className="text-xs text-gray-500">{selectedGuide.readTime} đọc</span>
                        </div>
                     </div>

                     <h2 className="mt-4 text-2xl font-bold tracking-tight text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>{selectedGuide.title}</h2>

                     {selectedIllustration && (
                        <div className="mt-5 overflow-hidden rounded-xl border border-gray-200">
                           <img
                              src={typeof selectedIllustration === 'string' ? selectedIllustration : selectedIllustration?.src}
                              alt={`Ảnh minh họa: ${selectedGuide.title}`}
                              className="h-56 w-full object-cover md:h-72"
                           />
                        </div>
                     )}

                     <p className="mt-4 text-sm leading-7 text-gray-600">{selectedContent.intro}</p>

                     <div className="mt-6 space-y-5">
                        {selectedContent.sections.map((section) => (
                           <article key={section.heading}>
                              <h3 className="text-base font-semibold text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>{section.heading}</h3>
                              <p className="mt-2 text-sm leading-7 text-gray-600">{section.body}</p>
                           </article>
                        ))}
                     </div>

                     <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                        <p className="text-sm leading-7 text-emerald-900">{selectedContent.conclusion}</p>
                     </div>
                  </div>
               </section>
            </div>
         )}
      </div>
   );
}
