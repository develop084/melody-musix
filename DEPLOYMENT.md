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

## ⚡ 4. AWS EC2 Deployment with Custom Domain & GitHub Actions CI/CD

Melody Studio is ready for automated zero-downtime deployment to any AWS EC2 instance (Ubuntu 20.04/22.04/24.04, including `t2.micro` or `t3.micro`).

### Architecture Overview
- **Unified Port 4000**: Express serves both backend `/api/v1/*` endpoints and the compiled React SPA from `frontend/dist`.
- **Nginx Reverse Proxy**: Listens on port 80 & 443 with your custom domain and forwards traffic to `127.0.0.1:4000`.
- **Certbot (Let's Encrypt)**: Automatically provisions and renews SSL/TLS certificates for HTTPS.
- **PM2**: Node process manager for automatic process monitoring, zero-downtime reloads, and boot auto-start.
- **GitHub Actions**: Automatically builds, verifies, SSHs into EC2, pulls code, syncs DB, builds, and reloads PM2 on git push.

---

### Step-by-Step Setup Guide

#### 1. Configure AWS EC2 Security Group
In your AWS EC2 Console, ensure your Security Group's **Inbound Rules** permit:
- **SSH (Port 22)**: My IP (or 0.0.0.0/0 if using GitHub Actions without fixed IP runner)
- **HTTP (Port 80)**: `0.0.0.0/0` (Anywhere IPv4) & `::/0` (Anywhere IPv6)
- **HTTPS (Port 443)**: `0.0.0.0/0` (Anywhere IPv4) & `::/0` (Anywhere IPv6)

#### 2. Configure Hostinger Domain DNS (A Record for Subdomain)
In your Hostinger hPanel:
1. Log in to [Hostinger hPanel](https://hpanel.hostinger.com) and go to **Domains**.
2. Select your root domain: `creativeisland.online`.
3. In the left sidebar, click **DNS / Nameservers**.
4. In the **Manage DNS records** section, add a new **A Record**:
   - **Type**: `A`
   - **Name**: `melody` *(Hostinger automatically appends `.creativeisland.online`)*
   - **Points to**: `<Your EC2 Public / Elastic IPv4 Address>` (e.g. `54.x.x.x`)
   - **TTL**: `300` seconds (or default)
5. Click **Add Record**.
*(Note: Allocate an **Elastic IP** in AWS EC2 Console and associate it with your EC2 instance so your public IP address never changes when rebooting.)*

#### 3. Run One-Click EC2 Setup Script
SSH into your EC2 instance:
```bash
ssh -i /path/to/your-key.pem ubuntu@<YOUR_EC2_PUBLIC_IP>
```
Clone your repository and execute the setup script:
```bash
# Clone the repository
git clone <YOUR_GIT_REPO_URL> /var/www/melody-studio
cd /var/www/melody-studio

# Execute setup with your subdomain and your email (for SSL notifications)
sudo bash scripts/setup-ec2.sh -d melody.creativeisland.online -e your-email@example.com
```
*The script automatically sets up a 2GB swapfile (preventing out-of-memory errors during build on t2.micro/t3.micro), installs Node 20 LTS, PM2, Nginx, Certbot, obtains your Let's Encrypt SSL certificate, and configures the UFW firewall!*

#### 4. Configure GitHub Actions Secrets
In your GitHub repository, navigate to **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Secret Name | Value |
| :--- | :--- |
| `EC2_HOST` | Your EC2 Public IPv4 address (e.g. `54.210.xx.xx`) |
| `EC2_USER` | `ubuntu` (or `ec2-user`) |
| `EC2_SSH_KEY` | Entire contents of your `.pem` private key file (including `-----BEGIN RSA PRIVATE KEY-----`) |
| `EC2_APP_DIR` | `/var/www/melody-studio` *(optional, this is the default)* |
| `EC2_PORT` | `22` *(optional, default is 22)* |

#### 5. Push Code & Auto-Deploy!
Whenever you push to `main` (or `master`), GitHub Actions will:
1. Run `verify` job: run clean install and compile TypeScript/Vite to verify zero errors.
2. Run `deploy` job: SSH into your EC2 instance, pull changes, update Prisma database schema, build, and reload PM2 with zero downtime.

---

## ⚡ 5. Architecture & Production Verification

- **Frontend + Backend on 1 Domain**: No CORS mismatch, no separate frontend proxy needed.
- **YouTube Media Streaming**: Proxied via `@distube/ytdl-core` with native search and automatic audio MIME detection (`audio/mp4` / `audio/webm`).
- **In-Browser MP3 Export**: Headless `OfflineAudioContext` mixing + LAME MP3 compilation + lossless WAV fallback.
