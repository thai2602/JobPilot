# JobPilot — Nền tảng Phân tích và Tìm kiếm Việc làm

<p align="center">
  <a href="https://www.uit.edu.vn/" title="Trường Đại học Công nghệ Thông tin">
    <img src="https://i.imgur.com/WmMnSRt.png" alt="University of Information Technology | Trường Đại học Công nghệ Thông tin">
  </a>
</p>

<h1 align="center"><b>Đồ án IE303: Nền tảng Phân tích và Tìm kiếm Việc làm</b></h1>

<p align="center">
  <img src="https://img.shields.io/badge/Java-21-orange?style=for-the-badge&logo=openjdk" alt="Java 21" />
  <img src="https://img.shields.io/badge/Spring%20Boot-4.0.0-brightgreen?style=for-the-badge&logo=springboot" alt="Spring Boot 4" />
  <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js" alt="Next.js 14" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react" alt="React 18" />
  <img src="https://img.shields.io/badge/PostgreSQL-15-336791?style=for-the-badge&logo=postgresql" alt="PostgreSQL 15" />
  <img src="https://img.shields.io/badge/LangChain4j-RAG-blueviolet?style=for-the-badge" alt="LangChain4j RAG" />
</p>

## Thông tin môn học

- **Môn học:** Công nghệ Java (IE303)
- **Lớp:** IE303.Q21.CNVN
- **Năm học:** Học kỳ 2, 2025–2026
- **Giảng viên hướng dẫn:** ThS. Huỳnh Văn Tín

## Thành viên nhóm

