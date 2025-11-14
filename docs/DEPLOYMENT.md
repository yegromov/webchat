# WebChat Deployment Guide

Complete guide for deploying WebChat in various environments.

## Table of Contents

1. [Deployment Options](#deployment-options)
2. [Docker Deployment](#docker-deployment)
3. [Production Deployment](#production-deployment)
4. [Cloud Platforms](#cloud-platforms)
5. [SSL/TLS Configuration](#ssltls-configuration)
6. [Environment Variables](#environment-variables)
7. [Post-Deployment](#post-deployment)

---

## Deployment Options

### Option 1: Docker (Recommended)
- Easiest setup
- Consistent environment
- Includes all dependencies
- Best for: Development, testing, small-to-medium deployments

### Option 2: Traditional Server
- Direct installation on server
- More control over configuration
- Best for: Custom infrastructure, specific requirements

### Option 3: Cloud Platforms
- Managed infrastructure
- Auto-scaling capabilities
- Best for: Production, high-traffic deployments

---

## Docker Deployment

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 2GB RAM minimum
- 10GB disk space

### Quick Deploy

**1. Clone Repository**
```bash
git clone https://github.com/your-org/webchat.git
cd webchat
```

**2. Configure Environment**
```bash
# Create environment file
cp apps/server/.env.example apps/server/.env

# Edit with your settings
nano apps/server/.env
```

**Minimum required settings:**
```env
PORT=3001
NODE_ENV=production
DATABASE_URL="postgresql://webchat:changeme@postgres:5432/webchat"
REDIS_URL="redis://redis:6379"
JWT_SECRET="generate-a-strong-random-secret-here"
CORS_ORIGIN="http://yourdomain.com"
```

**3. Start Services**
```bash
docker-compose up -d
```

**4. Run Migrations**
```bash
docker-compose exec server pnpm prisma migrate deploy
```

**5. Verify**
```bash
# Check all services running
docker-compose ps

# Check logs
docker-compose logs -f

# Test health endpoint
curl http://localhost:3001/health
```

**6. Access Application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- WebSocket: ws://localhost:3001/ws

### Docker Compose Configuration

**Production-ready docker-compose.yml:**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_DB: webchat
      POSTGRES_USER: webchat
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U webchat"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  server:
    build:
      context: .
      dockerfile: apps/server/Dockerfile
    restart: always
    ports:
      - "3001:3001"
    environment:
      PORT: 3001
      NODE_ENV: production
      DATABASE_URL: postgresql://webchat:${DB_PASSWORD}@postgres:5432/webchat
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      CORS_ORIGIN: ${CORS_ORIGIN}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  client:
    build:
      context: .
      dockerfile: apps/client/Dockerfile
      args:
        VITE_API_URL: ${API_URL}
        VITE_WS_URL: ${WS_URL}
    restart: always
    ports:
      - "3000:80"
    depends_on:
      - server

volumes:
  postgres_data:
  redis_data:
```

**Environment file (.env):**
```env
DB_PASSWORD=your-secure-db-password
JWT_SECRET=your-super-secret-jwt-key
CORS_ORIGIN=http://yourdomain.com,https://yourdomain.com
API_URL=http://yourdomain.com:3001
WS_URL=ws://yourdomain.com:3001/ws
```

### Docker Commands

**View logs:**
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f server

# Last 100 lines
docker-compose logs --tail=100 server
```

**Restart services:**
```bash
# All services
docker-compose restart

# Specific service
docker-compose restart server
```

**Stop services:**
```bash
docker-compose stop
```

**Remove everything (including data):**
```bash
docker-compose down -v
```

**Update and restart:**
```bash
git pull
docker-compose build
docker-compose up -d
```

---

## Production Deployment

### Manual Server Setup

**Requirements:**
- Ubuntu 22.04 LTS (or similar)
- Node.js 25+
- PostgreSQL 14+
- Redis 7+
- nginx (reverse proxy)
- PM2 (process manager)

### Step-by-Step Production Setup

#### 1. Install Dependencies

**Node.js:**
```bash
curl -fsSL https://deb.nodesource.com/setup_25.x | sudo -E bash -
sudo apt install -y nodejs
```

**pnpm:**
```bash
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

**PostgreSQL:**
```bash
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Redis:**
```bash
sudo apt install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

**nginx:**
```bash
sudo apt install nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### 2. Create Database

```bash
sudo -u postgres psql

# In PostgreSQL shell:
CREATE DATABASE webchat;
CREATE USER webchat_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE webchat TO webchat_user;
\q
```

#### 3. Clone and Build Application

```bash
# Create app directory
sudo mkdir -p /var/www/webchat
sudo chown $USER:$USER /var/www/webchat
cd /var/www/webchat

# Clone repository
git clone https://github.com/your-org/webchat.git .

# Install dependencies
pnpm install

# Configure environment
cp apps/server/.env.example apps/server/.env
nano apps/server/.env
```

**Production .env:**
```env
PORT=3001
NODE_ENV=production
DATABASE_URL="postgresql://webchat_user:secure_password@localhost:5432/webchat"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-super-secret-jwt-key"
CORS_ORIGIN="https://yourdomain.com"
```

**Build:**
```bash
# Build shared package
pnpm --filter @webchat/shared build

# Build server
pnpm --filter @webchat/server build

# Build client
pnpm --filter @webchat/client build
```

**Run migrations:**
```bash
cd apps/server
pnpm prisma migrate deploy
cd ../..
```

#### 4. Setup PM2

```bash
# Install PM2
sudo npm install -g pm2

# Create ecosystem file
nano ecosystem.config.js
```

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [{
    name: 'webchat-server',
    cwd: '/var/www/webchat/apps/server',
    script: 'pnpm',
    args: 'start',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
```

**Start server:**
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### 5. Configure nginx

**Create configuration:**
```bash
sudo nano /etc/nginx/sites-available/webchat
```

**Configuration:**
```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS configuration
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificates (configure after getting certificates)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Client build (static files)
    root /var/www/webchat/apps/client/dist;
    index index.html;

    # Serve static files
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket proxy
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket timeouts
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3001;
        access_log off;
    }
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/webchat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Cloud Platforms

### AWS Deployment

**Architecture:**
- **EC2** - Application servers
- **RDS** - PostgreSQL database
- **ElastiCache** - Redis
- **ALB** - Load balancer
- **S3** - Static assets (optional)
- **CloudFront** - CDN (optional)

**Deployment steps:**

1. **Create RDS PostgreSQL instance**
2. **Create ElastiCache Redis cluster**
3. **Launch EC2 instances** (t3.medium or larger)
4. **Configure Application Load Balancer** with WebSocket support
5. **Deploy application** using User Data script or CodeDeploy
6. **Configure Auto Scaling** group

**User Data script for EC2:**
```bash
#!/bin/bash
curl -fsSL https://deb.nodesource.com/setup_25.x | bash -
apt install -y nodejs git
npm install -g pnpm pm2

cd /home/ubuntu
git clone https://github.com/your-org/webchat.git
cd webchat
pnpm install
# ... build and configure ...
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

### DigitalOcean Deployment

**Option 1: App Platform (Easiest)**
1. Connect GitHub repository
2. Configure build settings
3. Add PostgreSQL and Redis managed databases
4. Deploy

**Option 2: Droplets**
- Similar to manual server setup
- Use DigitalOcean managed databases
- Add load balancer if needed

### Heroku Deployment

**Requirements:**
- Heroku CLI
- PostgreSQL addon
- Redis addon

**Deploy:**
```bash
# Login
heroku login

# Create app
heroku create webchat-app

# Add addons
heroku addons:create heroku-postgresql:standard-0
heroku addons:create heroku-redis:premium-0

# Set environment
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret

# Deploy
git push heroku main

# Run migrations
heroku run pnpm prisma migrate deploy
```

### Google Cloud Platform

**Services:**
- **Cloud Run** - Containerized applications
- **Cloud SQL** - PostgreSQL
- **Memorystore** - Redis
- **Cloud Load Balancing**

**Deploy:**
```bash
# Build containers
gcloud builds submit --tag gcr.io/PROJECT_ID/webchat

# Deploy to Cloud Run
gcloud run deploy webchat \
  --image gcr.io/PROJECT_ID/webchat \
  --platform managed \
  --region us-central1 \
  --add-cloudsql-instances PROJECT_ID:REGION:INSTANCE
```

---

## SSL/TLS Configuration

### Let's Encrypt (Free SSL)

**Install Certbot:**
```bash
sudo apt install certbot python3-certbot-nginx
```

**Get certificate:**
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

**Auto-renewal:**
```bash
sudo certbot renew --dry-run

# Add to crontab
0 3 * * * certbot renew --quiet
```

### Cloudflare SSL

1. Add domain to Cloudflare
2. Update DNS records
3. Enable "Full (Strict)" SSL mode
4. Use Cloudflare origin certificates

---

## Environment Variables

### Complete Reference

**Server (.env):**
```env
# Server Configuration
PORT=3001
NODE_ENV=production

# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# Redis
REDIS_URL="redis://host:6379"

# Security
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"

# CORS
CORS_ORIGIN="https://yourdomain.com,https://www.yourdomain.com"
```

**Client (.env):**
```env
VITE_API_URL=https://yourdomain.com
VITE_WS_URL=wss://yourdomain.com/ws
```

### Generating Secrets

**JWT Secret:**
```bash
openssl rand -base64 32
```

**Database Password:**
```bash
openssl rand -base64 24
```

---

## Post-Deployment

### Verification Checklist

- [ ] Health endpoint responding: `curl https://yourdomain.com/health`
- [ ] Frontend loads correctly
- [ ] User registration works
- [ ] Login works (both anonymous and registered)
- [ ] Chat rooms functional
- [ ] Direct messages working
- [ ] User blocking works
- [ ] WebSocket connection stable
- [ ] SSL certificate valid
- [ ] CORS configured correctly
- [ ] Database migrations applied
- [ ] Backups configured

### Performance Testing

**Load test with Artillery:**
```bash
npm install -g artillery

# Create test script
cat > load-test.yml << EOF
config:
  target: "wss://yourdomain.com"
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - engine: ws
    flow:
      - send: '{"type":"JOIN_ROOM","payload":{"roomId":"test"}}'
      - think: 5
      - send: '{"type":"SEND_MESSAGE","payload":{"content":"Hello","roomId":"test"}}'
EOF

# Run test
artillery run load-test.yml
```

### Monitoring Setup

**Install monitoring:**
```bash
# Prometheus
docker run -d -p 9090:9090 prom/prometheus

# Grafana
docker run -d -p 3000:3000 grafana/grafana
```

**PM2 monitoring:**
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Security Hardening

**Firewall (UFW):**
```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

**Fail2ban:**
```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

**Regular updates:**
```bash
# Setup unattended upgrades
sudo apt install unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

---

## Troubleshooting Deployment

### Common Issues

**Build fails:**
- Check Node.js version: `node --version`
- Clear node_modules: `rm -rf node_modules && pnpm install`
- Check for TypeScript errors: `pnpm tsc --noEmit`

**Database connection fails:**
- Verify DATABASE_URL format
- Check PostgreSQL is accessible
- Test connection: `psql $DATABASE_URL`

**WebSocket connection fails:**
- Check nginx WebSocket configuration
- Verify firewall allows WebSocket
- Check SSL works for WebSocket (wss://)

**502 Bad Gateway:**
- Check backend server is running: `pm2 status`
- Check backend port: `netstat -tulpn | grep 3001`
- Review nginx error logs: `sudo tail -f /var/log/nginx/error.log`

---

## Rollback Procedure

If deployment fails:

**1. Stop new version:**
```bash
pm2 stop all
```

**2. Restore previous version:**
```bash
git checkout <previous-commit>
pnpm install
pnpm build
```

**3. Restore database (if needed):**
```bash
psql webchat < backup.sql
```

**4. Restart:**
```bash
pm2 restart all
```

---

## Conclusion

You now have multiple options for deploying WebChat. Choose the method that best fits your infrastructure and requirements.

For support, refer to:
- **User Guide:** `docs/USER_GUIDE.md`
- **Admin Guide:** `docs/ADMIN_GUIDE.md`
- **GitHub Issues:** Report problems and get help

**Good luck with your deployment!** 🚀
