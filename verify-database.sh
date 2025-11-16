#!/bin/bash
# Database Verification Script for Stock Bundler

echo "=========================================="
echo "Stock Bundler Database Verification"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Track overall status
ERRORS=0

# 1. Check PostgreSQL installation
echo -n "1. PostgreSQL installed: "
if command -v psql &> /dev/null; then
    echo -e "${GREEN}YES${NC}"
    psql --version
else
    echo -e "${RED}NO${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 2. Check PostgreSQL service
echo -n "2. PostgreSQL service running: "
if brew services list | grep postgresql@15 | grep started &> /dev/null; then
    echo -e "${GREEN}YES${NC}"
else
    echo -e "${RED}NO${NC}"
    echo "   Run: brew services start postgresql@15"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 3. Check database exists
echo -n "3. Database 'stock_bundler' exists: "
if psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw stock_bundler; then
    echo -e "${GREEN}YES${NC}"
else
    echo -e "${RED}NO${NC}"
    echo "   Run: createdb stock_bundler"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 4. Check .env.local file
echo -n "4. Environment file (.env.local) exists: "
if [ -f ".env.local" ]; then
    echo -e "${GREEN}YES${NC}"
    if grep -q "DATABASE_URL" .env.local; then
        echo "   DATABASE_URL is configured"
    else
        echo -e "   ${YELLOW}Warning: DATABASE_URL not found${NC}"
    fi
else
    echo -e "${RED}NO${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 5. Check database connection
echo -n "5. Database connection: "
if psql -d stock_bundler -c "SELECT 1;" &> /dev/null; then
    echo -e "${GREEN}SUCCESS${NC}"
else
    echo -e "${RED}FAILED${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 6. Check Prisma installation
echo -n "6. Prisma installed: "
if [ -f "node_modules/.bin/prisma" ] || command -v prisma &> /dev/null; then
    echo -e "${GREEN}YES${NC}"
    npx prisma --version | head -1
else
    echo -e "${YELLOW}NO${NC}"
    echo "   Run: npm install"
fi
echo ""

# 7. Check for migrations
echo -n "7. Prisma migrations exist: "
if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations)" ]; then
    echo -e "${GREEN}YES${NC}"
    echo "   Migrations found: $(ls -1 prisma/migrations | wc -l | xargs)"
else
    echo -e "${YELLOW}NO${NC}"
    echo "   Run: npx prisma migrate dev --name add_performance_indexes"
fi
echo ""

# 8. Check tables in database
echo -n "8. Database tables created: "
TABLE_COUNT=$(psql -d stock_bundler -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)
if [ "$TABLE_COUNT" -gt 0 ]; then
    echo -e "${GREEN}YES ($TABLE_COUNT tables)${NC}"
    psql -d stock_bundler -c "\dt" 2>/dev/null | grep "public" | awk '{print "   - " $2}'
else
    echo -e "${YELLOW}NO${NC}"
    echo "   Run migrations first: npx prisma migrate dev"
fi
echo ""

# Summary
echo "=========================================="
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}All checks passed!${NC}"
    echo ""
    echo "Your database is ready to use."
    echo ""
    echo "Next steps:"
    echo "  - Run: npm run dev (to start your application)"
    echo "  - Run: npx prisma studio (to view database in browser)"
else
    echo -e "${RED}Found $ERRORS error(s)${NC}"
    echo ""
    echo "Please fix the issues above and run this script again."
    echo ""
    echo "Quick fix:"
    echo "  ./setup-database.sh"
fi
echo "=========================================="
