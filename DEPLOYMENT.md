# Deployment Guide: Stock Bundler

This guide covers how to deploy the Stock Bundler application to **Vercel** (Frontend & API) and **Supabase** (Database).

## Prerequisites

- [Vercel Account](https://vercel.com/signup)
- [Supabase Account](https://supabase.com/dashboard/sign-up)
- [Alpha Vantage API Key](https://www.alphavantage.co/support/#api-key)
- [GitHub Account](https://github.com/) (required for automated deployment)

## Quick Start: Automated GitHub Actions Deployment

This repository includes a GitHub Actions workflow for automatic deployments. Follow these steps:

### 1. Create a Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Configure the project (Next.js will be auto-detected)
5. **Important**: Do NOT deploy yet - just create the project

### 2. Get Vercel Credentials

1. **VERCEL_TOKEN**: Go to [Vercel Tokens](https://vercel.com/account/tokens) → Create a new token
2. **VERCEL_ORG_ID**: Go to Vercel Dashboard → Settings → General → copy "Vercel ID"
3. **VERCEL_PROJECT_ID**: Go to your project → Settings → General → copy "Project ID"

### 3. Add GitHub Secrets

Go to your GitHub repo → Settings → Secrets and variables → Actions → New repository secret:

- `VERCEL_TOKEN` - Your Vercel API token
- `VERCEL_ORG_ID` - Your Vercel Organization/Account ID  
- `VERCEL_PROJECT_ID` - Your Vercel Project ID

### 4. Add Vercel Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables, add:

| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | Supabase Transaction Pooler URL (port 6543) |
| `DIRECT_URL` | Supabase Direct Connection URL (port 5432) |
| `NEXTAUTH_SECRET` | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Your Vercel deployment URL |
| `ALPHA_VANTAGE_API_KEY` | Your Alpha Vantage API Key |
| `CRON_SECRET` | Secret for securing cron jobs |

### 5. Deploy

Push to the `main` branch - GitHub Actions will automatically deploy to production!

---

## Manual Deployment (Alternative)

## 1. Database Setup (Supabase)

1.  **Create a new project** in Supabase.
2.  Go to **Project Settings > Database**.
3.  Copy the **Connection String (URI)**.
    -   You will need two versions:
        -   **Transaction Pooler**: Use port `6543` (usually displayed as "Transaction" mode).
        -   **Session Pooler / Direct**: Use port `5432` (usually displayed as "Session" mode).
4.  Go to **SQL Editor** and run the following to ensure extensions are enabled (optional but recommended):
    ```sql
    create extension if not exists "uuid-ossp";
    ```

## 2. Application Deployment (Vercel)

1.  **Push your code** to a GitHub repository.
2.  **Import the project** in Vercel.
3.  **Configure Project Settings**:
    -   **Framework Preset**: Next.js
    -   **Root Directory**: `./` (default)
    -   **Build Command**: `next build` (default)
    -   **Output Directory**: `.next` (default)
    -   **Install Command**: `npm install` (default)

4.  **Environment Variables**:
    Add the following environment variables in the Vercel dashboard:

    | Variable | Description | Example Value |
    | :--- | :--- | :--- |
    | `DATABASE_URL` | Supabase Transaction Pooler URL | `postgres://[user]:[pass]@aws-0-[region].pooler.supabase.com:6543/[db]` |
    | `DIRECT_URL` | Supabase Direct Connection URL | `postgres://[user]:[pass]@aws-0-[region].pooler.supabase.com:5432/[db]` |
    | `NEXTAUTH_SECRET` | Random string for encryption | `openssl rand -base64 32` |
    | `NEXTAUTH_URL` | Your Vercel deployment URL | `https://your-project.vercel.app` |
    | `ALPHA_VANTAGE_API_KEY` | Alpha Vantage API Key | `YOUR_API_KEY` |
    | `CRON_SECRET` | Secret for securing cron jobs | `some-random-secret-string` |

5.  **Deploy**: Click **Deploy**.
    -   Vercel will automatically run `npm install`, `prisma generate` (via postinstall), and `next build`.
    -   If the build fails due to database connection, ensure your IP is allowed in Supabase or "Allow all IPs" is checked (temporarily).

## 3. Database Migration

After deployment, you need to push your schema to the production database. You can do this from your local machine or via a Vercel build command (advanced).

**Option A: From Local Machine (Recommended)**

1.  Create a `.env.production` file locally with your production Supabase credentials:
    ```env
    DATABASE_URL="postgres://[user]:[pass]@aws-0-[region].pooler.supabase.com:6543/[db]"
    DIRECT_URL="postgres://[user]:[pass]@aws-0-[region].pooler.supabase.com:5432/[db]"
    ```
2.  Run the migration command:
    ```bash
    npx dotenv -e .env.production -- npx prisma migrate deploy
    ```

## 4. Cron Job Setup

The application uses Vercel Cron Jobs to update stock prices.

1.  The `vercel.json` file is already configured to run `/api/stocks/update` every 15 minutes.
2.  Vercel automatically detects this configuration.
3.  **Security**: Ensure `CRON_SECRET` is set in Vercel Environment Variables. The API route checks for this header to prevent unauthorized access.

## 5. Verification

1.  Visit your deployed URL.
2.  Sign up/Login.
3.  Create a custom ETF.
4.  Check if stock prices are updating (wait for the cron job or trigger manually if you implemented a manual trigger).
