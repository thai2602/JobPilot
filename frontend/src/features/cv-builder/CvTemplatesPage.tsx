'use client';

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
   Eye, X, Sparkles, CheckCircle2, XCircle, FileText,
   Award, BookOpen, Briefcase, GraduationCap, Phone,
   Mail, MapPin, Calendar, Heart, User, Check, ArrowRight
} from "lucide-react";
import profilePicture1 from "../../assets/profile_picture/image_1.png";
import profilePicture2 from "../../assets/profile_picture/image_2.png";
import profilePicture3 from "../../assets/profile_picture/image_3.png";
import profilePicture4 from "../../assets/profile_picture/image_4.png";
import { readAuthUser } from "../../utils/auth";

const templates = [
   {
      id: "chuan",
      name: "CV Chuẩn Mực",
      level: "Tối ưu hóa cho mọi ngành nghề",
      tag: "Phổ biến nhất",
      tagColor: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
      accent: "#10b981",
      preview: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30",
      iconColor: "text-emerald-400",
      description: "Mẫu thiết kế thanh lịch, chuyên nghiệp, cấu trúc rõ ràng phù hợp với hầu hết các doanh nghiệp hiện nay.",
   },
   {
      id: "cong-nghe",
      name: "CV Tech Pro",
      level: "Tối ưu cho IT & Engineering",
      tag: "Công nghệ",
      tagColor: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
      accent: "#6366f1",
      preview: "from-indigo-500/20 to-purple-500/20 border-indigo-500/30",
      iconColor: "text-indigo-400",
      description: "Thiết kế hiện đại, làm nổi bật các dự án cá nhân, kỹ năng kỹ thuật cứng và các chứng chỉ công nghệ hàng đầu.",
   },
   {
      id: "sang-tao",
      name: "CV Marketing & Design",
      level: "Dành cho khối Sáng tạo",
      tag: "Sáng tạo",
      tagColor: "bg-rose-500/10 border-rose-500/20 text-rose-400",
      accent: "#f43f5e",
      preview: "from-rose-500/20 to-pink-500/20 border-rose-500/30",
      iconColor: "text-rose-400",
      description: "Phối màu cá tính, bố cục phá cách giúp bạn thu hút sự chú ý của nhà tuyển dụng truyền thông và sáng tạo ngay từ cái nhìn đầu tiên.",
   },
   {
      id: "quan-ly",
      name: "CV Executive",
      level: "Dành cho Lãnh đạo & PM",
      tag: "Cao cấp",
      tagColor: "bg-amber-500/10 border-amber-500/20 text-amber-400",
      accent: "#f59e0b",
      preview: "from-amber-500/20 to-orange-500/20 border-amber-500/30",
      iconColor: "text-amber-400",
      description: "Nhấn mạnh kỹ năng quản lý, lãnh đạo, số liệu hóa các thành quả thực tế và hành trình thăng tiến sự nghiệp xuất sắc.",
   },
];

type CvEntry = {
   period: string;
   title: string;
   subtitle?: string;
   details?: string[];
};

type SampleCv = {
   fullName: string;
   title: string;
   avatar: any;
   summary: string;
   personalInfo: Array<{ label: string; value: string }>;
   objective: string;
   education: CvEntry[];
   experience: CvEntry[];
   activities: CvEntry[];
   certificates: string[];
   awards: string[];
   skills: string[];
   references: string[];
   hobbies: string[];
};

const cvWritingTips = [
   {
      title: "Thông tin liên hệ & Tiêu đề",
      good: "Ghi ngắn gọn vị trí ứng tuyển mong muốn, cung cấp email chuyên nghiệp (ví dụ: nguyen.van@email.com) và số điện thoại đang hoạt động.",
      bad: "Sử dụng email thiếu nghiêm túc thời học sinh, ghi sai số điện thoại hoặc đặt tiêu đề CV chung chung như 'CV xin việc'.",
   },
   {
      title: "Mục tiêu nghề nghiệp",
      good: "Trình bày rõ ràng giá trị bạn muốn mang lại cho doanh nghiệp và định hướng phát triển rõ nét trong ngắn & dài hạn.",
      bad: "Viết sáo rỗng kiểu 'mong muốn học hỏi kinh nghiệm' hoặc copy nguyên bản các mục tiêu rập khuôn trên mạng.",
   },
   {
      title: "Học vấn & Bằng cấp",
      good: "Liệt kê trường, chuyên ngành học, GPA nếu tốt (trên 3.0/4) và các đề tài nghiên cứu liên quan mật thiết đến công việc ứng tuyển.",
      bad: "Liệt kê cả quá trình học từ cấp 1, cấp 2 hoặc đưa thông tin không chính xác về xếp loại tốt nghiệp.",
   },
   {
      title: "Kinh nghiệm làm việc",
      good: "Sử dụng các động từ hành động mạnh mẽ và định lượng hóa kết quả đạt được bằng con số (ví dụ: tăng 25% doanh số, tối ưu code giảm 30% tải).",
      bad: "Mô tả chung chung các nhiệm vụ được giao hàng ngày mà không nêu rõ thành tích hay đóng góp cụ thể của bản thân.",
   },
   {
      title: "Kỹ năng & Chứng chỉ",
      good: "Phân loại rõ kỹ năng chuyên môn (Hard Skills) và kỹ năng mềm (Soft Skills) thực tế, chỉ đưa vào những chứng chỉ uy tín và còn hạn.",
      bad: "Liệt kê vô tội vạ hàng chục kỹ năng không liên quan hoặc tự đánh giá 5 sao cho những công cụ bạn chỉ mới làm quen.",
   },
   {
      title: "Trình bày & Định dạng",
      good: "Thiết kế nhất quán về font chữ, căn lề thẳng hàng, kiểm tra kỹ chính tả và LUÔN LUÔN xuất file dạng PDF để tránh lỗi định dạng.",
      bad: "Sử dụng quá nhiều màu sắc sặc sỡ, viết sai lỗi chính tả cơ bản hoặc gửi file Word (.docx) làm lệch font chữ trên máy nhà tuyển dụng.",
   },
];

