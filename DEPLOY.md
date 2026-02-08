# Deploy THE HOLD

## GitHub Repository
**URL**: https://github.com/Bgman508/the-hold

## Option 1: Render (Recommended)

### One-Click Deploy
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Bgman508/the-hold)

### Manual Setup

1. **Create Render Account**: https://dashboard.render.com

2. **Create Web Service**:
   - Click "New +" → "Web Service"
   - Connect GitHub repo: `Bgman508/the-hold`
   - Settings:
     - **Name**: `the-hold`
     - **Environment**: `Node`
     - **Build Command**: `npm install && npm run db:generate && npm run build`
     - **Start Command**: `npm start`
     - **Plan**: Starter ($7/month)

3. **Environment Variables**:
   ```
   NODE_ENV=production
   DATABASE_URL=file:./data/prod.db
   JWT_SECRET=<generate with: openssl rand -base64 32>
   IP_HASH_SECRET=<generate with: openssl rand -base64 32>
   COUNCIL_EMAIL=council@thehold.app
   COUNCIL_PASSWORD=<secure password>
   WS_PORT=3001
   NEXT_PUBLIC_WS_URL=wss://the-hold-ws.onrender.com
   ALLOWED_ORIGINS=https://the-hold.onrender.com
   ```

4. **Add Disk** (for SQLite persistence):
   - Mount Path: `/app/data`
   - Size: 1 GB

5. **Create Second Service** (WebSocket):
   - Click "New +" → "Web Service"
   - Same repo
   - **Name**: `the-hold-ws`
   - **Start Command**: `npm run dev:ws`
   - **Port**: 3001
   - Same environment variables

---

## Option 2: Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template?template=https://github.com/Bgman508/the-hold)

---

## Option 3: Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Launch
fly launch --name the-hold --region ord

# Set secrets
fly secrets set JWT_SECRET="$(openssl rand -base64 32)"
fly secrets set IP_HASH_SECRET="$(openssl rand -base64 32)"
fly secrets set COUNCIL_EMAIL="council@thehold.app"
fly secrets set COUNCIL_PASSWORD="your-secure-password"

# Deploy
fly deploy
```

---

## Option 4: VPS (DigitalOcean, Linode, etc.)

```bash
# SSH into your server
git clone https://github.com/Bgman508/the-hold.git
cd the-hold

# Setup environment
cp .env.example .env
# Edit .env with production values

# Run with Docker
docker compose up -d
```

---

## Post-Deploy Setup

### 1. Initialize Database
```bash
# On Render: Use Shell tab
npm run db:push
npm run db:seed
```

### 2. Verify Deployment
- Home page loads: `https://your-domain.com`
- Health check: `https://your-domain.com/api/health`
- Two-tab presence test works

### 3. Council Access
- Login with `COUNCIL_EMAIL` and `COUNCIL_PASSWORD`
- Access admin at `/admin` (future feature)

---

## Live Demo

Once deployed, your instance will be available at:
- **App**: `https://your-domain.com`
- **WebSocket**: `wss://your-domain.com/ws`

---

## Need Help?

- **Issues**: https://github.com/Bgman508/the-hold/issues
- **Discussions**: https://github.com/Bgman508/the-hold/discussions
