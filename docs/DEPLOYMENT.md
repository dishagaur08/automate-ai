# Production deployment

Recommended architecture: **Render Web Service + Render PostgreSQL + Render Static Site**.

## 1. Deploy
1. Push this repository to GitHub.
2. In Render, create a new Blueprint and select the repository.
3. Render reads `render.yaml` and creates the API, PostgreSQL database, and frontend.
4. After the frontend URL is known, set backend `CORS_ORIGINS` to the exact frontend origin, e.g. `https://automateai-web.onrender.com`.
5. Set `VITE_API_URL` on the frontend to the exact backend URL, e.g. `https://automateai-api.onrender.com`.
6. Add `LLM_API_KEY` for AI, `EMBEDDING_API_KEY` (or reuse LLM_API_KEY) for RAG, and SMTP variables for real email sending.
7. Redeploy both services.

## 2. Required production environment variables

Backend:
- `APP_ENV=production`
- `DATABASE_URL` — Render PostgreSQL connection string
- `JWT_SECRET` — long random secret; never commit it
- `JWT_EXPIRE_MINUTES=1440`
- `CORS_ORIGINS` — exact frontend origin
- `LLM_API_KEY` — required for AI Command Center/workflow AI
- `LLM_MODEL` — e.g. `gpt-4o-mini`
- `LLM_BASE_URL` — usually `https://api.openai.com/v1`
- `EMBEDDING_API_KEY` — optional if using the LLM key
- `EMBEDDING_MODEL` — e.g. `text-embedding-3-small`
- `EMBEDDING_BASE_URL` — optional
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, `SMTP_USE_TLS` — required for sending email

Frontend:
- `VITE_API_URL` — deployed backend URL

## 3. Local production-like run

PowerShell:
```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
# Fill secrets/configuration in backend/.env
uvicorn main:app --host 127.0.0.1 --port 8000
```

In another terminal:
```powershell
cd frontend
npm ci
npm run build
npm run preview
```

## 4. Final testing checklist

- `/health` returns healthy.
- Register → login → refresh → logout.
- Protected API rejects missing/invalid JWT.
- User A cannot read/update/delete User B's leads, customers, tasks, approvals, documents, emails, workflows or analytics.
- Dashboard and analytics load with empty states.
- Leads/customers/tasks CRUD + search work.
- Approvals approve/reject and persist.
- AI Command Center works when configured and degrades cleanly when not configured.
- RAG upload/list/delete/query is user-scoped.
- Email draft/send/approval flow works with SMTP configured and fails safely when not configured.
- Workflow CRUD, triggers, conditions, actions and execution history work.
- Navigation and all routes work after refresh.
- Browser console has no application errors.
- Frontend production build succeeds.
- CORS allows only the configured frontend origin.
- No secrets, `.env`, DB files, uploads, caches or build artifacts are committed.
