# Smart Care System (SCS30)

Connected hospital care platform — NexaHack full-stack foundation.

## Repository structure

```text
Smart-Care-System/
├── frontend/     # React + Vite + TypeScript (existing UI)
├── backend/      # Express + TypeScript + Socket.io API
├── README.md
└── .gitignore
```

## Prerequisites

- Node.js 18+ recommended
- npm

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs at [http://localhost:5173](http://localhost:5173).

The UI still uses **PatientContext / AuthContext / mockData** and works **without** the backend.

Optional env (see `frontend/.env.example`):

```env
VITE_API_URL=http://localhost:5000
```

## Backend

```bash
cd backend
npm install
npm run dev
```

Runs at [http://localhost:5000](http://localhost:5000).

Health check:

```bash
curl http://localhost:5000/api/health
```

Optional env (see `backend/.env.example`):

```env
PORT=5000
MONGODB_URI=
CLIENT_URL=http://localhost:5173
```

MongoDB is **not required** for the current stub API.

## Run both (two terminals)

```bash
# Terminal 1
cd backend
npm install
npm run dev

# Terminal 2
cd frontend
npm install
npm run dev
```

## Scripts

| Package | Command | Purpose |
|---------|---------|---------|
| frontend | `npm run dev` | Vite dev server |
| frontend | `npm run build` | Production build |
| frontend | `npm run lint` | ESLint |
| frontend | `npm test` | Vitest |
| backend | `npm run dev` | API + Socket.io (tsx watch) |
| backend | `npm run build` | Compile TypeScript |
| backend | `npm run typecheck` | Type check only |
| backend | `npm start` | Run compiled `dist/server.js` |

## Notes

- Do not commit real secrets — use `.env.example` templates.
- API placeholders live under `/api/*`; real persistence comes in a later phase.
- Socket.io is initialized for future live patient / lab / pharmacy / family updates.
