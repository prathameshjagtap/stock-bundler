# Stock Bundler ETF Platform - Master Project Plan

**Version:** 2.0
**Last Updated:** 2025-10-27
**Project Status:** Core Platform Complete, V1.0 Launch Features In Progress

---

## 📊 Executive Summary

### Vision
Build a modern, user-friendly ETF creation and management platform that democratizes portfolio construction by allowing users to create, customize, and track custom ETFs with different weighting strategies.

### Current State
- ✅ **Core Infrastructure:** Complete (Database, Auth, API)
- ✅ **Stock Data System:** Complete (Alpha Vantage integration, auto-updates)
- ✅ **ETF Creation Engine:** Complete (3 weighting methods)
- ✅ **Basic UI:** Complete (Dashboard, ETF creator, editor)
- 🚧 **Portfolio Management:** Not Started (0% complete)
- ⏳ **Analytics & Tracking:** Not Started (0% complete)
- ⏳ **UX Enhancements:** Planned (20% complete)

### Progress Summary
- **Original Plan:** 23/29 tasks complete (79%)
- **Launch Readiness:** 60% (missing critical portfolio & charts features)
- **Technical Debt:** Medium (caching, testing, optimization needed)

---

## 🗺️ Roadmap Overview

```
Current → V1.0 (Launch) → V1.1 (UX Polish) → V1.2 (Growth) → V2.0 (Advanced)
   |          2-3 weeks       2-3 weeks        3-4 weeks       Future
   |
Foundation 79% Complete
```

| Version | Timeline | Focus | Key Deliverables |
|---------|----------|-------|------------------|
| **Foundation** | ✅ 79% Complete | Infrastructure | Auth, Database, Stock Data, ETF Engine |
| **V1.0** | 2-3 weeks | Launch Blockers | Portfolio Dashboard, Performance Charts, Analytics |
| **V1.1** | 2-3 weeks | Critical UX | Education, Onboarding, Mobile, Feedback |
| **V1.2** | 3-4 weeks | Polish & Growth | Advanced Analytics, Community Features |
| **V2.0** | Future | Innovation | Backtesting, Paper Trading, Integrations |

---

## ✅ Foundation Phase (79% COMPLETE)

### Phase 1: Infrastructure & Setup ✅ 100%

| # | Feature | Status | Files/Components |
|---|---------|--------|------------------|
| 1 | Next.js + TypeScript + Tailwind | ✅ Done | `next.config.js`, `tsconfig.json`, `tailwind.config.ts` |
| 2 | PostgreSQL + Prisma ORM | ✅ Done | `prisma/schema.prisma`, `.env.example` |
| 3 | Environment Configuration | ✅ Done | `.env.local`, API keys configured |
| 4 | Database Schema | ✅ Done | Users, Stocks, ETFs, ETF_Compositions, User_ETFs, Price_History |

### Phase 2: Stock Data System ✅ 100%

| # | Feature | Status | Files/Components |
|---|---------|--------|------------------|
| 5 | Alpha Vantage API Integration | ✅ Done | `src/lib/stockApi.ts` |
| 6 | Stock Data Fetcher | ✅ Done | Error handling, rate limiting implemented |
| 7 | Auto-Update Cron Job | ✅ Done | 15-minute intervals, `api/stocks/update/route.ts` |
| 8 | ETF Database Seeding | ✅ Done | SPY, QQQ, DIA, VTI in `prisma/seed.ts` |
| 9 | Stock Data API Routes | ✅ Done | `api/stocks/search/route.ts` |

### Phase 3: Authentication & User Management ✅ 100%

| # | Feature | Status | Files/Components |
|---|---------|--------|------------------|
| 10 | NextAuth.js Setup | ✅ Done | `api/auth/[...nextauth]/route.ts` |
| 11 | Login/Signup Pages | ✅ Done | `app/auth/login/page.tsx`, `app/auth/register/page.tsx` |
| 12 | Protected Routes | ✅ Done | Middleware, route guards |
| 13 | User Profile Management | ✅ Done | User model with hashed passwords |

### Phase 4: ETF Management Engine ✅ 100%

| # | Feature | Status | Files/Components |
|---|---------|--------|------------------|
| 14 | ETF API Routes | ✅ Done | CRUD operations in `api/etfs/` |
| 15 | Weighting Algorithms | ✅ Done | Market cap, Price, Equal in `lib/etfCalculations.ts` |
| 16 | Historical Tracking | ✅ Done | Price_History, ETFHistory tables |

### Phase 5: Core UI Components ⚠️ 78%

| # | Feature | Status | Files/Components |
|---|---------|--------|------------------|
| 17 | Dashboard with ETF Listings | ✅ Done | `app/dashboard/page.tsx` |
| 18 | ETF Detail Pages | ✅ Done | `app/etfs/[id]/page.tsx` |
| 19 | Stock Search Interface | ✅ Done | Search, filter, selection in creator |
| 20 | Custom ETF Creator | ✅ Done | `app/etfs/create/page.tsx` |
| 21 | ETF Editor | ✅ Done | Add/remove stocks in detail page |
| 22 | **User Portfolio Page** | ❌ **NOT DONE** | **CRITICAL GAP** |
| 23 | **Price Comparison Charts** | ❌ **NOT DONE** | **CRITICAL GAP** |
| 24 | Responsive Design | ✅ Done | Tailwind CSS, basic mobile support |

