# PostgreSQL Installation Alternatives for Stock Bundler

**Status:** Homebrew installation failed due to network timeout issues
**Date:** 2025-10-29
**Platform:** macOS 12 (Darwin 21.6.0)

---

## 🚨 Issue Encountered

The Homebrew installation of PostgreSQL@15 failed with:
```
Error: postgresql@15: Failed to download resource "libunistring (1.4.1)"
Download failed: http://ftp.gnu.org/gnu/libunistring/libunistring-1.4.1.tar.gz
```

**Cause:** Network timeout while downloading dependencies (curl 502, SSL timeouts)

---

## 🎯 Recommended Solution: Postgres.app (Easiest)

**Postgres.app** is a full-featured PostgreSQL installation packaged as a standard Mac app.

### Step 1: Download and Install

1. Visit: https://postgresapp.com/
2. Download the latest version (includes PostgreSQL 15)
3. Drag Postgres.app to Applications folder
4. Open Postgres.app
5. Click "Initialize" to create a new server

### Step 2: Add to PATH

```bash
# Add to your ~/.zshrc or ~/.bash_profile
echo 'export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"' >> ~/.zshrc

# Reload shell configuration
source ~/.zshrc

# Verify installation
psql --version
```

### Step 3: Create Database

```bash
# Create stock_bundler database
createdb stock_bundler

# Test connection
psql -d stock_bundler -c "SELECT version();"
```

### Step 4: Configure Stock Bundler

Update `/Users/prathameshjagtap/Projects/stock-bundler/.env.local`:

```env
DATABASE_URL="postgresql://localhost:5432/stock_bundler?schema=public"
```

Note: Postgres.app uses your macOS username with no password by default.

### Step 5: Run Migrations

```bash
cd /Users/prathameshjagtap/Projects/stock-bundler

# Run Prisma migrations
npx prisma migrate dev --name add_performance_indexes

# Generate Prisma Client
npx prisma generate

# Verify
npx prisma studio
```

**Advantages:**
- ✅ No command line needed
- ✅ GUI for starting/stopping
- ✅ Includes multiple PostgreSQL versions
- ✅ No dependencies to download
- ✅ Easy to use

---

## 🐳 Alternative 2: Docker (Recommended for Development)

If you have Docker installed, this is the fastest option.

### Step 1: Run PostgreSQL Container

```bash
docker run -d \
  --name stock-bundler-postgres \
  -e POSTGRES_DB=stock_bundler \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:15-alpine

# Verify container is running
docker ps
```

### Step 2: Configure Stock Bundler

Update `.env.local`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/stock_bundler?schema=public"
```

### Step 3: Run Migrations

```bash
cd /Users/prathameshjagtap/Projects/stock-bundler
npx prisma migrate dev --name add_performance_indexes
npx prisma generate
```

### Managing Docker PostgreSQL

```bash
# Start the container
docker start stock-bundler-postgres

# Stop the container
docker stop stock-bundler-postgres

# View logs
docker logs stock-bundler-postgres

# Access PostgreSQL CLI
docker exec -it stock-bundler-postgres psql -U postgres -d stock_bundler

# Remove container (WARNING: deletes data)
docker rm -f stock-bundler-postgres
```

**Advantages:**
- ✅ Isolated environment
- ✅ Easy to reset/recreate
- ✅ No system-wide installation
- ✅ Production-like setup
- ✅ Multiple versions easily

**Requirements:**
- Docker Desktop for Mac installed

---

## 🔄 Alternative 3: Retry Homebrew Installation

If you want to retry the Homebrew installation, try these steps:

### Option A: Clean Install with Better Mirror

```bash
# Kill any existing installation attempts
pkill -f "brew install"

# Clean Homebrew cache
brew cleanup

# Update Homebrew
brew update

# Try installing with verbose output
brew install postgresql@15 --verbose
```

### Option B: Use Different Formula Version

```bash
# Try the non-versioned formula (usually installs latest)
brew install postgresql

# Or try an older version
brew install postgresql@14
```

### Option C: Install Dependencies Separately

```bash
# Try installing the problematic dependency manually
brew install libunistring

# Then try PostgreSQL again
brew install postgresql@15
```

### Option D: Use Different Mirror

```bash
# Set Homebrew to use a different mirror (if in China/Asia)
export HOMEBREW_BOTTLE_DOMAIN="https://mirrors.tuna.tsinghua.edu.cn/homebrew-bottles"

# Try installation again
brew install postgresql@15
```

---

## 📦 Alternative 4: Direct Download (Advanced)

If all else fails, download PostgreSQL directly from EnterpriseDB.

### Step 1: Download Installer

1. Visit: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
2. Select PostgreSQL 15.x for macOS
3. Download the installer (.dmg file)

### Step 2: Install

1. Open the .dmg file
2. Run the installer
3. Follow the installation wizard
4. Set a password for the postgres user (remember this!)
5. Port: 5432 (default)
6. Locale: English, United States

### Step 3: Add to PATH

```bash
# Add PostgreSQL binaries to PATH
echo 'export PATH="/Library/PostgreSQL/15/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Verify
psql --version
```

### Step 4: Create Database

```bash
# You'll be prompted for the password you set during installation
psql -U postgres

