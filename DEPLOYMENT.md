# Vercel Deployment Guide

## Project Structure
```
├── frontend/          # Vite + React app → Deploy to Vercel
└── backend/           # Express + MongoDB → Deploy to Railway/Render/Fly.io
```

## ⚠️ Important: Backend Cannot Run on Vercel
The backend uses:
- **MongoDB persistent connections** (not serverless-friendly)
- **Cron jobs** (`node-cron`) for attendance reminders
- **Long-running QR sessions**
- **WebSocket-like features**

These **don't work** on Vercel Serverless Functions (10s timeout, no persistent processes).

## Recommended Deployment

### Option 1: Frontend on Vercel + Backend on Railway (Recommended)
1. **Backend** → Deploy to [Railway](https://railway.app) / [Render](https://render.com) / [Fly.io](https://fly.io)
2. **Frontend** → Deploy to Vercel

### Option 2: Both on Vercel (Major Refactor Required)
- Convert backend to serverless functions
- Replace cron jobs with Vercel Cron
- Use MongoDB Atlas with connection pooling
- Significant code changes needed

---

## Frontend Deployment (Vercel)

### 1. Push to GitHub
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 2. Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Select **frontend** folder as root directory
4. Vercel auto-detects Vite configuration

### 3. Environment Variables (Vercel Dashboard)
Add these in **Settings → Environment Variables**:

| Variable | Value |
|----------|-------|
| `VITE_API_BASE_URL` | `https://your-backend-url.railway.app/api/v1` |
| `VITE_APP_NAME` | `Smart Attendance System` |

### 4. Deploy
- Vercel builds with `npm run build` (outputs to `dist/`)
- SPA routing handled by `vercel.json` rewrites

---

## Backend Deployment (Railway Example)

### 1. Create Railway Project
1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Select **backend** folder

### 2. Add MongoDB
- Railway: Add PostgreSQL/MongoDB plugin or use MongoDB Atlas
- Set `MONGODB_URI` in Railway variables

### 3. Environment Variables (Railway)
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-secret
FRONTEND_URL=https://your-app.vercel.app
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### 4. Deploy
- Railway runs `npm start` (uses `server.js`)
- Auto-assigns public URL like `https://smart-attendance.up.railway.app`

---

## Post-Deployment

### Update Frontend API URL
In Vercel dashboard, update `VITE_API_BASE_URL` to your Railway URL:
```
https://smart-attendance.up.railway.app/api/v1
```

### CORS Configuration
In `backend/server.js` or CORS middleware, ensure:
```javascript
origin: process.env.FRONTEND_URL // https://your-app.vercel.app
```

---

## File Summary
```
frontend/
├── vercel.json          # Vercel config (created)
├── .env.example         # Env template (created)
├── vite.config.js       # Updated with base: '/'
└── package.json         # Build: vite build → dist/
```

---

## Commands Reference

| Task | Command |
|------|---------|
| Local dev (frontend) | `cd frontend && npm run dev` |
| Local dev (backend) | `cd backend && npm run dev` |
| Build frontend | `cd frontend && npm run build` |
| Preview build | `cd frontend && npm run preview` |
| Lint frontend | `cd frontend && npm run lint` |