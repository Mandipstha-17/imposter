# Football Imposter

A modern multiplayer web game built with the MERN stack (MongoDB, Express, React, Node.js) and Socket.IO.

## Push to GitHub

1. Copy env templates (do not commit real secrets):
   ```bash
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   ```
   Edit `server/.env` with your MongoDB URI locally only.

2. Initialize and push:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Football Imposter"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

Never commit `server/.env`, `client/.env`, or real credentials in `.env.example`.

## Requirements

- Node.js (v18+)
- MongoDB (Atlas recommended for cloud)

## Local development

1. **Install dependencies** (from the project root):

   ```bash
   npm install
   cd client && npm install
   cd ../server && npm install
   ```

2. **Environment variables**

   - `server/`: copy `.env.example` to `.env` and set `MONGO_URI`, `PORT`, and `FRONTEND_URL` (default `http://localhost:5173` for Vite dev).
   - `client/`: copy `.env.example` to `.env` and set `VITE_SERVER_URL=http://localhost:5000`.

3. **Run dev servers** (from the root):

   ```bash
   npm run dev
   ```

   Opens the Vite app at `http://localhost:5173` with the API on port `5000`.

## Production build (local)

From the root:

```bash
npm run build
```

In `server/.env` set at minimum:

```env
NODE_ENV=production
MONGO_URI=your_mongodb_connection_string
FRONTEND_URL=http://localhost:5000
```

(`FRONTEND_URL` must match the URL users open in the browser. In production mode the app is served from the same port as the API.)

Start:

```bash
npm start
```

Open `http://localhost:5000`.

## Cloud deployment

Deploy as a **single web service** that runs the build and serves the React app from Express (same origin for API, static files, and Socket.IO).

### Environment variables (hosting dashboard)

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | Set to `production` |
| `MONGO_URI` | Yes | MongoDB Atlas connection string |
| `FRONTEND_URL` | Yes | Public app URL, e.g. `https://your-app.onrender.com` (must match what users open) |
| `PORT` | Often auto | Set by the platform (Render, Railway, etc.) |

Do **not** set `VITE_SERVER_URL` for cloud builds. The client uses the current origin in production.

### Build and start commands

**Build:**

```bash
npm install && cd client && npm install && cd ../server && npm install && cd .. && npm run build
```

**Start:**

```bash
npm start
```

### Health check

Use `GET /health` — returns `{ "status": "ok" }`.

### Platform notes

- **Render / Railway**: enable WebSocket support if offered; set the health check path to `/health`.
- **MongoDB Atlas**: allow network access from your host (or `0.0.0.0/0` for managed platforms).
- Test from any device (phone on cellular or Wi‑Fi) using only your **public URL** — no LAN IP or `localhost` on client devices.

### Verify after deploy

1. Open the public URL — home page loads.
2. Create/join a room — Socket.IO connects (no CORS errors in the browser console).
3. Open `/leaderboard` — data loads from `/api/leaderboard` on the same origin.
