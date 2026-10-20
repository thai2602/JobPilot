# Quy chuẩn đánh giá kiến trúc và chất lượng hệ thống JobPilot

Tài liệu này liệt kê các quy chuẩn được dùng để đánh giá cấu trúc hệ thống JobPilot (Backend, Frontend, Database và tổng thể), tiêu chí cụ thể rút ra từ mỗi quy chuẩn, và nguồn tài liệu gốc để tra cứu hoặc trích dẫn trong báo cáo.

> Ghi chú: Một số quy chuẩn là **tiêu chuẩn chính thức** (ISO, RFC), một số là **hướng dẫn thực hành được ngành công nhận** (OWASP, 12-Factor, guideline của Microsoft/Zalando, tài liệu chính thức của framework). Khi trích dẫn trong báo cáo nên phân biệt rõ hai loại này.

## Mục lục

1. [Tổng thể](#1-tổng-thể)
2. [Backend](#2-backend)
3. [Bảo mật](#3-bảo-mật)
4. [Frontend](#4-frontend)
5. [Database](#5-database)
6. [Kiểm thử](#6-kiểm-thử)
7. [Bảng tổng hợp nguồn tài liệu](#7-bảng-tổng-hợp-nguồn-tài-liệu)

---

## 1. Tổng thể

### 1.1 ISO/IEC 25010:2023 — Product Quality Model (SQuaRE)

- **Loại:** Tiêu chuẩn quốc tế (ISO/IEC), phiên bản 2, công bố 11/2023.
- **Nội dung:** Mô hình chất lượng sản phẩm phần mềm gồm 9 đặc tính, mỗi đặc tính có các đặc tính con: Functional suitability, Performance efficiency, Compatibility, Interaction capability, Reliability, Security, Maintainability, Flexibility, Safety.
- **Áp dụng cho JobPilot:** Dùng làm khung chấm điểm tổng hợp cho từng tầng (BE/FE/DB), tập trung vào các đặc tính:
  - *Maintainability* (modularity, reusability, analysability, testability)
  - *Security* (confidentiality, integrity, accountability)
  - *Reliability* (fault tolerance, recoverability)
- **Nguồn:** ISO/IEC 25010:2023, *Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — Product quality model*. <https://www.iso.org/standard/78176.html>
- **Tham khảo thêm:** ISO/IEC 25000 (tổng quan họ SQuaRE): <https://iso25000.com/index.php/en/iso-25000-standards/iso-25010>

### 1.2 The Twelve-Factor App

- **Loại:** Phương pháp luận xây dựng ứng dụng web/SaaS (Adam Wiggins, Heroku, 2011).
- **Tiêu chí áp dụng:**
  - *III. Config* — cấu hình và bí mật (secret) lưu trong biến môi trường, không ghi cứng trong mã nguồn.
  - *IV. Backing services* — DB, LLM API, reranker là tài nguyên gắn ngoài, thay được qua cấu hình.
  - *X. Dev/prod parity* — môi trường dev gần với production (Docker Compose).
  - *XI. Logs* — log là luồng sự kiện.
- **Nguồn:** <https://12factor.net/>

---

## 2. Backend

### 2.1 Kiến trúc phân tầng (Layered Architecture)

- **Nội dung:** Tách rõ Presentation (Controller) → Business/Service → Data Access (Repository). Controller chỉ nhận request, kiểm tra đầu vào, gọi Service và trả response; logic nghiệp vụ nằm ở Service.
- **Tiêu chí:** Controller không gọi trực tiếp Repository; mỗi tầng chỉ phụ thuộc tầng ngay dưới.
- **Nguồn:**
  - Martin Fowler, *Patterns of Enterprise Application Architecture*, Addison-Wesley, 2002 (chương "Layering").
  - Martin Fowler, *PresentationDomainDataLayering*: <https://martinfowler.com/bliki/PresentationDomainDataLayering.html>
  - Spring Framework Reference — các stereotype `@Controller`, `@Service`, `@Repository`: <https://docs.spring.io/spring-framework/reference/core/beans/classpath-scanning.html>

### 2.2 Tổ chức mã theo chức năng (Package by Feature)

- **Nội dung:** Gom code theo domain/chức năng (job, company, cv…) thay vì theo loại kỹ thuật (controllers/, services/…); cấu trúc giữa các module nên đồng nhất.
- **Nguồn:** Spring Boot Reference — *Structuring Your Code*: <https://docs.spring.io/spring-boot/reference/using/structuring-your-code.html>

### 2.3 Data Transfer Object (DTO)

- **Nội dung:** API trả về DTO thay vì entity JPA, để không lộ trường nội bộ (ví dụ password hash), tránh vòng lặp tuần tự hoá và tách hợp đồng API khỏi schema DB.
- **Nguồn:** Martin Fowler, *Data Transfer Object* (P of EAA Catalog): <https://martinfowler.com/eaaCatalog/dataTransferObject.html>

### 2.4 Thiết kế REST API

- **Tiêu chí:**
  - Đặt tên resource bằng danh từ, số nhiều.
  - Dùng đúng phương thức HTTP và mã trạng thái.
  - Định dạng lỗi thống nhất.
  - Phân trang nhất quán.
  - Không dùng ID do client truyền vào để xác định "người dùng hiện tại".
- **Nguồn:**
  - RFC 9110 — *HTTP Semantics* (phương thức, mã trạng thái): <https://www.rfc-editor.org/rfc/rfc9110>
  - RFC 9457 — *Problem Details for HTTP APIs* (định dạng lỗi chuẩn, thay thế RFC 7807): <https://www.rfc-editor.org/rfc/rfc9457>
  - Microsoft REST API Guidelines: <https://github.com/microsoft/api-guidelines>
  - Zalando RESTful API Guidelines: <https://opensource.zalando.com/restful-api-guidelines/>

### 2.5 Xử lý lỗi tập trung và kiểm tra dữ liệu đầu vào

- **Tiêu chí:** Có `@RestControllerAdvice` xử lý ngoại lệ toàn cục, trả lỗi theo một định dạng (khuyến nghị RFC 9457 `ProblemDetail`); validate request bằng Bean Validation (`@Valid`, `@NotBlank`…).
- **Nguồn:**
  - Spring Framework Reference — *Error Responses* (`ProblemDetail`): <https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-ann-rest-exceptions.html>
  - Spring Framework Reference — *Exceptions* (`@ControllerAdvice`): <https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-advice.html>
  - Jakarta Bean Validation Specification: <https://jakarta.ee/specifications/bean-validation/>

---

## 3. Bảo mật

### 3.1 OWASP API Security Top 10 (2023)

- **Loại:** Danh sách rủi ro bảo mật API phổ biến nhất, do tổ chức OWASP công bố.
- **Các mục dùng để đánh giá JobPilot:**
  - **API1:2023 Broken Object Level Authorization** — người dùng truy cập/sửa đối tượng của người khác qua ID.
  - **API2:2023 Broken Authentication**
  - **API3:2023 Broken Object Property Level Authorization** — lộ thuộc tính nhạy cảm trong response (ví dụ password hash).
  - **API4:2023 Unrestricted Resource Consumption** — endpoint tốn tài nguyên (LLM) không giới hạn tần suất.
  - **API5:2023 Broken Function Level Authorization**
- **Nguồn:** <https://owasp.org/API-Security/editions/2023/en/0x11-t10/>

### 3.2 OWASP Application Security Verification Standard (ASVS)

- **Nội dung:** Bộ yêu cầu kiểm chứng bảo mật theo cấp độ (L1–L3); có thể dùng L1 làm checklist tối thiểu cho đồ án.
- **Nguồn:** <https://owasp.org/www-project-application-security-verification-standard/>

### 3.3 OWASP Cheat Sheet Series

- **Các cheat sheet liên quan:**
  - *JSON Web Token for Java*: <https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html>
  - *Secrets Management*: <https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html>
  - *HTML5 Security* (rủi ro lưu token trong `localStorage`): <https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html>

### 3.4 Spring Security Reference

- **Nội dung:** Cấu hình `SecurityFilterChain`, phân quyền theo request và theo method, xác thực JWT.
- **Nguồn:** <https://docs.spring.io/spring-security/reference/>

---

## 4. Frontend

### 4.1 Quy ước Next.js App Router

- **Tiêu chí:**
  - Cấu trúc thư mục `app/` theo route.
  - Phân biệt Server Component và Client Component.
  - Colocation các file liên quan.
  - Dùng route động `[slug]`.
- **Nguồn:**
  - Next.js Docs — *Project Structure*: <https://nextjs.org/docs/app/getting-started/project-structure>
  - Next.js Docs — *Server and Client Components*: <https://nextjs.org/docs/app/getting-started/server-and-client-components>

### 4.2 Bulletproof React

- **Nội dung:** Kiến trúc tham khảo cho ứng dụng React quy mô vừa/lớn:
  - Tổ chức theo `features/`.
  - Tầng API tách riêng.
  - Thư mục `components/`, `hooks/`, `utils/` dùng chung.
  - Không import chéo giữa các feature.
- **Nguồn:** <https://github.com/alan2207/bulletproof-react> (đặc biệt `docs/project-structure.md`)

### 4.3 Feature-Sliced Design (FSD)

- **Nội dung:** Phương pháp tổ chức frontend theo các lớp (app, pages, widgets, features, entities, shared) với quy tắc phụ thuộc một chiều.
- **Nguồn:** <https://feature-sliced.design/>

### 4.4 Nguyên tắc thiết kế component React

- **Tiêu chí:**
  - Mỗi component một trách nhiệm (single responsibility).
  - Tách logic ra custom hook.
  - Giữ component nhỏ, dễ đọc. Ngưỡng khoảng 300 dòng là quy ước thực hành, không phải tiêu chuẩn chính thức.
- **Nguồn:**
  - React Docs — *Thinking in React*: <https://react.dev/learn/thinking-in-react>
  - React Docs — *Reusing Logic with Custom Hooks*: <https://react.dev/learn/reusing-logic-with-custom-hooks>

---

## 5. Database

### 5.1 Chuẩn hoá dữ liệu (Normalization, 1NF → 3NF/BCNF)

- **Tiêu chí:** Loại bỏ dư thừa và bất thường khi cập nhật; chỉ phi chuẩn hoá (ví dụ cột JSONB) khi có lý do rõ ràng về hiệu năng hoặc tính linh hoạt.
- **Nguồn:**
  - E. F. Codd, "A Relational Model of Data for Large Shared Data Banks", *Communications of the ACM*, 13(6), 1970. <https://doi.org/10.1145/362384.362685>
  - R. Elmasri, S. B. Navathe, *Fundamentals of Database Systems*, 7th ed., Pearson, 2016 (chương Normalization).

### 5.2 Quản lý thay đổi schema bằng migration có phiên bản

- **Tiêu chí:**
  - Mọi thay đổi schema được viết thành migration có đánh số.
  - Migration được áp dụng tự động trên mọi môi trường, không chỉ khi tạo DB mới.
  - Có bảng lịch sử ghi lại migration nào đã chạy.
- **Nguồn:**
  - Martin Fowler, Pramod Sadalage, *Evolutionary Database Design*: <https://martinfowler.com/articles/evodb.html>
  - Flyway Documentation: <https://documentation.red-gate.com/fd>
  - Spring Boot — *Database Initialization / Flyway*: <https://docs.spring.io/spring-boot/how-to/data-initialization.html>

### 5.3 Index và tìm kiếm trong PostgreSQL

- **Tiêu chí:**
  - Tạo index cho các cột lọc/join thường dùng.
  - Dùng GIN cho JSONB và full-text search.
  - Chọn kiểu index phù hợp với truy vấn.
- **Nguồn:**
  - PostgreSQL Docs — *Indexes*: <https://www.postgresql.org/docs/current/indexes.html>
  - PostgreSQL Docs — *Full Text Search*: <https://www.postgresql.org/docs/current/textsearch.html>
  - pgvector: <https://github.com/pgvector/pgvector>
  - ParadeDB `pg_search` (BM25): <https://docs.paradedb.com/>

### 5.4 Quy ước đặt tên SQL

- **Tiêu chí:** `snake_case`, tên bảng nhất quán (số ít hoặc số nhiều), khoá ngoại dạng `<bảng>_id`.
- **Nguồn:** Simon Holywell, *SQL Style Guide*: <https://www.sqlstyle.guide/>

---

## 6. Kiểm thử

### 6.1 Test Pyramid

- **Nội dung:** Nhiều unit test, ít hơn integration test, ít nhất là E2E test. Đánh giá độ phủ kiểm thử theo từng tầng.
- **Nguồn:** Ham Vocke, *The Practical Test Pyramid* (martinfowler.com): <https://martinfowler.com/articles/practical-test-pyramid.html>

### 6.2 Đánh giá hệ thống RAG

- **Nội dung:** Đo chất lượng câu trả lời và truy xuất bằng các metric Faithfulness, Answer Relevancy, Context Precision, Context Recall.
- **Nguồn:** S. Es, J. James, L. Espinosa-Anke, S. Schockaert, "RAGAS: Automated Evaluation of Retrieval Augmented Generation", *EACL 2024 (System Demonstrations)*. <https://arxiv.org/abs/2309.15217>

---

## 7. Bảng tổng hợp nguồn tài liệu

| # | Quy chuẩn | Loại | Phạm vi | Nguồn |
|---|---|---|---|---|
| 1 | ISO/IEC 25010:2023 | Tiêu chuẩn quốc tế | Tổng thể | <https://www.iso.org/standard/78176.html> |
| 2 | The Twelve-Factor App | Phương pháp luận | Tổng thể, cấu hình | <https://12factor.net/> |
| 3 | Layered Architecture (Fowler, P of EAA) | Mẫu kiến trúc | Backend | <https://martinfowler.com/bliki/PresentationDomainDataLayering.html> |
| 4 | Spring Boot — Structuring Your Code | Tài liệu framework | Backend | <https://docs.spring.io/spring-boot/reference/using/structuring-your-code.html> |
| 5 | DTO Pattern (Fowler) | Mẫu thiết kế | Backend | <https://martinfowler.com/eaaCatalog/dataTransferObject.html> |
| 6 | RFC 9110 — HTTP Semantics | Tiêu chuẩn IETF | Backend API | <https://www.rfc-editor.org/rfc/rfc9110> |
| 7 | RFC 9457 — Problem Details | Tiêu chuẩn IETF | Backend API | <https://www.rfc-editor.org/rfc/rfc9457> |
| 8 | Microsoft REST API Guidelines | Hướng dẫn ngành | Backend API | <https://github.com/microsoft/api-guidelines> |
| 9 | Zalando RESTful API Guidelines | Hướng dẫn ngành | Backend API | <https://opensource.zalando.com/restful-api-guidelines/> |
| 10 | Jakarta Bean Validation | Đặc tả Jakarta EE | Backend | <https://jakarta.ee/specifications/bean-validation/> |
| 11 | OWASP API Security Top 10 (2023) | Hướng dẫn bảo mật | Bảo mật | <https://owasp.org/API-Security/editions/2023/en/0x11-t10/> |
| 12 | OWASP ASVS | Tiêu chuẩn kiểm chứng bảo mật | Bảo mật | <https://owasp.org/www-project-application-security-verification-standard/> |
| 13 | OWASP Cheat Sheet Series | Hướng dẫn bảo mật | Bảo mật | <https://cheatsheetseries.owasp.org/> |
| 14 | Spring Security Reference | Tài liệu framework | Bảo mật | <https://docs.spring.io/spring-security/reference/> |
| 15 | Next.js App Router Docs | Tài liệu framework | Frontend | <https://nextjs.org/docs/app/getting-started/project-structure> |
| 16 | Bulletproof React | Kiến trúc tham khảo | Frontend | <https://github.com/alan2207/bulletproof-react> |
| 17 | Feature-Sliced Design | Phương pháp luận | Frontend | <https://feature-sliced.design/> |
| 18 | React Docs | Tài liệu framework | Frontend | <https://react.dev/learn/thinking-in-react> |
| 19 | Codd (1970) — Relational Model / Normalization | Bài báo khoa học | Database | <https://doi.org/10.1145/362384.362685> |
| 20 | Evolutionary Database Design (Fowler & Sadalage) | Phương pháp luận | Database | <https://martinfowler.com/articles/evodb.html> |
| 21 | Flyway Documentation | Tài liệu công cụ | Database | <https://documentation.red-gate.com/fd> |
| 22 | PostgreSQL Docs — Indexes, FTS | Tài liệu DBMS | Database | <https://www.postgresql.org/docs/current/indexes.html> |
| 23 | SQL Style Guide (Holywell) | Hướng dẫn ngành | Database | <https://www.sqlstyle.guide/> |
| 24 | The Practical Test Pyramid | Hướng dẫn ngành | Kiểm thử | <https://martinfowler.com/articles/practical-test-pyramid.html> |
| 25 | RAGAS (Es et al., EACL 2024) | Bài báo khoa học | Đánh giá RAG | <https://arxiv.org/abs/2309.15217> |
