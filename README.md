# JobPilot — Career Analysis and Job Search Platform

<p align="center">
  <a href="https://www.uit.edu.vn/" title="University of Information Technology">
    <img src="https://i.imgur.com/WmMnSRt.png" alt="University of Information Technology">
  </a>
</p>

<h1 align="center"><b>IE303 Course Project: Career Analysis and Job Search Platform</b></h1>

<p align="center">
  <img src="https://img.shields.io/badge/Java-21-orange?style=for-the-badge&logo=openjdk" alt="Java 21" />
  <img src="https://img.shields.io/badge/Spring%20Boot-4.0.0-brightgreen?style=for-the-badge&logo=springboot" alt="Spring Boot 4" />
  <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js" alt="Next.js 14" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react" alt="React 18" />
  <img src="https://img.shields.io/badge/PostgreSQL-15-336791?style=for-the-badge&logo=postgresql" alt="PostgreSQL 15" />
  <img src="https://img.shields.io/badge/LangChain4j-RAG-blueviolet?style=for-the-badge" alt="LangChain4j RAG" />
</p>

## Course Information

- **Course:** Java Technology (IE303)
- **Class:** IE303.Q21.CNVN
- **Academic term:** Semester 2, 2025–2026
- **Instructor:** Huỳnh Văn Tín, M.Sc.

## Team Members

