#!/usr/bin/env bash
set -e

echo "======================================================"
echo "  🚀 Starting Viewora Production Automated Deployment"
echo "======================================================"

# 1. Setup 2GB Swap Memory (Crucial for 512MB RAM instances)
if [ ! -f /swapfile ]; then
    echo "⚙️ [1/6] Creating 2GB Swap Memory (Prevents memory crash during build)..."
    sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "✅ Swap configured successfully."
else
    echo "⚙️ [1/6] Swap memory already active."
fi

# 2. Update System & Install Core Packages
echo "⚙️ [2/6] Installing Node.js 20 LTS, Nginx, and Git..."
sudo apt-get update -y
sudo apt-get install -y curl git nginx

# Install Node.js 20 LTS if not present
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install PM2 process manager globally
sudo npm install -g pm2

# 3. Setup Project Directory
echo "⚙️ [3/6] Fetching latest codebase from GitHub..."
sudo mkdir -p /var/www/viewora
sudo chown -R $USER:$USER /var/www/viewora

if [ -d "/var/www/viewora/.git" ]; then
    cd /var/www/viewora
    git pull origin main
else
    git clone https://github.com/Haider899/viewora.git /var/www/viewora
    cd /var/www/viewora
fi

# 4. Backend Setup & Configuration
echo "⚙️ [4/6] Setting up Backend API Engine..."
cd /var/www/viewora/server

if [ ! -f .env ]; then
    echo "Generating production .env configuration..."
    cat <<EOT > .env
NODE_ENV=production
PORT=5050
API_PREFIX=/api/v1
CORS_ORIGIN=*
DATABASE_URL="file:./dev.db"
JWT_ACCESS_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
JWT_ACCESS_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
ENABLE_REWARDS=true
ENABLE_REFERRAL_COMMISSIONS=true
ENABLE_CRYPTO_PAYMENTS=true
MAINTENANCE_MODE=false
DEFAULT_COMMISSION_PERCENT=5.0
DEFAULT_USD_TO_PKR_RATE=280.00
ADMIN_EMAIL=admin@innovative.online
ADMIN_PASSWORD=Super@2026
EOT
fi

npm install
npx prisma db push
npx tsx src/scripts/create-super-admin.ts || true
npm run build

# Start or restart backend with PM2
pm2 stop viewora-api 2>/dev/null || true
pm2 delete viewora-api 2>/dev/null || true
pm2 start dist/index.js --name "viewora-api"
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER || true

# 5. Frontend Client Build
echo "⚙️ [5/6] Building Frontend Client for production..."
cd /var/www/viewora/client
npm install
npm run build

# 6. Configure Nginx Reverse Proxy
echo "⚙️ [6/6] Configuring Nginx reverse proxy..."
sudo tee /etc/nginx/sites-available/viewora > /dev/null << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root /var/www/viewora/client/dist;
    index index.html;

    client_max_body_size 25M;

    # Frontend Single Page App routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5050/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/viewora /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

PUBLIC_IP=$(curl -s http://checkip.amazonaws.com || curl -s ifconfig.me || echo "your-server-ip")

echo "======================================================"
echo "  🎉 Viewora Deployment Completed Successfully!"
echo "  🌐 Access Platform: http://$PUBLIC_IP"
echo "  🔐 Super Admin Email: admin@innovative.online"
echo "  🔑 Super Admin Pass:  Super@2026"
echo "======================================================"
