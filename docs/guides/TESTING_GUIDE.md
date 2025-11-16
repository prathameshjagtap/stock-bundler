# Testing Guide - Day 1 Security Fixes

This guide provides step-by-step instructions for testing the authentication and authorization fixes implemented in Day 1 of the Security Sprint.

---

## Prerequisites

### 1. Install Dependencies
```bash
cd /Users/prathameshjagtap/Projects/stock-bundler
npm install
```

### 2. Setup Database
```bash
# Run migrations if needed
npx prisma migrate dev

# Seed database with predefined ETFs
npx prisma db seed
```

### 3. Start Development Server
```bash
npm run dev
```

Server should start at `http://localhost:3000`

---

## Test Suite 1: Authentication Tests

### Test 1.1: Unauthenticated POST Returns 401

**Objective:** Verify that creating an ETF without authentication fails

**Steps:**
1. Open terminal
2. Run the following command:

```bash
curl -X POST http://localhost:3000/api/etfs \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "TEST",
    "name": "Test ETF",
    "description": "Test Description",
    "weightingMethod": "EQUAL",
    "stocks": [{"symbol": "AAPL"}]
  }'
```

**Expected Result:**
```json
{
  "error": "Unauthorized - Please log in to create an ETF"
}
```
**Status Code:** 401

**PASS Criteria:** Response is 401 with error message

---

### Test 1.2: Authenticated POST Succeeds

**Objective:** Verify that authenticated users can create ETFs

**Steps:**
1. Open browser to `http://localhost:3000/auth/login`
2. Login with test credentials
3. Open browser DevTools > Network tab
4. Copy the `next-auth.session-token` cookie value
5. Run the following command (replace `YOUR_SESSION_TOKEN`):

```bash
curl -X POST http://localhost:3000/api/etfs \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "ticker": "MYTEST",
    "name": "My Test ETF",
    "description": "Test Description",
    "weightingMethod": "EQUAL",
    "stocks": [{"symbol": "AAPL"}]
  }'
```

**Expected Result:**
- Status Code: 201
- Response contains ETF object with:
  - `id`
  - `ticker: "MYTEST"`
  - `name: "My Test ETF"`
  - `isCustom: true`
  - `createdBy: <your-user-id>`
  - `compositions` array

**PASS Criteria:** ETF created successfully with authenticated user's ID

---

### Test 1.3: userId in Request Body is Ignored

**Objective:** Verify that users cannot impersonate other users

**Steps:**
1. Login as User A
2. Get User B's ID from database
3. Try to create ETF with User B's ID in request body:

```bash
curl -X POST http://localhost:3000/api/etfs \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "ticker": "FAKE",
    "name": "Fake ETF",
    "weightingMethod": "EQUAL",
    "stocks": [{"symbol": "AAPL"}],
    "userId": "some-other-user-id"
  }'
```

**Expected Result:**
- Status Code: 201
- Response contains ETF with `createdBy: <user-a-id>` (NOT "some-other-user-id")

**PASS Criteria:** ETF created with authenticated user's ID, NOT the userId from request body

---

## Test Suite 2: Authorization Tests

### Test 2.1: User Cannot Modify Another User's ETF

**Objective:** Verify ownership checks prevent unauthorized modifications

**Setup:**
1. Login as User A, create custom ETF, note its ID
2. Logout, login as User B
3. Copy User B's session token

**Steps:**
```bash
curl -X PATCH http://localhost:3000/api/etfs/USER_A_ETF_ID \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=USER_B_SESSION_TOKEN" \
  -d '{
    "addStocks": ["MSFT"]
  }'
```

**Expected Result:**
```json
{
  "error": "Forbidden - You do not own this ETF"
}
```
**Status Code:** 403

**PASS Criteria:** Request rejected with 403 Forbidden

---

### Test 2.2: User Cannot Delete Another User's ETF

**Objective:** Verify ownership checks prevent unauthorized deletions

**Setup:**
1. Use same setup as Test 2.1

**Steps:**
```bash
curl -X DELETE http://localhost:3000/api/etfs/USER_A_ETF_ID \
  -H "Cookie: next-auth.session-token=USER_B_SESSION_TOKEN"
```

**Expected Result:**
```json
{
  "error": "Forbidden - You do not own this ETF"
}
```
**Status Code:** 403

**PASS Criteria:** Request rejected with 403 Forbidden

---

### Test 2.3: Cannot Modify Predefined ETFs

**Objective:** Verify predefined ETFs are protected from modification

**Setup:**
1. Login as any user
2. Find a predefined ETF (SPY, QQQ, etc.) ID from database or UI

**Steps:**
```bash
curl -X PATCH http://localhost:3000/api/etfs/PREDEFINED_ETF_ID \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "addStocks": ["MSFT"]
  }'
```

**Expected Result:**
```json
{
  "error": "Cannot modify predefined ETFs"
}
```
**Status Code:** 403

