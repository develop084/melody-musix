#!/usr/bin/env bash
# ==============================================================================
# Melody Studio — One-Click EC2 Ubuntu Setup Script
# Configures: Swap memory, Node.js 20 LTS, PM2, Git, Nginx, Certbot SSL, UFW
# ==============================================================================

set -euo pipefail

DOMAIN=""
EMAIL=""
APP_DIR="/var/www/melody-studio"
REPO_URL=""

# Parse flags
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -d|--domain) DOMAIN="$2"; shift ;;
        -e|--email) EMAIL="$2"; shift ;;
        -r|--repo) REPO_URL="$2"; shift ;;
        -p|--path) APP_DIR="$2"; shift ;;
        -h|--help)
            echo "Usage: sudo bash setup-ec2.sh [OPTIONS]"
            echo "Options:"
            echo "  -d, --domain   Your custom domain (e.g. example.com)"
            echo "  -e, --email    Your email address for Let's Encrypt SSL certificates"
            echo "  -r, --repo     Your Git repository URL (HTTPS or SSH)"
            echo "  -p, --path     Target installation path (default: /var/www/melody-studio)"
            exit 0
            ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run this script with sudo or as root: sudo bash $0"
    exit 1
fi

REAL_USER="${SUDO_USER:-$(whoami)}"
USER_HOME=$(eval echo "~$REAL_USER")

echo "=================================================="
echo "🚀 Starting EC2 Setup for Melody Studio"
echo "=================================================="

# Prompt for domain if not provided
if [ -z "$DOMAIN" ]; then
    read -rp "Enter your custom domain (e.g. app.mydomain.com): " DOMAIN
fi

if [ -z "$EMAIL" ]; then
    read -rp "Enter your email for SSL alerts (e.g. admin@$DOMAIN): " EMAIL
fi

if [ -z "$REPO_URL" ]; then
    read -rp "Enter your Git repository clone URL (or leave blank if code already copied): " REPO_URL
fi

# 1. Setup Swap Space (Essential for t2/t3.micro 1GB instances to prevent OOM during builds)
echo "📦 Step 1/7: Checking Swap space..."
if [ "$(swapon --show | wc -l)" -le 1 ]; then
    echo "Creating 2GB swap file to prevent out-of-memory errors..."
    fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    if ! grep -q "/swapfile" /etc/fstab; then
        echo "/swapfile none swap sw 0 0" >> /etc/fstab
    fi
    echo "✅ 2GB Swap activated."
else
    echo "✅ Swap space is already configured."
fi

# 2. System update and essential tools
echo "📦 Step 2/7: Installing system packages (Nginx, Certbot, Git, Curl, Build tools, FFmpeg)..."
apt-get update -y
apt-get install -y curl git ufw nginx certbot python3-certbot-nginx build-essential ffmpeg

# Install yt-dlp standalone binary for rock-solid YouTube audio streaming on cloud IPs
if ! command -v yt-dlp >/dev/null 2>&1; then
    echo "Installing latest yt-dlp binary..."
    curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
    chmod a+rx /usr/local/bin/yt-dlp
fi

# 3. Install Node.js 20 LTS & PM2
echo "📦 Step 3/7: Installing Node.js 20 LTS and PM2..."
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 20 ]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
npm install -g pm2

# 4. Setup Application Directory
echo "📦 Step 4/7: Setting up application directory at $APP_DIR..."
mkdir -p "$APP_DIR"
chown -R "$REAL_USER":"$REAL_USER" "$APP_DIR"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ -n "$REPO_URL" ] && [ ! -d "$APP_DIR/.git" ]; then
    echo "Cloning repository..."
    sudo -u "$REAL_USER" git clone "$REPO_URL" "$APP_DIR"
elif [ ! -f "$APP_DIR/package.json" ] && [ -f "$SCRIPT_DIR/package.json" ]; then
    echo "Syncing application files from $SCRIPT_DIR to $APP_DIR..."
    cp -a "$SCRIPT_DIR/." "$APP_DIR/"
    chown -R "$REAL_USER":"$REAL_USER" "$APP_DIR"
fi

cd "$APP_DIR"

