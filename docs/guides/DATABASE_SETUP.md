# PostgreSQL Database Setup Guide
## Stock Bundler ETF Management Platform

---

## Quick Start

```bash
# 1. Run the automated setup script
./setup-database.sh

# 2. Run Prisma migrations
npx prisma migrate dev --name add_performance_indexes

# 3. Generate Prisma Client
npx prisma generate

# 4. (Optional) Open Prisma Studio to view your database
npx prisma studio
```

---

## Manual Installation Steps

### 1. Install PostgreSQL on macOS

```bash
# Using Homebrew (Recommended)
brew install postgresql@15

# Add to PATH (add to ~/.zshrc or ~/.bash_profile for persistence)
export PATH="/usr/local/opt/postgresql@15/bin:$PATH"

# Reload shell configuration
source ~/.zshrc  # or source ~/.bash_profile
```

### 2. Start PostgreSQL Service

```bash
# Start PostgreSQL service (runs in background)
brew services start postgresql@15

# Verify PostgreSQL is running
brew services list | grep postgresql

# Expected output:
# postgresql@15 started username ~/Library/LaunchAgents/...
```

### 3. Create Database

```bash
# Create the stock_bundler database
createdb stock_bundler

# Verify database creation
psql -l | grep stock_bundler
```

### 4. Configure Environment Variables

Create `.env.local` file in your project root:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/stock_bundler?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="lkElowEO3jlKm0l/p6iuvjKOXkh+GIioTeMwjTmb9qE="

# Alpha Vantage API
ALPHA_VANTAGE_API_KEY="your-alpha-vantage-api-key"

# Development mode
NODE_ENV="development"
```

**Important Notes:**
- The DATABASE_URL uses default PostgreSQL credentials (user: postgres, password: postgres)
- For production, use strong passwords and secure credentials
- The NEXTAUTH_SECRET has been generated for you using `openssl rand -base64 32`
- Replace `ALPHA_VANTAGE_API_KEY` with your actual API key

### 5. Install Dependencies

```bash
# Install all Node.js dependencies including Prisma
npm install

# Verify Prisma installation
npx prisma --version
```

### 6. Run Database Migrations

```bash
# Create and apply the migration with performance indexes
npx prisma migrate dev --name add_performance_indexes

# This will:
# - Create migration files in prisma/migrations/
# - Execute SQL to create all tables and indexes
# - Generate Prisma Client automatically
```

### 7. Generate Prisma Client

```bash
# Generate Prisma Client (if not done automatically)
npx prisma generate

# This creates the type-safe database client in node_modules/@prisma/client
```

### 8. Verify Setup

```bash
# Connect to database using psql
psql -d stock_bundler

# Inside psql, run these commands:
\dt              # List all tables
\d+ "User"       # Describe User table
\di              # List all indexes
\q               # Quit psql

# Or use Prisma Studio (GUI database browser)
npx prisma studio
# Opens at http://localhost:5555
```

---

## Database Schema Overview

Your Stock Bundler database includes:

### Tables

1. **User** - User authentication and profiles
   - Indexes: email, createdAt

2. **Stock** - Individual stock information
   - Indexes: symbol, sector, lastUpdated, currentPrice

3. **ETF** - ETF definitions (predefined and custom)
   - Indexes: ticker, isCustom, createdBy, lastUpdated
   - Composite index: (isCustom, createdBy)

4. **ETFComposition** - Stocks within ETFs (many-to-many)
   - Indexes: etfId, stockId
   - Composite index: (etfId, weight DESC)

5. **UserETF** - User's saved ETFs
   - Indexes: userId, etfId
   - Composite index: (userId, savedAt DESC)

6. **PriceHistory** - Historical stock prices
   - Indexes: (stockId, timestamp), timestamp DESC

7. **ETFHistory** - Historical ETF values
   - Indexes: (etfId, timestamp), timestamp DESC

### Performance Optimizations

The schema includes 11 performance indexes:
- Single-column indexes for frequently queried fields
- Composite indexes for common query patterns
- Descending indexes for sorting operations
- Indexes on foreign keys for join performance

---

## Common Commands

### PostgreSQL Service Management

```bash
# Start PostgreSQL
brew services start postgresql@15

# Stop PostgreSQL
brew services stop postgresql@15

# Restart PostgreSQL
brew services restart postgresql@15

# Check service status
brew services list | grep postgresql
```

### Database Operations

```bash
# List all databases
psql -l

# Connect to stock_bundler database
psql -d stock_bundler

# Create database backup
pg_dump stock_bundler > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore database from backup
psql -d stock_bundler < backup_20250101_120000.sql

# Drop and recreate database (CAUTION: Deletes all data)
dropdb stock_bundler
createdb stock_bundler
```

### Prisma Commands

```bash
# Create a new migration
npx prisma migrate dev --name migration_name

# Apply migrations in production
npx prisma migrate deploy

# Reset database (CAUTION: Deletes all data)
npx prisma migrate reset

# Generate Prisma Client
npx prisma generate

# Open Prisma Studio
npx prisma studio

# Format schema file
npx prisma format

# Validate schema
npx prisma validate

# Pull database schema into Prisma schema
npx prisma db pull

# Push schema changes without migration (dev only)
npx prisma db push
```

---

## Troubleshooting

### Issue: PostgreSQL not starting

```bash
# Check if port 5432 is already in use
lsof -i :5432