**PASS Criteria:** Request rejected with 403 and specific error message

---

### Test 2.4: Cannot Delete Predefined ETFs

**Objective:** Verify predefined ETFs are protected from deletion

**Steps:**
```bash
curl -X DELETE http://localhost:3000/api/etfs/PREDEFINED_ETF_ID \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**Expected Result:**
```json
{
  "error": "Cannot delete predefined ETFs"
}
```
**Status Code:** 403

**PASS Criteria:** Request rejected with 403 and specific error message

---

### Test 2.5: User CAN Modify Their Own ETFs

**Objective:** Verify legitimate operations still work

**Setup:**
1. Login as User A
2. Create custom ETF
3. Note the ETF ID

**Steps:**
```bash
curl -X PATCH http://localhost:3000/api/etfs/YOUR_ETF_ID \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "addStocks": ["MSFT"]
  }'
```

**Expected Result:**
- Status Code: 200
- Response contains updated ETF with MSFT added

**PASS Criteria:** ETF updated successfully

---

### Test 2.6: User CAN Delete Their Own ETFs

**Objective:** Verify legitimate deletions still work

**Steps:**
```bash
curl -X DELETE http://localhost:3000/api/etfs/YOUR_ETF_ID \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**Expected Result:**
```json
{
  "success": true
}
```
**Status Code:** 200

**PASS Criteria:** ETF deleted successfully

---

## Test Suite 3: Regression Tests

### Test 3.1: GET All ETFs Works

**Objective:** Verify listing ETFs still works

**Steps:**
```bash
# Unauthenticated - should return predefined ETFs
curl http://localhost:3000/api/etfs

# Authenticated - should return predefined + user's custom ETFs
curl http://localhost:3000/api/etfs \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**Expected Result:**
- Status Code: 200
- Array of ETF objects

**PASS Criteria:** ETFs returned successfully

---

### Test 3.2: GET Single ETF Works

**Objective:** Verify viewing ETF details still works

**Steps:**
```bash
curl http://localhost:3000/api/etfs/ANY_ETF_ID
```

**Expected Result:**
- Status Code: 200
- ETF object with compositions

**PASS Criteria:** ETF details returned successfully

---

### Test 3.3: Stock Search Still Works

**Objective:** Verify stock search is not affected

**Steps:**
```bash
curl http://localhost:3000/api/stocks/search?q=AAPL
```

**Expected Result:**
- Status Code: 200
- Array of matching stocks

**PASS Criteria:** Stock search works without authentication

---

## Test Suite 4: UI Testing

### Test 4.1: ETF Creation via UI

**Steps:**
1. Open browser to `http://localhost:3000`
2. Login with test account
3. Navigate to "Create ETF" page
4. Fill in form:
   - Ticker: "UITEST"
   - Name: "UI Test ETF"
   - Method: "Equal Weight"
   - Add stocks: AAPL, MSFT, GOOGL
5. Submit form

**Expected Result:**
- ETF created successfully
- Redirected to ETF detail page
- ETF shows in "My ETFs" list

**PASS Criteria:** UI flow works end-to-end

---

### Test 4.2: ETF Modification via UI

**Steps:**
1. Login as user
2. Navigate to your custom ETF
3. Click "Edit" or "Modify"
4. Add a new stock
5. Save changes

**Expected Result:**
- ETF updated successfully
- New stock appears in composition

**PASS Criteria:** UI modification works

---

### Test 4.3: Cannot Edit Other's ETFs via UI

**Steps:**
1. Login as User A, create custom ETF
2. Copy the ETF detail page URL
3. Logout, login as User B
4. Navigate to User A's ETF URL
5. Try to edit

**Expected Result:**
- Edit button should be hidden OR
- Edit action should fail with error message

**PASS Criteria:** UI prevents editing other's ETFs

---

## Test Suite 5: Edge Cases

### Test 5.1: Session Expiry

**Steps:**
1. Login
2. Wait for session to expire (default: 30 days, but can be shortened for testing)
3. Try to create ETF

**Expected Result:**
- 401 Unauthorized
- User redirected to login page

**PASS Criteria:** Expired sessions are rejected

---

### Test 5.2: Invalid Session Token

**Steps:**
```bash
curl -X POST http://localhost:3000/api/etfs \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=invalid-token-123" \
  -d '{
    "ticker": "TEST",
    "name": "Test ETF",
    "weightingMethod": "EQUAL",
    "stocks": [{"symbol": "AAPL"}]
  }'
```

**Expected Result:**
- 401 Unauthorized

**PASS Criteria:** Invalid tokens are rejected

---

### Test 5.3: Non-existent ETF

**Steps:**
```bash
curl -X PATCH http://localhost:3000/api/etfs/non-existent-id \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{"addStocks": ["MSFT"]}'
```