| No. | Student ID | Full Name | Role | GitHub | Email |
| :-- | :--------- | :-------- | :--- | :----- | :---- |
| 1 | 23521416 | Lê Hoàng Thái | Team Leader | [thai2602](https://github.com/thai2602) | <23521416@gm.uit.edu.vn> |
| 2 | 23521478 | Lê Trần Đức Thiện | Member | — | <23521478@gm.uit.edu.vn> |
| 3 | 23521664 | Nguyễn Tấn Trọng | Member | — | <23521664@gm.uit.edu.vn> |
| 4 | 23521720 | Nguyễn Minh Tuấn | Member | [MinhTuan-K18](https://github.com/MinhTuan-K18) | <23521720@gm.uit.edu.vn> |

## Useful Links

- **Project report:** Coming soon
- **Task assignments:** [IE303 Project Management](https://docs.google.com/spreadsheets/d/1uTk0Fm5hLVeCZlcBdFD41b2_mcxjzoDZoWpbaZZQnUc/edit?usp=sharing)
- **Database ERD:** [docs/db-erd.png](docs/db-erd.png)
- **Vietnamese README:** [Original Vietnamese version](pri_docs/README.vi.md)

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Key Features](#key-features)
- [RAG Pipeline](#rag-pipeline)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Local Setup](#local-setup)
- [Testing and CI](#testing-and-ci)
- [API Overview](#api-overview)

## Overview

**JobPilot** is a full-stack career platform that combines job discovery, company profiles, CV management, online applications, and an AI assistant for career guidance. The application uses a Next.js frontend, a Spring Boot REST API backend, and PostgreSQL/ParadeDB for transactional storage, vector retrieval, and lexical search.

The current data pipeline uses PostgreSQL as the canonical source for job postings and company information. Active jobs and historical records are embedded into separate pgvector stores and retrieved through a Hybrid RAG pipeline.

## System Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│ Next.js 14 App Router · React 18 · TypeScript · TailwindCSS    │
│                         :3000                               │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST / JSON / SSE
┌──────────────────────────────▼──────────────────────────────┐
│ Spring Boot 4 · Security/JWT · JPA · LangChain4j              │
│                         :8080                               │
└───────────────┬───────────────────────┬─────────────────────┘
                │                       │
┌───────────────▼────────────────┐  ┌───▼─────────────────────┐
│ ParadeDB / PostgreSQL 15       │  │ OpenRouter              │
│ Canonical job/company data    │  │ Chat + Embedding Models │
│ pgvector + pg_search + FTS     │  └─────────────────────────┘
│ Active & historical RAG data  │
└───────────────┬────────────────┘
                │ optional
        ┌───────▼────────┐
        │ Local reranker │
        │ :8000/rerank   │
        └────────────────┘
```

Crawler data is stored separately from application data:

```text
crawler.companies / crawler.jobs
                 │ normalize & upsert
                 ▼
 public.companies / public.jobs
                 │ incremental sync
                 ├────────► rag_job_embeddings
                 └────────► rag_historical_job_embeddings
```

## Key Features

### Authentication and User Accounts

- Email/password registration and login.
- Google Sign-In.
- JWT protection for account operations.
- User profile management.
- Saved jobs and applications synchronized through the backend API, with local fallback state on the frontend.

### Job Discovery

- Paginated job search with keywords and flexible filters.
- Job detail pages using Next.js dynamic slugs.
- Save and unsave jobs with state that persists across page reloads.
- Apply for jobs and review submitted applications.
- A dedicated recommendation module that scores and suggests jobs based on the candidate's CV and profile context.

### Company Directory

- Search, industry filters, sorting, and incremental "Load more" pagination.
- Dynamic company detail pages at `/cong-ty/[companySlug]`.
- The directory requests `completeOnly=true` by default and hides profiles missing core fields: description, industry, headquarters, or company size.
- Company headquarters are the preferred display location, with locations from open job postings used as a fallback.

Example:

```http
GET /api/companies?offset=0&limit=6&search=technology&completeOnly=true
```

### CV Tools

- Create, edit, preview, and save multiple CVs.
- Upload PDF CVs and automatically extract their information.
- Visual progress indicators during file uploads and AI CV scoring.
- AI-assisted CV evaluation, auditing, rewriting, and optimization.
- A responsive CV editor with convenient vertical navigation.

### AI Chatbot

- General career guidance and conversations informed by the user's CV context.
- Real-time streaming responses through Server-Sent Events (SSE).
- Conversation history APIs.
- Dedicated endpoints for CV auditing, rewriting, and compatibility assessment.
- Graceful fallback when lexical search or the optional reranker service is unavailable.

## RAG Pipeline

The current retrieval pipeline:

1. **Canonical data:** Job and company data are read directly from `public.jobs` and `public.companies`; job embeddings no longer come from bundled static JSON files.
2. **Incremental synchronization:** Changed records are embedded in batches, and stale or invalid vectors can be safely removed.
3. **Separate stores:**
   - `rag_hr_embeddings`: HR and CV-writing knowledge.
   - `rag_job_embeddings`: Active job postings.
   - `rag_historical_job_embeddings`: Closed or expired jobs for market trend analysis.
4. **Intent routing:** Queries are analyzed and routed to HR knowledge, active jobs, historical jobs, or a combination of sources.
5. **Hybrid retrieval:** Semantic candidates from pgvector are combined with BM25 candidates from `pg_search`. Native PostgreSQL full-text search provides a fallback.
6. **Fusion:** Weighted Reciprocal Rank Fusion (RRF) merges vector and lexical rankings.
7. **Reranking:** An optional local reranker refines and reduces the candidate set; retrieval continues to work if the service is offline.
8. **Response generation:** The final evidence context is added to the LangChain4j prompt and sent to the configured OpenRouter chat model.

By default, RAG, crawler, and historical synchronization features are disabled on local startup as a precaution. Enable the corresponding flags in `backend/.env` only when you intend to run indexing:

```dotenv
RAG_INCREMENTAL_ENABLED=true
RAG_INCREMENTAL_RUN_ON_START=true
RAG_HISTORICAL_ENABLED=true
RAG_HISTORICAL_RUN_ON_START=true
```

## Technology Stack

### Frontend

| Technology | Version | Purpose |
| :--------- | :------ | :------ |
| Next.js | 14.2.x | App Router, routing, and production builds |
| React | 18.2 | Component-based user interfaces |
| TypeScript | 5.2 | Static typing |
| TailwindCSS | 3.4 | Utility-first styling |
| Firebase | 12.x | Google authentication |
| Lucide React | 0.300 | Icons |
| Recharts | 3.8 | Charts and data visualization |
| React Markdown | 10.x | Markdown rendering for the chatbot |

### Backend

| Technology | Version | Purpose |
| :--------- | :------ | :------ |
| Java | 21 | Runtime and primary language |
| Spring Boot | 4.0.0 | REST API framework |
| Spring Security + JJWT | 0.12.6 | Authentication and authorization |
| Spring Data JPA | Managed by Spring Boot | Database access and persistence |
| LangChain4j | 0.29.1 | LLM integration and RAG pipelines |
| MapStruct | 1.6.0 | DTO mapping |
| Lombok | 1.18.40 | Boilerplate reduction |
| SpringDoc OpenAPI | 2.6.0 | Swagger/OpenAPI documentation UI |

### Data and Infrastructure

| Technology | Purpose |
| :--------- | :------ |
| ParadeDB `v0.25.6-pg15` | PostgreSQL 15 image with bundled search extensions |
| pgvector | Embedding storage and semantic similarity search |
| pg_search | BM25 lexical retrieval |
| PostgreSQL FTS | Fallback full-text search |
| Docker Compose | Local database setup and automatic migrations |
| OpenRouter | Chat and embedding model APIs |
| GitHub Actions | Frontend and backend CI automation |

## Project Structure

```text
jobpilot/
├── .github/workflows/ci.yml          # Frontend and backend CI
├── backend/
│   ├── docker/init-db.sh             # Runs database migrations in order
│   ├── src/main/java/com/jobportal/
│   │   ├── modules/auth/             # Registration, login, Google authentication
│   │   ├── modules/user/             # User profile management
│   │   ├── modules/job/              # Job management and search APIs
│   │   ├── modules/company/          # Company directory and detail APIs
│   │   ├── modules/cv/               # CV storage and PDF extraction
│   │   ├── modules/application/      # Job application management
│   │   ├── modules/savedjob/         # Saved job management
│   │   ├── modules/recommendation/   # CV-based job recommendations
│   │   ├── modules/crawler/          # Crawler-to-canonical data normalization
│   │   └── modules/chatbot/          # Chatbot and RAG pipeline
│   └── src/main/resources/
│       ├── application.properties
│       └── db/migration/             # Database and search migrations
├── frontend/
│   ├── src/app/                      # Next.js App Router pages
│   ├── src/features/                 # Domain-specific UI modules
│   ├── src/components/               # Shared components
│   ├── src/layouts/                  # Application header and footer
│   ├── src/services/                 # Typed backend API clients
│   ├── src/hooks/                    # Reusable custom hooks
│   └── src/utils/                    # Shared frontend utilities
├── docs/                             # Project documentation and ERD
├── docker-compose.yml                # ParadeDB/PostgreSQL service
├── .env.example                      # Reference template for environment variables
└── README.md
```

## Local Setup

### Prerequisites

- Node.js 18+ and npm 9+.
- JDK 21.
- Maven 3.9+.
- Docker and Docker Compose.
- An OpenRouter-compatible API key for AI features.

### 1. Clone the Repository

```bash
git clone https://github.com/thai2602/IE303---Website-Analysis-and-Search-Career.git
cd IE303---Website-Analysis-and-Search-Career
```

### 2. Create Local Environment Files

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

Update the database connection settings, `JWT_SECRET_KEY`, `GOOGLE_CLIENT_ID`, and `OPENAI_API_KEY`. Never commit the generated `.env` files to Git.

### 3. Start PostgreSQL/ParadeDB

```bash
docker compose up -d db
```

The container exposes PostgreSQL at `localhost:5432` by default and automatically applies SQL migrations from `backend/src/main/resources/db/migration` in order when a new data volume is initialized.

### 4. Start the Backend

```bash
cd backend
mvn spring-boot:run
```

- REST API: <http://localhost:8080>
- Swagger UI: <http://localhost:8080/swagger-ui.html>

### 5. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

- Web application: <http://localhost:3000>

### Optional Reranker

Run an HTTP service at `http://localhost:8000/rerank` and configure `RAG_RERANKER_URL` to enable reranking. If the service is unavailable, JobPilot automatically retains the vector/lexical results instead of failing the chat request.

## Testing and CI

Frontend checks:

```bash
cd frontend
npm run typecheck
npm run build
```

Backend checks:

```bash
cd backend
mvn test
```

GitHub Actions runs frontend type checks and builds, along with `mvn verify` for the backend, on pushes and pull requests as configured in [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## API Overview

| Module | Endpoint | Description |
| :----- | :------- | :---------- |
| Auth | `/api/auth/**` | Registration, email login, and Google Sign-In |
| Users | `/api/users/**` | User profile lookup and management |
| Jobs | `/api/jobs/**` | Paginated job listings and job details |
| Companies | `/api/companies/**` | Company directory, details, and profile completeness filtering |
| CVs | `/api/cvs/**` | CV CRUD, template listings, and PDF extraction |
| Applications | `/api/applications/**` | Submit, list, and delete job applications |
| Saved jobs | `/api/saved-jobs/**` | Save, list, and unsave jobs |
| Recommendations | `/api/recommendations/**` | CV-based job recommendations and context for the LLM |
| Chatbot | `/api/chatbot/**` | Chat, SSE streaming, chat history, CV auditing, rewriting, and RAG evaluation |

After starting the backend, visit <http://localhost:8080/swagger-ui.html> for the full generated OpenAPI documentation.

---

<p align="center">Developed with ❤️ by the JobPilot Team — UIT IE303 2025–2026</p>
