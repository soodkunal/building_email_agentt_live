# CLAUDE.md — Email Reply Agent

This document serves as the developer guide and technical outline for the Gmail Reply Agent. It details the project phases, system architecture, command references, environment configuration, and code styling standards.

---

## 🛠 Command Reference

### Development & Build
*   **Install Dependencies:** `npm install`
*   **Run Frontend (Dev):** `npm run dev` (Vite / Next.js)
*   **Run Backend (Dev):** `npm run dev:server` or `python src/main.py`
*   **Build Production:** `npm run build`
*   **Linter & Formatter:** `npm run lint` / `npm run format`

### Database & Migrations (Supabase CLI)
*   **Start Local Supabase:** `supabase start`
*   **Create Migration:** `supabase migrations new <migration_name>`
*   **Apply Migrations:** `supabase db reset`
*   **Seed Data / Ingest Knowledge:** `npm run db:seed` or `python scripts/ingest_knowledge.py`

### Testing
*   **Run Unit Tests:** `npm run test` (Frontend) / `pytest` (Backend)
*   **Run E2E Tests:** `npm run test:e2E`

---

## 🏗 System Architecture & Flow

```mermaid
graph TD
    A[Gmail API] -->|Fetch Unread Primary Inbox| B[Backend Server]
    B -->|Convert CSV/Docs to Vector Embeddings| C[(Supabase DB + pgvector)]
    B -->|Search Query| C
    C -->|Return RAG Scenario Context| B
    B -->|Compose Context + Prompt| D[Gemini API]
    D -->|Draft Reply| B
    B -->|Serve Drafts & Auth| E[Frontend Dashboard]
    E -->|Google OAuth Login| F[Google Auth Service]
    E -->|1-Click Review/Edit & Send| A
    E -->|Submit Feedback & Rating| C
```

---

## 📋 Implementation Phases

### Phase 1: Database Setup & Vector Ingestion
*   Setup Supabase project. Enable `pgvector` extension for semantic search.
*   Define schema for:
    *   `knowledge_base`: stores text chunks of scenarios and their vector embeddings.
    *   `drafted_emails`: records `original_draft` (AI-generated), `final_sent` (modified or original), `email_id`, `recipient`, `timestamp`, and approval status.
    *   `feedback`: stores `star_rating` (1-5) and `textual_feedback` linked to each email response.
*   Write a script (`scripts/ingest_knowledge.py` or similar) to parse the local CSV data, generate embeddings using Gemini/Vertex API (or standard open embeddings), and upsert them into the database.

### Phase 2: Authentication & Gmail API Integration
*   Configure Google Cloud Console OAuth 2.0 Credentials.
*   Implement Google Login on the Frontend (REST + Supabase Auth).
*   Create backend services to fetch unread threads from the `primary` inbox category via Gmail API.
*   Implement secure token storage/refresh mechanisms in Supabase to ensure persistent inbox access for the authenticated owner.

### Phase 3: RAG & Gemini Reply Crafting
*   Implement vector search query on Supabase using Cosine Similarity/Inner Product.
*   Formulate a robust system prompt for Gemini that blends the user's incoming email, the sender's details, and the retrieved context/scenarios.
*   Craft AI drafts. Ensure drafts are strictly context-aware and maintain professional, empathetic tones.

### Phase 4: Frontend Development (Dashboard & Control Panel)
*   Build a sleek, premium, responsive dashboard (Vite/React or Next.js + CSS) deployed to Vercel.
*   Implement the following views:
    *   **Inbox / Thread List:** Displays unread primary emails with draft status.
    *   **Detail Panel:** Side-by-side view of the original incoming email, the AI-generated draft (editable text area), and the RAG context used.
    *   **Control Bar:** A single-button "Approve & Send" action and a "Regenerate" option.
    *   **Feedback Modal:** Post-send popup asking for a star rating and textual feedback.

### Phase 5: Verification & Safety Nets
*   Ensure **no email is ever sent automatically**. Safe-sending logic must require explicit user approval.
*   Log both the raw AI draft and the edited sent version to Supabase for continuous system refinement.
*   Configure backend deployment to Railway with automated scale-to-zero or logging.

---

## 🔐 Environment Variables (`.env.example`)

```env
# Frontend
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Backend / API Keys
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=your_google_redirect_uri

# Database
DATABASE_URL=postgres://postgres:...@db.supabase.co:5432/postgres
```

---

## 🎨 Coding Guidelines

### TypeScript / JavaScript Standards
*   Prefer **TypeScript** for strong interfaces around Gmail API payloads and DB schemas.
*   Use functional components with React Hooks.
*   Handle API state explicitly: `idle | loading | success | error`.
*   All asynchronous functions must be wrapped in `try/catch` blocks with explicit error logging.

### Styling & Aesthetics
*   Use pure vanilla CSS (or Tailwind if specifically requested by user).
*   Maintain a premium dark/glassmorphic design system using CSS custom properties (`--color-primary`, `--border-radius`, etc.).
*   Ensure smooth interactive micro-animations for button hovers, page transitions, and loading skeletons.

### Security
*   Restrict all dashboard access behind Google OAuth login middleware.
*   Never store raw Google Access/Refresh tokens on the client; manage them through HTTP-only cookies or secured backend sessions.
