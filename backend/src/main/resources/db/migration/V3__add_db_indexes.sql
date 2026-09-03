-- ==========================================
-- BỔ SUNG INDEX CHO BẢNG JOBS ĐỂ TỐI ƯU HÓA TRUY VẤN
-- ==========================================

-- Index cho khóa ngoại company_id (tối ưu hóa phép JOIN)
CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON jobs(company_id);

-- Index cho các trường thường xuyên lọc (job_type, job_level)
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_jobs_level ON jobs(job_level);
