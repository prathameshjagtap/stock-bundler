#!/bin/bash
# Stock Bundler PostgreSQL Setup Script
# This script automates the PostgreSQL database setup for local development

set -e  # Exit on error

echo "=================================================="
echo "Stock Bundler - PostgreSQL Setup"
echo "=================================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check if PostgreSQL is installed
echo "Step 1: Checking PostgreSQL installation..."
if command -v psql &> /dev/null; then
    echo -e "${GREEN}PostgreSQL is already installed${NC}"
    psql --version
else
    echo -e "${YELLOW}PostgreSQL not found. Installing via Homebrew...${NC}"
    if command -v brew &> /dev/null; then
        brew install postgresql@15
        echo -e "${GREEN}PostgreSQL 15 installed successfully${NC}"
    else
        echo -e "${RED}Error: Homebrew not found. Please install Homebrew first.${NC}"
        exit 1
    fi
fi
echo ""

# Step 2: Start PostgreSQL service
echo "Step 2: Starting PostgreSQL service..."
brew services start postgresql@15
sleep 3
echo -e "${GREEN}PostgreSQL service started${NC}"
echo ""

# Step 3: Add PostgreSQL to PATH
echo "Step 3: Setting up PATH..."
export PATH="/usr/local/opt/postgresql@15/bin:$PATH"
echo -e "${GREEN}PostgreSQL added to PATH${NC}"
echo ""

# Step 4: Initialize database cluster (if needed)
echo "Step 4: Checking database cluster..."
if [ ! -d "/usr/local/var/postgresql@15" ]; then
    echo "Initializing database cluster..."
    initdb /usr/local/var/postgresql@15
fi
echo -e "${GREEN}Database cluster ready${NC}"
echo ""

# Step 5: Create database user (if not using default postgres user)
echo "Step 5: Setting up database user..."
echo "Using default postgres user for development"
echo ""

# Step 6: Create stock_bundler database
echo "Step 6: Creating stock_bundler database..."
if psql postgres -lqt | cut -d \| -f 1 | grep -qw stock_bundler; then
    echo -e "${YELLOW}Database 'stock_bundler' already exists${NC}"
else
    createdb stock_bundler
    echo -e "${GREEN}Database 'stock_bundler' created successfully${NC}"
fi
echo ""

# Step 7: Verify database connection
echo "Step 7: Verifying database connection..."
if psql -d stock_bundler -c "SELECT version();" > /dev/null 2>&1; then
    echo -e "${GREEN}Database connection successful${NC}"
    psql -d stock_bundler -c "SELECT version();" | head -3
else
    echo -e "${RED}Error: Cannot connect to database${NC}"
    exit 1
fi
echo ""

# Step 8: Check for .env.local file
echo "Step 8: Checking environment configuration..."
if [ -f ".env.local" ]; then
    echo -e "${GREEN}.env.local file exists${NC}"
    echo "DATABASE_URL is configured"
else
    echo -e "${YELLOW}Warning: .env.local not found${NC}"
    echo "Please create .env.local with DATABASE_URL"
fi
echo ""

# Step 9: Install Prisma dependencies
echo "Step 9: Checking Prisma installation..."
if [ -f "package.json" ]; then
    if npm list prisma &> /dev/null; then
        echo -e "${GREEN}Prisma is installed${NC}"
    else
        echo -e "${YELLOW}Installing Prisma...${NC}"
        npm install
    fi
else
    echo -e "${YELLOW}No package.json found. Run 'npm install' manually.${NC}"
fi
echo ""

# Step 10: Run Prisma migrations
echo "Step 10: Running Prisma migrations..."
echo -e "${YELLOW}Ready to run: npx prisma migrate dev --name add_performance_indexes${NC}"
echo ""
echo "=================================================="
echo "Setup Complete!"
echo "=================================================="
echo ""
echo "Next steps:"
echo "1. Run: npx prisma migrate dev --name add_performance_indexes"
echo "2. Run: npx prisma generate"
echo "3. (Optional) Run: npx prisma studio  # To view database in browser"
echo ""
echo "Database Information:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: stock_bundler"
echo "  User: postgres (default)"
echo "  Connection String: postgresql://postgres:postgres@localhost:5432/stock_bundler?schema=public"
echo ""
echo "Useful Commands:"
echo "  - Start PostgreSQL: brew services start postgresql@15"
echo "  - Stop PostgreSQL: brew services stop postgresql@15"
echo "  - Restart PostgreSQL: brew services restart postgresql@15"
echo "  - Check status: brew services list | grep postgresql"
echo "  - Access psql: psql -d stock_bundler"
echo ""
