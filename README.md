# Stock Bundler - ETF Management Platform

A comprehensive web application for managing and creating custom ETFs (Exchange-Traded Funds) with different weighting strategies.

## Features

- **Browse ETFs**: View predefined popular ETFs (SPY, QQQ, DIA, VTI) with their compositions
- **Custom ETF Creation**: Build your own ETFs with custom stock selections
- **Weighting Methods**:
  - Market Cap Weighted
  - Price Weighted
  - Equal Weighted
- **ETF Management**: Add or remove stocks from custom ETFs
- **Real-time Data**: Stock prices updated every 15 minutes via Alpha Vantage API
- **User Authentication**: Secure login and registration with NextAuth.js
- **Portfolio Tracking**: Save and manage your custom ETFs

## Tech Stack

- **Frontend**: React.js with Next.js 14 (App Router)
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Stock Data**: Alpha Vantage API
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js 20.9.0 or higher
- PostgreSQL database
- npm or yarn package manager

## Installation

1. **Clone the repository**
   ```bash
   cd stock-bundler
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Copy the `.env.example` file to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

   Fill in your environment variables:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/stock_bundler?schema=public"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key-here"
   ALPHA_VANTAGE_API_KEY="your-alpha-vantage-api-key"
   CRON_SECRET="your-cron-secret-key"
   ```

   **Getting API Keys:**
   - **Alpha Vantage**: Sign up at [Alpha Vantage](https://www.alphavantage.co/support/#api-key) to get a free API key
   - **NEXTAUTH_SECRET**: Generate with `openssl rand -base64 32`
   - **CRON_SECRET**: Generate with `openssl rand -base64 32`

4. **Set up the database**

   Create a PostgreSQL database:
   ```bash
   createdb stock_bundler
   ```

   Run Prisma migrations:
   ```bash
   npx prisma migrate dev --name init
   ```

   Generate Prisma Client:
   ```bash
   npx prisma generate
   ```

5. **Seed the database**

   Populate the database with initial ETF data:
   ```bash
   npm run db:seed
   ```

## Running the Application

### Development Mode

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
npm run build
npm start
```

## Database Management

- **View database in Prisma Studio**:
  ```bash
  npm run db:studio
  ```

- **Create a new migration**:
  ```bash
  npm run db:migrate
  ```

- **Push schema changes without migration**:
  ```bash
  npm run db:push
  ```

## Project Structure

```
stock-bundler/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API routes
│   │   │   ├── auth/            # Authentication endpoints
│   │   │   ├── etfs/            # ETF CRUD operations
│   │   │   └── stocks/          # Stock data endpoints
│   │   ├── auth/                # Auth pages (login, register)
│   │   ├── dashboard/           # Main dashboard
│   │   ├── etfs/                # ETF pages (detail, create)
│   │   └── layout.tsx           # Root layout
│   ├── components/              # Reusable React components
│   │   ├── Navbar.tsx
│   │   └── ETFCard.tsx
│   ├── lib/                     # Utility functions
│   │   ├── db.ts               # Prisma client
│   │   ├── stockApi.ts         # Alpha Vantage integration
│   │   └── etfCalculations.ts # ETF weighting algorithms
│   └── types/                   # TypeScript type definitions
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── seed.ts                 # Database seed script
└── public/                      # Static assets
```

## Key Features Explained

### ETF Weighting Methods

1. **Market Cap Weighted**
   - Stocks are weighted proportionally to their market capitalization
   - Larger companies have higher weights
   - Most common in index funds (e.g., S&P 500)

2. **Price Weighted**
   - Stocks are weighted by their share price
   - Higher-priced stocks have more influence
   - Used by the Dow Jones Industrial Average

3. **Equal Weighted**
   - All stocks have the same weight regardless of size or price
   - Provides balanced exposure to all holdings

### Stock Data Updates

The application uses a cron job to update stock prices every 15 minutes during market hours:
- Configured in `vercel.json` for Vercel deployment
- API endpoint: `/api/stocks/update`
- Rate-limited to comply with Alpha Vantage API limits

### Database Schema

The application uses 7 main tables:
- **User**: User accounts and authentication
- **Stock**: Individual stock information
- **ETF**: ETF definitions (predefined and custom)
- **ETFComposition**: Stock holdings within ETFs
- **UserETF**: User's saved ETFs
- **PriceHistory**: Historical stock prices
- **ETFHistory**: Historical ETF values

## API Routes

### Authentication
- `POST /api/auth/register` - Create new user account
- `POST /api/auth/[...nextauth]` - NextAuth.js endpoints

### ETFs
- `GET /api/etfs` - List all ETFs
- `POST /api/etfs` - Create custom ETF
- `GET /api/etfs/[id]` - Get ETF details
- `PATCH /api/etfs/[id]` - Update ETF composition
- `DELETE /api/etfs/[id]` - Delete custom ETF

### Stocks
- `GET /api/stocks/search?q=query` - Search stocks
- `POST /api/stocks/update` - Update stock prices (cron job)

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

The cron job will automatically run based on `vercel.json` configuration.

### Other Platforms

For other platforms, set up a cron job to call `/api/stocks/update` every 15 minutes with the `CRON_SECRET` in the Authorization header:

```bash
curl -X POST https://your-domain.com/api/stocks/update \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Development Tips

1. **Alpha Vantage Rate Limits**
   - Free tier: 5 API calls per minute, 500 per day
   - The application implements automatic rate limiting
   - Consider upgrading for production use

2. **Database Optimization**
   - Indexes are defined in the Prisma schema
   - Use `EXPLAIN ANALYZE` for query optimization
   - Consider adding Redis for caching in production

3. **Testing**
   - Test authentication flows thoroughly
   - Verify ETF calculations with known values
   - Monitor API rate limits during development

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check `DATABASE_URL` in `.env.local`
- Run `npx prisma migrate reset` to reset database

### Stock Data Not Updating
- Verify `ALPHA_VANTAGE_API_KEY` is valid
- Check API rate limits
- Review logs for error messages

### Authentication Issues
- Regenerate `NEXTAUTH_SECRET`
- Clear browser cookies
- Verify `NEXTAUTH_URL` matches your domain

## Future Enhancements

- [ ] Historical performance charts
- [ ] Portfolio value tracking over time
- [ ] Email notifications for price changes
- [ ] Export ETF data to CSV
- [ ] Social sharing of custom ETFs
- [ ] Advanced filtering and sorting
- [ ] Mobile app version
- [ ] Real-time WebSocket updates

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please open an issue on GitHub.

---

Built with Next.js, Prisma, and Alpha Vantage API
