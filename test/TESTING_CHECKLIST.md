# Razorpay Integration Testing Checklist

## Pre-Testing Setup

### Environment Variables
- [ ] `RAZORPAY_KEY_ID` set and valid (from Razorpay dashboard)
- [ ] `RAZORPAY_KEY_SECRET` set and valid
- [ ] `RAZORPAY_ACCOUNT_NUMBER` set with your account number
- [ ] `RAZORPAY_WEBHOOK_SECRET` set (same as dashboard webhook secret)
- [ ] `RAZORPAY_DEFAULT_BANK_MODE` set (typically `NEFT`)
- [ ] `RAZORPAY_DEFAULT_PURPOSE` set (typically `refund`)

Verify with:
```bash
env | grep RAZORPAY
```

### Database Schema
- [ ] Run migrations: `npx drizzle-kit push`
- [ ] Verify tables exist:
  ```sql
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema='public' AND table_name IN 
  ('redemptions', 'redemption_upi', 'redemption_bank_transfers', 'third_party_api_logs');
  ```
- [ ] Verify status records exist:
  ```sql
  SELECT id, name FROM redemption_statuses 
  WHERE name IN ('Processing', 'Success', 'Failed', 'Refunded');
  ```
- [ ] Verify channel records exist:
  ```sql
  SELECT id, name FROM redemption_channels 
  WHERE name IN ('UPI', 'BANK_TRANSFER');
  ```

### User Test Data
- [ ] User exists in `users` table with ID (note this ID for testing)
- [ ] User has role (Retailer/Electrician/Counter Staff)
- [ ] User profile exists with role-specific table entry
- [ ] User has UPI ID set (for UPI testing): `upi_id`
- [ ] User has bank details validated (for bank testing): `bank_account_number`, `bank_ifsc_code`, `bank_account_name`, `is_bank_validated`

Query to check user data:
```sql
SELECT u.id, u.email, ut.type_name, r.upi_id, r.is_bank_validated, r.points_balance
FROM users u
JOIN user_type_entity ut ON u.role_id = ut.id
LEFT JOIN retailers r ON u.id = r.user_id
WHERE u.id = <USER_ID>;
```

### Service Startup
- [ ] Application runs without errors: `npm run dev`
- [ ] Check logs for any Razorpay initialization errors
- [ ] Confirm webhook endpoint is accessible:
  ```bash
  curl -X POST http://localhost:3000/api/v1/redemption/webhooks/razorpay \
    -H "Content-Type: application/json" \
    -d '{"test":"payload"}'
  ```
  Expected: 4xx error (not connection refused)

---

## Unit Tests

### Webhook Signature Verification
```bash
npm test -- test/unit/razorpay-signature.test.ts
```
- [ ] Valid signature accepted
- [ ] Invalid signature rejected
- [ ] Missing signature rejected
- [ ] Timing-safe comparison used

### Payout Request Building
```bash
npm test -- test/unit/razorpay-payout-request.test.ts
```
- [ ] UPI payload correctly formatted
- [ ] Bank transfer payload correctly formatted
- [ ] Required fields present
- [ ] Amounts converted to paise correctly
- [ ] Idempotency key set to redemption ID

### Error Mapping
```bash
npm test -- test/unit/razorpay-error-mapping.test.ts
```
- [ ] Razorpay error codes mapped to user messages
- [ ] Unknown errors have fallback message
- [ ] HTTP status codes preserved

---

## Integration Tests

### Automated E2E Tests
```bash
npm test -- test/e2e/redemption-razorpay.test.ts
```
- [ ] All tests pass (or adjust for your test environment)
- [ ] Database state correctly updated after each webhook
- [ ] Points refunded correctly on failure/reversal
- [ ] Idempotency working for duplicate webhooks

### Quick Manual API Test
Create redemption request:
```bash
REDEMPTION_RESPONSE=$(curl -X POST http://localhost:3000/api/v1/redemption/request \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{
    "channelId": 2,
    "pointsRedeemed": 100,
    "amount": 100,
    "redemptionType": "UPI"
  }')

echo $REDEMPTION_RESPONSE
REDEMPTION_ID=$(echo $REDEMPTION_RESPONSE | jq -r '.data.redemptionId')
```

- [ ] Response status 200
- [ ] Response contains `redemptionId`
- [ ] Response contains message about payout initiated

