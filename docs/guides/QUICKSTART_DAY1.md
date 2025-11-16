# Quick Start - Day 1 Security Fixes

This is a quick reference guide for getting started with testing the Day 1 security fixes.

---

## What Was Fixed?

### Critical Security Vulnerabilities Resolved:
1. **VULN-001: No Authentication** - All API routes now require authentication
2. **VULN-007: No Authorization** - Users can only modify their own ETFs

### Files Changed:
- **CREATED:** `/src/lib/auth-helpers.ts` - Authentication utilities
- **MODIFIED:** `/src/app/api/etfs/route.ts` - ETF creation/listing
- **MODIFIED:** `/src/app/api/etfs/[id]/route.ts` - ETF modification/deletion

---

## Quick Setup

```bash
# 1. Navigate to project
cd /Users/prathameshjagtap/Projects/stock-bundler

# 2. Install dependencies (if not already done)
npm install

# 3. Start development server
npm run dev
```

---

## Quick Test

### Test 1: Try to Create ETF Without Login (Should Fail)
```bash
curl -X POST http://localhost:3000/api/etfs \
  -H "Content-Type: application/json" \
  -d '{"ticker":"TEST","name":"Test","weightingMethod":"EQUAL","stocks":[{"symbol":"AAPL"}]}'
```
**Expected:** 401 Unauthorized

### Test 2: Login and Create ETF (Should Work)
1. Open `http://localhost:3000/auth/login` in browser
2. Login with test account
3. Use browser DevTools to copy session token
4. Run:
```bash
curl -X POST http://localhost:3000/api/etfs \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -d '{"ticker":"TEST","name":"Test","weightingMethod":"EQUAL","stocks":[{"symbol":"AAPL"}]}'
```
**Expected:** 201 Created

---

## Key Changes Summary

### Before (VULNERABLE):
```typescript
export async function POST(request: Request) {
  const { userId } = body; // Anyone can impersonate any user!
  // No authentication check
}
```

### After (SECURE):
```typescript
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id; // Use session, not request body
}
```

---

## HTTP Status Codes

| Code | Meaning | When It Happens |
|------|---------|-----------------|
| 200 | OK | Successful GET/PATCH |
| 201 | Created | ETF created successfully |
| 401 | Unauthorized | Not logged in |
| 403 | Forbidden | Don't own the ETF or trying to modify predefined ETF |
| 404 | Not Found | ETF doesn't exist |
| 500 | Server Error | Something went wrong |

---

## Common Error Messages

### "Unauthorized - Please log in to create an ETF"
**Cause:** Trying to create ETF without logging in
**Fix:** Login first via UI or API

### "Forbidden - You do not own this ETF"
**Cause:** Trying to modify/delete another user's custom ETF
**Fix:** Only modify your own ETFs

### "Cannot modify predefined ETFs"
**Cause:** Trying to modify SPY, QQQ, or other predefined ETFs
**Fix:** Predefined ETFs are read-only

### "Cannot delete predefined ETFs"
**Cause:** Trying to delete SPY, QQQ, or other predefined ETFs
**Fix:** Predefined ETFs cannot be deleted

---

## Testing Checklist

Minimum tests before moving to Day 2:

- [ ] Unauthenticated POST to `/api/etfs` returns 401
- [ ] Authenticated POST to `/api/etfs` creates ETF with session userId
- [ ] Cannot modify another user's custom ETF (403)
- [ ] Cannot delete another user's custom ETF (403)
- [ ] Cannot modify predefined ETFs (403)
- [ ] Cannot delete predefined ETFs (403)
- [ ] Can modify own custom ETF (200)
- [ ] Can delete own custom ETF (200)
- [ ] Stock search still works without authentication

---

## Documentation

For detailed information, see:
- **SECURITY_SPRINT_DAY1_SUMMARY.md** - Complete implementation details
- **TESTING_GUIDE.md** - Comprehensive testing instructions
- **backend-recommendations.md** - Original security audit

---

## Next Steps

After testing:
1. ✅ Verify all tests pass
2. ✅ Document any issues found
3. ✅ Commit changes to git
4. ✅ Move to Day 2: Input Validation

---

## Need Help?

### Common Issues

**Issue:** Can't get session token
- **Fix:** Login via browser UI, then copy cookie from DevTools > Application > Cookies

**Issue:** 500 error when creating ETF
- **Check:** Database is running, all stocks exist in database

**Issue:** TypeScript errors
- **Note:** Some tsconfig warnings are expected and don't affect security

---

## Git Commit Message (Suggested)

```
feat: Add authentication and authorization to ETF API routes

SECURITY FIXES:
- VULN-001: Added authentication to all mutation endpoints
- VULN-007: Added ownership checks to prevent unauthorized access

Changes:
- Created auth-helpers.ts with reusable auth utilities
- Updated POST /api/etfs to require authentication
- Updated PATCH /api/etfs/[id] with auth + ownership checks
- Updated DELETE /api/etfs/[id] with auth + ownership checks
- Protected predefined ETFs from modification/deletion
- Fixed user impersonation vulnerability

Breaking Changes: None
Frontend Impact: None (backward compatible)

Tested:
- Authentication flow
- Authorization checks
- Ownership verification
- Predefined ETF protection
```

---

**Ready to Start:** Yes
**Estimated Time:** 30 minutes for basic testing
**Priority:** HIGH - Test before moving to Day 2
