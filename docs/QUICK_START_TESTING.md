# Quick Start - Testing Massive.com Migration

**⚡ Fast track to testing the Massive.com API integration**

---

## 1️⃣ Setup Environment (2 minutes)

```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your keys:
nano .env  # or use your preferred editor
```

**Required variables:**
```env
STOCK_DATA_PROVIDER="massive"
MASSIVE_API_KEY="your-actual-massive-api-key"
DATABASE_URL="postgresql://user:password@localhost:5432/stock_bundler"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
CRON_SECRET="generate-with-openssl-rand-base64-32"
```

**Generate secrets:**
```bash
openssl rand -base64 32  # Copy for NEXTAUTH_SECRET
openssl rand -base64 32  # Copy for CRON_SECRET
```

---

## 2️⃣ Install & Start (3 minutes)

```bash
# Install dependencies
npm install

# Setup database
npm run db:push

# Clear build cache
rm -rf .next

# Start dev server
npm run dev
```

**✅ Success indicators:**
- Server starts on `http://localhost:3000`
- Console shows: `[StockProvider] Using provider: massive`
- No compilation errors

---

## 3️⃣ Test Endpoints (5 minutes)

### Test 1: Search Stocks
```bash
curl "http://localhost:3000/api/stocks/search?q=AAPL"
```
**Expected:** JSON with stocks array, source: "database" or "combined"

### Test 2: Get Stock Details
```bash
curl "http://localhost:3000/api/stocks/AAPL"
```
**Expected:** Stock details with price, name, provider: "Massive.com"

### Test 3: Force Refresh
```bash
curl -X POST "http://localhost:3000/api/stocks/AAPL"
```
**Expected:** Fresh data from API

### Test 4: Update Stocks (Cron Job)
```bash
# Get CRON_SECRET from .env
source .env

curl -X POST "http://localhost:3000/api/stocks/update" \
  -H "Authorization: Bearer $CRON_SECRET"
```
**Expected:** Success response with updated count

---

## 4️⃣ Test Rollback (2 minutes)

```bash
# Stop server (Ctrl+C)

# Edit .env - change to:
STOCK_DATA_PROVIDER="alpha_vantage"

# Restart
npm run dev

# Test again
curl "http://localhost:3000/api/stocks/AAPL"
```

**✅ Should work with Alpha Vantage without code changes!**

---

## 🎯 Quick Checklist

- [ ] Environment configured
- [ ] Server starts successfully
- [ ] Search endpoint works
- [ ] Details endpoint works
- [ ] Stock update works
- [ ] Rollback to Alpha Vantage works
- [ ] Switch back to Massive.com works

---

## 🚨 Troubleshooting

### Server won't start
```bash
# Clear cache and rebuild
rm -rf .next node_modules/.cache
npm install
npm run dev
```

### "API key not configured" error
- Check `.env` file has `MASSIVE_API_KEY`
- No quotes around the key
- Restart server after editing .env

### Database connection errors
```bash
# Verify PostgreSQL is running
psql -U postgres -c "SELECT version();"

# Check DATABASE_URL in .env
# Re-run migrations
npm run db:push
```

### TypeScript errors
```bash
# Clear build cache
rm -rf .next

# Reinstall
npm install

# Check for errors
npx tsc --noEmit
```

---

## 📊 What to Monitor

**Console Logs:**
- `[StockProvider] Using provider: massive` ✅
- `[Massive] Cache hit for quote: AAPL` ✅ (cache working)
- `[Massive] Fetching quote for AAPL` ✅ (API call)

**Performance:**
- First request: 200-500ms (API call)
- Cached request: < 50ms (cache hit)
- Search: < 200ms

**Red Flags:**
- `MassiveApiError: INVALID_KEY` ❌ (check API key)
- `Rate limit exceeded` ❌ (shouldn't happen with Stocks Starter)
- Network errors ❌ (check internet/firewall)

---

## 🎓 Understanding the Flow

### Stock Search Flow
```
1. User searches "AAPL"
   ↓
2. Check local database first (fast)
   ↓
3. If < 5 results → Search Massive.com API
   ↓
4. Add new stocks to database
   ↓
5. Return combined results
```

### Stock Details Flow
```
1. User requests /api/stocks/AAPL
   ↓
2. Check cache (5-min TTL)
   ↓
3. If cached → Return immediately
   ↓
4. If stale → Fetch from Massive.com API
   ↓
5. Update database & cache
   ↓
6. Return fresh data
```

### Provider Switching
```
Change STOCK_DATA_PROVIDER in .env
   ↓
Restart server
   ↓
getStockProvider() returns different provider
   ↓
All code works the same way!
```

---

## 🔗 Next Steps

After basic testing works:

1. **Full Testing:** See [MIGRATION_IMPLEMENTATION_STATUS.md](./planning/MIGRATION_IMPLEMENTATION_STATUS.md)
2. **Performance Testing:** Monitor cache hit rates
3. **Load Testing:** Test with multiple stocks
4. **Deployment:** Follow deployment checklist

---

## 📞 Need Help?

1. Check console logs for error details
2. Review [MASSIVE_API_MIGRATION_PLAN.md](./planning/MASSIVE_API_MIGRATION_PLAN.md)
3. Check Massive.com docs: https://massive.com/docs/stocks
4. Verify API key at: https://massive.com/dashboard

---

**Ready to test?** Start with Step 1! 🚀
