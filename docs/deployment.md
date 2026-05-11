# BSS Signature — Deployment Guide (Linux)

Deploy the Next.js app on a fresh Linux server, served at `/bss-sig`.

---

## Prerequisites

- Fresh Linux machine (Ubuntu 22.04+ recommended)
- Root/sudo access
- PostgreSQL database (local or remote)
- SSL certificate (self-signed or CA-signed)
- Node.js 20+ and npm

---

## 1. Update the Server

```bash
sudo apt-get update
sudo apt-get upgrade -y
```

---

## 2. Install Node.js

```bash
# Install Node.js 20 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node -v   # v20.x.x
npm -v    # 10.x.x
```

---

## 3. Install PostgreSQL

```bash
sudo apt-get install -y postgresql postgresql-contrib

# Start and enable
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql <<EOF
CREATE USER bss_sig_user WITH PASSWORD 'bss-sig@2026';
CREATE DATABASE "bss-sig" OWNER bss_sig_user;
GRANT ALL PRIVILEGES ON DATABASE "bss-sig" TO bss_sig_user;
EOF
```

Your `DATABASE_URL` will be:

```
postgresql://bss_sig_user:bss-sig@2026@localhost:5432/bss-sig
```

---

## 4. Clone and Install the App

```bash
# Create app directory
sudo mkdir -p /var/www/bss-www-sig
cd /var/www/bss-www-sig

# Clone the repo (or copy files)
git clone <YOUR_REPO_URL> .

# Install dependencies
npm install
```

---

## 5. Configure Environment

```bash
cp .env.example .env
nano .env
```

Fill in all values:

```env
AZURE_AD_CLIENT_ID=<your-client-id>
AZURE_AD_TENANT_ID=<your-tenant-id>
AZURE_AD_CLIENT_SECRET=<your-client-secret>

AUTH_SECRET=<generate with: openssl rand -base64 32>
AUTH_URL=https://<YOUR_DOMAIN_OR_IP>:8123/bss-sig

ADMIN_EMAILS=admin@company.com

DATABASE_URL=postgresql://bsssig:your_secure_password@localhost:5432/bsssig
```

---

## 6. Initialize Database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy
```

---

## 7. Build the App

```bash
npm run build
```

This creates the production build in `.next/`.

---

## 8. Test Run

```bash
# Quick test (runs on port 3000 by default)
npm start
```

The app should be accessible at `http://localhost:3000/bss-sig`. Press `Ctrl+C` to stop.

---

## 9. Install PM2 (Process Manager)

```bash
sudo npm install -g pm2

# Start the app on port 8123
PORT=8123 pm2 start npm --name "bss-sig" -- start

# Save the process list and enable startup on boot
pm2 save
pm2 startup
# Run the command PM2 outputs (e.g., sudo env PATH=... pm2 startup systemd -u <user> --hp /home/<user>)
```

### Useful PM2 Commands

```bash
pm2 status          # Check status
pm2 logs bss-sig    # View logs
pm2 restart bss-sig # Restart app
pm2 stop bss-sig    # Stop app
pm2 delete bss-sig  # Remove from PM2
```

---

## 10. SSL + Nginx Setup (blackstone.simtechitsolutions.in)

The subdomain `blackstone.simtechitsolutions.in` and SSL have been configured by the server admin. The Nginx config file already exists at `/etc/nginx/sites-available/blackstone.simtechitsolutions.in` and is linked in `sites-enabled`. You only need to update its contents.

---

### Step 1: Open Firewall Port

```bash
sudo ufw allow 8123
sudo ufw status
```

---

### Step 2: Add the Proxy Block to the Existing Nginx Config

The SSL is already configured by the server admin. Just open the existing config and add the `location /bss-sig` block inside the existing `server` block:

```bash
sudo nano /etc/nginx/sites-available/blackstone.simtechitsolutions.in
```

Add this inside the existing `server { ... }` block (leave all SSL lines untouched):

```nginx
location /bss-sig {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

---

### Step 3: Test and Reload Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

The app will be accessible at `https://blackstone.simtechitsolutions.in:8123/bss-sig`.

---

## 11. Firewall

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 8123
sudo ufw enable
```

---

## 12. Verify Deployment

Check these URLs are accessible from a browser:

```
https://blackstone.simtechitsolutions.in:8123/bss-sig/login
https://blackstone.simtechitsolutions.in:8123/bss-sig/commands.html
https://blackstone.simtechitsolutions.in:8123/bss-sig/taskpane.html
https://blackstone.simtechitsolutions.in:8123/bss-sig/icon-80.png
```

---

## 13. Upload Manifest

Once all URLs are accessible:

1. Update `public/staging/manifest.xml` with your actual URLs
2. Go to **Microsoft 365 Admin Center** → **Integrated Apps** → **Upload custom apps**
3. Upload the manifest file
4. Assign to users

---

## Updating the App

```bash
cd /var/www/bss-www-sig

# Pull latest code
git pull

# Install any new dependencies
npm install

# Run any new migrations
npx prisma migrate deploy

# Rebuild
npm run build

# Restart
pm2 restart bss-sig
```

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `EACCES` permission error | Run with `sudo` or fix ownership: `sudo chown -R $USER /var/www/bss-www-sig` |
| Port already in use | Check: `sudo lsof -i :3000` and kill the process |
| Prisma migration fails | Check `DATABASE_URL` in `.env` and that PostgreSQL is running |
| SSL errors in browser | Expected for self-signed certs — click "Advanced" → "Proceed" |
| App not loading at `/bss-sig` | Verify `basePath: '/bss-sig'` in `next.config.ts` |
| PM2 not starting on reboot | Run `pm2 startup` and execute the printed command |
| Nginx 502 Bad Gateway | App not running — check `pm2 status` and `pm2 logs bss-sig` |
