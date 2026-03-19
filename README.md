# HCI-Coursework-Group-48

University of Plymouth Year 3 HCI module coursework project.

## Tech Stack

- **Frontend:** React + Vite + Redux Toolkit + Tailwind
- **Backend:** Node.js + Express + MongoDB + Socket.IO

## Project Structure

- `frontend/` — React client app
- `backend/` — Express API server

## Prerequisites

Make sure you have installed:

- **Node.js** 18+ (LTS recommended)
- **npm**
- **MongoDB** (local instance or MongoDB Atlas)

## 1) Install Dependencies

From the workspace root, install backend and frontend dependencies:

```bash
cd backend
npm install

cd ../frontend
npm install
```

> On Windows PowerShell, if `npm` is blocked by execution policy, use `npm.cmd` instead (e.g. `npm.cmd install`, `npm.cmd run dev`).

## 2) Configure Environment Variables

Create a `.env` file inside `backend/` (path: `backend/.env`) with:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://localhost:27017/homeplan3d
JWT_SECRET=change_me_to_a_secure_secret
JWT_EXPIRES_IN=7d
# Optional (for some DNS/network setups):
# DNS_SERVERS=8.8.8.8,1.1.1.1
```

Create a `.env` file inside `frontend/` (path: `frontend/.env`) with:

```env
VITE_API_URL=http://localhost:5000/api
```

## 3) Run the Project

You need **two terminals**.

### Terminal 1 — Start Backend

```bash
cd backend
npm run dev
```

Backend runs at: `http://localhost:5000`

### Terminal 2 — Start Frontend

```bash
cd frontend
npm run dev
```

Frontend runs at: `http://localhost:5173`

## Admin Login

On backend startup, an admin user is automatically seeded if it does not already exist.

- **Admin login page:** `http://localhost:5173/admin/login`
- **Email:** `admin@homeplan3d.com`
- **Password:** `admin123456`

After login, admin dashboard route is `http://localhost:5173/admin`.

> For production/deployment, change the default admin password immediately.

## Useful Scripts

### Backend (`backend/package.json`)

- `npm run dev` — run server with `nodemon`
- `npm start` — run server with Node

### Frontend (`frontend/package.json`)

- `npm run dev` — start Vite dev server
- `npm run build` — build production assets
- `npm run preview` — preview production build

## Quick Health Check

After starting backend, open:

- `http://localhost:5000/api/health`

Expected response includes:

```json
{ "success": true, "message": "HomePlan3D API running" }
```
