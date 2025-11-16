# PostgreSQL Setup Instructions
## Stock Bundler ETF Management Platform

---

## Current Status

The PostgreSQL installation is currently in progress via Homebrew. Follow these steps once the installation completes.

---

## Step-by-Step Setup Guide

### Step 1: Wait for PostgreSQL Installation to Complete

The installation is running in the background. It should complete in a few minutes.

```bash
# Check installation status
brew list postgresql@15
```

If installed, you should see a list of installed files. If not, wait a bit longer.

---

### Step 2: Add PostgreSQL to Your PATH

```bash
# Add to your shell profile (~/.zshrc or ~/.bash_profile)
echo 'export PATH="/usr/local/opt/postgresql@15/bin:$PATH"' >> ~/.zshrc

# Reload your shell configuration
source ~/.zshrc
```

For bash users, use `~/.bash_profile` instead of `~/.zshrc`.

---

### Step 3: Start PostgreSQL Service

```bash
# Start PostgreSQL as a background service
brew services start postgresql@15

# Verify it's running
brew services list | grep postgresql
```

Expected output: `postgresql@15 started ...`

---

### Step 4: Create the Database

```bash
# Wait a few seconds for PostgreSQL to fully start, then create the database
sleep 3
createdb stock_bundler

# Verify database creation
psql -l | grep stock_bundler
```

---

### Step 5: Verify Database Connection

```bash
# Connect to the database
psql -d stock_bundler

# Inside psql, you should see:
# psql (15.x)
# Type "help" for help.
# stock_bundler=#

# Type \q to exit
\q
```

---

### Step 6: Verify Environment Configuration

Your `.env.local` file has already been created with the following configuration:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/stock_bundler?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="lkElowEO3jlKm0l/p6iuvjKOXkh+GIioTeMwjTmb9qE="
ALPHA_VANTAGE_API_KEY="your-alpha-vantage-api-key"
NODE_ENV="development"
```

**Action Required:** Replace `your-alpha-vantage-api-key` with your actual API key from Alpha Vantage.

Location: `/Users/prathameshjagtap/Projects/stock-bundler/.env.local`

---

### Step 7: Install Node.js Dependencies

```bash
# Make sure you're in the project directory
cd /Users/prathameshjagtap/Projects/stock-bundler

# Install all dependencies including Prisma
npm install
```

---

### Step 8: Run Database Migrations

This is the crucial step that creates all your tables and indexes.

```bash
# Run the migration to create all tables with performance indexes
npx prisma migrate dev --name add_performance_indexes
```

This command will:
- Create a migration file in `prisma/migrations/`
- Execute SQL to create all 7 tables (User, Stock, ETF, ETFComposition, UserETF, PriceHistory, ETFHistory)
- Create all 11 performance indexes
- Generate the Prisma Client automatically

Expected output:
```
Environment variables loaded from .env.local
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "stock_bundler"

Applying migration `20250129_add_performance_indexes`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20250129_add_performance_indexes/
    └─ migration.sql

Your database is now in sync with your schema.

✔ Generated Prisma Client
```

---

### Step 9: Generate Prisma Client (if needed)

The migration should generate the client automatically, but if needed:

```bash
npx prisma generate
```

---

### Step 10: Verify the Setup

```bash
# Run the verification script
./verify-database.sh
```

This will check:
- PostgreSQL installation
- Service status
- Database existence
- Environment configuration
- Database connection
- Prisma installation
- Migrations
- Tables created

---

### Step 11: Explore Your Database

#### Option 1: Using Prisma Studio (Recommended - GUI)

```bash
npx prisma studio
```

This opens a web interface at `http://localhost:5555` where you can:
- View all tables
- Browse data
- Add/edit/delete records
- Test relationships

#### Option 2: Using psql (Command Line)

```bash
# Connect to database
psql -d stock_bundler

# View all tables
\dt

# You should see:
#              List of relations
#  Schema |      Name        | Type  |  Owner
# --------+------------------+-------+----------
#  public | ETF              | table | postgres
#  public | ETFComposition   | table | postgres
#  public | ETFHistory       | table | postgres
#  public | PriceHistory     | table | postgres
#  public | Stock            | table | postgres
#  public | User             | table | postgres
#  public | UserETF          | table | postgres

# View table structure
\d "User"
\d "Stock"
\d "ETF"

# View indexes
\di

# Exit
\q
```

---

## Automated Setup (Alternative Method)

If you prefer, you can use the automated setup script:

```bash
# Run the automated setup script
./setup-database.sh
```

This script will:
- Check PostgreSQL installation
- Start the service
- Create the database
- Verify connection
- Guide you through migrations

---

## What Gets Created

### Tables

1. **User** (7 columns)
   - id, email, name, passwordHash, createdAt, updatedAt
   - Relations: userETFs