# Create production .env if not exists
if [ ! -f "backend/.env" ]; then
    echo "Creating default backend/.env..."
    mkdir -p backend
    JWT_ACCESS=$(openssl rand -hex 32)
    JWT_REFRESH=$(openssl rand -hex 32)
    cat <<EOF > backend/.env
PORT=4000
NODE_ENV=production
DATABASE_URL="file:./dev.db"
JWT_ACCESS_SECRET="${JWT_ACCESS}"
JWT_REFRESH_SECRET="${JWT_REFRESH}"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
CORS_ORIGIN="https://${DOMAIN}"
EOF
    chown "$REAL_USER":"$REAL_USER" backend/.env
fi

# 5. Build and launch with PM2
echo "📦 Step 5/7: Installing dependencies, building, and starting application..."
if [ -f "package.json" ]; then
    sudo -u "$REAL_USER" npm ci || sudo -u "$REAL_USER" npm install
    sudo -u "$REAL_USER" npx prisma generate --schema=backend/prisma/schema.prisma
    sudo -u "$REAL_USER" npm run db:push
    sudo -u "$REAL_USER" npm run build

    # Start with PM2 under the real user
    sudo -u "$REAL_USER" pm2 start ecosystem.config.cjs --env production || sudo -u "$REAL_USER" pm2 reload ecosystem.config.cjs
    sudo -u "$REAL_USER" pm2 save

    # Ensure PM2 starts on server reboot
    env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u "$REAL_USER" --hp "$USER_HOME" || true
fi

# Check if domain is an apex domain (e.g. example.com) or subdomain (e.g. melody.creativeisland.online)
DOT_COUNT=$(awk -F. '{print NF-1}' <<< "$DOMAIN")
if [ "$DOT_COUNT" -le 1 ]; then
    SERVER_NAMES="${DOMAIN} www.${DOMAIN}"
    CERT_DOMAINS="-d ${DOMAIN} -d www.${DOMAIN}"
else
    SERVER_NAMES="${DOMAIN}"
    CERT_DOMAINS="-d ${DOMAIN}"
fi

# 6. Configure Nginx Reverse Proxy
echo "📦 Step 6/7: Configuring Nginx reverse proxy for ${DOMAIN}..."
cat <<EOF > /etc/nginx/sites-available/melody-studio
server {
    listen 80;
    listen [::]:80;
    server_name ${SERVER_NAMES};

    client_max_body_size 50M;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/x-javascript application/json application/xml image/svg+xml;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;

        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';

        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        proxy_buffering off;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
EOF

ln -sf /etc/nginx/sites-available/melody-studio /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# 7. Setup SSL Certificate (Certbot) & Firewall
echo "📦 Step 7/7: Setting up SSL certificate with Let's Encrypt and configuring UFW..."

# Configure UFW
ufw allow OpenSSH
ufw allow 'Nginx Full'
echo "y" | ufw enable || true

if [ -n "$DOMAIN" ] && [ -n "$EMAIL" ]; then
    echo "Requesting SSL certificate for $DOMAIN ($CERT_DOMAINS)..."
    certbot --nginx ${CERT_DOMAINS} --non-interactive --agree-tos -m "$EMAIL" --redirect || {
        echo "⚠️  Certbot could not obtain a certificate right now."
        echo "   Make sure your domain DNS A Record points to this EC2 public IP, then rerun:"
        echo "   sudo certbot --nginx ${CERT_DOMAINS} -m $EMAIL --agree-tos --redirect"
    }
fi

echo ""
echo "=================================================="
echo "🎉 EC2 Server Setup Completed!"
echo "=================================================="
echo "Application URL: https://${DOMAIN}"
echo "API Health Check: https://${DOMAIN}/api/v1/health"
echo "Local Port: 4000 (proxied via Nginx)"
echo "Directory: $APP_DIR"
echo ""
echo "GitHub Actions Secrets to configure in your GitHub repo:"
echo "--------------------------------------------------------"
echo "  EC2_HOST     : $(curl -s ifconfig.me || curl -s icanhazip.com || echo '<EC2_PUBLIC_IP>')"
echo "  EC2_USER     : ${REAL_USER}"
echo "  EC2_SSH_KEY  : <Private SSH Key corresponding to your EC2 keypair (.pem)>"
echo "  EC2_APP_DIR  : ${APP_DIR} (optional, default: /var/www/melody-studio)"
echo "=================================================="