const sampleCvByTemplate: Record<string, SampleCv> = {
   "CV Chuẩn Mực": {
      fullName: "Nguyễn Minh Anh",
      title: "Junior Frontend Developer",
      avatar: profilePicture1,
      summary: "Kỹ sư phát triển Frontend đầy nhiệt huyết với thế mạnh xây dựng ứng dụng web hiện đại bằng React và TypeScript. Tự hào có kỹ năng thiết kế giao diện đáp ứng (Responsive) tốt và tinh thần tự học hỏi công nghệ mới cực cao.",
      personalInfo: [
         { label: "Ngày sinh", value: "12/08/2002" },
         { label: "Email", value: "anh.nguyen@email.com" },
         { label: "Số điện thoại", value: "0901 234 567" },
         { label: "Địa chỉ", value: "Quận 1, TP. Hồ Chí Minh" },
      ],
      objective: "Được làm việc trong một môi trường công nghệ chuyên nghiệp, áp dụng kiến thức vững chắc về lập trình Frontend để xây dựng những trải nghiệm web đỉnh cao cho người dùng, hướng tới vai trò Fullstack Developer trong 3 năm tới.",
      education: [
         {
            period: "2020 - 2024",
            title: "Đại học Khoa học Tự nhiên - ĐHQG TP.HCM",
            subtitle: "Cử nhân Công nghệ Thông tin (Chuyên ngành Hệ thống)",
            details: ["GPA đạt: 3.45 / 4.0 (Tốt nghiệp loại Giỏi)", "Đề tài tốt nghiệp: Ứng dụng quản lý nhân sự thời gian thực bằng React và WebSockets đạt điểm A."],
         },
      ],
      experience: [
         {
            period: "06/2025 - 12/2025",
            title: "Frontend Developer Intern",
            subtitle: "Tập đoàn Công nghệ ABC",
            details: [
               "Tham gia phát triển hệ thống Dashboard thống kê cho khách hàng doanh nghiệp bằng React và Tailwind CSS.",
               "Tối ưu hóa các component dùng chung, giúp tăng 35% hiệu suất render và giảm dung lượng file bundle ban đầu.",
               "Cộng tác ăn ý cùng UI/UX Designer chuyển đổi thiết kế Figma thành code pixel-perfect."
            ],
         },
      ],
      activities: [
         {
            period: "2022 - 2024",
            title: "Trưởng ban Kỹ thuật - CLB Lập trình Tin học",
            subtitle: "Trường ĐH Khoa học Tự nhiên",
            details: ["Tổ chức thành công 5 buổi workshop kỹ thuật thu hút hơn 300 sinh viên tham gia.", "Lập trình landing page tuyển thành viên mới giúp tăng 50% lượt đăng ký ứng tuyển."],
         },
      ],
      certificates: ["Google UX Design Certificate (Coursera)", "Advanced React & Redux Course Completion"],
      awards: ["Học bổng Khuyến khích Học tập 4 kỳ liên tiếp", "Giải Ba cuộc thi Olympic Tin học Sinh viên cấp trường 2023"],
      skills: ["React", "TypeScript", "JavaScript (ES6+)", "Tailwind CSS", "Git / GitHub", "REST API", "Figma", "Responsive Web Design"],
      references: ["Thầy Trần Minh Khoa - Giảng viên hướng dẫn - khoa.tm@fit.hcmus.edu.vn", "Anh Nguyễn Văn Huy - Lead Frontend tại ABC Group - huy.nv@abc.com"],
      hobbies: ["Đọc sách công nghệ", "Chạy bộ cự ly dài", "Tham gia các Hackathon cuối tuần"],
   },
   "CV Tech Pro": {
      fullName: "Trần Hoàng Nam",
      title: "Middle Frontend Developer",
      avatar: profilePicture2,
      summary: "Lập trình viên Frontend với hơn 3 năm kinh nghiệm thực chiến phát triển các hệ thống SaaS và E-commerce quy mô lớn. Am hiểu sâu sắc về kiến trúc Next.js, Redux State Management và có đam mê cực lớn trong tối ưu hóa SEO và hiệu năng website.",
      personalInfo: [
         { label: "Ngày sinh", value: "19/03/1999" },
         { label: "Email", value: "nam.tran@techpro.vn" },
         { label: "Số điện thoại", value: "0908 111 222" },
         { label: "Địa chỉ", value: "Quận Liên Chiểu, Đà Nẵng" },
      ],
      objective: "Mang tư duy phân tích và kỹ năng tối ưu mã nguồn vượt trội để giúp doanh nghiệp xây dựng những sản phẩm web có khả năng mở rộng tốt. Mục tiêu dẫn dắt một nhóm phát triển Frontend và nâng tầm chuẩn mực chất lượng code.",
      education: [
         {
            period: "2017 - 2021",
            title: "Đại học Bách khoa - Đại học Đà Nẵng",
            subtitle: "Kỹ sư Công nghệ Phần mềm",
            details: ["GPA: 3.58 / 4.0 - Đạt học bổng sinh viên xuất sắc năm học 2019 - 2020.", "Tác giả bài báo nghiên cứu ứng dụng AI trong nhận diện cử chỉ tay tại hội nghị khoa học trẻ."],
         },
      ],
      experience: [
         {
            period: "01/2023 - Nay",
            title: "Software Engineer - Frontend",
            subtitle: "JobTech Vietnam Joint Stock Company",
            details: [
               "Xây dựng thành công nền tảng tìm việc JobPilot phục vụ hơn 120.000 người dùng hoạt động mỗi tháng.",
               "Tăng điểm số Web Vitals từ 65 lên 95 thông qua lazy loading, code-splitting và tối ưu hóa tài nguyên hình ảnh.",
               "Lập trình và đóng gói thư viện UI Kit nội bộ dạng NPM Package giúp rút ngắn 40% thời gian code UI cho các dự án sau."
            ],
         },
      ],
      activities: [
         {
            period: "2023 - 2025",
            title: "Diễn giả kỹ thuật chuyên môn",
            subtitle: "Cộng đồng Đà Nẵng Web Devs",
            details: ["Chia sẻ 4 chuyên đề chuyên sâu về Next.js App Router và Server Action.", "Mentor trực tiếp định hướng nghề nghiệp cho hơn 20 bạn sinh viên năm cuối."],
         },
      ],
      certificates: ["AWS Certified Cloud Practitioner", "Professional Scrum Master I (PSM I)"],
      awards: ["Cá nhân xuất sắc nhất năm (Employee of the Year) - JobTech 2024"],
      skills: ["React / Next.js", "Redux Toolkit / Zustand", "TypeScript", "Node.js (Basic)", "Jest / React Testing Library", "Lighthouse Performance Tuning", "CI/CD (GitHub Actions)"],
      references: ["Anh Lê Minh Quân - Engineering Manager tại JobTech - quan.lm@jobtech.vn"],
      hobbies: ["Chơi bóng đá", "Đọc sách trinh thám", "Tìm hiểu tài chính cá nhân"],
   },
   "CV Executive": {
      fullName: "Lê Thu Hà",
      title: "Senior Product Manager",
      avatar: profilePicture3,
      summary: "Nhà quản lý sản phẩm với hơn 7 năm kinh nghiệm xây dựng chiến lược và dẫn dắt các dự án phát triển phần mềm doanh nghiệp (B2B SaaS). Có thế mạnh đặc biệt trong việc phân tích dữ liệu hành vi người dùng, tối ưu tỷ lệ giữ chân khách hàng (Retention Rate) và dung hòa lợi ích giữa các bên liên quan.",
      personalInfo: [
         { label: "Ngày sinh", value: "25/11/1992" },
         { label: "Email", value: "ha.le@executive.com" },
         { label: "Số điện thoại", value: "0933 999 888" },
         { label: "Địa chỉ", value: "Quận Cầu Giấy, Hà Nội" },
      ],
      objective: "Đảm nhận vị trí Product Lead / Head of Product để định hình tầm nhìn sản phẩm đột phá, xây dựng và dẫn dắt một đội ngũ Agile tài năng giúp doanh nghiệp bứt phá các mục tiêu tăng trưởng doanh thu vượt bậc.",
      education: [
         {
            period: "2010 - 2014",
            title: "Đại học Kinh tế Quốc dân",
            subtitle: "Cử nhân Quản trị Kinh doanh chất lượng cao",
            details: ["GPA: 3.65 / 4.0 - Xếp loại Xuất sắc", "Giải Nhất cuộc thi Nghiên cứu Khoa học Sinh viên cấp Bộ năm 2013."],
         },
      ],
      experience: [
         {
            period: "03/2021 - Nay",
            title: "Senior Product Manager",
            subtitle: "Tập đoàn Giải pháp Công nghệ Talent Hub",
            details: [
               "Quản trị toàn bộ vòng đời sản phẩm hệ thống tuyển dụng B2B SaaS lớn nhất khu vực.",
               "Tăng trưởng doanh thu thường niên định kỳ (ARR) lên 45% thông qua chiến lược cải tiến phễu Onboarding và thử nghiệm A/B Testing liên tục.",
               "Dẫn dắt thành công đội nhóm cross-functional gồm 14 thành viên (Designers, Developers, QA) hoàn thành đúng hạn các cột mốc quan trọng."
            ],
         },
      ],
      activities: [
         {
            period: "2022 - Nay",
            title: "Product Management Mentor",
            subtitle: "Product Vietnam Community",
            details: ["Đồng tổ chức 6 khóa học ngắn hạn cho người mới chuyển ngành.", "Hỗ trợ 15 học viên kết nối thành công và có việc làm tại các tập đoàn công nghệ."],
         },
      ],
      certificates: ["Certified Scrum Product Owner (CSPO)", "Advanced Business Data Analytics - Google"],
      awards: ["Top 10 Gương mặt Công nghệ Trẻ tiêu biểu 2024", "Giải thưởng Sao Khuê cho sản phẩm công nghệ xuất sắc nhất 2023"],
      skills: ["Agile/Scrum Product Mgmt", "Product Strategy & Roadmap", "User Research & Discovery", "A/B Testing", "Mixpanel / Google Analytics", "Stakeholder Communication", "SQL & Data Analytics"],
      references: ["Ông Phạm Quốc Dũng - CEO Talent Hub - dung.pq@talenthub.com"],
      hobbies: ["Tập Yoga", "Viết Blog chuyên môn trên Medium", "Du lịch khám phá ẩm thực vùng miền"],
   },
   "CV Marketing & Design": {
      fullName: "Phạm Quỳnh Như",
      title: "Senior UI/UX Designer",
      avatar: profilePicture4,
      summary: "Chuyên gia thiết kế UI/UX giàu tư duy sáng tạo với niềm đam mê sâu sắc trong việc kiến tạo những trải nghiệm người dùng tinh tế, đầy tính nhân văn. Có kinh nghiệm vững chắc xây dựng và đồng bộ hóa các hệ thống thiết kế (Design Systems) lớn, phục vụ đa nền tảng Web, Android và iOS.",
      personalInfo: [
         { label: "Ngày sinh", value: "09/06/1998" },
         { label: "Email", value: "nhu.pham@creative.studio" },
         { label: "Số điện thoại", value: "0977 555 444" },
         { label: "Địa chỉ", value: "Quận Phú Nhuận, TP. Hồ Chí Minh" },
      ],
      objective: "Vận dụng tối đa sự thấu hiểu người dùng cùng kỹ năng tạo nguyên mẫu (Prototyping) đỉnh cao để đem đến những giao diện trực quan, thu hút thị giác và giúp nâng tầm hình ảnh thương hiệu cũng như chỉ số kinh doanh của công ty.",
      education: [
         {
            period: "2016 - 2020",
            title: "Đại học Kiến trúc TP. Hồ Chí Minh",
            subtitle: "Cử nhân chuyên ngành Thiết kế Đồ họa",
            details: ["Tốt nghiệp thủ khoa đầu ra khoa Mỹ thuật Công nghiệp với điểm đồ án tốt nghiệp xuất sắc (9.6/10).", "Giải Nhất cuộc thi Sáng tạo Thiết kế xanh khu vực miền Nam 2019."],
         },
      ],
      experience: [
         {
            period: "09/2022 - Nay",
            title: "Senior UI/UX Designer",
            subtitle: "Creative Studio - Agency Thiết kế Đa quốc gia",
            details: [
               "Thiết kế lại hoàn toàn giao diện cổng thanh toán giúp giảm 28% tỷ lệ thoát trang tại bước checkout của người dùng.",
               "Xây dựng và phát triển thư viện Design System với hơn 200 components đáp ứng khả năng code tự động nhanh hơn 50%.",
               "Chủ trì thực hiện hơn 30 cuộc phỏng vấn người dùng sâu (User Interviews) để tìm ra đúng điểm đau (Pain points) của sản phẩm."
            ],
         },
      ],
      activities: [
         {
            period: "2021 - Nay",
            title: "Thành viên ban nội dung",
            subtitle: "Cộng đồng UX Vietnam Meetup",
            details: ["Tham gia chuẩn bị slide, thiết kế hình ảnh truyền thông cho các sự kiện phi lợi nhuận hàng quý.", "Chia sẻ bài viết kỹ thuật hàng tuần trên trang Fanpage cộng đồng."],
         },
      ],
      certificates: ["Google Professional UX Design Certificate", "Interaction Design Foundation (IxDF) Member"],
      awards: ["Giải Quán quân cuộc thi UI/UX Design Sprint Vietnam 2023"],
      skills: ["Figma / Sketch / Adobe XD", "Advanced Design System", "High-fidelity Prototyping", "User Research & Usability Testing", "Wireframing & User Flows", "HTML/CSS (Basic)", "Adobe Illustrator / Photoshop"],
      references: ["Anh Nguyễn Hải Nam - Creative Director - nam.nh@creative.studio"],
      hobbies: ["Vẽ tranh màu nước", "Nhiếp ảnh đường phố", "Sưu tầm sách nghệ thuật thị giác"],
   },
};