| STT | MSSV | Họ và tên | Vai trò | GitHub | Email |
| :-- | :--------- | :-------- | :--- | :----- | :---- |
| 1 | 23521416 | Lê Hoàng Thái | Trưởng nhóm | [thai2602](https://github.com/thai2602) | <23521416@gm.uit.edu.vn> |
| 2 | 23521478 | Lê Trần Đức Thiện | Thành viên | — | <23521478@gm.uit.edu.vn> |
| 3 | 23521664 | Nguyễn Tấn Trọng | Thành viên | — | <23521664@gm.uit.edu.vn> |
| 4 | 23521720 | Nguyễn Minh Tuấn | Thành viên | [MinhTuan-K18](https://github.com/MinhTuan-K18) | <23521720@gm.uit.edu.vn> |

## Liên kết hữu ích

- **Báo cáo đồ án:** Đang cập nhật
- **Phân công nhiệm vụ:** [IE303 Project Management](https://docs.google.com/spreadsheets/d/1uTk0Fm5hLVeCZlcBdFD41b2_mcxjzoDZoWpbaZZQnUc/edit?usp=sharing)
- **Sơ đồ ERD cơ sở dữ liệu:** [docs/db-erd.png](docs/db-erd.png)

## Mục lục

- [Tổng quan](#tổng-quan)
- [Kiến trúc hệ thống](#kiến-trúc-hệ-thống)
- [Tính năng nổi bật](#tính-năng-nổi-bật)
- [Quy trình RAG (RAG Pipeline)](#quy-trình-rag-rag-pipeline)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [Cài đặt cục bộ](#cài-đặt-cục-bộ)
- [Kiểm thử và CI](#kiểm-thử-và-ci)
- [Tổng quan API](#tổng-quan-api)

## Tổng quan

**JobPilot** là nền tảng tuyển dụng và tìm kiếm việc làm toàn diện (full-stack career platform), kết hợp giữa khám phá cơ hội nghề nghiệp, hồ sơ doanh nghiệp, quản lý CV, ứng tuyển trực tuyến và trợ lý AI hỗ trợ định hướng nghề nghiệp. Ứng dụng sử dụng frontend viết bằng Next.js, backend REST API bằng Spring Boot và PostgreSQL/ParadeDB để lưu trữ dữ liệu giao dịch, truy xuất vector (vector retrieval) cùng tìm kiếm từ khóa (lexical search).

Luồng dữ liệu hiện tại lấy PostgreSQL làm nguồn dữ liệu chuẩn (canonical source) cho các tin tuyển dụng và thông tin công ty. Các công việc đang hoạt động (active) và dữ liệu lịch sử (historical) được nhúng (embed) vào các kho lưu trữ pgvector riêng biệt và được truy xuất thông qua quy trình Hybrid RAG.

## Kiến trúc hệ thống

```text
┌─────────────────────────────────────────────────────────────┐
│ Next.js 14 App Router · React 18 · TypeScript · TailwindCSS │
│                         :3000                               │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST / JSON / SSE
┌──────────────────────────────▼──────────────────────────────┐
│ Spring Boot 4 · Security/JWT · JPA · LangChain4j           │
│                         :8080                               │
└───────────────┬───────────────────────┬─────────────────────┘
                │                       │
┌───────────────▼────────────────┐  ┌───▼─────────────────────┐
│ ParadeDB / PostgreSQL 15       │  │ OpenRouter             │
│ Dữ liệu chuẩn việc làm/công ty │  │ Model Chat + Embedding  │
│ pgvector + pg_search + FTS     │  └─────────────────────────┘
│ Dữ liệu RAG active & lịch sử   │
└───────────────┬────────────────┘
                │ tùy chọn (optional)
        ┌───────▼────────┐
        │ Local reranker │
        │ :8000/rerank   │
        └────────────────┘
```

Dữ liệu crawler được tách biệt độc lập với dữ liệu ứng dụng:

```text
crawler.companies / crawler.jobs
                 │ chuẩn hóa và cập nhật (normalize & upsert)
                 ▼
 public.companies / public.jobs
                 │ đồng bộ hóa gia tăng (incremental sync)
                 ├────────► rag_job_embeddings
                 └────────► rag_historical_job_embeddings
```

## Tính năng nổi bật

### Xác thực và tài khoản người dùng

- Đăng ký và đăng nhập qua tài khoản email/mật khẩu.
- Đăng nhập nhanh bằng Google (Google Sign-In).
- Bảo vệ các thao tác tài khoản thông qua JWT.
- Quản lý thông tin hồ sơ người dùng (User profile).
- Lưu việc làm và nộp hồ sơ ứng tuyển đồng bộ qua backend API, hỗ trợ lưu trạng thái fallback cục bộ ở frontend.

### Khám phá việc làm

- Tìm kiếm việc làm có phân trang theo từ khóa và nhiều tiêu chí lọc linh hoạt.
- Trang chi tiết công việc sử dụng dynamic slug của Next.js.
- Lưu / bỏ lưu công việc với trạng thái được duy trì sau khi tải lại trang.
- Ứng tuyển công việc và xem lại danh sách các hồ sơ đã nộp.
- Module gợi ý chuyên biệt giúp chấm điểm và đề xuất công việc dựa trên ngữ cảnh CV/hồ sơ của ứng viên.

### Danh bạ doanh nghiệp

- Tìm kiếm, lọc theo ngành nghề, sắp xếp và phân trang lũy tiến dạng "Xem thêm" (load more).
- Đường dẫn động chi tiết công ty tại `/cong-ty/[companySlug]`.
- Danh bạ mặc định gửi yêu cầu `completeOnly=true` và ẩn các hồ sơ thiếu các trường thông tin cốt lõi: mô tả, ngành nghề, trụ sở chính hoặc quy mô công ty.
- Trụ sở công ty được ưu tiên làm địa điểm hiển thị, với địa điểm của các tin tuyển dụng đang mở làm phương án dự phòng.

Ví dụ:

```http
GET /api/companies?offset=0&limit=6&search=technology&completeOnly=true
```

### Công cụ hỗ trợ CV

- Tạo, chỉnh sửa, xem trước và lưu trữ nhiều bản CV khác nhau.
- Tải lên và tự động trích xuất thông tin từ CV định dạng PDF.
- Hiển thị trực quan trạng thái tiến độ khi tải file và khi AI chấm điểm CV.
- Hỗ trợ AI đánh giá, kiểm tra (audit) và viết lại/tối ưu nội dung CV.
- Giao diện chỉnh sửa CV responsive với thanh điều hướng dọc tiện lợi.

### AI Chatbot thông minh

- Hỏi đáp hướng nghiệp tổng quát và trò chuyện thấu hiểu ngữ cảnh CV người dùng.
- Phản hồi dạng luồng (streaming) theo thời gian thực thông qua Server-Sent Events (SSE).
- Các API quản lý lịch sử hội thoại.
- Các endpoint chuyên dụng phục vụ kiểm tra CV (audit), viết lại nội dung (rewrite) và đánh giá độ tương thích.
- Cơ chế xử lý dự phòng mượt mà khi tìm kiếm từ khóa hoặc dịch vụ reranker tùy chọn không khả dụng.

## Quy trình RAG (RAG Pipeline)

Quy trình truy xuất dữ liệu (retrieval pipeline) hiện tại:

1. **Dữ liệu chuẩn (Canonical data):** Dữ liệu công việc và công ty được đọc trực tiếp từ `public.jobs` và `public.companies`; vector nhúng (embedding) của công việc không còn lấy từ file JSON tĩnh đính kèm.
2. **Đồng bộ hóa gia tăng (Incremental synchronization):** Các bản ghi thay đổi được nhúng theo lô (batch) và các vector cũ/không còn hợp lệ có thể xóa an toàn.
3. **Các kho lưu trữ riêng biệt (Separate stores):**
   - `rag_hr_embeddings`: Lưu trữ kiến thức nhân sự và viết CV.
   - `rag_job_embeddings`: Lưu trữ các công việc đang tuyển dụng (active).
   - `rag_historical_job_embeddings`: Lưu trữ các công việc đã đóng hoặc hết hạn, phục vụ phân tích xu hướng thị trường.
4. **Điều hướng ý định (Intent routing):** Phân tích câu truy vấn để điều hướng tới kho kiến thức HR, việc làm hiện tại, việc làm lịch sử, hoặc gộp các nguồn lại.
5. **Truy xuất lai (Hybrid retrieval):** Kết hợp các ứng viên tìm kiếm ngữ nghĩa từ pgvector với các ứng viên BM25 từ `pg_search`. Sử dụng tìm kiếm toàn văn bản (Full-text search) mặc định của PostgreSQL làm phương án dự phòng.
6. **Hợp nhất kết quả (Fusion):** Sử dụng thuật toán RRF (Reciprocal Rank Fusion) có trọng số để gộp bảng xếp hạng vector và xếp hạng từ khóa.
7. **Tái xếp hạng (Reranking):** Mô hình reranker cục bộ tùy chọn giúp tinh chỉnh và rút gọn tập ứng viên; quá trình truy xuất vẫn tiếp tục hoạt động bình thường nếu dịch vụ reranker offline.
8. **Tạo phản hồi (Prompt generation):** Ngữ cảnh chứng cứ cuối cùng được đưa vào prompt của LangChain4j và gửi đến mô hình chat OpenRouter đã cấu hình.

Mặc định, các tính năng RAG, crawler và đồng bộ hóa dữ liệu lịch sử được tắt khi khởi động cục bộ để đảm bảo an toàn. Chỉ bật các cờ tương ứng trong `backend/.env` khi bạn muốn thực hiện lập chỉ mục (index):

```dotenv
RAG_INCREMENTAL_ENABLED=true
RAG_INCREMENTAL_RUN_ON_START=true
RAG_HISTORICAL_ENABLED=true
RAG_HISTORICAL_RUN_ON_START=true
```

## Công nghệ sử dụng

### Frontend

| Công nghệ | Phiên bản | Mục đích sử dụng |
| :--------- | :------ | :------ |
| Next.js | 14.2.x | App Router, định tuyến và build production |
| React | 18.2 | Xây dựng giao diện component UI |
| TypeScript | 5.2 | Định kiểu tĩnh (Static typing) |
| TailwindCSS | 3.4 | Định kiểu giao diện Utility-first |
| Firebase | 12.x | Xác thực người dùng qua Google |
| Lucide React | 0.300 | Bộ biểu tượng (Icons) |
| Recharts | 3.8 | Vẽ biểu đồ và trực quan hóa dữ liệu |
| React Markdown | 10.x | Render định dạng Markdown cho Chatbot |

### Backend

| Công nghệ | Phiên bản | Mục đích sử dụng |
| :--------- | :------ | :------ |
| Java | 21 | Môi trường runtime và ngôn ngữ chính |
| Spring Boot | 4.0.0 | Framework phát triển REST API |
| Spring Security + JJWT | 0.12.6 | Xác thực và phân quyền người dùng |
| Spring Data JPA | Quản lý bởi Spring Boot | Thao tác và truy xuất cơ sở dữ liệu |
| LangChain4j | 0.29.1 | Tích hợp LLM và quy trình RAG |
| MapStruct | 1.6.0 | Ánh xạ đối tượng DTO (DTO mapping) |
| Lombok | 1.18.40 | Giảm thiểu mã lặp (Boilerplate code) |
| SpringDoc OpenAPI | 2.6.0 | Giao diện tài liệu Swagger/OpenAPI |

### Dữ liệu và hạ tầng

| Công nghệ | Mục đích sử dụng |
| :--------- | :------ |
| ParadeDB `v0.25.6-pg15` | Image PostgreSQL 15 tích hợp sẵn các extension tìm kiếm |
| pgvector | Lưu trữ vector embedding và tìm kiếm tương đồng ngữ nghĩa |
| pg_search | Truy xuất dữ liệu từ khóa bằng thuật toán BM25 |
| PostgreSQL FTS | Tìm kiếm toàn văn bản dự phòng (Fallback lexical search) |
| Docker Compose | Khởi tạo cơ sở dữ liệu và tự động chạy migration cục bộ |
| OpenRouter | API cung cấp mô hình Chat và Embedding |
| GitHub Actions | Tự động hóa quy trình CI cho cả Frontend và Backend |

## Cấu trúc dự án

```text
jobpilot/
├── .github/workflows/ci.yml          # CI tự động cho Frontend và Backend
├── backend/
│   ├── docker/init-db.sh             # Script chạy migration cơ sở dữ liệu theo thứ tự
│   ├── src/main/java/com/jobportal/
│   │   ├── modules/auth/             # Đăng ký, đăng nhập, xác thực Google
│   │   ├── modules/user/             # Quản lý hồ sơ người dùng
│   │   ├── modules/job/              # API quản lý và tìm kiếm việc làm
│   │   ├── modules/company/          # API danh bạ và chi tiết công ty
│   │   ├── modules/cv/               # Lưu trữ CV và trích xuất dữ liệu từ PDF
│   │   ├── modules/application/      # Quản lý hồ sơ ứng tuyển
│   │   ├── modules/savedjob/         # Quản lý việc làm đã lưu
│   │   ├── modules/recommendation/   # Gợi ý việc làm phù hợp với CV
│   │   ├── modules/crawler/          # Chuẩn hóa dữ liệu từ crawler sang canonical
│   │   └── modules/chatbot/          # Chatbot và quy trình RAG
│   └── src/main/resources/
│       ├── application.properties
│       └── db/migration/             # Các file migration cho database và tìm kiếm
├── frontend/
│   ├── src/app/                      # Các trang theo App Router của Next.js
│   ├── src/features/                 # Các module UI theo miền nghiệp vụ
│   ├── src/components/               # Các component dùng chung
│   ├── src/layouts/                  # Header và footer của ứng dụng
│   ├── src/services/                 # Các client gọi API backend có định kiểu
│   ├── src/hooks/                    # Các custom hook tái sử dụng
│   └── src/utils/                    # Các hàm tiện ích dùng chung ở frontend
├── docs/                             # Tài liệu dự án và sơ đồ ERD
├── docker-compose.yml                # Dịch vụ ParadeDB/PostgreSQL
├── .env.example                      # File mẫu tham khảo toàn bộ biến môi trường
└── README.md
```

## Cài đặt cục bộ

### Yêu cầu môi trường

- Node.js 18+ và npm 9+.
- JDK 21.
- Maven 3.9+.
- Docker và Docker Compose.
- Khóa API tương thích với OpenRouter để sử dụng các tính năng AI.

### 1. Clone repository

```bash
git clone https://github.com/thai2602/IE303---Website-Analysis-and-Search-Career.git
cd IE303---Website-Analysis-and-Search-Career
```

### 2. Tạo file cấu hình môi trường cục bộ

PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env.local
```

Bash:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Cập nhật các thông tin kết nối cơ sở dữ liệu, `JWT_SECRET_KEY`, `GOOGLE_CLIENT_ID` và `OPENAI_API_KEY`. Tuyệt đối không commit các file `.env` đã tạo lên hệ thống Git.

### 3. Khởi động PostgreSQL/ParadeDB

```bash
docker compose up -d db
```

Container sẽ mở cổng PostgreSQL trên `localhost:5432` theo mặc định và tự động áp dụng các file SQL migration theo thứ tự từ thư mục `backend/src/main/resources/db/migration` khi một volume dữ liệu mới được khởi tạo.

### 4. Khởi chạy Backend

```bash
cd backend
mvn spring-boot:run
```

- REST API: <http://localhost:8080>
- Swagger UI: <http://localhost:8080/swagger-ui.html>

### 5. Khởi chạy Frontend

```bash
cd frontend
npm install
npm run dev
```

- Ứng dụng web: <http://localhost:3000>

### Reranker tùy chọn (Optional)

Chạy dịch vụ HTTP tại `http://localhost:8000/rerank` và cấu hình biến môi trường `RAG_RERANKER_URL` nếu bạn muốn dùng tính năng rerank. Khi dịch vụ này không khả dụng, JobPilot sẽ tự động giữ lại kết quả từ vector/từ khóa thay vì báo lỗi yêu cầu chat.

## Kiểm thử và CI

Kiểm tra Frontend:

```bash
cd frontend
npm run typecheck
npm run build
```

Kiểm tra Backend:

```bash
cd backend
mvn test
```

GitHub Actions sẽ tự động kiểm tra type-check/build cho frontend và chạy `mvn verify` cho backend đối với các lệnh push và pull request theo kịch bản trong [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Tổng quan API

| Phân hệ | Endpoint | Mô tả |
| :----- | :------- | :---------- |
| Auth | `/api/auth/**` | Đăng ký tài khoản, đăng nhập email và đăng nhập bằng Google |
| Users | `/api/users/**` | Tra cứu và quản lý thông tin hồ sơ người dùng |
| Jobs | `/api/jobs/**` | Danh sách việc làm có phân trang và thông tin chi tiết công việc |
| Companies | `/api/companies/**` | Danh bạ công ty, thông tin chi tiết và bộ lọc hồ sơ hoàn thiện |
| CVs | `/api/cvs/**` | Thao tác CRUD CV, danh sách mẫu và trích xuất dữ liệu từ file PDF |
| Applications | `/api/applications/**` | Nộp đơn, xem danh sách và xóa hồ sơ ứng tuyển |
| Saved jobs | `/api/saved-jobs/**` | Lưu tin, xem danh sách và bỏ lưu việc làm |
| Recommendations | `/api/recommendations/**` | Gợi ý việc làm thông minh dựa trên CV và cung cấp ngữ cảnh cho LLM |
| Chatbot | `/api/chatbot/**` | Chat, stream SSE, lịch sử chat, kiểm tra CV (audit), viết lại và đánh giá RAG |

Sau khi backend khởi chạy, truy cập đường dẫn <http://localhost:8080/swagger-ui.html> để xem tài liệu OpenAPI chi tiết được sinh tự động.

---

<p align="center">Được phát triển với ❤️ bởi Nhóm JobPilot — UIT IE303 2025–2026</p>