### Phase 6: Optimization & Polish ⚠️ 40%

| # | Feature | Status | Files/Components |
|---|---------|--------|------------------|
| 25 | Database Indexes | ⚠️ Partial | Basic indexes in schema |
| 26 | Caching Strategy | ❌ Not Started | Redis/memory cache needed |
| 27 | Loading States & Error Handling | ✅ Done | Throughout app |
| 28 | Testing Suite | ❌ Not Started | Unit, integration, E2E tests |
| 29 | Documentation | ✅ Done | README.md |

**Foundation Phase Completion:** 23/29 tasks (79%)

---

## 🚀 V1.0 - Launch Blockers (2-3 Weeks)

**Goal:** Complete original plan Phases 22-23 and add essential tracking features.

### Week 1: Portfolio Management

#### 🔴 P0-1: User Portfolio Dashboard (Phase 22)
**Status:** ❌ Not Started
**Effort:** 3-4 days
**Priority:** P0 (Launch Blocker)

**Why It Matters:**
Users can create ETFs but have nowhere to view their saved collection. Backend UserETF table exists but no frontend.

**Current Gap:**
- UserETF model exists in Prisma schema
- No API route to fetch user's saved ETFs
- No portfolio page in app

**Implementation:**
```typescript
// Files to Create
app/portfolio/page.tsx              // Main portfolio dashboard
components/Portfolio/
  ├── PortfolioSummary.tsx         // Stats overview
  ├── SavedETFCard.tsx             // ETF preview card
  ├── PortfolioFilters.tsx         // Filter/sort controls
api/portfolio/route.ts              // GET user's ETFs
```

