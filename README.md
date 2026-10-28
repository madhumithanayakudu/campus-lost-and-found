# Campus Lost & Found

- `frontend/` HTML, CSS, JavaScript (no build step)
- `backend/` Node.js + Express API using Supabase
- `supabase/schema.sql` database schema

## Setup
1. Create a project at https://supabase.com. Open SQL Editor, paste `supabase/schema.sql`, click Run.
2. In Project Settings > API copy the Project URL and the `service_role` key.
3. In `backend/`: `cp .env.example .env` and fill in both values.
4. Run: `cd backend && npm install && npm start`
5. Open http://localhost:3000 (the backend also serves the frontend).

Keep the service_role key private. Never put it in the frontend.
Without the backend, the frontend opens in demo mode (data saved in the browser only).

## API
GET /api/items?type=&category=&status=&q= | POST /api/items | PATCH /api/items/:id/resolve | GET /api/stats | GET /api/health
