# FinLedger Pro

FinLedger Pro is a premium enterprise-grade AI financial intelligence platform built with **React (Vite), Node.js (Express), and MongoDB**.

---

## ✨ Key Features

### 🧠 Advanced AI Financial Intelligence
*   **Global AI Chat Assistant**: Persistent, context-aware financial consultation powered by advanced neural models.
*   **Neural Insights Engine**: Automated executive summaries, actionable performance recommendations, and growth analysis.
*   **Health Scoring & Anomalies**: Real-time 0-100 firm health metrics and automatic spike detection for all expense categories.
*   **Natural Language Query (NLQ)**: Slicing and dicing complex data using human-language questions.

### 📊 Interactive Analytics & Visualization
*   **Executive Command Center**: High-fidelity dashboards with real-time KPI tracking (Revenue, Net Profit, Net Margin, and Ratios).
*   **YoY Comparison Engine**: Trend overlays comparing current performance with historical actuals and prorated targets.
*   **Financial Ratios Hub Hub**: Comprehensive visualization of liquidity, profitability, solvency, and efficiency ratios.
*   **Dynamic Pivot Tables**: Flexible, multi-dimensional filtering for deep-dive transactional analysis.

### 💾 Data Portability & Reporting
*   **Universal CSV Export**: One-click, high-fidelity exports for P&L Statements, Dashboards, Audit Trails, and AI Insights.
*   **GST & Compliance**: Automated tracking of GST Invoices, Returns, and Bank Reconciliations.

### 🛡️ Enterprise Security & Infrastructure
*   **Multi-Entity Management**: Secure multi-company switching with strictly scoped data isolation.
*   **Security Audit Central**: Verifiable audit logging for every system modification and security event.
*   **JWT Architecture**: Production-ready security with httpOnly cookie-based refresh tokens.

---

## 🏗️ Project Architecture
*   **frontend**: React + Vite + Tailwind CSS (Premium Typography: General Sans & Be Vietnam Pro)
*   **backend**: Node/Express + MongoDB (Mongoose)

---

## Multi-company (company-wise data)

### How data is separated
- Every business object (transactions, budgets, reports, audit logs, AI logs) is scoped by **`companyId`** in MongoDB.
- Each authenticated request runs under an **active company context** (`req.companyId`), derived from the access token.

### How users manage multiple companies
- A user can belong to multiple companies via `CompanyMembership` (`backend/src/models/CompanyMembership.ts`).
- The UI shows a **company switcher** in the dashboard header.
- Switching company calls `POST /api/v1/companies/:id/switch`, which issues a new access token (httpOnly cookie) for that active company.

## Local development (no Docker)

### Backend

```bash
cd backend
npm install
npm run dev
```

Backend runs on `http://localhost:5000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Docker deployment (recommended)

This repo includes `docker-compose.yml`, `backend/Dockerfile`, and `frontend/Dockerfile` (nginx serves the SPA and proxies `/api/*` to the backend).

### Prerequisites
- Install Docker Desktop (Windows) and ensure `docker` is available in your terminal.

### Run

```bash
docker compose up --build
```

Then open `http://localhost/`.

### Environment variables
Edit in `docker-compose.yml` (backend service):
- `MONGO_URI`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `CORS_ORIGIN` (for docker + nginx proxy, typically `http://localhost`)
- `GROQ_API_KEY` (optional; AI features require it)

## Seeding demo data (optional)

Seeding is **manual only**:

```bash
cd backend
npm run seed
```