2. **Stock** (9 columns)
   - id, symbol, name, sector, industry, marketCap, currentPrice, lastUpdated, createdAt
   - Relations: etfCompositions, priceHistory

3. **ETF** (11 columns)
   - id, ticker, name, description, weightingMethod, isCustom, createdBy, currentValue, lastUpdated, createdAt
   - Relations: compositions, userETFs, etfHistory

4. **ETFComposition** (6 columns)
   - id, etfId, stockId, weight, shares, addedAt
   - Relations: etf, stock

5. **UserETF** (6 columns)
   - id, userId, etfId, customName, notes, savedAt
   - Relations: user, etf

6. **PriceHistory** (5 columns)
   - id, stockId, price, volume, timestamp
   - Relations: stock

7. **ETFHistory** (4 columns)
   - id, etfId, value, timestamp
   - Relations: etf

### Indexes (11 Total)

Performance indexes for:
- User: email, createdAt
- Stock: symbol, sector, lastUpdated, currentPrice
- ETF: ticker, isCustom, createdBy, lastUpdated, (isCustom, createdBy) composite
- ETFComposition: etfId, stockId, (etfId, weight DESC) composite
- UserETF: userId, etfId, (userId, savedAt DESC) composite
- PriceHistory: (stockId, timestamp), timestamp DESC
- ETFHistory: (etfId, timestamp), timestamp DESC

---

## Next Steps After Setup

1. **Test the connection in your Next.js app**
   ```typescript
   // Test in your API route or page
   import { prisma } from '@/lib/prisma'

   const users = await prisma.user.findMany()
   console.log(users)
   ```

2. **Create seed data** (optional)
   - Create `prisma/seed.ts` to populate initial data
   - Add predefined ETFs and sample stocks

3. **Set up Alpha Vantage API**
   - Get your API key from https://www.alphavantage.co/
   - Update `.env.local` with your key

4. **Start your development server**
   ```bash
   npm run dev
   ```

5. **Build authentication**
   - Implement user registration
   - Set up NextAuth.js with your User model

---

## Troubleshooting

### PostgreSQL won't start
```bash
brew services restart postgresql@15
```

### Database doesn't exist
```bash
createdb stock_bundler
```

### Can't connect
```bash
# Check if PostgreSQL is running
brew services list | grep postgresql

# Test connection
psql postgres
```

### Migration fails
```bash
# Validate schema
npx prisma validate

# Check DATABASE_URL
cat .env.local | grep DATABASE_URL

# Reset and try again (WARNING: Deletes data)
npx prisma migrate reset
```

### Need to start over
```bash
# Stop PostgreSQL
brew services stop postgresql@15

# Drop database
dropdb stock_bundler

# Recreate
createdb stock_bundler

# Run migrations again
npx prisma migrate dev
```

---

## Important Commands Summary

```bash
# Start PostgreSQL
brew services start postgresql@15

# Stop PostgreSQL
brew services stop postgresql@15

# Create database
createdb stock_bundler

# Run migrations
npx prisma migrate dev --name add_performance_indexes

# Generate Prisma Client
npx prisma generate

# Open database GUI
npx prisma studio

# Verify setup
./verify-database.sh

# Connect via psql
psql -d stock_bundler
```

---

## Files Created for You

1. **`.env.local`** - Environment configuration with DATABASE_URL
2. **`setup-database.sh`** - Automated setup script
3. **`verify-database.sh`** - Database verification script
4. **`DATABASE_SETUP.md`** - Complete documentation
5. **`DATABASE_QUICK_REFERENCE.md`** - Quick command reference
6. **`SETUP_INSTRUCTIONS.md`** - This file

All files are located in: `/Users/prathameshjagtap/Projects/stock-bundler/`

---

## Support Resources

- **Prisma Documentation**: https://www.prisma.io/docs/
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/15/
- **Next.js + Prisma Guide**: https://www.prisma.io/nextjs
- **PostgreSQL on macOS**: https://wiki.postgresql.org/wiki/Homebrew

---

## Database Administration Best Practices

1. **Regular Backups**
   ```bash
   pg_dump stock_bundler > backup_$(date +%Y%m%d).sql
   ```

2. **Monitor Performance**
   ```bash
   npx prisma studio
   # Check slow queries in PostgreSQL logs
   ```

3. **Keep Schema in Sync**
   ```bash
   # Always use migrations
   npx prisma migrate dev --name descriptive_name
   ```

4. **Test Before Production**
   ```bash
   # Test migrations in development first
   npx prisma migrate dev

   # Deploy to production
   npx prisma migrate deploy
   ```

---

**Setup Date:** 2025-10-29
**PostgreSQL Version:** 15
**Platform:** macOS (Darwin 21.6.0)
**Project:** Stock Bundler ETF Management Platform

---

## Ready to Go?

Once PostgreSQL installation completes, run:

```bash
./setup-database.sh
```

Or follow the manual steps above. Good luck with your Stock Bundler project!
