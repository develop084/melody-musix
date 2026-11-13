#!/usr/bin/env bash
# ==============================================================================
# Melody Studio — One-Command Deployment from Local Machine to AWS EC2
# Usage: ./scripts/deploy-from-local.sh [EC2_IP] [DOMAIN] [EMAIL] [KEY_PATH]
# ==============================================================================

set -euo pipefail

# Configuration with defaults
EC2_IP="${1:-13.210.232.227}"
DOMAIN="${2:-melody.creativeisland.online}"
EMAIL="${3:-admin@creativeisland.online}"

# Find key file automatically if not provided
if [ -n "${4:-}" ]; then
    KEY_PATH="$4"
elif [ -f "$HOME/Downloads/melody-pem.pem" ]; then
    KEY_PATH="$HOME/Downloads/melody-pem.pem"
elif [ -f "$HOME/Downloads/ec2_key.pem" ]; then
    KEY_PATH="$HOME/Downloads/ec2_key.pem"
elif [ -f "$HOME/Downloads/pem key.pem" ]; then
    KEY_PATH="$HOME/Downloads/pem key.pem"
else
    KEY_PATH="$HOME/Downloads/melody-pem.pem"
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=================================================="
echo "🚀 Melody Studio — Deployment to AWS EC2"
echo "=================================================="
echo "  Target EC2 IP : ${EC2_IP}"
echo "  Target Domain : ${DOMAIN}"
echo "  SSL Email     : ${EMAIL}"
echo "  SSH Key       : ${KEY_PATH}"
echo "=================================================="

# 1. Verify Key File
if [ ! -f "$KEY_PATH" ]; then
    echo "❌ SSH private key not found at: $KEY_PATH"
    echo "   Please specify your key path as the 4th argument:"
    echo "   ./scripts/deploy-from-local.sh $EC2_IP $DOMAIN $EMAIL /path/to/key.pem"
    exit 1
fi
chmod 400 "$KEY_PATH"

# 2. Check DNS Resolution
echo "🔍 Checking DNS resolution for ${DOMAIN}..."
RESOLVED_IP=$(python3 -c "import socket; print(socket.gethostbyname('${DOMAIN}'))" 2>/dev/null || echo "")

if [ -z "$RESOLVED_IP" ]; then
    echo "⚠️  WARNING: '${DOMAIN}' does not resolve to an IP address yet!"
    echo "   Please add the DNS A Record in your Hostinger hPanel:"
    echo "   - Domain: creativeisland.online"
    echo "   - Type: A"
    echo "   - Name: melody"
    echo "   - Points to: ${EC2_IP}"
    echo "   - TTL: 300"
    echo ""
    read -rp "Do you want to proceed anyway? (y/N): " CONFIRM
    if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled. Add the Hostinger DNS record, wait 2-3 minutes, then re-run."
        exit 0
    fi
elif [ "$RESOLVED_IP" != "$EC2_IP" ]; then
    echo "⚠️  WARNING: '${DOMAIN}' currently resolves to ${RESOLVED_IP}, not ${EC2_IP}."
    echo "   Make sure your Hostinger A Record points to ${EC2_IP} before requesting SSL."
    read -rp "Proceed anyway? (y/N): " CONFIRM
    if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
        exit 0
    fi
else
    echo "✅ DNS is properly mapped: ${DOMAIN} -> ${EC2_IP}"
fi

# 3. Test SSH Connection
echo "🔌 Testing SSH connectivity to ubuntu@${EC2_IP}..."
ssh -i "$KEY_PATH" -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new ubuntu@"${EC2_IP}" "echo '✅ SSH connection successful!'" || {
    echo "❌ Could not connect via SSH to ubuntu@${EC2_IP}."
    echo "   Check that:"
    echo "   1. The EC2 instance is Running in the AWS Console."
    echo "   2. Security Group allows inbound SSH (Port 22) from your IP or 0.0.0.0/0."
    echo "   3. Your key file matches the key pair chosen when launching the instance."
    exit 1
}

# 4. Package Application Bundle
TMP_ARCHIVE="/tmp/melody-studio-deploy.tar.gz"
echo "📦 Creating application package (excluding node_modules and cache)..."
cd "$ROOT_DIR"
tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.db' \
    --exclude='*.db-journal' \
    --exclude='dist' \
    --exclude='backend/dist' \
    --exclude='frontend/dist' \
    -czf "$TMP_ARCHIVE" .

# 5. Upload to EC2
echo "📤 Uploading package to EC2..."
scp -i "$KEY_PATH" -o StrictHostKeyChecking=accept-new "$TMP_ARCHIVE" ubuntu@"${EC2_IP}":/home/ubuntu/melody-studio-deploy.tar.gz
rm -f "$TMP_ARCHIVE"

# 6. Unpack on EC2
echo "📂 Unpacking application bundle on EC2..."
ssh -i "$KEY_PATH" -o StrictHostKeyChecking=accept-new ubuntu@"${EC2_IP}" bash -c "'
    mkdir -p /home/ubuntu/melody-studio
    tar -xzf /home/ubuntu/melody-studio-deploy.tar.gz -C /home/ubuntu/melody-studio
    rm -f /home/ubuntu/melody-studio-deploy.tar.gz
'"

# 7. Execute Server Setup Script
echo "⚙️  Executing automated server setup on EC2 (this may take 2-4 minutes)..."
ssh -t -i "$KEY_PATH" -o StrictHostKeyChecking=accept-new ubuntu@"${EC2_IP}" \
    "sudo bash /home/ubuntu/melody-studio/scripts/setup-ec2.sh -d '${DOMAIN}' -e '${EMAIL}'"

# 8. Final Health Verification
echo ""
echo "🩺 Verifying application health..."
sleep 3
python3 -c "
import urllib.request
try:
    res = urllib.request.urlopen('https://${DOMAIN}/api/v1/health', timeout=10)
    print('✅ Health check passed with HTTP status:', res.status)
except Exception as e:
    print('⚠️  Notice: https://${DOMAIN}/api/v1/health returned:', e)
    print('   If DNS just updated, wait 1-2 minutes for global propagation.')
" || true

echo ""
echo "=================================================="
echo "🎉 Deployment Process Complete!"
echo "   Visit: https://${DOMAIN}"
echo "=================================================="
