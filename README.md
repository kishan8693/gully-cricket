# Night Cricket Tournament

Production-ready MERN stack web application for managing a Night Cricket Tournament.

## Tech Stack

- **Frontend:** React 18 (Vite), Tailwind CSS, Axios, React Router
- **Backend:** Node.js, Express.js (ES Modules)
- **Database:** MongoDB with Mongoose
- **Auth:** JWT (Signup / Login), role-based (Admin / User)

## Features

- **Auth:** Signup, Login, JWT, protected routes. Users can update own profile (username, password, profileImage). Re-login required after password change.
- **Roles:** Admin (full access: scoring, commentary, toss, CRUD, finance). User (read-only + update own profile only).
- **Teams:** Pre-seed KKR, CSK, GT. Max 11 players per team. Team stats (matchesPlayed, matchesWon, matchesLost, totalRuns).
- **Players:** Add/Edit/Delete (Admin), profile image, role (Batsman, Bowler, All-rounder, Wicket-keeper), totalRuns, totalFours, totalSixes, strikeRate.
- **Matches:** Schedule, toss (coin flip UI), start (striker, non-striker, bowler), ball-by-ball live scoring, scorecard.
- **Toss:** Random heads/tails, select winner, choose bat or field. Message: "Team A won the toss and chose to field first".
- **Live scoring:** Runs per ball, striker/bowler, fours/sixes, wickets. CRR, RRR. Extras: wide, no ball, bye, leg bye.
- **Commentary:** Auto-generated from scoring events; admin can add or edit custom commentary.
- **Finance:** Contributions (player-wise, ₹50/100/custom), expenses (amount, description, category). Summary: Total Collection − Total Expenses = Remaining Balance.
- **Dashboard:** Team standings, recent/upcoming matches, top run scorers, financial summary.

## Project structure

```
├── backend/          # Express API (ESM)
│   ├── config/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── server.js
│   ├── seed.js
│   └── .env.example
├── frontend/         # Vite + React + Tailwind
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── ...
└── README.md
```

## Setup

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env: set MONGODB_URI, JWT_SECRET
npm install
npm run seed    # creates admin user + 3 teams
npm run dev     # runs on http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev     # runs on http://localhost:5173
```

### 3. Use the app

- Open **http://localhost:5173**
- **Login:** `admin` / `admin123` (full access)
- Or **Sign up** as a new user (read-only + profile edit)

## API (overview)

- `POST /api/auth/register` — Signup
- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Current user
- `PUT /api/auth/profile` — Update own profile (username, password, profileImage)
- `GET/POST/PUT/DELETE /api/teams`
- `GET/POST/PUT/DELETE /api/players`
- `GET/POST/PUT/DELETE /api/matches`
- `POST /api/matches/:id/toss` — Record toss (tossWinner, tossResult, decision)
- `POST /api/matches/:id/start` — Start match (strikerId, nonStrikerId, bowlerId)
- `POST /api/matches/:id/ball` — Record ball (runs, extras, wicket)
- `GET/POST/PUT /api/matches/:id/commentary`
- `GET/POST /api/finance/contributions`, expenses, summary
- `GET /api/dashboard`

## Validations

- Max 11 players per team (enforced in backend).
- Required fields and role-based access on all mutating endpoints.
- Re-login after password change (frontend logs out and redirects to login).
