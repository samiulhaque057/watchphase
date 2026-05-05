# Watch Phase Deployment Guide (DigitalOcean Droplet)

This guide deploys **everything on one droplet**:

- Next.js app (production build)
- PostgreSQL database
- Persistent uploads/media
- Nginx reverse proxy + HTTPS (Let's Encrypt)
- Systemd service
- Update workflow

---

## 0) Requirements

- Domain name pointed to your droplet IP (`A` record for `@` and `www`)
- Ubuntu 22.04/24.04 droplet
- SSH access with sudo
- Your project repository URL

Recommended droplet size: **2 GB RAM** minimum.

---

## 1) Server Bootstrap

SSH into server:

```bash
ssh root@YOUR_DROPLET_IP
```

Install base packages:

```bash
apt update && apt upgrade -y
apt install -y git curl ufw nginx certbot python3-certbot-nginx ca-certificates gnupg lsb-release docker.io docker-compose-plugin
```

Enable firewall:

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
```

Install Node 20 LTS:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v
npm -v
```

Create deploy user:

```bash
adduser deploy
usermod -aG sudo deploy
usermod -aG docker deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```

Reconnect as deploy:

```bash
ssh deploy@YOUR_DROPLET_IP
```

---

## 2) Clone Project

```bash
mkdir -p ~/apps && cd ~/apps
git clone https://github.com/samiulhaque057/watchphase watchphase
cd watchphase
npm install
```

---

## 3) Configure Persistent Upload Storage

The app stores uploads under `public/uploads`. To keep files after deploys, store them outside repo and symlink:

```bash
sudo mkdir -p /var/lib/watchphase/uploads/products
sudo chown -R deploy:deploy /var/lib/watchphase
```

In project root:

```bash
rm -rf public/uploads
ln -s /var/lib/watchphase/uploads public/uploads
```

---

## 4) Production Environment Variables

Create `.env` in project root:

```env
DATABASE_URL="postgresql://watchphase:CHANGE_ME_DB_PASSWORD@127.0.0.1:5432/watchphase?schema=public"

ADMIN_ROUTE_KEY="CHANGE_ME_LONG_RANDOM_ROUTE_KEY"
ADMIN_PASSWORD="CHANGE_ME_STRONG_ADMIN_PASSWORD"
ADMIN_SESSION_SECRET="CHANGE_ME_LONG_RANDOM_SECRET_MIN_32_CHARS"

NEXT_PUBLIC_SITE_URL="https://watchphase.com"
SITEMAP_LASTMOD="2026-05-04T00:00:00.000Z"

# Optional
# ADMIN_API_TOKEN="CHANGE_ME_OPTIONAL_API_TOKEN"
# NEXT_PUBLIC_MEDIA_HOST="media.watchphase.com"
```

> Important: Never use development secrets in production.

---

## 5) PostgreSQL (Docker)

Create `docker-compose.prod.yml` in project root:

```yaml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: watchphase
      POSTGRES_PASSWORD: CHANGE_ME_DB_PASSWORD
      POSTGRES_DB: watchphase
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - watchh_pgdata:/var/lib/postgresql/data

volumes:
  watchh_pgdata:
```

Start DB:

```bash
docker-compose -f docker-compose.prod.yml up -d
docker ps
```

---

## 6) Initialize Database + Build App

From project root:

```bash
npm run db:generate
npm run db:push
npm run db:seed
npm run build
```

---

## 7) Run App as System Service

Create `/etc/systemd/system/watchphase.service`:

```ini
[Unit]
Description=Watch Phase Next.js App
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=deploy
WorkingDirectory=/home/deploy/apps/watchphase
Environment=NODE_ENV=production
EnvironmentFile=/home/deploy/apps/watchphase/.env
ExecStart=/usr/bin/npm run start -- -p 3000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable watchphase
sudo systemctl start watchphase
sudo systemctl status watchphase
```

---

## 8) Nginx Reverse Proxy

Create `/etc/nginx/sites-available/watchphase`:

```nginx
server {
    server_name watchphase.com www.watchphase.com;

    client_max_body_size 25M;

    location /uploads/ {
        alias /var/lib/watchphase/uploads/;
        access_log off;
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/watchphase /etc/nginx/sites-enabled/watchphase
sudo nginx -t
sudo systemctl reload nginx
```

---

## 9) Enable HTTPS

Before issuing a certificate, confirm DNS is pointing to this droplet:

```bash
dig +short watchphase.com
dig +short www.watchphase.com
```

Both should return your droplet public IP.

Issue SSL certificate with Let's Encrypt:

```bash
sudo certbot --nginx -d watchphase.com -d www.watchphase.com
```

When prompted:

- choose redirect to HTTPS (`2: Redirect`) so all `http://` traffic moves to `https://`
- provide an email for expiry notices

Verify certificate is active:

```bash
sudo certbot certificates
curl -I https://watchphase.com
```

Test auto-renewal (recommended):

```bash
sudo certbot renew --dry-run
systemctl list-timers | rg certbot
```

Optional hardening:

- Enable HSTS only after HTTPS works perfectly on both root and `www`.
- Keep a valid admin email in certbot for expiry reminders.
- Re-run certbot if you later add a new domain/subdomain.

### SSL troubleshooting

If cert issuance fails:

1. Ensure `watchphase.com` and `www.watchphase.com` both point to your droplet IP.
2. Ensure ports `80` and `443` are open in firewall/cloud rules.
3. Ensure Nginx config validates:
   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   ```
4. Retry certbot:
   ```bash
   sudo certbot --nginx -d watchphase.com -d www.watchphase.com
   ```

---

## 10) Update / Redeploy Workflow

When new code is pushed:

```bash
cd ~/apps/watchphase
git pull origin main
npm install
npm run db:generate
npm run db:push
npm run build
sudo systemctl restart watchphase
sudo systemctl status watchphase --no-pager
```

If seed data changed:

```bash
npm run db:seed
```

---

## 11) Post-Deploy Verification

Check these URLs:

- `https://watchphase.com`
- `https://watchphase.com/robots.txt`
- `https://watchphase.com/sitemap.xml`
- `https://watchphase.com/admin`

Functional checks:

- Upload image from admin and confirm it appears under `/uploads/...`
- Place test order from storefront
- Confirm order appears in admin orders list

Logs:

```bash
journalctl -u watchphase -f
docker logs $(docker ps --filter "ancestor=postgres:16-alpine" -q | head -n1) --tail 200
```

---

## 12) Security Hardening Checklist

- Use strong random values for:
  - `ADMIN_PASSWORD`
  - `ADMIN_SESSION_SECRET`
  - `ADMIN_ROUTE_KEY`
  - DB password
- Keep DB bound to localhost (`127.0.0.1:5432`)
- Keep firewall enabled
- Disable root SSH login after setup (optional but recommended)
- Add fail2ban (optional)

---

## 13) Notes for This Project

- This project currently uses Prisma `db push` workflow in scripts.
- Uploads are local filesystem-backed by default (`public/uploads`).
- `proxy.ts` is used for admin API auth in current Next.js convention.

