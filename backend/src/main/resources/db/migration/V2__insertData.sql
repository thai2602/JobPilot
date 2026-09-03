-- ==========================================
-- DỮ LIỆU MẪU (SEED DATA)
-- ==========================================

-- INSERT ROLES
INSERT INTO roles (name) VALUES 
('ROLE_ADMIN'), 
('ROLE_EMPLOYER'), 
('ROLE_CANDIDATE');

-- INSERT USERS (Mật khẩu mặc định đều là "123456" đã được mã hóa bằng thuật toán BCrypt)
INSERT INTO users (email, password_hash, auth_provider, status) VALUES 
('admin@jobpilot.com', '$2a$10$oXvFItqf09uG/XhF0.K/.e0H3d.S0p0F9H0/1H8E2P.C5H8N9l3lq', 'LOCAL', 'ACTIVE'),
('employer@company.com', '$2a$10$oXvFItqf09uG/XhF0.K/.e0H3d.S0p0F9H0/1H8E2P.C5H8N9l3lq', 'LOCAL', 'ACTIVE'),
('candidate@gmail.com', '$2a$10$oXvFItqf09uG/XhF0.K/.e0H3d.S0p0F9H0/1H8E2P.C5H8N9l3lq', 'LOCAL', 'ACTIVE'); 

-- USER ROLES
INSERT INTO user_roles (user_id, role_id) VALUES 
(1, 1), 
(2, 2), 
(3, 3);

-- USER PROFILES
INSERT INTO user_profiles (user_id, full_name, phone, gender, address) VALUES
(1, 'Hệ thống Quản Trị', '0987654321', 'MALE', 'Hà Nội'),
(2, 'Nhà Tuyển Dụng FPT', '0912345678', 'FEMALE', 'Hồ Chí Minh'),
(3, 'Nguyễn Văn Ứng Viên', '0909090909', 'MALE', 'Đà Nẵng');

-- CATEGORIES (Ngành nghề & Danh mục Blog)
INSERT INTO categories (name, type) VALUES 
('Công nghệ thông tin', 'JOB_INDUSTRY'),
('Marketing', 'JOB_INDUSTRY'),
('Tài chính - Kế toán', 'JOB_INDUSTRY'),
('Cẩm nang xin việc', 'BLOG_CATEGORY'),
('Góc nhà tuyển dụng', 'BLOG_CATEGORY');

-- SKILLS
INSERT INTO skills (name) VALUES 
('Java'), ('PostgreSQL'), ('ReactJS'), ('Spring Boot'), ('Figma'), ('SEO');

-- COMPANIES
INSERT INTO companies (employer_id, name, slug, industry_id, size, description, is_featured) VALUES 
(2, 'FPT Software', 'fpt-software', 1, '500+', 'Công ty phần mềm hàng đầu Việt Nam. Nơi hội tụ các nhân tài IT.', true),
(2, 'VNG Corporation', 'vng-corporation', 1, '500+', 'Kỳ lân công nghệ của Việt Nam.', true);

-- JOBS
INSERT INTO jobs (company_id, title, slug, job_type, job_level, experience_years, salary_min, salary_max, location_city, description, requirements, benefits) VALUES 
(1, 'Backend Web Developer (Java/Spring Boot)', 'backend-web-developer', 'FULL_TIME', 'JUNIOR', '1-3 năm', 15000000, 25000000, 'Hà Nội', 'Tham gia phát triển các dự án backend lớn...', 'Yêu cầu 1 năm kinh nghiệm Java, Spring Boot, quen thuộc với Postgres...', 'Bảo hiểm đầy đủ, Thưởng project, Lương tháng 13...'),
(2, 'Lập trình viên Frontend (ReactJS)', 'frontend-reactjs', 'FULL_TIME', 'FRESHER', 'Dưới 1 năm', 10000000, 15000000, 'Hồ Chí Minh', 'Tuyển dụng fresher phát triển ứng dụng web hiện đại...', 'Yêu cầu ReactJS cơ bản, hiểu HTML, CSS, Javascript...', 'Làm việc môi trường trẻ trung, cởi mở...');

-- JOB_SKILLS
INSERT INTO job_skills (job_id, skill_id) VALUES 
(1, 1), (1, 2), (1, 4), -- Job 1 yều cầu: Java, Postgres, Spring Boot
(2, 3); -- Job 2 yêu cầu: ReactJS

-- ARTICLES
INSERT INTO articles (author_id, category_id, title, slug, content, is_featured) VALUES
(1, 4, 'Bí quyết viết CV chuẩn ATS chinh phục nhà tuyển dụng', 'bi-quyet-viet-cv-chuan-ats', 'Nội dung chi tiết cung cấp những tips viết CV ấn tượng...', true);
