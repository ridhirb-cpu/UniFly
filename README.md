# UniFly

UniFly is a full-stack web application for college students planning flights home around school breaks. Students can choose their college, load a break calendar, compare nearby-airport flight suggestions, coordinate overlapping dates with friends, and add an airport ride only when they need one.

## Stack

- Frontend: React + Tailwind CSS
- Backend: Node.js + Express
- Database: SQLite for local development, PostgreSQL-ready schema design
- Auth: Email + `.edu` verification with JWT sessions
- API: REST

## Core Features

- Flight-first dashboard centered on upcoming breaks and suggested flights
- College selector with autocomplete, state filtering, and 1000+ seeded college entries
- Airport autocomplete for home, departure, and destination airport fields
- Break planner with fall, Thanksgiving, winter, and spring break windows
- Mock flight search using break dates or manual airport-to-airport search
- Friend requests, shared break visibility, overlap detection, and collaborative flight planning
- Travel deals sorted by expiration date
- Airport rides as a secondary add-on linked to selected flights
- Notifications for friend requests, overlaps, and trip invites

## Project Structure

- `frontend/`
- `backend/`
- `database/`

## Local Setup

From `/Users/ridhimabhimavarapu/Documents/CampusRide`:

```bash
npm install
npm run seed
npm run dev
```

Frontend runs at [http://localhost:5173](http://localhost:5173) and the API runs on [http://localhost:4000](http://localhost:4000) by default.

## Environment

Optional backend env file at [backend/.env](/Users/ridhimabhimavarapu/Documents/CampusRide/backend/.env):

```bash
PORT=4000
CLIENT_URL=http://localhost:5173
JWT_SECRET=replace-me
```

Optional frontend env file at [frontend/.env](/Users/ridhimabhimavarapu/Documents/CampusRide/frontend/.env):

```bash
VITE_API_URL=http://localhost:4000/api
```

## Seeded Demo Accounts

- `admin@unifly.edu` / `Admin123!`
- `maya.thompson@utexas.edu` / `Student123!`
- `daniel.kim@umich.edu` / `Student123!`
- `aisha.patel@unc.edu` / `Student123!`

## Data Notes

- College seed data is sourced from [database/colleges.json](/Users/ridhimabhimavarapu/Documents/CampusRide/database/colleges.json).
- Airport seed data is sourced from [database/airports.json](/Users/ridhimabhimavarapu/Documents/CampusRide/database/airports.json).
- Schema lives in [database/schema.sql](/Users/ridhimabhimavarapu/Documents/CampusRide/database/schema.sql).
- Seed logic lives in [database/seed.js](/Users/ridhimabhimavarapu/Documents/CampusRide/database/seed.js).
# UniFly
# UniFly