**Features:**
- [ ] Display all user's saved ETFs in grid layout
- [ ] Show key metrics per ETF (current value, # holdings, weighting method)
- [ ] Quick actions: View details, Edit, Delete
- [ ] Filter by: All, Custom, Saved predefined
- [ ] Sort by: Date created, Name, Performance
- [ ] Empty state with CTA to create first ETF
- [ ] Portfolio summary stats

**API Endpoint:**
```typescript
// GET /api/portfolio
// Returns all UserETF records for authenticated user
// Include ETF details and compositions
```

**Testing:**
- [ ] Can view empty portfolio
- [ ] Can see saved ETFs
- [ ] Can navigate to ETF details
- [ ] Can delete from portfolio

---

#### 🔴 P0-2: Performance Tracking with Charts (Phase 23)
**Status:** ❌ Not Started
**Effort:** 4-5 days
**Priority:** P0 (Launch Blocker)

**Why It Matters:**
Core value proposition is tracking custom portfolio performance. Currently have data collection but no visualization.

**Current State:**
- ETFHistory table exists and collects data
- PriceHistory table tracks stock prices
- No chart library installed
- No performance calculation utilities

**Implementation:**
```typescript
// Install
npm install recharts

// Files to Create
components/Charts/
  ├── PerformanceChart.tsx         // Line chart component
  ├── TimeRangeSelector.tsx        // 1D, 1W, 1M, 3M, YTD, 1Y, All
  ├── PriceChangeIndicator.tsx    // +/- % display
lib/performance/
  ├── calculator.ts                // Return calculations
  ├── historical.ts                // Data fetching
api/performance/[id]/route.ts      // Performance data API
```

**Features:**
- [ ] Line chart showing ETF value over time
- [ ] Time range selector (1D, 1W, 1M, 3M, YTD, 1Y, All)
- [ ] Percentage change indicators (green/red)
- [ ] Tooltip on hover showing exact values
- [ ] Responsive chart sizing
- [ ] Loading states during data fetch
- [ ] Handle missing/incomplete data gracefully

**Performance Metrics:**
```typescript
interface PerformanceData {
  date: Date;
  value: number;
  change: number;        // $ change from previous
  percentChange: number; // % change from previous
}

interface PerformanceMetrics {
  currentValue: number;
  initialValue: number;
  totalReturn: number;        // $ gain/loss
  totalReturnPercent: number; // % gain/loss
  dayChange: number;
  weekChange: number;
  monthChange: number;
  ytdChange: number;
}
```

**Chart Configuration:**
- X-axis: Time (dates)
- Y-axis: ETF Value ($)
- Line color: Green if positive, Red if negative
- Grid lines for readability
- Responsive to container size

**Testing:**
- [ ] Chart renders with sample data
- [ ] Time range selector works
- [ ] Tooltips show correct values
- [ ] Handles empty data
- [ ] Mobile responsive

---

### Week 2: Comparison & Analytics

#### 🔴 P0-3: Benchmark Comparison
**Status:** ❌ Not Started
**Effort:** 2-3 days
**Priority:** P0 (Launch Blocker)

**Why It Matters:**
Users need context - "Is my ETF good?" requires comparison to market benchmarks like SPY.

**Implementation:**
```typescript
// Files to Create
components/Comparison/
  ├── BenchmarkSelector.tsx        // Dropdown to select benchmark
  ├── ComparisonChart.tsx          // Overlay two lines
  ├── RelativeMetrics.tsx          // Show outperformance
lib/comparison/
  ├── benchmarks.ts                // Benchmark data loading
  ├── correlation.ts               // Calculate correlation
api/comparison/route.ts            // Comparison API
```

**Features:**
- [ ] Benchmark selector dropdown (SPY, QQQ, DIA, VTI)
- [ ] Overlay benchmark line on performance chart
- [ ] Show relative performance: "Your ETF vs SPY: +4.2%"
- [ ] Color code: Green if outperforming, Red if underperforming
- [ ] Correlation coefficient display
- [ ] Toggle benchmark on/off

**Comparison Metrics:**
```typescript
interface ComparisonMetrics {
  etfReturn: number;
  benchmarkReturn: number;
  relativeReturn: number;      // Difference
  correlation: number;         // -1 to 1
  outperformanceDays: number;  // Days ETF > benchmark
  underperformanceDays: number;
}
```

**Testing:**
- [ ] Can select different benchmarks
- [ ] Chart shows both lines correctly
- [ ] Metrics calculated accurately
- [ ] Works with different time ranges

---

#### 🔴 P0-4: Basic Analytics Implementation
**Status:** ❌ Not Started
**Effort:** 1 day
**Priority:** P0 (Launch Blocker)

**Why It Matters:**
Need data to understand user behavior and improve product.

**Implementation:**
```typescript
// Install
npm install @vercel/analytics

// Files to Create
lib/analytics/
  ├── tracker.ts                   // Analytics wrapper
  ├── events.ts                    // Event definitions
utils/error-tracking.ts            // Sentry setup (optional)
```

**Events to Track:**
```typescript
enum AnalyticsEvent {
  // ETF Events
  ETF_CREATED = 'etf_created',
  ETF_SAVED = 'etf_saved',
  ETF_EDITED = 'etf_edited',
  ETF_DELETED = 'etf_deleted',

  // User Actions
  WEIGHTING_CHANGED = 'weighting_changed',
  STOCK_ADDED = 'stock_added',
  STOCK_REMOVED = 'stock_removed',

  // Performance
  PERFORMANCE_VIEWED = 'performance_viewed',
  COMPARISON_PERFORMED = 'comparison_performed',
  BENCHMARK_SELECTED = 'benchmark_selected',

  // Navigation
  DASHBOARD_VISITED = 'dashboard_visited',
  PORTFOLIO_VISITED = 'portfolio_visited',
}
```

**Implementation:**
- [ ] Install Vercel Analytics or Mixpanel
- [ ] Create analytics wrapper
- [ ] Add event tracking to key actions
- [ ] Track page views
- [ ] Setup error tracking (optional)

**Testing:**
- [ ] Events fire correctly in dev
- [ ] Events visible in analytics dashboard
- [ ] No PII collected

---

## 🎨 V1.1 - Critical UX Improvements (2-3 Weeks)

### Week 3: Education & Onboarding

#### 🟡 P1-1: Weighting Method Education
**Status:** ❌ Not Started
**Effort:** 1-2 days
**Priority:** P1 (Critical UX)

**Why It Matters:**
Most users don't understand weighting methods. Education increases correct usage.

**Current State:**
- Dropdown shows 3 methods with no explanation
- Users picking randomly
- No guidance on which to choose

**Implementation:**
```typescript
// Files to Create
components/Education/
  ├── WeightingMethodGuide.tsx     // Info modal
  ├── WeightingComparison.tsx      // Comparison table
  ├── MethodTooltip.tsx            // Inline tooltips
content/weighting-methods.md       // Educational content
```

**Features:**
- [ ] Info icon next to each method in dropdown
- [ ] Tooltip on hover with brief explanation
- [ ] "Learn more" link opens detailed modal
- [ ] Comparison table showing differences
- [ ] Example portfolios for each method
- [ ] Recommendation based on user goal

**Content:**
```
Market Cap Weighted
- Weight by company size
- Large companies = higher allocation
- Example: S&P 500 (SPY)
- Best for: Following market trends

Price Weighted
- Weight by stock price
- Higher price = higher allocation
- Example: Dow Jones (DIA)
- Best for: Equal share representation

Equal Weighted
- Every stock same weight
- No size bias
- Example: Equal-weight S&P
- Best for: Maximum diversification
```

**Testing:**
- [ ] Tooltips display correctly
- [ ] Modal content readable
- [ ] Examples make sense

---

#### 🟡 P1-2: Stock Context in Creation
**Status:** ❌ Not Started
**Effort:** 1-2 days
**Priority:** P1 (Critical UX)

**Why It Matters:**
Users see only ticker and company name - not enough context to make informed decisions.

**Current State:**
- Stock search shows: AAPL - Apple Inc.
- Missing: sector, price, market cap, context

**Implementation:**
```typescript
// Files to Modify
app/etfs/create/page.tsx           // Enhanced stock display
components/Stock/
  ├── StockCard.tsx                // Rich stock card
  ├── SectorBadge.tsx              // Sector visual

// Stock Search Enhancement
interface EnhancedStockResult {
  symbol: string;
  name: string;
  sector: string;           // NEW
  industry: string;         // NEW
  marketCap: number;        // NEW
  currentPrice: number;     // NEW
  change24h: number;        // NEW (if available)
}
```

**Features:**
- [ ] Show sector badge with color coding
- [ ] Display current price
- [ ] Show market cap (Large/Mid/Small)
- [ ] Brief company description (optional)
- [ ] Sector diversity indicator in ETF creator

**Sector Color Coding:**
- Technology: Blue
- Healthcare: Green
- Financial: Gold
- Consumer: Purple
- Energy: Orange
- Utilities: Teal
- Real Estate: Brown
- Industrial: Gray
- Communication: Pink

**Testing:**
- [ ] Context loads quickly
- [ ] Missing data handled gracefully
- [ ] Colors accessible (WCAG AA)

---

#### 🟡 P1-3: Onboarding Flow
**Status:** ❌ Not Started
**Effort:** 2-3 days
**Priority:** P1 (Critical UX)

**Why It Matters:**
First-time users are lost. Good onboarding = higher activation.

**Implementation:**
```typescript
// Files to Create
app/onboarding/page.tsx            // Onboarding wizard
components/Onboarding/
  ├── WelcomeModal.tsx            // First-time popup
  ├── ProductTour.tsx             // Guided tour
  ├── ETFTemplates.tsx            // Quick start templates
  ├── ProgressTracker.tsx         // Step progress
```

**Onboarding Steps:**
1. Welcome: "Create and track custom ETFs"
2. Explore: Tour of dashboard
3. Learn: View existing ETF (SPY)
4. Create: Build first ETF with template
5. Track: See performance chart
6. Celebrate: First ETF created!

**ETF Templates:**
- "Tech Giants" - AAPL, MSFT, GOOGL, META, NVDA
- "Dividend Stars" - High-yield stocks
- "Growth Leaders" - High-growth companies
- "Balanced Mix" - Diversified portfolio

**Features:**
- [ ] Welcome modal on first login
- [ ] Skip tour option
- [ ] Progress indicator (Step 2 of 5)
- [ ] Template gallery with preview
- [ ] One-click template creation
- [ ] Completion checklist

**Testing:**
- [ ] Tour flows smoothly
- [ ] Can skip and resume later
- [ ] Templates create correctly

---

### Week 4: Mobile & Feedback

#### 🟡 P1-4: Mobile Optimization
**Status:** ⏳ Planned (30% - basic responsive)
**Effort:** 2-3 days
**Priority:** P1 (Critical UX)

**Why It Matters:**
30-40% of users will be mobile. Current design is desktop-first.

**Current State:**
- Tailwind responsive classes used
- Not optimized for mobile interaction
- Charts may not work well on small screens

**Implementation:**
```typescript
// Files to Create/Modify
components/Mobile/
  ├── MobileNav.tsx               // Bottom nav bar
  ├── MobileDrawer.tsx            // Slide-up drawer
  ├── MobileChart.tsx             // Simplified chart
hooks/useMediaQuery.ts             // Responsive hook
```

**Mobile Optimizations:**
- [ ] Touch targets minimum 44x44px
- [ ] Mobile navigation (bottom tabs)
- [ ] Simplified chart view for mobile
- [ ] Swipe gestures for ETF cards
- [ ] Full-screen modals on mobile
- [ ] Optimized font sizes
- [ ] Test on real devices

**Breakpoints:**
```typescript
const breakpoints = {
  mobile: '0-640px',
  tablet: '641-1024px',
  desktop: '1025px+',
};
```

**Testing:**
- [ ] Test on iPhone (Safari)
- [ ] Test on Android (Chrome)
- [ ] Test on tablet
- [ ] Performance on 3G
- [ ] Touch targets accessible

---

#### 🟡 P1-5: Enhanced Feedback & Notifications
**Status:** ⏳ Planned (20% - basic toasts)
**Effort:** 1-2 days
**Priority:** P1 (Critical UX)

**Why It Matters:**
Users need confirmation of actions. Current feedback is minimal.

**Implementation:**
```typescript
// Files to Create/Modify
components/Feedback/
  ├── Toast.tsx                   // Enhanced toast system
  ├── ConfirmationModal.tsx       // Confirm destructive actions
  ├── LoadingSpinner.tsx          // Loading states
hooks/useToast.ts                  // Toast hook
lib/notifications.ts               // Notification manager
```

**Notification Types:**
- ✅ Success: "ETF created successfully"
- ❌ Error: "Failed to save changes"
- ⚠️ Warning: "Stock data unavailable"
- ℹ️ Info: "Prices updated 5 minutes ago"
- 🔄 Loading: "Updating prices..."

**Features:**
- [ ] Toast notifications (top-right)
- [ ] Auto-dismiss after 5 seconds
- [ ] Confirmation modals for delete
- [ ] Undo for destructive actions
- [ ] Loading spinners for async operations
- [ ] Inline validation errors

**Testing:**
- [ ] All notification types work
- [ ] Toasts stack properly
- [ ] Undo functionality works
- [ ] Accessible (screen readers)

---

## 🚀 V1.2 - Polish & Growth (3-4 Weeks)

### Week 5-6: Advanced Analytics

#### 🟢 P2-1: Advanced Analytics Dashboard
**Status:** ❌ Not Started
**Effort:** 5-7 days
**Priority:** P2 (Nice to Have)

**Metrics to Add:**
- Volatility (standard deviation)
- Sharpe Ratio (risk-adjusted returns)
- Beta (systematic risk vs market)
- Alpha (excess return)
- Maximum Drawdown
- Correlation matrix
- Risk/return scatter plot

**Implementation:**
```typescript
// Files to Create
lib/analytics/
  ├── volatility.ts
  ├── sharpe.ts
  ├── beta.ts
  ├── drawdown.ts
components/Analytics/
  ├── VolatilityChart.tsx
  ├── RiskReturnPlot.tsx
  ├── MetricsTable.tsx
  ├── CorrelationHeatmap.tsx
```

---

#### 🟢 P2-2: Sector Allocation Visualizations
**Status:** ❌ Not Started
**Effort:** 2-3 days
**Priority:** P2

**Features:**
- Pie chart for sector breakdown
- Sector weight table
- Comparison to benchmark sectors
- Concentration risk warnings
- Treemap visualization

---

### Week 7-8: Community Features

#### 🟢 P2-3: Community ETF Discovery
**Status:** ❌ Not Started
**Effort:** 4-5 days
**Priority:** P2

**Features:**
- Public ETF gallery
- Like/save system
- Comments/discussions
- Trending ETFs
- User profiles
- Follow/unfollow users
- Clone ETF functionality

**Database Changes:**
```prisma
model PublicETF {
  id          String   @id @default(cuid())
  etfId       String
  userId      String
  title       String
  description String?
  likes       Int      @default(0)
  saves       Int      @default(0)
  views       Int      @default(0)
  createdAt   DateTime @default(now())
}

model Comment {
  id        String   @id
  etfId     String
  userId    String
  content   String
  createdAt DateTime @default(now())
}
```

---

#### 🟢 P2-4: Rebalancing Alerts
**Status:** ❌ Not Started
**Effort:** 2-3 days
**Priority:** P2

**Features:**
- Calculate allocation drift
- Threshold settings (5%, 10%, 15%)
- Email alerts
- In-app notifications
- Rebalancing suggestions
- One-click rebalancing

---

#### 🟢 P2-5: Export Functionality
**Status:** ❌ Not Started
**Effort:** 2-3 days
**Priority:** P2

**Features:**
- Export to CSV
- PDF reports with charts
- Excel multi-sheet export
- Shareable performance images
- Scheduled email reports

---

## 🔮 V2.0 - Advanced Features (Future)

### 🔵 P3: Innovation Features

**P3-1: Backtesting Engine** (2-3 weeks)
- Test strategies on historical data
- Simulate rebalancing
- Compare multiple strategies
- Generate backtest reports

**P3-2: Paper Trading** (3-4 weeks)
- Virtual cash accounts
- Simulated order execution
- P&L tracking
- Leaderboard/competitions

**P3-3: Brokerage Integration** (8-12 weeks)
- Alpaca/TD Ameritrade API
- Real-money trading
- Regulatory compliance
- KYC/AML implementation

**P3-4: Mobile App** (12-16 weeks)
- React Native or Flutter
- Push notifications
- Offline support
- Native performance

**P3-5: Public API** (4-6 weeks)
- RESTful API
- OAuth 2.0
- Rate limiting
- Developer portal
- Webhooks

---

## 🔧 Technical Debt Items

### Infrastructure

#### Database Optimization
**Status:** ⚠️ Partial
**Effort:** 1-2 days
**Priority:** P1

**Tasks:**
- [ ] Add composite indexes for common queries
- [ ] Index all foreign keys
- [ ] Add full-text search indexes
- [ ] Optimize slow queries with EXPLAIN ANALYZE
- [ ] Monitor query performance

**Indexes Needed:**
```sql
CREATE INDEX idx_etf_compositions_etf_id ON etf_compositions(etf_id);
CREATE INDEX idx_etf_compositions_stock_id ON etf_compositions(stock_id);
CREATE INDEX idx_price_history_stock_date ON price_history(stock_id, timestamp DESC);
CREATE INDEX idx_user_etfs_user_id ON user_etfs(user_id);
CREATE INDEX idx_etf_history_etf_date ON etf_history(etf_id, timestamp DESC);
```

---

#### Caching Strategy
**Status:** ❌ Not Started
**Effort:** 2-3 days
**Priority:** P1

**Implementation:**
- [ ] Setup Redis for caching
- [ ] Cache stock price data (15-min TTL)
- [ ] Cache ETF compositions (1-hour TTL)
- [ ] Cache calculated metrics (1-hour TTL)
- [ ] Implement cache invalidation
- [ ] Monitor cache hit rates

**Cache Keys:**
```typescript
const cacheKeys = {
  stockPrice: (symbol: string) => `stock:${symbol}:price`,
  etfComposition: (id: string) => `etf:${id}:composition`,
  etfPerformance: (id: string, range: string) => `etf:${id}:perf:${range}`,
  userPortfolio: (userId: string) => `user:${userId}:portfolio`,
};
```

---

#### Testing Suite
**Status:** ❌ Not Started
**Effort:** 1-2 weeks
**Priority:** P1

**Setup:**
- [ ] Jest for unit tests
- [ ] React Testing Library for components
- [ ] Playwright for E2E tests
- [ ] API integration tests
- [ ] Test database setup
- [ ] CI/CD pipeline integration

**Coverage Goals:**
- Unit tests: 80%+
- Integration tests: All API routes
- E2E tests: Critical user flows
- Performance tests: Load testing

**Test Structure:**
```
__tests__/
├── unit/
│   ├── lib/
│   │   ├── etfCalculations.test.ts
│   │   ├── stockApi.test.ts
│   │   └── performance.test.ts
│   └── components/
│       ├── ETFCard.test.tsx
│       └── PerformanceChart.test.tsx
├── integration/
│   └── api/
│       ├── etfs.test.ts
│       ├── stocks.test.ts
│       └── portfolio.test.ts
└── e2e/
    ├── auth.spec.ts
    ├── etf-creation.spec.ts
    ├── portfolio.spec.ts
    └── performance.spec.ts
```

---

## 📊 Success Metrics & KPIs

### V1.0 Launch Metrics

**User Acquisition:**
- Target: 100 beta users in first month
- Goal: 500 users in 3 months
- Conversion: 10%+ signup → active

**User Engagement:**
- ETFs created per user: 5+
- Portfolio saves: 80%+ users save at least 1 ETF
- Weekly active users: 60%+
- Session duration: 8+ minutes average
- Return rate: 40%+ within 7 days

**Feature Adoption:**
- All 3 weighting methods tried: 60%+
- Performance chart viewed: 90%+
- Benchmark comparison used: 70%+
- Portfolio dashboard visited: 85%+

**Technical Performance:**
- Page load time: <2s (p95)
- API response time: <500ms (p95)
- Uptime: 99.5%+
- Error rate: <0.1%
- Alpha Vantage API success rate: >95%

**User Satisfaction:**
- NPS Score: 40+ (after beta)
- Support tickets: <5% of active users
- Bug reports: <2% of sessions
- Feature requests: Tracked and prioritized

---

### V1.1 UX Metrics

**Onboarding:**
- Completion rate: 70%+
- Time to first ETF: <5 minutes
- Activation rate: 60%+
- Tutorial views: 50%+

**Mobile Usage:**
- Mobile traffic: 30%+
- Mobile conversion: 80% of desktop
- Mobile session time: 80% of desktop
- Mobile satisfaction: 4.0+ stars

**Education:**
- Tutorial completion: 50%+
- Help docs viewed: 40%+
- Method selection confidence: Measured via survey

---

### V1.2 Growth Metrics

**Community:**
- Public ETFs created: 20%+ of total
- ETFs cloned: 30%+ of public ETFs
- Comments per public ETF: 3+
- User follows: 2+ per active user
- Share rate: 10%+

**Retention:**
- Day 7 retention: 40%+
- Day 30 retention: 25%+
- Day 90 retention: 15%+
- Monthly active users: 70%+ of registered

**Virality:**
- Invite rate: 20%+
- Referral signups: 15%+
- Social shares: 10%+
- K-factor: >0.5

---

## 🚨 Risks & Dependencies

### Technical Risks

**🔴 HIGH PRIORITY**

**1. Alpha Vantage Rate Limits**
- **Risk:** API throttling during peak usage (5 calls/min free tier)
- **Impact:** Stale data, poor user experience
- **Mitigation:**
  - Implement aggressive caching (15-min TTL)
  - Queue system for updates
  - Upgrade to paid plan ($49/month for 75 calls/min)
- **Contingency:** Add secondary provider (IEX Cloud, Polygon.io)

**2. Database Performance**
- **Risk:** Slow queries with large datasets
- **Impact:** Poor page load times, timeout errors
- **Mitigation:**
  - Add comprehensive indexes
  - Implement caching layer
  - Query optimization
- **Contingency:** Database sharding, read replicas

**3. Real-time Price Updates**
- **Risk:** Delayed or missing price data
- **Impact:** Inaccurate portfolio values
- **Mitigation:**
  - Fallback to last known price
  - Show "last updated" timestamp
  - Alert users of stale data
- **Contingency:** Multiple data sources, websocket connections

**🟡 MEDIUM PRIORITY**

**4. Chart Performance**
- **Risk:** Slow rendering with large datasets (1000+ points)
- **Impact:** Laggy charts, poor mobile experience
- **Mitigation:**
  - Data aggregation (daily → weekly for long ranges)
  - Lazy loading
  - Canvas-based rendering
- **Contingency:** Server-side image generation

**5. Mobile Performance**
- **Risk:** Poor experience on low-end devices
- **Impact:** High bounce rate from mobile users
- **Mitigation:**
  - Code splitting
  - Lazy loading components
  - Image optimization
- **Contingency:** Simplified mobile UI, PWA

---

### Product Risks

**🔴 HIGH PRIORITY**

**1. User Adoption**
- **Risk:** Low signups, low activation
- **Impact:** Product doesn't gain traction
- **Mitigation:**
  - Strong onboarding
  - Clear value proposition
  - User testing before launch
- **Contingency:** Pivot messaging, add requested features

**2. Feature Complexity**
- **Risk:** Users confused by weighting methods, too many options
- **Impact:** Frustration, abandoned flows
- **Mitigation:**
  - Education tooltips
  - Guided onboarding
  - Smart defaults
- **Contingency:** Simplify UI, hide advanced features

**🟡 MEDIUM PRIORITY**

**3. Market Competition**
- **Risk:** Competitors launch similar features
- **Impact:** Reduced differentiation
- **Mitigation:**
  - Focus on UX excellence
  - Build community features
  - Rapid iteration
- **Contingency:** Find niche (students, educators)

**4. Regulatory Compliance**
- **Risk:** Legal issues with financial advice
- **Impact:** Shutdown, lawsuits
- **Mitigation:**
  - Clear disclaimers ("not financial advice")
  - Legal review of content
  - No direct trading (V1)
- **Contingency:** Consult legal counsel, adjust messaging

---

### External Dependencies

**Critical:**
- Alpha Vantage API (stock data)
- Vercel (hosting, cron jobs)
- PostgreSQL (database)
- NextAuth.js (authentication)

**Important:**
- Recharts (charts library)
- Tailwind CSS (styling)
- Prisma (ORM)

**Optional:**
- Redis (caching)
- Sentry (error tracking)
- Mixpanel/Amplitude (analytics)

---

## 🎯 Immediate Next Steps

### This Week (Days 1-5)

**Monday-Tuesday: Portfolio Dashboard**
- [ ] Create `app/portfolio/page.tsx`
- [ ] Build PortfolioSummary component
- [ ] Create SavedETFCard component
- [ ] Implement portfolio filters/sorting
- [ ] Create API route `/api/portfolio`
- [ ] Write unit tests for components

**Wednesday-Thursday: Performance Charts Setup**
- [ ] Install Recharts: `npm install recharts`
- [ ] Create performance calculation utilities
- [ ] Build PerformanceChart component
- [ ] Implement TimeRangeSelector
- [ ] Add PriceChangeIndicator
- [ ] Test with sample historical data

**Friday: Integration & Polish**
- [ ] Connect portfolio to ETF details
- [ ] Add loading states throughout
- [ ] Implement error handling
- [ ] E2E test: Create ETF → Save → View in portfolio
- [ ] Bug fixes and code review
- [ ] Deploy to dev environment

---

### Next Week (Days 6-10)

**Monday-Wednesday: Complete Performance Features**
- [ ] Finalize chart interactions (hover, zoom)
- [ ] Add chart export functionality
- [ ] Optimize performance with large datasets
- [ ] Add accessibility features (keyboard nav)
- [ ] Documentation and examples

**Wednesday-Thursday: Benchmark Comparison**
- [ ] Build BenchmarkSelector component
- [ ] Implement comparison calculation logic
- [ ] Create ComparisonChart (overlay view)
- [ ] Add RelativeMetrics display
- [ ] Testing with multiple benchmarks

**Friday: Analytics & Testing**
- [ ] Setup Vercel Analytics
- [ ] Implement event tracking throughout app
- [ ] Create internal analytics dashboard
- [ ] Comprehensive testing of V1.0 features
- [ ] Prepare for beta launch

---

## 📁 Project Structure

```
stock-bundler/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx              ✅ Done
│   │   │   └── register/page.tsx           ✅ Done
│   │   ├── dashboard/page.tsx              ✅ Done
│   │   ├── etfs/
│   │   │   ├── page.tsx                    ✅ Done
│   │   │   ├── [id]/page.tsx               ✅ Done
│   │   │   └── create/page.tsx             ✅ Done
│   │   ├── portfolio/                      ❌ TO CREATE
│   │   │   ├── page.tsx                    ❌ Not Started
│   │   │   └── [id]/page.tsx               ❌ Not Started
│   │   ├── discover/                       🔵 V1.2
│   │   ├── onboarding/                     🟡 V1.1
│   │   └── api/
│   │       ├── auth/                       ✅ Done
│   │       ├── stocks/                     ✅ Done
│   │       ├── etfs/                       ✅ Done
│   │       ├── portfolio/                  ❌ TO CREATE
│   │       ├── performance/                ❌ TO CREATE
│   │       ├── comparison/                 ❌ TO CREATE
│   │       └── analytics/                  🟢 V1.2
│   ├── components/
│   │   ├── Navbar.tsx                      ✅ Done
│   │   ├── ETFCard.tsx                     ✅ Done
│   │   ├── Portfolio/                      ❌ TO CREATE
│   │   ├── Charts/                         ❌ TO CREATE
│   │   ├── Comparison/                     ❌ TO CREATE
│   │   ├── Education/                      🟡 V1.1
│   │   ├── Onboarding/                     🟡 V1.1
│   │   └── Mobile/                         🟡 V1.1
│   ├── lib/
│   │   ├── db.ts                           ✅ Done
│   │   ├── stockApi.ts                     ✅ Done
│   │   ├── etfCalculations.ts              ✅ Done
│   │   ├── portfolio.ts                    ❌ TO CREATE
│   │   ├── performance/                    ❌ TO CREATE
│   │   ├── comparison/                     ❌ TO CREATE
│   │   ├── analytics/                      ❌ TO CREATE
│   │   └── cache/                          🟢 V1.2
│   └── types/
│       ├── index.ts                        ✅ Done
│       └── next-auth.d.ts                  ✅ Done
├── prisma/
│   ├── schema.prisma                       ✅ Done (may need updates)
│   └── seed.ts                             ✅ Done
├── __tests__/                              ❌ TO CREATE
├── .env.example                            ✅ Done
├── package.json                            ✅ Done
├── README.md                               ✅ Done
└── project_plan.md                         ✅ This file
```

---

## 🎓 Development Guidelines

### Code Standards

**TypeScript:**
- Strict mode enabled
- No `any` types (use `unknown` if needed)
- Explicit return types on functions
- Interface over type when possible

**React:**
- Functional components only
- Hooks for state management
- Custom hooks for reusable logic
- PropTypes via TypeScript interfaces

**Naming Conventions:**
- Components: PascalCase (`ETFCard.tsx`)
- Files: camelCase (`etfCalculations.ts`)
- Constants: UPPER_SNAKE_CASE (`API_BASE_URL`)
- CSS classes: kebab-case (`etf-card`)

**File Organization:**
- One component per file
- Collocate related files in folders
- Index files for public exports
- Keep files under 300 lines

---

### Git Workflow

**Branches:**
- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - New features
- `fix/*` - Bug fixes
- `refactor/*` - Code refactoring

**Commit Messages:**
```
feat: Add portfolio dashboard page
fix: Correct ETF calculation for equal weighting
refactor: Extract chart logic into custom hook
docs: Update README with setup instructions
test: Add unit tests for performance calculations
```

**Pull Requests:**
- Reference related issues
- Include before/after screenshots
- Add testing instructions
- Request review from team

---

### Testing Strategy

**Unit Tests:**
- All calculation functions
- Utility functions
- Custom hooks
- Run on every commit

**Integration Tests:**
- All API routes
- Database operations
- External API calls
- Run before deployment

**E2E Tests:**
- Critical user flows
- Authentication
- ETF creation
- Portfolio management
- Run nightly

---

## 📞 Communication Plan

### Daily Standups (Async)
- What did you complete yesterday?
- What will you work on today?
- Any blockers?

### Weekly Sprint Reviews
- Demo completed features
- Review metrics
- Discuss feedback
- Plan next week

### Monthly Reviews
- User growth and engagement
- Feature adoption rates
- Technical health metrics
- Roadmap adjustments

---

## 📚 Resources & Links

### Documentation
- **Next.js:** https://nextjs.org/docs
- **Prisma:** https://www.prisma.io/docs
- **NextAuth.js:** https://next-auth.js.org
- **Recharts:** https://recharts.org
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Alpha Vantage API:** https://www.alphavantage.co/documentation

### Tools
- **Design:** Figma (TBD)
- **Project Management:** GitHub Projects
- **Analytics:** Vercel Analytics / Mixpanel
- **Error Tracking:** Sentry (optional)
- **Database UI:** Prisma Studio

### Internal
- **GitHub Repo:** [Link TBD]
- **Deployment:** Vercel
- **Database:** PostgreSQL on [Provider TBD]
- **Slack Channel:** #stock-bundler (TBD)

---

## 🔄 Change Log

### Version 2.0 (2025-10-27)
- Combined original technical plan with product manager recommendations
- Organized by priority and timeline
- Added detailed implementation specs
- Included success metrics and risks
- Created comprehensive testing strategy

### Version 1.0 (2025-10-27)
- Initial 29-phase technical implementation plan
- Foundation and core features defined

---

**Document Ownership:**
- **Product:** [Name TBD]
- **Engineering:** [Name TBD]
- **Design:** [Name TBD]

**Next Review:** Weekly (every Monday)

**Questions or Feedback:** Open an issue or contact the team

---

*Last Updated: 2025-10-27*
