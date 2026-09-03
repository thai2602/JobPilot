# JobPilot — Website Analysis and Search Career

<p align="center">
  <a href="https://www.uit.edu.vn/" title="University of Information Technology">
    <img src="https://i.imgur.com/WmMnSRt.png" alt="University of Information Technology | Trường Đại học Công nghệ Thông tin">
  </a>
</p>

<h1 align="center"><b>IE303 Project: Website Analysis and Search Career</b></h1>

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
- **Academic year:** Semester 2, 2025–2026
- **Lecturer:** Mr. Huynh Van Tin

## Team Members

| No. | Student ID | Full name | Role | GitHub | Email |
| :-- | :--------- | :-------- | :--- | :----- | :---- |
| 1 | 23521416 | Le Hoang Thai | Team Leader | [thai2602](https://github.com/thai2602) | <23521416@gm.uit.edu.vn> |
| 2 | 23521478 | Le Tran Duc Thien | Member | — | <23521478@gm.uit.edu.vn> |
| 3 | 23521664 | Nguyen Tan Trong | Member | — | <23521664@gm.uit.edu.vn> |
| 4 | 23521720 | Nguyen Minh Tuan | Member | [MinhTuan-K18](https://github.com/MinhTuan-K18) | <23521720@gm.uit.edu.vn> |

## Links

- **Project report:** To be added
- **Task assignment:** [IE303 Project Management](https://docs.google.com/spreadsheets/d/1uTk0Fm5hLVeCZlcBdFD41b2_mcxjzoDZoWpbaZZQnUc/edit?usp=sharing)
- **Database ERD:** [docs/db-erd.png](docs/db-erd.png)

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [RAG Pipeline](#rag-pipeline)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Local Setup](#local-setup)
- [Testing and CI](#testing-and-ci)
- [API Overview](#api-overview)

## Overview

**JobPilot** is a full-stack career platform that combines job discovery, company profiles, CV management, job applications and AI-assisted career guidance. The application uses a Next.js frontend, a Spring Boot REST API and PostgreSQL/ParadeDB for transactional data, vector retrieval and lexical search.

The current data flow treats PostgreSQL as the canonical source for jobs and companies. Active and historical jobs are embedded into separate pgvector stores and retrieved through a hybrid RAG pipeline.

## Architecture

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
│ Canonical jobs and companies   │  │ Chat + embedding model │
│ pgvector + pg_search + FTS     │  └─────────────────────────┘
│ Active and historical RAG data │
└───────────────┬────────────────┘
                │ optional
        ┌───────▼────────┐
        │ Local reranker │
        │ :8000/rerank   │
        └────────────────┘
```

Crawler data is isolated from application data:

```text
crawler.companies / crawler.jobs
                 │ normalize and upsert
                 ▼
 public.companies / public.jobs
                 │ incremental synchronization
                 ├────────► rag_job_embeddings
                 └────────► rag_historical_job_embeddings
```

## Features

### Authentication and user account

- Email/password registration and login.
- Google Sign-In.
- JWT-protected account operations.
- User profile management.
- Persistent saved jobs and submitted applications through backend APIs, with local state fallback in the frontend.

### Job discovery

- Paginated job search by keyword and filters.
- Job detail pages using Next.js dynamic slugs.
- Save/unsave job state that remains after reloading.
- Apply to jobs and review submitted applications.
- Dedicated recommendation module that scores jobs against the user's CV/profile context.

### Company directory

- Search, industry filtering, sorting and progressive “load more” pagination.
- Dynamic company detail routes at `/cong-ty/[companySlug]`.
- The directory requests `completeOnly=true` by default and hides profiles missing any core field: description, industry, headquarters or company size.
- Company headquarters is preferred as the displayed location, with active job locations as fallback.

Example:

```http
GET /api/companies?offset=0&limit=6&search=technology&completeOnly=true
```

### CV tools

- Create, edit, preview and persist multiple CVs.
- Upload and extract data from PDF CVs.
- Visible upload and AI-scoring progress states.
- AI-assisted CV audit and content rewriting.
- Responsive CV editor with a dedicated vertical navigation layout.

### AI chatbot

- General career Q&A and CV-aware conversations.
- Streaming responses through Server-Sent Events.
- Conversation history APIs.
- Dedicated audit, rewrite and evaluation endpoints.
- Graceful fallback when lexical search or the optional reranker is unavailable.

## RAG Pipeline

The current retrieval pipeline is:

1. **Canonical data:** jobs and companies are read from `public.jobs` and `public.companies`; job embeddings are no longer sourced from a bundled JSON job file.
2. **Incremental synchronization:** changed records are embedded in batches and stale vectors can be deleted safely.
3. **Separate stores:**
   - `rag_hr_embeddings` for CV/HR knowledge.
   - `rag_job_embeddings` for active, published jobs.
   - `rag_historical_job_embeddings` for closed or expired jobs used in market analysis.
4. **Intent routing:** each query is routed to HR, active jobs, historical jobs or a merged route.
5. **Hybrid retrieval:** pgvector semantic candidates are combined with `pg_search` BM25 candidates. Native PostgreSQL full-text search is the lexical fallback.
6. **Fusion:** weighted Reciprocal Rank Fusion merges vector and lexical rankings.
7. **Reranking:** an optional local reranker reduces the candidate set; retrieval continues without it when the service is offline.
8. **Prompt generation:** the final evidence is injected into the LangChain4j prompt and sent to the configured OpenRouter chat model.

RAG, crawler and historical synchronization are disabled by default for safe local startup. Enable the relevant flags in `backend/.env` only when indexing is intended:

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
| Next.js | 14.2.x | App Router, routing and production build |
| React | 18.2 | Component UI |
| TypeScript | 5.2 | Static typing |
| TailwindCSS | 3.4 | Utility-first styling |
| Firebase | 12.x | Google authentication |
| Lucide React | 0.300 | Icons |
| Recharts | 3.8 | Charts and visualization |
| React Markdown | 10.x | Chatbot Markdown rendering |

### Backend

| Technology | Version | Purpose |
| :--------- | :------ | :------ |
| Java | 21 | Runtime and language |
| Spring Boot | 4.0.0 | REST application framework |
| Spring Security + JJWT | 0.12.6 | Authentication and authorization |
| Spring Data JPA | Managed by Spring Boot | Database access |
| LangChain4j | 0.29.1 | LLM and RAG integration |
| MapStruct | 1.6.0 | DTO mapping |
| Lombok | 1.18.40 | Boilerplate reduction |
| SpringDoc OpenAPI | 2.6.0 | Swagger/OpenAPI UI |

### Data and infrastructure

| Technology | Purpose |
| :--------- | :------ |
| ParadeDB `v0.25.6-pg15` | PostgreSQL 15 image with search extensions |
| pgvector | Vector embedding storage and similarity search |
| pg_search | BM25 lexical retrieval |
| PostgreSQL FTS | Fallback lexical search |
| Docker Compose | Local database and migration bootstrap |
| OpenRouter | Chat and embedding API |
| GitHub Actions | Frontend and backend CI |

## Project Structure

```text
jobpilot/
├── .github/workflows/ci.yml          # Frontend and backend CI
├── backend/
│   ├── docker/init-db.sh             # Ordered database migration runner
│   ├── src/main/java/com/jobportal/
│   │   ├── modules/auth/             # Registration, login, Google auth
│   │   ├── modules/user/             # User profile
│   │   ├── modules/job/              # Jobs API
│   │   ├── modules/company/          # Company directory API
│   │   ├── modules/cv/               # CV persistence and PDF extraction
│   │   ├── modules/application/      # Applications
│   │   ├── modules/savedjob/         # Saved jobs
│   │   ├── modules/recommendation/   # CV-aware job recommendations
│   │   ├── modules/crawler/          # Crawler-to-canonical normalization
│   │   └── modules/chatbot/          # Chatbot and RAG pipeline
│   └── src/main/resources/
│       ├── application.properties
│       └── db/migration/             # Database and search migrations
├── frontend/
│   ├── src/app/                      # Next.js App Router pages
│   ├── src/features/                 # Domain UI modules
│   ├── src/components/               # Shared components
│   ├── src/layouts/                  # Header and footer
│   ├── src/services/                 # Typed backend API clients
│   ├── src/hooks/                    # Reusable hooks
│   └── src/utils/                    # Shared frontend utilities
├── docs/                             # Project documentation and ERD
├── docker-compose.yml                # ParadeDB/PostgreSQL service
├── .env.example                      # Complete environment reference
└── README.md
```

## Local Setup

### Requirements

- Node.js 18+ and npm 9+.
- JDK 21.
- Maven 3.9+.
- Docker and Docker Compose.
- An OpenRouter-compatible API key for AI features.

### 1. Clone the repository

```bash
git clone https://github.com/thai2602/IE303---Website-Analysis-and-Search-Career.git
cd IE303---Website-Analysis-and-Search-Career
```

### 2. Create local environment files

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

Update database credentials, `JWT_SECRET_KEY`, `GOOGLE_CLIENT_ID` and `OPENAI_API_KEY`. Never commit the generated `.env` files.

### 3. Start PostgreSQL/ParadeDB

```bash
docker compose up -d db
```

The container exposes PostgreSQL on `localhost:5432` by default and applies the ordered SQL migrations from `backend/src/main/resources/db/migration` when a fresh data volume is created.

### 4. Start the backend

```bash
cd backend
mvn spring-boot:run
```

- REST API: <http://localhost:8080>
- Swagger UI: <http://localhost:8080/swagger-ui.html>

### 5. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

- Web application: <http://localhost:3000>

### Optional reranker

Run an HTTP service at `http://localhost:8000/rerank` and configure `RAG_RERANKER_URL` if reranking is required. When it is unavailable, JobPilot automatically keeps the vector/lexical results instead of failing the chat request.

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

GitHub Actions runs frontend type-check/build and backend `mvn verify` for pushes and pull requests according to [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## API Overview

| Module | Endpoint | Description |
| :----- | :------- | :---------- |
| Auth | `/api/auth/**` | Registration, email login and Google login |
| Users | `/api/users/**` | User profile lookup and management |
| Jobs | `/api/jobs/**` | Paginated job list and job details |
| Companies | `/api/companies/**` | Company directory, details and complete-profile filtering |
| CVs | `/api/cvs/**` | CV CRUD, templates and PDF extraction |
| Applications | `/api/applications/**` | Submit, list and delete job applications |
| Saved jobs | `/api/saved-jobs/**` | Save, list and remove saved jobs |
| Recommendations | `/api/recommendations/**` | CV-aware job suggestions and LLM-ready context |
| Chatbot | `/api/chatbot/**` | Chat, SSE stream, history, audit, rewrite and RAG evaluation |

Once the backend is running, use <http://localhost:8080/swagger-ui.html> for the generated OpenAPI documentation.

---

<p align="center">Made with ❤️ by Team JobPilot — UIT IE303 2025–2026</p>
