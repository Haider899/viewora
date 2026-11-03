# VistaraX Deployment & Operations Manual

## 1. Prerequisites

- Node.js >= 20.x or 24.x
- npm >= 10.x
- PostgreSQL database (or local SQLite during zero-dependency evaluation)
- VPS / Cloud Server (Ubuntu 22.04 LTS or Debian 12 recommended)
- Reverse Proxy: Nginx or Caddy with SSL (Let's Encrypt)
- Process Manager: PM2 or Docker

---

## 2. Local Development Setup

1. **Backend**:
   ```bash
   cd server
   npm install
   npx prisma db push
   npx tsx src/prisma/seed.ts
   npm run dev
   ```
2. **Frontend**:
   ```bash
   cd client
   npm install
   npm run dev
   ```

---

## 3. Production Build & VPS Deployment

1. **Build Frontend**:
   ```bash
   cd client
   npm run build
   # Outputs optimized static files to client/dist
   ```

2. **Configure Production Database (PostgreSQL)**:
   In `server/.env`:
   ```env
   NODE_ENV=production
   PORT=5000
   DATABASE_URL="postgresql://vistara_user:secure_password@localhost:5432/vistarax?schema=public"
   ```
   Run Prisma migration:
   ```bash
   npx prisma migrate deploy
   ```

3. **Run Backend with PM2**:
   ```bash
   cd server
   npm run build
   pm2 start dist/index.js --name "vistarax-api"
   pm2 save
   ```

4. **Nginx Reverse Proxy Configuration**:
   ```nginx
   server {
       listen 80;
       server_name vistarax.yourdomain.com;

       # Serve static client bundle
       location / {
           root /var/www/vistarax/client/dist;
           try_files $uri $uri/ /index.html;
       }

       # Proxy API requests to backend
       location /api/ {
           proxy_pass http://127.0.0.1:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
