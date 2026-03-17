# FinLedger Pro

FinLedger Pro is a full-stack web app:
- **frontend**: React + Vite + Tailwind
- **backend**: Node/Express + MongoDB

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

