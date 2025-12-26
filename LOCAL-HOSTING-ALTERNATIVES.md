# Local Hosting Alternatives for Next.js App
## Why XAMPP Won't Work & What To Use Instead

---

## ❌ Why XAMPP Won't Work

**XAMPP is designed for:**
- PHP applications
- MySQL/MariaDB databases
- Apache web server

**Your application uses:**
- ✅ **Node.js** runtime (not PHP)
- ✅ **PostgreSQL** database (not MySQL)
- ✅ **Next.js** built-in server (not Apache)
- ✅ **TypeScript/JavaScript** (not PHP)

**XAMPP Components:**
- ❌ Apache - Not needed (Next.js has its own server)
- ❌ MySQL - Wrong database type (you need PostgreSQL)
- ❌ PHP - Not used in this project
- ❌ phpMyAdmin - Won't work with PostgreSQL

---

## ✅ What You Actually Need

For this Next.js application, you need:

1. **Node.js Runtime** (v20+)
2. **PostgreSQL Database** (local or cloud)
3. **npm/package manager**
4. **Process Manager** (for production - PM2, etc.)

---

## 🏠 Local Development Options

### Option 1: Simple Local Development (Current Setup)

**What you're already doing:**
```bash
npm run dev
```

This runs on `http://localhost:3000` - perfect for development!

**Pros:**
- ✅ Already working
- ✅ Hot reload
- ✅ Easy debugging
- ✅ No additional setup needed

**Cons:**
- ❌ Only accessible on your computer
- ❌ Stops when you close terminal
- ❌ Not suitable for production

---

### Option 2: Local PostgreSQL + Next.js (Self-Contained)

If you want everything running locally (including database):

#### Step 1: Install PostgreSQL Locally

**Windows:**
- Download from: https://www.postgresql.org/download/windows/
- Or use: https://www.postgresql.org/download/windows/installer/

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux:**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

#### Step 2: Create Local Database

```bash
# Create database
createdb hr_leave_portal

# Or using psql
psql -U postgres
CREATE DATABASE hr_leave_portal;
```

#### Step 3: Update .env File

```env
# Local PostgreSQL instead of Neon
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/hr_leave_portal?sslmode=prefer"
DIRECT_URL="postgresql://postgres:your_password@localhost:5432/hr_leave_portal?sslmode=prefer"
```

#### Step 4: Run Migrations

```bash
npm run db:migrate
npm run db:seed  # Optional
```

#### Step 5: Start Development Server

```bash
npm run dev
```

**Pros:**
- ✅ Everything runs locally
- ✅ No internet required (after setup)
- ✅ Full control over database
- ✅ Free (no cloud costs)

**Cons:**
- ❌ Requires PostgreSQL installation
- ❌ More setup complexity
- ❌ Database management yourself

---

### Option 3: Docker (Recommended for Local Production-like Setup)

Docker provides a complete local environment similar to production.

#### Step 1: Create Docker Compose File

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: hr-portal-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: your_secure_password
      POSTGRES_DB: hr_leave_portal
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build: .
    container_name: hr-portal-app
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:your_secure_password@postgres:5432/hr_leave_portal?sslmode=prefer
      NODE_ENV: production
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next

volumes:
  postgres_data:
```

#### Step 2: Create Dockerfile

Create `Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
```

#### Step 3: Start with Docker

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

**Pros:**
- ✅ Production-like environment
- ✅ Isolated containers
- ✅ Easy to replicate
- ✅ Can include all services

**Cons:**
- ❌ Requires Docker installation
- ❌ More complex setup
- ❌ Higher resource usage

---

### Option 4: PM2 for Production-like Local Server

PM2 keeps your app running in the background like a production server.

#### Step 1: Install PM2

```bash
npm install -g pm2
```

#### Step 2: Build Application

```bash
npm run build
```

#### Step 3: Start with PM2

```bash
pm2 start npm --name "hr-portal" -- start
```

#### Step 4: PM2 Commands

```bash
# View status
pm2 status

# View logs
pm2 logs hr-portal

# Restart
pm2 restart hr-portal

# Stop
pm2 stop hr-portal

# Auto-start on boot
pm2 startup
pm2 save
```

**Pros:**
- ✅ Keeps app running
- ✅ Auto-restart on crash
- ✅ Production-like behavior
- ✅ Easy process management

**Cons:**
- ❌ Still only local access
- ❌ Requires manual setup

---

## 🌐 Making It Accessible on Local Network

If you want other devices on your network to access the app:

### Option 1: Next.js Dev Server

```bash
# Start on all network interfaces
npm run dev -- -H 0.0.0.0
```

Then access from other devices using your computer's IP:
- `http://192.168.1.100:3000` (replace with your IP)

