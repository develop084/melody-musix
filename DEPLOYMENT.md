# Melody Studio — Free-Tier Deployment & Public Domain Guide

Melody Studio is architected as a **unified single-service workstation**: Express serves the React SPA frontend, the Web Audio proxy, the YouTube stream pipelines, and the SQLite medley storage from a single port on a single domain.

---

## 🌐 1. Instant Live Public Domain (Active Right Now)

Your local workstation is currently tunnelled and accessible publicly from anywhere on the internet via HTTPS:

- **Live URL**: [https://tidy-eels-talk.loca.lt](https://tidy-eels-talk.loca.lt)
- **Tunnel Password** (if prompted by the friendly anti-abuse splash screen): `223.181.72.183`

> You can share this URL with anyone or test it directly on mobile/tablet right now!

---

## 🚀 2. Permanent Free-Tier Cloud Deployment (Render.com)

Render provides a **100% free web service tier** with free automated SSL and a permanent `https://<your-app-name>.onrender.com` domain.

### Quick Setup Steps:
1. **Push your code to GitHub**:
   ```bash
   git add -A
   git commit -m "feat: prepare unified cloud deployment"
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git branch -M main
   git push -u origin main
   ```

2. **Deploy on Render**:
   - Go to [dashboard.render.com](https://dashboard.render.com) and click **New +** → **Web Service** (or **Blueprint**).
   - Connect your GitHub repository.
   - If using **Web Service** manually:
     - **Name**: `melody-studio` (or your chosen name)
     - **Environment**: `Node`
     - **Build Command**: `npm install && npm run db:push && npm run build`
     - **Start Command**: `npm start`
     - **Instance Type**: `Free` (0.5 CPU, 512 MB RAM)
     - **Environment Variables**:
       - `NODE_ENV`: `production`
       - `PORT`: `10000`
       - `DATABASE_URL`: `file:./dev.db`
   - Alternatively, if using **Blueprint**, Render will detect `render.yaml` automatically and configure everything in 1 click!

3. **Your Free Domain**:
   Render will instantly assign your free HTTPS domain:
   ```
   https://melody-studio.onrender.com
   ```

---

## 🐳 3. Alternative: Koyeb / Fly.io / Railway (Docker Deployment)

We have provided a production multi-stage [`Dockerfile`](./Dockerfile).

### On Koyeb (Free 512MB Instance & `*.koyeb.app` domain):
1. Sign in to [app.koyeb.com](https://app.koyeb.com).
2. Click **Create Service** → Choose **GitHub**.
3. Select your repository. Koyeb detects the `Dockerfile` automatically.
4. Set port to `4000` (or leave default).
5. Deploy — your app is live at `https://<your-app>.koyeb.app`.

---

## ⚡ 4. Architecture & Production Verification

- **Frontend + Backend on 1 Domain**: No CORS mismatch, no separate frontend proxy needed.
- **YouTube Media Streaming**: Proxied via `@distube/ytdl-core` with native search and automatic audio MIME detection (`audio/mp4` / `audio/webm`).
- **In-Browser MP3 Export**: Headless `OfflineAudioContext` mixing + LAME MP3 compilation + lossless WAV fallback.