export default function CvTemplatesPage() {
   const router = useRouter();
   const [previewTitle, setPreviewTitle] = useState<string | null>(null);
   const [previewCv, setPreviewCv] = useState<SampleCv | null>(null);

   const openTemplatePreview = (templateName: string) => {
      setPreviewTitle(templateName);
      setPreviewCv(sampleCvByTemplate[templateName]);
   };

   const openCreateCvModal = () => {
      if (!readAuthUser()) {
         router.push("/dang-nhap?next=/cv-editor");
         return;
      }
      router.push("/cv-editor");
   };

   const renderEntry = (entry: CvEntry) => (
      <div
         key={`${entry.title}-${entry.period}`}
         className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:border-slate-200 transition-all space-y-3"
      >
         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
               <h4 className="font-extrabold text-[15px] text-slate-900 leading-snug">{entry.title}</h4>
               {entry.subtitle && (
                  <p className="text-[13px] text-slate-500 font-semibold mt-0.5">{entry.subtitle}</p>
               )}
            </div>
            <span className="inline-flex shrink-0 self-start sm:self-center px-3 py-1 rounded-full bg-slate-50 border border-slate-100 text-[11.5px] font-extrabold text-slate-600">
               {entry.period}
            </span>
         </div>
         {entry.details && entry.details.length > 0 && (
            <ul className="list-disc pl-5 text-slate-600 text-[13px] space-y-1.5 leading-relaxed">
               {entry.details.map((detail, idx) => (
                  <li key={idx}>{detail}</li>
               ))}
            </ul>
         )}
      </div>
   );

   return (
      <div className="space-y-12 pb-16">
         {/* ── Hero Banner Section ── */}
         <div className="relative overflow-hidden rounded-[20px] border border-slate-200 bg-white px-6 py-16 shadow-[0_4px_20px_rgba(0,0,0,0.06)] md:px-12 md:py-20 min-h-[400px] md:min-h-[520px]">
            {/* Blurry abstract glow items */}
            <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-emerald-500/15 blur-3xl" />
            <div className="absolute -bottom-20 left-1/4 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl" />

            <div className="relative max-w-4xl mx-auto text-center space-y-6">
               <div className="flex justify-center mb-4">
                  <div className="p-3 rounded-full bg-emerald-100">
                     <FileText className="w-8 h-8 text-emerald-600" />
                  </div>
               </div>
               <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                  Kho CV mẫu chuẩn hóa
               </h1>
               <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
                  Khám phá bộ sưu tập mẫu CV thiết kế đẳng cấp cao, chuẩn cấu trúc tuyển dụng quốc tế. Có sẵn gợi ý để bạn sẵn sàng tạo dấu ấn riêng.
               </p>
               <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                     onClick={openCreateCvModal}
                     className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
                  >
                     Tạo CV ngay <ArrowRight className="h-4 w-4" />
                  </button>
                  <Link href="/tim-viec" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm hover:shadow-md transition-all hover:border-slate-400">
                     Xem công việc phù hợp
                  </Link>
               </div>
            </div>
         </div>

         {/* ── Template Cards Section ── */}
         <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
               <div>
                  <h2 className="text-2xl font-black text-slate-950">Mẫu CV theo nhu cầu của bạn</h2>
                  <p className="text-slate-500 text-sm mt-1">Được thiết kế tỉ mỉ bởi các chuyên gia tuyển dụng hàng đầu.</p>
               </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
               {templates.map((t) => (
                  <article
                     key={t.name}
                     className="group bg-white border border-slate-100 rounded-[28px] overflow-hidden shadow-sm hover:shadow-xl hover:border-slate-200 transition-all duration-300 flex flex-col h-full"
                  >
                     {/* Template Card Mockup Preview (Visual Wow) */}
                     <div className={`h-40 bg-gradient-to-br ${t.preview} p-6 relative overflow-hidden flex items-center justify-center shrink-0 border-b border-slate-100`}>
                        <div className="absolute inset-0 bg-slate-950/5 group-hover:bg-slate-950/0 transition-colors" />

                        {/* Dynamic Mini Mockup of a CV Card */}
                        <div className="w-[180px] h-[110px] bg-white rounded-xl shadow-lg border border-slate-100/50 p-3 flex gap-2 group-hover:scale-105 transition-transform duration-300 relative z-10 overflow-hidden">
                           {/* Mini sidebar */}
                           <div className="w-1/3 flex flex-col gap-1.5 border-r border-slate-100 pr-1.5 shrink-0">
                              <div className="w-6 h-6 rounded-full bg-slate-100 shrink-0 mx-auto" />
                              <div className="w-full h-1.5 rounded-full bg-slate-100" />
                              <div className="w-3/4 h-1 rounded-full bg-slate-100" />
                              <div className="w-full h-1 rounded-full bg-slate-100" />
                           </div>
                           {/* Mini main */}
                           <div className="flex-1 flex flex-col gap-1.5">
                              <div className="w-3/4 h-2.5 rounded bg-slate-200" />
                              <div className="w-1/2 h-1.5 rounded bg-slate-100" />
                              <div className="w-full h-1.5 rounded bg-slate-100" />
                              <div className="w-full h-1 rounded bg-slate-50" />
                              <div className="w-5/6 h-1 rounded bg-slate-50" />
                           </div>

                           {/* Accent Glow Circle */}
                           <div
                              className="absolute -right-6 -bottom-6 w-12 h-12 rounded-full opacity-30 blur-md group-hover:scale-150 transition-transform duration-500"
                              style={{ backgroundColor: t.accent }}
                           />
                        </div>
                     </div>

                     {/* Content Info */}
                     <div className="p-6 flex-grow flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                           <div className="flex items-center justify-between gap-2">
                              <h3 className="font-extrabold text-slate-900 text-[15px] group-hover:text-emerald-600 transition-colors">{t.name}</h3>
                              <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold uppercase shrink-0 ${t.tagColor}`}>
                                 {t.tag}
                              </span>
                           </div>
                           <p className="text-[12px] font-bold text-slate-400">{t.level}</p>
                           <p className="text-slate-500 text-[12.5px] leading-relaxed line-clamp-3">
                              {t.description}
                           </p>
                        </div>

                        <div className="pt-2 flex gap-2 shrink-0">
                           <button
                              onClick={() => openTemplatePreview(t.name)}
                              className="flex-1 flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-100 hover:border-slate-200 text-slate-700 text-[12px] font-extrabold py-2.5 rounded-xl transition-all cursor-pointer group-active:scale-95"
                           >
                              <Eye className="w-4 h-4" /> Xem mẫu
                           </button>
                           <button
                              onClick={openCreateCvModal}
                              className="px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-white text-[12px] font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                           >
                              Chọn <ArrowRight className="w-3.5 h-3.5" />
                           </button>
                        </div>
                     </div>
                  </article>
               ))}
            </div>
         </section>

         {/* ── Middle Premium Promo banner ── */}
         <section className="relative rounded-[28px] bg-gradient-to-r from-emerald-50 to-teal-50/50 border border-emerald-100/70 p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 overflow-hidden">
            <div className="absolute -right-16 -top-16 w-40 h-40 rounded-full bg-emerald-300/10 blur-2xl" />
            <div className="space-y-2 relative z-10">
               <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-500" /> Bạn muốn một chiếc CV chuyên nghiệp đỉnh cao?
               </h3>
               <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
                  Hãy sử dụng công cụ soạn thảo CV nâng cao. Hệ thống cho phép bạn bóc tách dữ liệu từ PDF cũ bằng AI, gợi ý viết mô tả theo chuẩn ATS và chấm điểm hồ sơ hoàn toàn miễn phí.
               </p>
            </div>
            <button
               onClick={openCreateCvModal}
               className="relative z-10 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[13.5px] font-extrabold rounded-xl transition-all active:scale-95 cursor-pointer shadow-md shrink-0"
            >
               Trình soạn thảo CV mới
            </button>
         </section>

         {/* ── CV Writing Guide (Rich Aesthetics) ── */}
         <section className="border border-slate-100 rounded-[32px] bg-white p-6 sm:p-8 shadow-sm space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div className="space-y-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded">
                     Hướng dẫn viết CV
                  </span>
                  <h3 className="text-2xl font-black text-slate-950 pt-2">Bí kíp chinh phục nhà tuyển dụng khó tính</h3>
               </div>
               <p className="text-slate-400 text-[13.5px] max-w-md leading-relaxed">
                  CV là cầu nối đầu tiên đưa bạn đến vòng phỏng vấn. Nắm vững những quy tắc vàng dưới đây để tránh những sai lầm đáng tiếc nhất.
               </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {cvWritingTips.map((tip) => (
                  <article
                     key={tip.title}
                     className="border border-slate-100/70 rounded-3xl p-5 bg-slate-50/50 space-y-4 hover:bg-white hover:shadow-md hover:border-slate-100 transition-all duration-300 flex flex-col justify-between"
                  >
                     <h4 className="font-extrabold text-[15px] text-slate-900 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-500 shrink-0" /> {tip.title}
                     </h4>

                     <div className="space-y-3 flex-grow">
                        {/* Good side */}
                        <div className="rounded-2xl bg-emerald-50/60 border border-emerald-100/40 p-3.5 space-y-1">
                           <p className="text-[10px] font-extrabold text-emerald-600 uppercase flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Nên làm
                           </p>
                           <p className="text-[12px] text-emerald-950/80 leading-relaxed font-semibold">
                              {tip.good}
                           </p>
                        </div>
                        {/* Bad side */}
                        <div className="rounded-2xl bg-rose-50/60 border border-rose-100/40 p-3.5 space-y-1">
                           <p className="text-[10px] font-extrabold text-rose-600 uppercase flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" /> Không nên
                           </p>
                           <p className="text-[12px] text-rose-950/80 leading-relaxed font-semibold">
                              {tip.bad}
                           </p>
                        </div>
                     </div>
                  </article>
               ))}
            </div>
         </section>

         {/* ── Premium 2-Column CV Template Preview Modal ── */}
         {previewCv && (
            <div
               className="fixed inset-0 bg-slate-950/65 z-[1000] flex justify-center items-start p-4 sm:p-6 overflow-y-auto backdrop-blur-sm animate-fade-in"
               onClick={() => setPreviewCv(null)}
            >
               <section
                  className="w-full max-w-4xl bg-slate-50 rounded-[32px] border border-slate-100 shadow-2xl overflow-hidden mt-4 mb-8 relative animate-scale-up flex flex-col"
                  onClick={(e) => e.stopPropagation()}
               >
                  {/* Modal Header */}
                  <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white shrink-0">
                     <div className="space-y-1">
                        <h3 className="text-[17px] font-black text-slate-950 flex items-center gap-2">
                           <FileText className="w-5 h-5 text-emerald-500" /> Bản xem trước: {previewTitle}
                        </h3>
                        <p className="text-[12.5px] text-slate-400 font-bold">
                           Đây là cấu trúc mẫu tiêu chuẩn. Bạn có thể chọn chỉnh sửa bằng trình editor chuyên nghiệp.
                        </p>
                     </div>
                     <button
                        onClick={() => setPreviewCv(null)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer shrink-0"
                     >
                        <X className="w-4.5 h-4.5" />
                     </button>
                  </div>

                  {/* Modal Toolbar */}
                  <div className="px-6 py-4 bg-emerald-50/50 border-b border-emerald-100/50 flex flex-wrap items-center justify-between gap-4 shrink-0">
                     <span className="text-[12.5px] text-emerald-700 font-extrabold flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" /> Đã tối ưu hóa bố cục chuẩn ATS quốc tế
                     </span>
                     <button
                        onClick={() => {
                           setPreviewCv(null);
                           openCreateCvModal();
                        }}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[12.5px] rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
                     >
                        Sử dụng mẫu này sửa ngay <ArrowRight className="w-4 h-4" />
                     </button>
                  </div>

                  {/* Premium 2-Column CV Page Preview */}
                  <div className="p-6 overflow-y-auto flex-grow max-h-[70vh]">
                     <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm p-6 sm:p-8 space-y-8 max-w-3xl mx-auto">

                        {/* 1. Header Information section */}
                        <div className="flex flex-col md:flex-row gap-6 items-start pb-6 border-b border-slate-100">
                           <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border border-slate-100 shrink-0 bg-slate-50 shadow-inner">
                              <img src={typeof previewCv.avatar === 'string' ? previewCv.avatar : (previewCv.avatar as any)?.src} className="w-full h-full object-cover" alt={previewCv.fullName} />
                           </div>
                           <div className="flex-1 space-y-2">
                              <h2 className="text-2xl font-black text-slate-950 tracking-tight leading-none">{previewCv.fullName}</h2>
                              <p className="text-emerald-600 text-sm font-extrabold tracking-wide uppercase">{previewCv.title}</p>
                              <p className="text-slate-500 text-[13px] leading-relaxed pt-1">{previewCv.summary}</p>
                           </div>
                        </div>

                        {/* 2. Premium 2-Column Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.8fr] gap-8 items-start">

                           {/* LEFT COLUMN: Sidebar (Contact, Skills, Certs, Awards, Hobbies) */}
                           <div className="space-y-6">
                              {/* Contact detail */}
                              <div className="space-y-3">
                                 <h4 className="text-[12px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                                    <User className="w-3.5 h-3.5" /> Thông tin liên hệ
                                 </h4>
                                 <div className="space-y-2.5">
                                    {previewCv.personalInfo.map((info) => {
                                       const isEmail = info.label === "Email";
                                       const isPhone = info.label === "Số điện thoại";
                                       const isLoc = info.label === "Địa chỉ";
                                       return (
                                          <div key={info.label} className="flex gap-2.5 items-start">
                                             <span className="w-6 h-6 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 mt-0.5 text-slate-400">
                                                {isEmail && <Mail className="w-3.5 h-3.5" />}
                                                {isPhone && <Phone className="w-3.5 h-3.5" />}
                                                {isLoc && <MapPin className="w-3.5 h-3.5" />}
                                                {!isEmail && !isPhone && !isLoc && <Calendar className="w-3.5 h-3.5" />}
                                             </span>
                                             <div className="min-w-0">
                                                <p className="text-[10px] text-slate-400 font-extrabold uppercase leading-none">{info.label}</p>
                                                <p className="text-[12px] text-slate-800 font-bold mt-1 truncate">{info.value}</p>
                                             </div>
                                          </div>
                                       );
                                    })}
                                 </div>
                              </div>

                              {/* Skills */}
                              <div className="space-y-3">
                                 <h4 className="text-[12px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                                    <Sparkles className="w-3.5 h-3.5" /> Kỹ năng chuyên môn
                                 </h4>
                                 <div className="flex flex-wrap gap-1.5">
                                    {previewCv.skills.map((skill) => (
                                       <span key={skill} className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-50 border border-slate-100 text-[11.5px] font-bold text-slate-700 shadow-sm">
                                          <Check className="w-3 h-3 text-emerald-500 shrink-0" /> {skill}
                                       </span>
                                    ))}
                                 </div>
                              </div>

                              {/* Certificates */}
                              <div className="space-y-3">
                                 <h4 className="text-[12px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                                    <Award className="w-3.5 h-3.5" /> Chứng chỉ
                                 </h4>
                                 <div className="flex flex-col gap-2">
                                    {previewCv.certificates.map((cert) => (
                                       <div key={cert} className="rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 text-[12px] text-slate-700 font-bold leading-normal flex gap-2">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                          <span>{cert}</span>
                                       </div>
                                    ))}
                                 </div>
                              </div>

                              {/* Awards */}
                              {previewCv.awards && previewCv.awards.length > 0 && (
                                 <div className="space-y-3">
                                    <h4 className="text-[12px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                                       <Award className="w-3.5 h-3.5 text-amber-500" /> Giải thưởng
                                    </h4>
                                    <div className="flex flex-col gap-2">
                                       {previewCv.awards.map((award) => (
                                          <div key={award} className="rounded-xl border border-amber-100/50 bg-amber-50/20 p-2.5 text-[12px] text-slate-700 font-bold leading-normal flex gap-2">
                                             <span className="text-amber-500 shrink-0">★</span>
                                             <span>{award}</span>
                                          </div>
                                       ))}
                                    </div>
                                 </div>
                              )}

                              {/* Hobbies */}
                              <div className="space-y-3">
                                 <h4 className="text-[12px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                                    <Heart className="w-3.5 h-3.5 text-rose-500 animate-pulse" /> Sở thích
                                 </h4>
                                 <div className="flex flex-wrap gap-1.5">
                                    {previewCv.hobbies.map((hobby) => (
                                       <span key={hobby} className="px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 text-[11px] font-bold text-slate-500">
                                          {hobby}
                                       </span>
                                    ))}
                                 </div>
                              </div>
                           </div>

                           {/* RIGHT COLUMN: Main Content (Objective, Experience, Education, Activities, References) */}
                           <div className="space-y-6 md:border-l md:border-slate-100 md:pl-6">
                              {/* Objective */}
                              <div className="space-y-3">
                                 <h3 className="text-[14px] font-black text-slate-950 uppercase tracking-wider flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-emerald-500" /> Mục tiêu nghề nghiệp
                                 </h3>
                                 <div className="bg-emerald-50/20 border border-emerald-100/30 rounded-2xl p-4 text-[13px] text-slate-700 leading-relaxed font-semibold">
                                    {previewCv.objective}
                                 </div>
                              </div>

                              {/* Experience */}
                              <div className="space-y-3">
                                 <h3 className="text-[14px] font-black text-slate-950 uppercase tracking-wider flex items-center gap-2">
                                    <Briefcase className="w-4 h-4 text-emerald-500" /> Kinh nghiệm làm việc
                                 </h3>
                                 <div className="space-y-4">
                                    {previewCv.experience.map(renderEntry)}
                                 </div>
                              </div>

                              {/* Education */}
                              <div className="space-y-3">
                                 <h3 className="text-[14px] font-black text-slate-950 uppercase tracking-wider flex items-center gap-2">
                                    <GraduationCap className="w-4.5 h-4.5 text-emerald-500" /> Học vấn & Trình độ
                                 </h3>
                                 <div className="space-y-4">
                                    {previewCv.education.map(renderEntry)}
                                 </div>
                              </div>

                              {/* Activities */}
                              {previewCv.activities && previewCv.activities.length > 0 && (
                                 <div className="space-y-3">
                                    <h3 className="text-[14px] font-black text-slate-950 uppercase tracking-wider flex items-center gap-2">
                                       <FileText className="w-4 h-4 text-emerald-500" /> Hoạt động ngoại khóa
                                    </h3>
                                    <div className="space-y-4">
                                       {previewCv.activities.map(renderEntry)}
                                    </div>
                                 </div>
                              )}

                              {/* References */}
                              {previewCv.references && previewCv.references.length > 0 && (
                                 <div className="space-y-3">
                                    <h3 className="text-[14px] font-black text-slate-950 uppercase tracking-wider flex items-center gap-2">
                                       <User className="w-4 h-4 text-emerald-500" /> Người giới thiệu
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                       {previewCv.references.map((ref, idx) => (
                                          <div key={idx} className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl text-[12.5px] text-slate-700 leading-normal font-bold">
                                             {ref}
                                          </div>
                                       ))}
                                    </div>
                                 </div>
                              )}
                           </div>

                        </div>
                     </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="px-6 py-5 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
                     <button
                        onClick={() => setPreviewCv(null)}
                        className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-extrabold text-[12.5px] rounded-xl transition-colors cursor-pointer"
                     >
                        Đóng lại
                     </button>
                     <button
                        onClick={() => {
                           setPreviewCv(null);
                           openCreateCvModal();
                        }}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[12.5px] rounded-xl transition-all shadow-md cursor-pointer"
                     >
                        Sử dụng mẫu để sửa ngay
                     </button>
                  </div>
               </section>
            </div>
         )}
      </div>
   );
}