# In psql prompt:
CREATE DATABASE stock_bundler;
\q
```

### Step 5: Configure Stock Bundler

Update `.env.local`:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/stock_bundler?schema=public"
```

Replace `YOUR_PASSWORD` with the password you set during installation.

---

## 🔧 Troubleshooting Network Issues

If you're experiencing persistent network issues with Homebrew:

### Check Network Connectivity

```bash
# Test DNS
nslookup ftp.gnu.org

# Test connection
curl -I https://ftp.gnu.org/

# Check proxy settings
echo $HTTP_PROXY
echo $HTTPS_PROXY
```

### Use VPN or Different Network

Sometimes corporate networks or ISPs block certain download sources. Try:
- Switching to mobile hotspot
- Using a VPN
- Trying at a different time
- Using a different WiFi network

### Homebrew Diagnostics

```bash
# Check Homebrew installation
brew doctor

# View detailed configuration
brew config

# Check for issues
brew update-reset
```

---

## ✅ Verification Steps (Any Method)

After installing PostgreSQL using any method above, verify it works:

### 1. Check PostgreSQL Version

```bash
psql --version
# Expected: psql (PostgreSQL) 15.x or 14.x or 16.x
```

### 2. Check Service Status

```bash
# For Postgres.app: Just check if app is running

# For Homebrew:
brew services list | grep postgresql

# For Docker:
docker ps | grep postgres

# For Direct Install:
pg_ctl -D /Library/PostgreSQL/15/data status
```

### 3. Test Connection

```bash
psql -d stock_bundler -c "SELECT version();"
# Should show PostgreSQL version info
```

### 4. List Databases

```bash
psql -l
# Should show stock_bundler in the list
```

### 5. Run Prisma Migration

```bash
cd /Users/prathameshjagtap/Projects/stock-bundler
npx prisma migrate dev --name add_performance_indexes
```

Expected output:
```
✔ Generated Prisma Client
The following migration(s) have been applied:
migrations/
  └─ 20231029_add_performance_indexes/
    └─ migration.sql
```

### 6. Verify Tables Created

```bash
psql -d stock_bundler -c "\dt"
```

Should show 7 tables:
- User
- Stock
- ETF
- ETFComposition
- UserETF
- PriceHistory
- ETFHistory

### 7. Start Application

```bash
npm run dev
```

Visit: http://localhost:3000

---

## 📊 Installation Comparison

| Method | Ease of Use | Setup Time | Best For |
|--------|-------------|------------|----------|
| **Postgres.app** | ⭐⭐⭐⭐⭐ | 5 min | Beginners, GUI users |
| **Docker** | ⭐⭐⭐⭐ | 2 min | Developers, isolation |
| **Homebrew** | ⭐⭐⭐ | 10 min | Command line users |
| **Direct Install** | ⭐⭐ | 15 min | Enterprise, production-like |

---

## 🎯 My Recommendation

Based on your situation:

1. **First Choice: Postgres.app**
   - Easiest to install
   - No network issues (single download)
   - GUI for management
   - Perfect for local development

2. **Second Choice: Docker**
   - If you already have Docker installed
   - Fastest setup (2 minutes)
   - Easy to reset/recreate

3. **Last Resort: Retry Homebrew**
   - Only if you specifically need Homebrew
   - May need to troubleshoot network
   - Can take longer

---

## 🚀 Quick Start with Postgres.app

**The fastest path forward:**

```bash
# 1. Download and install Postgres.app from https://postgresapp.com/
# 2. Open the app and click "Initialize"

# 3. Add to PATH
echo 'export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# 4. Create database
createdb stock_bundler

# 5. Update .env.local
echo 'DATABASE_URL="postgresql://localhost:5432/stock_bundler?schema=public"' >> .env.local

# 6. Run migrations
cd /Users/prathameshjagtap/Projects/stock-bundler
npx prisma migrate dev --name add_performance_indexes
npx prisma generate

# 7. Start app
npm run dev

# Done! 🎉
```

---

## 📞 Need Help?

If you encounter issues with any method:

1. Check the verification steps above
2. Review the troubleshooting sections
3. Run `./verify-database.sh` (already created in your project)
4. Check existing documentation:
   - `DATABASE_SETUP.md` - Complete guide
   - `DATABASE_QUICK_REFERENCE.md` - Common commands
   - `SETUP_INSTRUCTIONS.md` - Step-by-step

All files are in `/Users/prathameshjagtap/Projects/stock-bundler/`

---

## 📝 Summary

**Problem:** Homebrew installation failed due to network timeout
**Solution:** Use Postgres.app (recommended) or Docker
**Time to Fix:** 5-10 minutes
**Status:** Multiple alternatives available

Choose the method that works best for you and proceed with the setup!
