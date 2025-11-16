# Database Quick Reference
## Stock Bundler - PostgreSQL Commands

---

## Installation & Setup (One-Time)

```bash
# Automated setup
./setup-database.sh

# Manual setup
brew install postgresql@15
brew services start postgresql@15
createdb stock_bundler
npx prisma migrate dev --name add_performance_indexes
npx prisma generate
```

---

## Daily Development Commands

```bash
# Start PostgreSQL
brew services start postgresql@15

# Verify database status
./verify-database.sh

# Open database GUI
npx prisma studio

# View database in terminal
psql -d stock_bundler

# Stop PostgreSQL
brew services stop postgresql@15
```

---

## Prisma Commands

```bash
# Run migrations
npx prisma migrate dev

# Generate client
npx prisma generate

# Reset database (WARNING: Deletes all data)
npx prisma migrate reset

# View database
npx prisma studio

# Format schema
npx prisma format

# Check schema
npx prisma validate
```

---

## PostgreSQL Commands (in psql)

```sql
-- Connect to database
psql -d stock_bundler

-- List tables
\dt

-- Describe table
\d "User"
\d "Stock"
\d "ETF"

-- List indexes
\di

-- View table data
SELECT * FROM "User" LIMIT 10;
SELECT * FROM "Stock" LIMIT 10;

-- Count records
SELECT COUNT(*) FROM "Stock";
SELECT COUNT(*) FROM "ETF";

-- Check database size
\l+

-- Quit
\q
```

---

## Troubleshooting

```bash
# PostgreSQL won't start
brew services restart postgresql@15
rm /usr/local/var/postgresql@15/postmaster.pid

# Can't connect to database
psql postgres
createdb stock_bundler

# Port already in use
lsof -i :5432
kill -9 <PID>

# Reset everything (WARNING: Deletes all data)
dropdb stock_bundler
createdb stock_bundler
npx prisma migrate reset
```

---

## Connection Information

```
Host: localhost
Port: 5432
Database: stock_bundler
User: postgres
Password: postgres (default)

Connection String:
postgresql://postgres:postgres@localhost:5432/stock_bundler?schema=public
```

---

## File Locations

```
Schema: /Users/prathameshjagtap/Projects/stock-bundler/prisma/schema.prisma
Environment: /Users/prathameshjagtap/Projects/stock-bundler/.env.local
Migrations: /Users/prathameshjagtap/Projects/stock-bundler/prisma/migrations/
PostgreSQL Data: /usr/local/var/postgresql@15/
PostgreSQL Config: /usr/local/var/postgresql@15/postgresql.conf
```

---

## Emergency Commands

```bash
# Backup database
pg_dump stock_bundler > backup.sql

# Restore database
psql -d stock_bundler < backup.sql

# Kill all connections
psql -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='stock_bundler';"

# Drop and recreate (WARNING: Deletes all data)
dropdb stock_bundler && createdb stock_bundler
```

---

## Performance Monitoring

```sql
-- Slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC LIMIT 10;

-- Database size
SELECT pg_size_pretty(pg_database_size('stock_bundler'));

-- Table sizes
SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Need Help?

- Full documentation: `DATABASE_SETUP.md`
- Automated setup: `./setup-database.sh`
- Verification: `./verify-database.sh`
- Prisma docs: https://www.prisma.io/docs/
- PostgreSQL docs: https://www.postgresql.org/docs/
