-- ==========================================
-- MODULE 1: AUTH & USER (Phân quyền & Người dùng)
-- ==========================================
CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL -- VD: ROLE_ADMIN, ROLE_EMPLOYER, ROLE_CANDIDATE
);

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    auth_provider VARCHAR(50) DEFAULT 'LOCAL', -- LOCAL, GOOGLE, FACEBOOK
    provider_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'ACTIVE', -- PENDING, ACTIVE, BANNED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE user_roles (
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    role_id BIGINT REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE user_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    gender VARCHAR(20),
    dob DATE,
    address TEXT,
    bio TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- MODULE 2 & 3: CATEGORY, SKILL, COMPANY, JOB
-- ==========================================
CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL -- JOB_INDUSTRY, BLOG_CATEGORY
);

CREATE TABLE skills (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE companies (
    id BIGSERIAL PRIMARY KEY,
    employer_id BIGINT REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    logo_url TEXT,
    website VARCHAR(255),
    tax_code VARCHAR(100),
    industry_id BIGINT REFERENCES categories(id),
    size VARCHAR(50), -- 1-50, 51-200, 201-500, 500+
    description TEXT,
    culture TEXT,
    benefits TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE jobs (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT REFERENCES companies(id),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    job_type VARCHAR(50), -- FULL_TIME, PART_TIME, REMOTE, FREELANCE
    job_level VARCHAR(50), -- INTERN, FRESHER, JUNIOR, SENIOR, MANAGER
    experience_years VARCHAR(50), -- VD: Dưới 1 năm, 1-3 năm
    salary_min NUMERIC(15, 2),
    salary_max NUMERIC(15, 2),
    currency VARCHAR(10) DEFAULT 'VND',
    location_city VARCHAR(100),
    location_address TEXT,
    description TEXT,
    requirements TEXT,
    benefits TEXT,
    status VARCHAR(50) DEFAULT 'PUBLISHED', -- DRAFT, PUBLISHED, CLOSED
    expired_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE job_skills (
    job_id BIGINT REFERENCES jobs(id) ON DELETE CASCADE,
    skill_id BIGINT REFERENCES skills(id) ON DELETE CASCADE,
    PRIMARY KEY (job_id, skill_id)
);

CREATE TABLE saved_jobs (
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    job_id BIGINT REFERENCES jobs(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, job_id)
);

-- ==========================================
-- MODULE 4: CV & APPLICATION (Ứng tuyển)
-- ==========================================
CREATE TABLE cv_templates (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255),
    thumbnail_url TEXT,
    html_structure TEXT
);

CREATE TABLE user_cvs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    cv_name VARCHAR(255) NOT NULL,
    file_url TEXT,
    cv_data JSONB, -- Lưu raw data JSON để sửa CV trực tuyến
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE applications (
    id BIGSERIAL PRIMARY KEY,
    job_id BIGINT REFERENCES jobs(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    cv_id BIGINT REFERENCES user_cvs(id),
    cover_letter TEXT,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, REVIEWING, INTERVIEWING, REJECTED, HIRED
    employer_feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- ==========================================
-- MODULE 5: ARTICLE (Cẩm nang / Blog)
-- ==========================================
CREATE TABLE articles (
    id BIGSERIAL PRIMARY KEY,
    author_id BIGINT REFERENCES users(id),
    category_id BIGINT REFERENCES categories(id),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    thumbnail_url TEXT,
    content TEXT NOT NULL,
    views_count INT DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- ==========================================
-- THÊM INDEX tối ưu hóa tốc độ tìm kiếm
-- ==========================================
CREATE INDEX idx_jobs_title ON jobs(title);
CREATE INDEX idx_jobs_location ON jobs(location_city);
CREATE INDEX idx_companies_name ON companies(name);
CREATE INDEX idx_user_cvs_data ON user_cvs USING GIN (cv_data); -- Tối ưu hóa tìm kiếm trong cục JSONB của CV
