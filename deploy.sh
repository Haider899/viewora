#!/bin/bash
# ==============================================================================
# Viewora — Ubuntu 24.04 LTS Production Automated Deployment Script
# ==============================================================================
# Run this on your Ubuntu server as root:
#   bash deploy.sh
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${PURPLE}==================================================================${NC}"
echo -e "${PURPLE}   🚀 Starting Viewora Automated Deployment on Ubuntu 24.04 LTS   ${NC}"
echo -e "${PURPLE}==================================================================${NC}"

# 1. Check Root Privileges
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Please run this script as root.${NC}"
  exit 1
fi

APP_DIR="/var/www/viewora"
REPO_URL="https://github.com/Haider899/viewora.git"
SERVER_IP=$(hostname -I | awk '{print $1}')

# 2. System Packages & Dependencies
echo -e "\n${BLUE}[1/8] Updating system packages & installing core tools...${NC}"
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get install -y curl git ufw nginx build-essential openssl certbot python3-certbot-nginx

# 3. Node.js 22 LTS Installation
if ! command -v node &> /dev/null || [[ "$(node -v)" != v22* && "$(node -v)" != v20* ]]; then
  echo -e "\n${BLUE}[2/8] Installing Node.js 22 LTS...${NC}"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs
fi
echo -e "${GREEN}✓ Node.js version: $(node -v)${NC}"
echo -e "${GREEN}✓ npm version: $(npm -v)${NC}"

# 4. Install PM2 Globally
if ! command -v pm2 &> /dev/null; then
  echo -e "\n${BLUE}[3/8] Installing PM2 process manager...${NC}"
  npm install -g pm2
fi

# 5. Clone or Pull Latest Repository
echo -e "\n${BLUE}[4/8] Fetching project code from GitHub...${NC}"
if [ -d "$APP_DIR/.git" ]; then
  echo -e "${YELLOW}Repository already exists at $APP_DIR. Pulling latest main branch...${NC}"
  cd "$APP_DIR"
  git fetch origin
  git reset --hard origin/main
else
  mkdir -p /var/www
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# 6. Configure & Build Backend Server
echo -e "\n${BLUE}[5/8] Setting up backend server...${NC}"
cd "$APP_DIR/server"

if [ ! -f ".env" ]; then
  echo -e "${YELLOW}Creating server/.env from template...${NC}"
  cp .env.example .env

  # Generate random strong JWT secrets
  JWT_ACCESS=$(openssl rand -hex 32)
  JWT_REFRESH=$(openssl rand -hex 32)
  sed -i "s|JWT_ACCESS_SECRET=.*|JWT_ACCESS_SECRET=$JWT_ACCESS|g" .env
  sed -i "s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$JWT_REFRESH|g" .env
  sed -i "s|NODE_ENV=.*|NODE_ENV=production|g" .env
  sed -i "s|PORT=.*|PORT=5050|g" .env
fi

npm install --production=false
npx prisma generate
npx prisma db push --accept-data-loss
npx tsx src/prisma/seed.ts || true
npm run build

# Start or reload server with PM2
pm2 delete viewora-api &> /dev/null || true
pm2 start dist/index.js --name "viewora-api"
pm2 save
pm2 startup systemd -u root --hp /root &> /dev/null || true

# 7. Configure & Build Frontend Client
echo -e "\n${BLUE}[6/8] Building client frontend bundle...${NC}"
cd "$APP_DIR/client"
if [ ! -f ".env" ]; then
  cp .env.example .env
fi

npm install
npm run build

# 8. Configure Nginx Reverse Proxy
echo -e "\n${BLUE}[7/8] Configuring Nginx web server & reverse proxy...${NC}"
NGINX_CONF="/etc/nginx/sites-available/viewora"

cat > "$NGINX_CONF" << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _ 72.62.76.176 viewora.*;

    client_max_body_size 50M;

    # Static Frontend
    root /var/www/viewora/client/dist;
    index index.html;

    # Frontend routes fallback (Single Page App)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
EOF

# Enable site and remove default
rm -f /etc/nginx/sites-enabled/default
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/viewora

nginx -t
systemctl restart nginx

# 9. Configure UFW Firewall
echo -e "\n${BLUE}[8/8] Enabling firewall (UFW)...${NC}"
ufw allow OpenSSH &> /dev/null || true
ufw allow 'Nginx Full' &> /dev/null || true
ufw --force enable &> /dev/null || true

# 10. Done!
echo -e "\n${GREEN}==================================================================${NC}"
echo -e "${GREEN}   🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!                          ${NC}"
echo -e "${GREEN}==================================================================${NC}"
echo -e "Web App URL:       ${YELLOW}http://${SERVER_IP}${NC}"
echo -e "Backend API Base:  ${YELLOW}http://${SERVER_IP}/api/v1${NC}"
echo -e ""
echo -e "${BLUE}Default Logins:${NC}"
echo -e "  • Super Admin:   ${GREEN}admin@vistarax.com${NC} / ${GREEN}VistaraSecure2026!${NC}"
echo -e "  • Finance Admin: ${GREEN}finance@vistarax.com${NC} / ${GREEN}VistaraSecure2026!${NC}"
echo -e "  • Active User:   ${GREEN}user@vistarax.com${NC} / ${GREEN}VistaraSecure2026!${NC}"
echo -e ""
echo -e "${PURPLE}To add free SSL HTTPS certificate later when your domain is pointed:${NC}"
echo -e "  ${YELLOW}certbot --nginx -d yourdomain.com${NC}"
echo -e "${GREEN}==================================================================${NC}"