Verify in database:
```bash
psql -d <DB_NAME> -c "
  SELECT id, status, metadata->>'razorpayPayoutId' as payout_id, created_at
  FROM redemptions
  WHERE user_id = <USER_ID>
  ORDER BY created_at DESC
  LIMIT 1;"
```

- [ ] Redemption created with ID
- [ ] Status is "Processing" (or Processing status ID)
- [ ] Metadata contains `razorpayPayoutId`

---

## Webhook Callback Tests

### Generate Test Webhook
```bash
node scripts/generate-webhook-test.js <REDEMPTION_ID> <PAYOUT_ID> payout.processed
```

This will output a ready-to-use cURL command. Copy and paste it.

### Test 1: Payout Processed (Success)
- [ ] Generate webhook for `payout.processed` event
- [ ] Run cURL command
- [ ] Verify response: 200 OK, `{"success": true}`
- [ ] Check database:
  ```sql
  SELECT id, status, metadata->>'utr' as utr, updated_at
  FROM redemptions WHERE id = <REDEMPTION_ID>;
  ```
  - [ ] Status changed to "Success" (ID 3, adjust based on DB)
  - [ ] UTR populated in metadata
  - [ ] `updated_at` changed to recent time
- [ ] Check channel-specific table:
  ```sql
  SELECT utr, processed_at FROM redemption_upi 
  WHERE redemption_id = <REDEMPTION_ID>;
  ```
  - [ ] UTR stored
  - [ ] `processed_at` timestamp set
- [ ] Check API logs:
  ```sql
  SELECT webhook_event_type, is_success, http_status_code, response_time_ms
  FROM third_party_api_logs WHERE redemption_id = <REDEMPTION_ID>;
  ```
  - [ ] Webhook entry exists with `is_success = true`
  - [ ] `response_time_ms` is reasonable

### Test 2: Payout Failed
- [ ] Generate webhook for `payout.failed` event
- [ ] Run cURL command
- [ ] Verify response: 200 OK with "points refunded" message
- [ ] Check database:
  ```sql
  SELECT id, status, metadata->>'failureReason' as reason, updated_at
  FROM redemptions WHERE id = <REDEMPTION_ID>;
  ```
  - [ ] Status changed to "Failed" (ID 4)
  - [ ] Failure reason stored in metadata
- [ ] Verify points refunded:
  ```sql
  SELECT type, amount, remarks, opening_balance, closing_balance
  FROM retailer_ledger
  WHERE user_id = <USER_ID> AND remarks LIKE '%Refund%'
  ORDER BY created_at DESC LIMIT 1;
  ```
  - [ ] CREDIT entry created
  - [ ] Amount equals redeemed points
  - [ ] Closing balance restored

### Test 3: Payout Reversed
- [ ] First, ensure a "Success" status redemption exists (Test 1)
- [ ] Generate webhook for `payout.reversed` event with same redemption ID
- [ ] Run cURL command
- [ ] Verify response: 200 OK with "points refunded" message
- [ ] Check database:
  ```sql
  SELECT id, status, metadata->>'webhookEvent' as event
  FROM redemptions WHERE id = <REDEMPTION_ID>;
  ```
  - [ ] Status changed to "Refunded"
  - [ ] Event is `payout.reversed`
- [ ] Verify points refunded again

### Test 4: Duplicate Webhook (Idempotency)
- [ ] Generate webhook for `payout.processed`
- [ ] Send it once (should update to Success)
- [ ] Send the **exact same payload** again
- [ ] Verify response: 200 OK with "Already processed" message
- [ ] Check that status is still "Success" (not duplicated)
- [ ] Check ledger: only ONE entry for this redemption (no duplicate credits)

### Test 5: Invalid Signature
- [ ] Generate webhook for `payout.processed`
- [ ] Modify the signature header to something invalid
- [ ] Run request with invalid signature
- [ ] Verify response: 401 Unauthorized
- [ ] Check database: status should NOT have changed
- [ ] Check logs: should show signature verification failure

### Test 6: Missing Signature Header
- [ ] Send webhook without `X-Razorpay-Signature` header
- [ ] Verify response: 401 Unauthorized
- [ ] Check logs: should show missing signature error

### Test 7: Invalid Redemption ID
- [ ] Generate webhook with reference_id that doesn't exist (e.g., 999999)
- [ ] Run request with valid signature
- [ ] Verify response: 404 Not Found
- [ ] Check logs: should show "Redemption not found"

