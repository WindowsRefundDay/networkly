# Linux Home Server Guide (Ubuntu 22.04/24.04)

This guide is for a **production home server** running Ubuntu Server. It covers:

- The Networkly web app (Next.js + Bun)
- The `ec-scraper` service
- SearXNG via Docker for web discovery
- LAN-only and Domain + HTTPS options (Minecraft-style domain is OK)

## 1) Prerequisites

### OS + user

- Ubuntu Server 22.04 or 24.04
- A non-root user with sudo access
- SSH enabled

### Install system packages

```bash
sudo apt update
sudo apt install -y git curl ca-certificates gnupg lsb-release unzip
```

### Install Docker Engine + Compose plugin

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker
```

### Install Bun

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
```

## 2) Clone and install

```bash
git clone https://github.com/NetworklyINC/Networkly.git
cd Networkly
bun install
```

## 3) Environment configuration

Copy and edit the environment file:

```bash
cp .env.example .env
```

At minimum, set:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
GROQ_API_KEY=...  # or OPENROUTER_API_KEY/GOOGLE_AI_API_KEY
NEXT_PUBLIC_APP_URL=https://your-domain-or-lan-ip
```

For the scraper (inside `ec-scraper/.env`):

```env
DATABASE_URL=postgres://...
SUPABASE_URL=...
SUPABASE_SECRET_KEY=...
GROQ_API_KEY=...
GOOGLE_AI_API_KEY=...
SEARXNG_BASE_URL=http://localhost:8080
USE_SUPABASE=true
```

## 4) SearXNG via Docker (required for web discovery)

Create a minimal `searxng` compose file:

```bash
mkdir -p docker/searxng
cat > docker/searxng/compose.yml <<'EOF'
services:
  searxng:
    image: searxng/searxng:latest
    container_name: searxng
    ports:
      - "8080:8080"
    volumes:
      - ./searxng:/etc/searxng
    environment:
      - SEARXNG_BASE_URL=http://localhost:8080/
      - SEARXNG_INSTANCE_NAME=Networkly
    restart: unless-stopped
EOF
```

Start it:

```bash
docker compose -f docker/searxng/compose.yml up -d
```

Security note: Do **not** expose SearXNG publicly without auth. Keep it LAN-only or behind a reverse proxy with basic auth.

## 5) Build and run the web app

### Build

```bash
bun run build
```

### Production run (systemd)

Create a service (adjust `User` and paths if needed):

```bash
sudo tee /etc/systemd/system/networkly-web.service > /dev/null <<'EOF'
[Unit]
Description=Networkly Web
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/Networkly
Environment=NODE_ENV=production
ExecStart=/home/ubuntu/.bun/bin/bun run start
Restart=always

[Install]
WantedBy=multi-user.target
EOF
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now networkly-web
sudo systemctl status networkly-web --no-pager
```

The app listens on `http://localhost:3000`.

## 6) Run ec-scraper

### Host-based (simple)

```bash
cd ec-scraper
python -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -r requirements.txt
```

Run a test discovery:

```bash
hatch run discover "machine learning internships"
```

### Optional: systemd for scraper

```bash
sudo tee /etc/systemd/system/networkly-scraper.service > /dev/null <<'EOF'
[Unit]
Description=Networkly ec-scraper
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/Networkly/ec-scraper
EnvironmentFile=/home/ubuntu/Networkly/ec-scraper/.env
ExecStart=/home/ubuntu/Networkly/ec-scraper/.venv/bin/python scripts/scheduled_discovery.py
Restart=always

[Install]
WantedBy=multi-user.target
EOF
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now networkly-scraper
```

## 7) Networking options

### Option A: LAN-only (no domain)

- Access from LAN: `http://<server-lan-ip>:3000`
- Open firewall (if needed):

```bash
sudo ufw allow 3000/tcp
sudo ufw allow 8080/tcp
sudo ufw enable
```

### Option B: Domain + HTTPS (Caddy)

This works for **public domains** (including a Minecraft server domain if it points to your IP).

Install Caddy:

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

Create `/etc/caddy/Caddyfile`:

```caddy
your-domain.example.com {
  reverse_proxy localhost:3000
}
```

Reload:

```bash
sudo systemctl reload caddy
```

Requirements:

- DNS `A` record points to your public IP
- Ports **80/443** forwarded to the server

## 8) Operations

### Check services

```bash
systemctl status networkly-web --no-pager
systemctl status networkly-scraper --no-pager
docker ps --filter name=searxng
```

### Logs

```bash
journalctl -u networkly-web -n 100 --no-pager
journalctl -u networkly-scraper -n 100 --no-pager
docker logs --tail 100 searxng
```

### Updates

```bash
git pull
bun install
bun run build
sudo systemctl restart networkly-web
```

## 9) Quick checklist

- [ ] `.env` configured
- [ ] `ec-scraper/.env` configured
- [ ] SearXNG running on `:8080`
- [ ] Web app running on `:3000`
- [ ] Reverse proxy (optional) configured