### Option 2: Production Build on Network

```bash
# Build
npm run build

# Start on network
npm start -- -H 0.0.0.0
```

### Option 3: Use ngrok (Internet Access)

```bash
# Install ngrok
npm install -g ngrok

# Start your app
npm run dev

# In another terminal, create tunnel
ngrok http 3000
```

This gives you a public URL like: `https://abc123.ngrok.io`

---

## 🖥️ Self-Hosting on Your Own Server

If you want to host on a physical server or VPS:

### Option 1: Simple Node.js Setup

**On your server:**

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Clone your app
git clone <your-repo>
cd hr-staff-leave-portal

# Install dependencies
npm install

# Build
npm run build

# Start with PM2
pm2 start npm --name "hr-portal" -- start
pm2 save
pm2 startup
```

### Option 2: Docker on Server

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Clone app
git clone <your-repo>
cd hr-staff-leave-portal

# Start with Docker Compose
docker-compose up -d
```

### Option 3: Nginx Reverse Proxy (Production)

For production, use Nginx as reverse proxy:

**Install Nginx:**
```bash
sudo apt-get install nginx
```

**Create Nginx config** (`/etc/nginx/sites-available/hr-portal`):

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/hr-portal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 📊 Comparison Table

| Solution | Use Case | Complexity | Cost |
|----------|----------|------------|------|
| **npm run dev** | Development | ⭐ Easy | Free |
| **Local PostgreSQL** | Local testing | ⭐⭐ Medium | Free |
| **Docker** | Production-like local | ⭐⭐⭐ Complex | Free |
| **PM2** | Background process | ⭐⭐ Medium | Free |
| **VPS/Server** | Self-hosting | ⭐⭐⭐ Complex | $5-20/month |
| **Vercel/Cloud** | Production | ⭐ Easy | Free tier available |

---

## 🎯 Recommended Approach

### For Development:
✅ **Keep using `npm run dev`** - It's perfect!

### For Local Testing with Database:
✅ **Use local PostgreSQL** - Full control, no cloud dependency

### For Production-like Local Setup:
✅ **Use Docker** - Matches production environment

### For Actual Production:
✅ **Use Vercel** (recommended) or your own VPS with Nginx

---

## 🚀 Quick Start: Local PostgreSQL Setup

If you want to switch from Neon to local PostgreSQL:

### 1. Install PostgreSQL

**Windows:**
- Download installer from postgresql.org
- Install with default settings
- Remember the password you set

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE hr_leave_portal;

# Exit
\q
```

### 3. Update .env

```env
# Replace Neon URL with local
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/hr_leave_portal?sslmode=prefer"
DIRECT_URL="postgresql://postgres:your_password@localhost:5432/hr_leave_portal?sslmode=prefer"
```

### 4. Run Migrations

```bash
npm run db:migrate
npm run db:seed
```

### 5. Start App

```bash
npm run dev
```

---

## ❓ FAQ

### Q: Can I use XAMPP's MySQL instead of PostgreSQL?
**A:** No. The app is built specifically for PostgreSQL. Converting would require:
- Changing all Prisma schema
- Rewriting all database queries
- Testing everything again
- Not recommended

### Q: Can I use Apache instead of Next.js server?
**A:** No. Next.js has its own optimized server. You could use Apache as a reverse proxy, but Next.js still needs to run.

### Q: What's the easiest way to host locally?
**A:** Keep using `npm run dev` for development. For production-like, use Docker.

### Q: Can I use XAMPP for anything?
**A:** Only if you rewrite the entire app in PHP, which would take weeks/months and isn't recommended.

---

## 📝 Summary

**XAMPP is NOT suitable** for this Next.js application because:
- ❌ Wrong runtime (needs Node.js, not PHP)
- ❌ Wrong database (needs PostgreSQL, not MySQL)
- ❌ Wrong server (Next.js has built-in server)

**Use instead:**
- ✅ `npm run dev` for development
- ✅ Local PostgreSQL for database
- ✅ Docker for production-like setup
- ✅ PM2 for background processes
- ✅ Vercel/Cloud for production

---

**Last Updated**: 2024
**Next Steps**: Choose your preferred local hosting option above