**Expected Result:**
```json
{
  "error": "ETF not found"
}
```
**Status Code:** 404

**PASS Criteria:** Returns 404 for non-existent ETFs

---

## Automated Test Script

For convenience, here's a bash script to run basic tests:

```bash
#!/bin/bash
# save as: test-auth.sh

BASE_URL="http://localhost:3000"
SESSION_TOKEN="$1"  # Pass session token as argument

echo "Testing Authentication & Authorization"
echo "======================================="

# Test 1: Unauthenticated POST
echo ""
echo "Test 1: Unauthenticated POST (should fail)"
curl -s -X POST $BASE_URL/api/etfs \
  -H "Content-Type: application/json" \
  -d '{"ticker":"TEST","name":"Test","weightingMethod":"EQUAL","stocks":[{"symbol":"AAPL"}]}' \
  | jq .

# Test 2: Authenticated POST (if token provided)
if [ ! -z "$SESSION_TOKEN" ]; then
  echo ""
  echo "Test 2: Authenticated POST (should succeed)"
  curl -s -X POST $BASE_URL/api/etfs \
    -H "Content-Type: application/json" \
    -H "Cookie: next-auth.session-token=$SESSION_TOKEN" \
    -d '{"ticker":"AUTOTEST","name":"Auto Test","weightingMethod":"EQUAL","stocks":[{"symbol":"AAPL"}]}' \
    | jq .
fi

# Test 3: Stock search (should work without auth)
echo ""
echo "Test 3: Stock search without auth (should work)"
curl -s "$BASE_URL/api/stocks/search?q=AAPL" | jq .

echo ""
echo "Tests completed!"
```

**Usage:**
```bash
chmod +x test-auth.sh
./test-auth.sh YOUR_SESSION_TOKEN
```

---

## Troubleshooting

### Issue: "next-auth.session-token" not found

**Solution:**
1. Make sure you're logged in via the UI first
2. Use browser DevTools > Application > Cookies
3. Copy the exact cookie value
4. Use it in curl commands

### Issue: 500 Internal Server Error

**Check:**
1. Database connection is working
2. All environment variables are set
3. Server logs for detailed error

### Issue: CORS errors

**Solution:**
- Use curl instead of browser fetch
- Or test through the UI
- Next.js API routes don't have CORS issues by default

---

## Test Results Template

Use this template to document test results:

```
# Test Results - Day 1 Security Fixes
Date: YYYY-MM-DD
Tester: [Name]

## Authentication Tests
- [ ] Test 1.1: Unauthenticated POST returns 401 - PASS/FAIL
- [ ] Test 1.2: Authenticated POST succeeds - PASS/FAIL
- [ ] Test 1.3: userId in body ignored - PASS/FAIL

## Authorization Tests
- [ ] Test 2.1: Cannot modify other's ETF - PASS/FAIL
- [ ] Test 2.2: Cannot delete other's ETF - PASS/FAIL
- [ ] Test 2.3: Cannot modify predefined ETFs - PASS/FAIL
- [ ] Test 2.4: Cannot delete predefined ETFs - PASS/FAIL
- [ ] Test 2.5: CAN modify own ETF - PASS/FAIL
- [ ] Test 2.6: CAN delete own ETF - PASS/FAIL

## Regression Tests
- [ ] Test 3.1: GET all ETFs works - PASS/FAIL
- [ ] Test 3.2: GET single ETF works - PASS/FAIL
- [ ] Test 3.3: Stock search works - PASS/FAIL

## UI Tests
- [ ] Test 4.1: ETF creation via UI - PASS/FAIL
- [ ] Test 4.2: ETF modification via UI - PASS/FAIL
- [ ] Test 4.3: Cannot edit other's ETFs - PASS/FAIL

## Edge Cases
- [ ] Test 5.1: Session expiry - PASS/FAIL
- [ ] Test 5.2: Invalid session token - PASS/FAIL
- [ ] Test 5.3: Non-existent ETF - PASS/FAIL

## Summary
Total Tests: 15
Passed: __
Failed: __
Pass Rate: __%

Issues Found:
1. [Description]
2. [Description]

Notes:
[Any additional observations]
```

---

## Next Steps After Testing

1. **If All Tests Pass:**
   - Document results
   - Commit changes
   - Move to Day 2 (Input Validation)

2. **If Tests Fail:**
   - Document failures
   - Fix issues
   - Re-run tests
   - Get code review

3. **Code Review Checklist:**
   - [ ] All authentication checks in place
   - [ ] All authorization checks in place
   - [ ] Error messages are clear
   - [ ] HTTP status codes are correct
   - [ ] No breaking changes to frontend
   - [ ] Code is well-commented
   - [ ] No security regressions

---

**Document Status:** ✅ COMPLETE
**Last Updated:** 2025-10-29
**Purpose:** Testing guidance for Day 1 security fixes
