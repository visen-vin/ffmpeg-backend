# Deploying ffmpeg-backend on Hostinger

This guide covers deploying the Node.js + FFmpeg backend on Hostinger. Because this app depends on FFmpeg and a background worker, a **Hostinger VPS** (Ubuntu) is strongly recommended. Shared hosting (hPanel Node.js manager) may not support FFmpeg or multiple Node processes reliably.

## Overview
- API server: `node src/server.js` (port `3000`)
- Worker: `node src/worker.js` (processes queued jobs)
- Storage path: `storage/sessions/<sessionId>` (relative to app working directory)
- Reverse proxy: Nginx pointing your domain → `http://127.0.0.1:3000`

---

## Option A — VPS (Recommended)

### 1) Prepare the server
1. Provision a Hostinger VPS (Ubuntu 22.04 or later).
2. Point your domain DNS to the VPS IP.
3. SSH into the VPS:
```bash
ssh <user>@<your-vps-ip>
```

### 2) Install dependencies
```bash
# Update packages
sudo apt update -y && sudo apt upgrade -y

# Install FFmpeg
sudo apt install -y ffmpeg
ffmpeg -version && ffprobe -version

# Install Node.js (LTS) via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"
nvm install --lts
node -v && npm -v

# Optional: Git
sudo apt install -y git
```

### 3) Upload or clone the project
- Clone (if in a Git repo):
```bash
git clone <your-repo-url> ffmpeg-backend
cd ffmpeg-backend
```
- Or upload a zip via SFTP, then:
```bash
unzip ffmpeg-backend.zip -d ffmpeg-backend
cd ffmpeg-backend
```

### 4) Install Node packages
```bash
npm ci || npm install
```

### 5) Ensure storage directories
```bash
mkdir -p storage/sessions
# Optional permissions (if running under a different user):
chmod -R 755 storage
```

### 6) Run with PM2 (process manager)
```bash
sudo npm i -g pm2

# Start API server and worker from the project root
pm2 start src/server.js --name ffmpeg-api --cwd $(pwd)
pm2 start src/worker.js --name ffmpeg-worker --cwd $(pwd)

# Persist across reboots
pm2 save
pm2 startup  # follow instructions shown to enable startup

# Check status/logs
pm2 status
pm2 logs ffmpeg-api --lines 50
pm2 logs ffmpeg-worker --lines 50
```

### 7) Configure Nginx reverse proxy
```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/ffmpeg-backend
```
Paste:
```nginx
server {
    listen 80;
    server_name example.com www.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Enable and reload:
```bash
sudo ln -s /etc/nginx/sites-available/ffmpeg-backend /etc/nginx/sites-enabled/ffmpeg-backend
sudo nginx -t && sudo systemctl reload nginx
```

### 8) HTTPS (Let’s Encrypt)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d example.com -d www.example.com
```

### 9) Health checks
```bash
# Create session
curl -X POST http://example.com/api/v1/sessions/create

# Upload file (adjust path)
curl -F "file=@/path/to/image.png" http://example.com/api/v1/sessions/<SID>/upload

# Convert image to video
curl -X POST http://example.com/api/v1/sessions/image-to-video \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"<SID>","images":["image.png"],"duration":3}'

# Check job status
curl http://example.com/api/v1/jobs/<jobId>
```

### 10) Maintenance
```bash
# Pull new code and restart
pm2 reload ffmpeg-api
pm2 reload ffmpeg-worker

# Or restart both
pm2 restart ffmpeg-api ffmpeg-worker

# Update Node/FFmpeg periodically
nvm install --lts && nvm use --lts
sudo apt update && sudo apt upgrade -y
```

---

## Option B — Shared Hosting (hPanel Node.js Manager)
- The app needs FFmpeg and a **background worker**. Shared hosting often lacks FFmpeg, and the Node.js manager typically runs a **single** Node app. That makes the worker difficult to run.
- If you must use shared hosting:
  - Verify FFmpeg availability: ask Hostinger support. If it’s unavailable, jobs will fail.
  - Use the Node.js manager to start `src/server.js` as the entry script.
  - Running `src/worker.js` concurrently is usually not supported. Without the worker, queued jobs won’t process.
- For reliable operation, prefer **VPS**.

---

## Tips & Gotchas
- Always run PM2 apps with `--cwd` from the project root; storage directory is resolved relative to the current working directory.
- Ensure enough disk space in `storage/` for generated videos.
- Open only required ports (80/443). Do not expose port 3000 publicly; use Nginx.
- If jobs stay queued: confirm the worker is running (`pm2 status`), and check `/storage/sessions/<SID>/queue`.
- If overlay text doesn’t show: ensure FFmpeg version ≥ 6, and verify PNG overlay generation succeeds in `/storage/sessions/<SID>/temp/`.
- Logs: PM2 keeps logs; use `pm2 logs --lines 100` to inspect.

---

## Quick Start (copy/paste)
```bash
# On VPS
sudo apt update -y && sudo apt install -y ffmpeg nginx
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"
nvm install --lts

# Upload/clone, then:
cd ffmpeg-backend
npm ci
mkdir -p storage/sessions
sudo npm i -g pm2
pm2 start src/server.js --name ffmpeg-api --cwd $(pwd)
pm2 start src/worker.js --name ffmpeg-worker --cwd $(pwd)
pm2 save && pm2 startup

# Nginx reverse proxy (replace domain)
# create /etc/nginx/sites-available/ffmpeg-backend as above, enable, reload
```

If you want me to generate an `ecosystem.config.js` for PM2 or an Nginx config for your actual domain, share the domain and server details and I’ll tailor it.