# If another process is using it, kill it or change PostgreSQL port
# To change port, edit: /usr/local/var/postgresql@15/postgresql.conf

# Remove old PID file if exists
rm /usr/local/var/postgresql@15/postmaster.pid

# Try starting again
brew services restart postgresql@15
```

### Issue: Cannot connect to database

```bash
# Verify PostgreSQL is running
brew services list | grep postgresql

# Check connection with psql
psql postgres

# If you get "role does not exist" error:
createuser -s postgres

# Test connection string
psql "postgresql://postgres:postgres@localhost:5432/stock_bundler"
```

### Issue: Database does not exist

```bash
# List all databases
psql -l

# Create stock_bundler database
createdb stock_bundler

# Or create via psql
psql postgres -c "CREATE DATABASE stock_bundler;"
```

### Issue: Permission denied

```bash
# Fix database ownership
psql postgres -c "ALTER DATABASE stock_bundler OWNER TO postgres;"

# Grant all privileges
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE stock_bundler TO postgres;"
```

### Issue: Prisma migration fails

```bash
# Check DATABASE_URL in .env.local
cat .env.local | grep DATABASE_URL

# Validate Prisma schema
npx prisma validate

# Reset database and try again (CAUTION: Deletes all data)
npx prisma migrate reset
npx prisma migrate dev

# If still failing, check migration status
npx prisma migrate status
```

### Issue: Port 5432 already in use

```bash
# Find process using port 5432
lsof -i :5432

# Kill the process (replace PID with actual process ID)
kill -9 PID

# Or change PostgreSQL port in postgresql.conf
# Edit: /usr/local/var/postgresql@15/postgresql.conf
# Change: port = 5433 (or any available port)
# Update DATABASE_URL in .env.local accordingly
```

### Issue: Too many connections

```bash
# Check current connections
psql -d stock_bundler -c "SELECT count(*) FROM pg_stat_activity;"

# Terminate idle connections
psql -d stock_bundler -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='stock_bundler' AND state='idle';"

# Increase max_connections in postgresql.conf (requires restart)
# Edit: /usr/local/var/postgresql@15/postgresql.conf
# Change: max_connections = 100 (default is 100)
```

---

## Performance Monitoring

### Check Query Performance

```sql
-- Connect to database
psql -d stock_bundler

-- Enable query timing
\timing

-- Analyze query execution plan
EXPLAIN ANALYZE SELECT * FROM "Stock" WHERE symbol = 'AAPL';

-- Check slow queries (requires pg_stat_statements extension)
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### Database Statistics

```sql
-- Database size
SELECT pg_size_pretty(pg_database_size('stock_bundler'));

-- Table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Active connections
SELECT * FROM pg_stat_activity WHERE datname = 'stock_bundler';
```

---

## Production Deployment Considerations

### Security

1. **Use strong passwords**
   ```env
   DATABASE_URL="postgresql://secure_user:strong_password@localhost:5432/stock_bundler"
   ```

2. **Enable SSL/TLS**
   ```env
   DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
   ```

3. **Restrict network access**
   - Configure `pg_hba.conf` to limit connections
   - Use firewall rules to restrict port 5432

4. **Regular backups**
   ```bash
   # Automated daily backups
   0 2 * * * pg_dump stock_bundler > /backups/stock_bundler_$(date +\%Y\%m\%d).sql
   ```

### Performance

1. **Connection pooling**
   - Use PgBouncer or Prisma's connection pooling
   - Configure pool size based on application needs

2. **Regular maintenance**
   ```sql
   -- Analyze tables for query planner
   ANALYZE;

   -- Vacuum to reclaim space
   VACUUM ANALYZE;

   -- Reindex if needed
   REINDEX DATABASE stock_bundler;
   ```

3. **Monitor and optimize**
   - Enable pg_stat_statements for query analysis
   - Set up monitoring with tools like pgAdmin, DataDog, or Prometheus
   - Review and optimize slow queries

### High Availability

1. **Replication setup**
   - Configure streaming replication for failover
   - Set up read replicas for load distribution

2. **Backup strategy**
   - Implement automated backups
   - Test recovery procedures regularly
   - Store backups offsite

3. **Monitoring and alerting**
   - Set up alerts for connection limits
   - Monitor disk space and performance
   - Track replication lag

---

## Next Steps

1. **Seed Initial Data**
   - Create a seed script to populate initial stocks and ETFs
   - Location: `/Users/prathameshjagtap/Projects/stock-bundler/prisma/seed.ts`

2. **Set up API Integration**
   - Configure Alpha Vantage API key
   - Test stock price fetching

3. **Implement Authentication**
   - Configure NextAuth.js
   - Set up user registration and login

4. **Testing**
   - Write database tests
   - Test migrations in staging environment

5. **Documentation**
   - Document your database schema
   - Create API documentation

---

## Resources

- [Prisma Documentation](https://www.prisma.io/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PostgreSQL Homebrew Formula](https://formulae.brew.sh/formula/postgresql@15)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)

---

## Support

For issues specific to this project, please refer to:
- Project repository issues
- Prisma schema file: `/Users/prathameshjagtap/Projects/stock-bundler/prisma/schema.prisma`
- Environment config: `/Users/prathameshjagtap/Projects/stock-bundler/.env.local`

---

**Last Updated:** 2025-10-29
**PostgreSQL Version:** 15
**Prisma Version:** Latest
**Platform:** macOS (Darwin 21.6.0)
