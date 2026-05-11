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
CREATE USER bsssig WITH PASSWORD 'your_secure_password';
CREATE DATABASE bsssig OWNER bsssig;
GRANT ALL PRIVILEGES ON DATABASE bsssig TO bsssig;
EOF
```

Your `DATABASE_URL` will be:

```
postgresql://bsssig:your_secure_password@localhost:5432/bsssig
```

---

## 4. Clone and Install the App

```bash
# Create app directory
sudo mkdir -p /opt/bss-sig
cd /opt/bss-sig

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

## 10. SSL Setup with Nginx (Reverse Proxy)

### Install Nginx

```bash
sudo apt-get install -y nginx
```

### Create Self-Signed SSL Certificate (Staging)

For staging/internal use, a self-signed certificate is sufficient. This enables HTTPS without a domain name.

```bash
sudo mkdir -p /etc/nginx/ssl

# Generate a self-signed cert valid for 365 days
# Replace the IP with your staging server IP
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/bss-sig.key \
  -out /etc/nginx/ssl/bss-sig.crt \
  -subj "/C=IN/ST=State/L=City/O=Blackstone Shipping/CN=103.252.116.34" \
  -addext "subjectAltName=IP:103.252.116.34"
```

> The `-addext "subjectAltName=IP:..."` is important — modern browsers reject certs without a SAN matching the address.

#### Verify the Certificate

```bash
openssl x509 -in /etc/nginx/ssl/bss-sig.crt -text -noout | grep -A1 "Subject Alternative"
```

#### Trust the Self-Signed Certificate

Browsers and Outlook will show security warnings with self-signed certs. To suppress them:

**On the server (for curl/wget testing):**

```bash
sudo cp /etc/nginx/ssl/bss-sig.crt /usr/local/share/ca-certificates/bss-sig.crt
sudo update-ca-certificates
```

**On Windows (for browser/Outlook testing):**

1. Download the `.crt` file from the server: `scp user@103.252.116.34:/etc/nginx/ssl/bss-sig.crt .`
2. Double-click the `.crt` file → **Install Certificate**
3. Choose **Local Machine** → **Place all certificates in the following store** → **Trusted Root Certification Authorities**
4. Click **Finish** and restart the browser/Outlook

**On Mac:**

1. Download the `.crt` file
2. Double-click → opens Keychain Access
3. Find the cert → **Get Info** → **Trust** → set **Always Trust**

> **From Microsoft's official docs (Server requirements section):**
>
> *"Self-signed certificates can be used for development and testing, so long as the certificate is trusted on the local machine."*
>
> *"If you plan to run your add-in in Office on the web or publish your add-in to Microsoft Marketplace, it must be SSL-secured."*
>
> **Source:** https://learn.microsoft.com/en-us/office/dev/add-ins/concepts/requirements-for-running-office-add-ins
>
> **Our recommendation:** For production/org-wide deployment, use a CA-signed certificate (e.g., Let's Encrypt) with a proper domain name.

#### Production: Use Let's Encrypt (requires domain name)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/bss-sig
```

Paste:

```nginx
server {
    listen 8123 ssl;
    server_name _;

    ssl_certificate /etc/nginx/ssl/bss-sig.crt;
    ssl_certificate_key /etc/nginx/ssl/bss-sig.key;

    location /bss-sig {
        proxy_pass http://127.0.0.1:3000/bss-sig;
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
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/bss-sig /etc/nginx/sites-enabled/
sudo nginx -t          # Test config
sudo systemctl restart nginx
sudo systemctl enable nginx
```

Now the app is accessible at `https://<IP>:8123/bss-sig`.

> **Note:** If using PM2 with Nginx, set PM2 to run on port 3000 (internal) and Nginx handles SSL on port 8123 (external).

Update PM2 accordingly:

```bash
pm2 delete bss-sig
PORT=3000 pm2 start npm --name "bss-sig" -- start
pm2 save
```

---

## 11. Firewall

```bash
# Allow SSH and app port
sudo ufw allow 22
sudo ufw allow 8123
sudo ufw enable
```

---

## 12. Verify Deployment

Check these URLs are accessible from a browser:

```
https://<YOUR_IP>:8123/bss-sig/login
https://<YOUR_IP>:8123/bss-sig/commands.html
https://<YOUR_IP>:8123/bss-sig/taskpane.html
https://<YOUR_IP>:8123/bss-sig/icon-80.png
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
cd /opt/bss-sig

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
| `EACCES` permission error | Run with `sudo` or fix ownership: `sudo chown -R $USER /opt/bss-sig` |
| Port already in use | Check: `sudo lsof -i :3000` and kill the process |
| Prisma migration fails | Check `DATABASE_URL` in `.env` and that PostgreSQL is running |
| SSL errors in browser | Expected for self-signed certs — click "Advanced" → "Proceed" |
| App not loading at `/bss-sig` | Verify `basePath: '/bss-sig'` in `next.config.ts` |
| PM2 not starting on reboot | Run `pm2 startup` and execute the printed command |
| Nginx 502 Bad Gateway | App not running — check `pm2 status` and `pm2 logs bss-sig` |