### Test 8: Malformed Reference ID
- [ ] Generate webhook with malformed reference_id (e.g., "abc", "redemption_abc")
- [ ] Run request
- [ ] Verify response: 400 Bad Request
- [ ] Check logs: should show "Invalid reference ID format"

---

## Razorpay Dashboard Tests (Real Payouts)

### Webhook Configuration in Dashboard
1. Log in to Razorpay Dashboard (https://dashboard.razorpay.com)
2. Go to **Settings** → **Webhooks**
3. Add/verify webhook:
   - [ ] URL: `https://yourdomain.com/api/v1/redemption/webhooks/razorpay`
   - [ ] Active: enabled
   - [ ] Events subscribed:
     - [ ] `payout.processed`
     - [ ] `payout.failed`
     - [ ] `payout.reversed`

### Test Webhook from Dashboard
1. In webhooks list, find your URL
2. Click "Test Webhook" or similar button
3. Select event type
4. Choose payout (or generate test payout)
5. Send
- [ ] Your system receives webhook
- [ ] Response is 200 OK
- [ ] Database updated correctly

### Monitor Live Webhooks
1. Stay in webhook configuration page
2. Create a real redemption request via API
3. Watch webhook logs in Razorpay dashboard
- [ ] Webhook delivery shows in dashboard
- [ ] Status 200 (not 4xx/5xx)
- [ ] Payload and response logged

---

## Performance & Load Tests

### Concurrent Webhook Processing
```bash
# Send 5 parallel webhooks for different redemptions
for i in {1..5}; do
  node scripts/generate-webhook-test.js $((100+$i)) pout_test_$i payout.processed &
done
wait
```
- [ ] All webhooks processed successfully (200 responses)
- [ ] No database conflicts or race conditions
- [ ] Each redemption status updated correctly
- [ ] Ledger entries created without duplicates

### Webhook Latency
- [ ] Average response time < 500ms
- [ ] 95th percentile < 1000ms
- [ ] Check `response_time_ms` in `third_party_api_logs`

---

## Final Verification Queries

### Overall Status Check
```sql
SELECT
  COUNT(*) as total_redemptions,
  SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN status = 4 THEN 1 ELSE 0 END) as failed,
  SUM(CASE WHEN status = 5 THEN 1 ELSE 0 END) as refunded
FROM redemptions
WHERE user_id = <USER_ID>;
```
- [ ] Counts match expectations

### Points Accuracy Check
```sql
SELECT
  u.id as user_id,
  r.points_balance as current_balance,
  SUM(CASE WHEN l.type = 'CREDIT' THEN CAST(l.amount AS INTEGER) ELSE 0 END) as total_credits,
  SUM(CASE WHEN l.type = 'DEBIT' THEN CAST(l.amount AS INTEGER) ELSE 0 END) as total_debits
FROM retailers r
JOIN users u ON r.user_id = u.id
LEFT JOIN retailer_ledger l ON u.id = l.user_id
WHERE u.id = <USER_ID>
GROUP BY u.id, r.points_balance;
```
- [ ] Points match: opening + credits - debits = current_balance

### Razorpay Data Completeness
```sql
SELECT
  r.id,
  r.metadata->>'razorpayPayoutId' as payout_id,
  r.metadata->>'utr' as utr,
  CASE WHEN rup.id IS NOT NULL THEN 'UPI' 
       WHEN rbt.id IS NOT NULL THEN 'BANK' 
       ELSE 'OTHER' END as channel_type,
  r.status as status_id
FROM redemptions r
LEFT JOIN redemption_upi rup ON r.channel_reference_id = rup.id AND r.channel_id = 2
LEFT JOIN redemption_bank_transfers rbt ON r.channel_reference_id = rbt.id AND r.channel_id = 3
WHERE r.user_id = <USER_ID>
ORDER BY r.created_at DESC
LIMIT 20;
```
- [ ] All payouts have Razorpay payout IDs
- [ ] Channel-specific records created
- [ ] UTRs populated for successful payouts

---

## Sign-Off

- [ ] All checklist items completed
- [ ] No critical errors in logs
- [ ] Points calculations accurate
- [ ] Webhook signatures verified
- [ ] Ready for production deployment

**Tested By:** ___________________
**Date:** ___________________
**Razorpay Account:** ___________________
**Notes:** ___________________
