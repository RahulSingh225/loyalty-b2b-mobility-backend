# Razorpay Payout API Integration - Implementation Summary

**Date:** January 25, 2026
**Status:** ✅ Implementation Complete
**Version:** 1.0

---

## Overview

This document summarizes the complete implementation of Razorpay Payout API integration into the redemption flow, including webhook handling, error recovery, and comprehensive testing infrastructure.

---

## What Was Implemented

### 1. **Webhook Controller** ✅
**File:** `src/controllers/razorpay.webhook.controller.ts`

**Functionality:**
- Handles three Razorpay webhook events:
  - `payout.processed` - Updates status to SUCCESS, stores UTR
  - `payout.failed` - Updates status to FAILED, refunds points
  - `payout.reversed` - Updates status to REFUNDED, refunds points
- Verifies webhook signatures using HMAC-SHA256
- Implements idempotent processing (duplicate webhook detection)
- Extracts redemption ID from payout reference_id
- Updates both redemption record and channel-specific tables
- Logs all webhook events to `third_party_api_logs`

**Key Security Features:**
- HMAC-SHA256 signature verification (timing-safe comparison)
- 401 response for invalid signatures
- Duplicate webhook detection via metadata tracking
- Input validation for reference ID format

---

### 2. **Webhook Route** ✅
**File:** `src/routes/redemption.routes.ts`

**Changes:**
```typescript
router.post('/webhooks/razorpay', asyncHandler(handleWebhook));
```

**Characteristics:**
- Public endpoint (no authentication required)
- Matches Razorpay webhook delivery requirements
- URL: `POST /api/v1/redemption/webhooks/razorpay`
- Wrapped in async error handler for proper error handling

---

### 3. **Payout Integration in Redemption Procedure** ✅
**File:** `src/procedures/redemption.ts`

**New Flow:**
```
User initiates UPI/Bank redemption
    ↓
Validate user role and balance
    ↓
Create redemption record (initial status: Pending)
    ↓
[NEW] For UPI/BANK_TRANSFER:
  1. Create channel-specific record (UPI or bank transfer table)
  2. Update channel_reference_id in redemptions
  3. Call razorpayService.createPayout() ← NEW
  4. On success:
     - Update status to PROCESSING
     - Store razorpayPayoutId, fundAccountId in metadata
  5. On failure:
     - Update status to FAILED
     - Refund points immediately
     - Throw error to user
    ↓
Return success message
```

**Error Handling:**
- Validates UPI ID exists for UPI redemptions
- Validates bank details for bank transfer redemptions
- Automatic points refund on payout API failure
- Clear error messages for user

**Metadata Tracking:**
- Stores `razorpayPayoutId` for tracking
- Stores `razorpayFundAccountId` for reference
- Records `payoutStatus` (processing/processed/failed)
- Tracks `payoutInitiatedAt` timestamp

---

### 4. **Testing Infrastructure** ✅

#### A. End-to-End Test Suite
**File:** `test/e2e/redemption-razorpay.test.ts`

**Test Coverage:**
1. **UPI Redemption Flow (6 tests)**
   - Redemption creation with payout
   - Database verification
   - Successful payout webhook processing
   - Status updates correctly
   - Duplicate webhook idempotency
   - Invalid signature rejection

2. **Bank Transfer Redemption Flow (4 tests)**
   - Bank redemption creation
   - Failed payout webhook
   - Status and refund verification
   - API logging

3. **Reversal Flow (3 tests)**
   - Create successful redemption
   - Trigger reversal webhook
   - Verify REFUNDED status and point refund

4. **Error Scenarios (4 tests)**
   - Missing signature header
   - Invalid redemption ID
   - Malformed reference ID
   - Unhandled event type

5. **Concurrent Processing (1 test)**
   - 5 parallel webhooks
   - No data corruption
   - Correct status updates

**Run Tests:**
```bash
npm test -- test/e2e/redemption-razorpay.test.ts
```

#### B. Manual Testing Guide
**File:** `test/MANUAL_TESTING_GUIDE.md`

**Content:**
- Step-by-step scenarios for 5 real-world use cases
- SQL queries for verification
- Razorpay dashboard webhook triggering
- Troubleshooting checklist
- Sample cURL commands

#### C. Testing Checklist
**File:** `test/TESTING_CHECKLIST.md`

**Sections:**
- Pre-testing setup (env vars, database, user data)
- Unit test verification
- Integration test verification
- Webhook callback tests (8 scenarios)
- Real Razorpay dashboard tests
- Performance & load tests
- Final verification queries
- Sign-off section

#### D. Webhook Test Generator
**File:** `scripts/generate-webhook-test.js`

**Features:**
- Generates valid webhook payloads with correct signatures
- Supports all three event types (processed, failed, reversed)
- Outputs ready-to-use cURL commands
- Saves test payload to JSON file for reference

**Usage:**
```bash
node scripts/generate-webhook-test.js <REDEMPTION_ID> <PAYOUT_ID> [EVENT_TYPE] [UTR]
node scripts/generate-webhook-test.js 123 pout_K7Jqk7tgPZd8HK payout.processed
node scripts/generate-webhook-test.js 123 pout_K7Jqk7tgPZd8HK payout.failed
```

---

## Architecture & Data Flow

### Request Flow
```
User API Request
    ↓
RedemptionController.requestRedemption()
    ↓
RedemptionProcedure.execute()
    ├─ Validate user role, balance
    ├─ Create redemption record
    ├─ [NEW] For UPI/BANK_TRANSFER:
    │  ├─ Create channel-specific record
    │  ├─ Call razorpayService.createPayout()
    │  ├─ On error: refund + mark FAILED
    │  ├─ On success: mark PROCESSING + store payout ID
    │  └─ Log API call
    └─ Return success/error
    ↓
User receives response with redemption ID
```

### Webhook Flow
```
Razorpay Platform
    ↓
POST /api/v1/redemption/webhooks/razorpay
    ↓
razorpay.webhook.controller.handleWebhook()
    ├─ Verify X-Razorpay-Signature header
    ├─ Route to event handler:
    │  ├─ payout.processed → handlePayoutProcessed()
    │  ├─ payout.failed → handlePayoutFailed()
    │  ├─ payout.reversed → handlePayoutReversed()
    │  └─ other → acknowledge and skip
    │
    ├─ Extract redemption ID from reference_id
    ├─ Check idempotency (prevent duplicate processing)
    ├─ Update redemption status
    ├─ Update channel-specific table (UPI/Bank)
    ├─ On failure/reversal: refund points
    ├─ Log webhook event
    └─ Return 200 OK
    ↓
Razorpay receives 200 confirmation
```

### Database Schema Integration

**Tables Used:**
1. `redemptions` - Main redemption record
   - Added columns: `metadata` (JSONB) for Razorpay data

2. `redemption_upi` - UPI-specific details
   - `razorpay_payout_id`
   - `razorpay_fund_account_id`
   - `razorpay_contact_id`
   - `utr`
   - `processed_at`

3. `redemption_bank_transfers` - Bank transfer details
   - `razorpay_payout_id`
   - `razorpay_fund_account_id`
   - `razorpay_contact_id`
   - `utr`
   - `processed_at`

4. `third_party_api_logs` - API audit trail
   - Records all Razorpay API calls (request + response)
   - Records all webhook events
   - Timing metrics for performance monitoring

5. `retailer_ledger` / `electrician_ledger` / `counter_sales_ledger`
   - New CREDIT entries for point refunds on failure/reversal

---

## Key Features

### ✅ Asynchronous Payout Processing
- Initial redemption request returns immediately
- Actual payout completion confirmed via webhooks
- User sees status progression: Pending → Processing → Success/Failed

### ✅ Idempotency & Duplicate Prevention
- Uses redemption ID as Razorpay idempotency key
- Webhook duplicate detection via metadata tracking
- Prevents double-crediting points on network retries

### ✅ Automatic Error Recovery
- Failed payouts automatically refund points
- Ledger entries created for audit trail
- Clear error messages for users

### ✅ Comprehensive Logging
- All API calls logged to `third_party_api_logs`
- Request and response payloads stored (for debugging)
- Timing metrics captured for performance monitoring
- Webhook events logged with signatures (compliance)

### ✅ Security
- HMAC-SHA256 webhook signature verification
- Timing-safe comparison for signatures
- No authentication required for webhook (signature is auth)
- Input validation on all webhook payloads

### ✅ Multi-Channel Support
- UPI redemptions
- Bank transfer redemptions
- Both use same webhook infrastructure
- Easy to extend for other channels

---

## Configuration

### Environment Variables Required
```env
# Razorpay API Credentials
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_ACCOUNT_NUMBER=2323230052006085
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Optional (defaults provided)
RAZORPAY_DEFAULT_BANK_MODE=NEFT
RAZORPAY_DEFAULT_PURPOSE=refund
RAZORPAY_ENABLE_WEBHOOK_VERIFICATION=true
```

### Razorpay Dashboard Configuration
1. Go to **Settings → Webhooks**
2. Add webhook URL: `https://yourdomain.com/api/v1/redemption/webhooks/razorpay`
3. Subscribe to events:
   - `payout.processed`
   - `payout.failed`
   - `payout.reversed`
4. Copy webhook secret to `RAZORPAY_WEBHOOK_SECRET` env var

---

## Redemption Status States

```
Pending (initial)
    ↓
[For UPI/Bank] Processing (after Razorpay payout creation)
    ├─ → Success (webhook: payout.processed)
    ├─ → Failed (webhook: payout.failed or API error) → Points refunded
    └─ → Refunded (webhook: payout.reversed) → Points refunded

[For Voucher/Physical] Pending → [Admin approval] → Approved/Rejected

[For Marketplace] Pending → Approved (auto) → Completed
```

---

## API Endpoints

### User Endpoints

**Create Redemption Request**
```
POST /api/v1/redemption/request
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "channelId": 2,
  "pointsRedeemed": 100,
  "amount": 100,
  "redemptionType": "UPI"
}

Response:
{
  "success": true,
  "data": {
    "redemptionId": "RED-1234567890-abc",
    "message": "Payout initiated for UPI. Processing in progress...",
    "approvalId": null
  }
}
```

**Get Redemption History**
```
GET /api/v1/redemption/history?page=1&pageSize=20
Authorization: Bearer <JWT>
```

**Get Redemption Details**
```
GET /api/v1/redemption/{id}
Authorization: Bearer <JWT>
```

### Webhook Endpoint

**Receive Webhook Callbacks**
```
POST /api/v1/redemption/webhooks/razorpay
X-Razorpay-Signature: <SIGNATURE>
Content-Type: application/json

{
  "entity": "event",
  "event": "payout.processed",
  "payload": {
    "payout": {
      "id": "pout_K7Jqk7tgPZd8HK",
      "reference_id": "123",
      "status": "processed",
      "utr": "UTR1234567890",
      ...
    }
  }
}

Response: 200 OK
{
  "success": true,
  "data": { "message": "Payout processed" }
}
```

---

## Testing Strategy

### Phase 1: Unit Tests (Local)
- ✅ Webhook signature verification
- ✅ Payout request building
- ✅ Error code mapping
- ✅ Idempotency logic

### Phase 2: Integration Tests (Local DB)
- ✅ End-to-end redemption flow
- ✅ Database state transitions
- ✅ Points refund calculations
- ✅ Concurrent webhook handling

### Phase 3: Manual Testing (Local + Real Razorpay)
- [ ] UPI redemption (Success path)
- [ ] Bank transfer (Failed path)
- [ ] Payout reversal (Refund path)
- [ ] Signature verification
- [ ] Duplicate webhook handling

### Phase 4: Staging Testing (Real Razorpay Test Account)
- [ ] Dashboard webhook configuration
- [ ] Real payout creation
- [ ] Real webhook delivery
- [ ] Email/SMS notifications

### Phase 5: Production Deployment
- [ ] Switch to production Razorpay credentials
- [ ] Update webhook URL to production domain
- [ ] Monitor webhook delivery
- [ ] Monitor points accuracy

**Test Files:**
- `test/e2e/redemption-razorpay.test.ts` - Automated E2E tests
- `test/MANUAL_TESTING_GUIDE.md` - Manual test scenarios
- `test/TESTING_CHECKLIST.md` - Comprehensive checklist
- `scripts/generate-webhook-test.js` - Webhook payload generator

---

## Known Limitations & Future Enhancements

### Current Limitations
1. **No retry mechanism** - Failed payouts need manual retry from UI
2. **No batch processing** - Each redemption creates individual payout
3. **Synchronous payout call** - API call blocks redemption request (consider async)
4. **No rate limiting on webhooks** - Razorpay may rate limit deliveries

### Future Enhancements
1. **Batch Payouts** - Group multiple redemptions into single batch payout
2. **Auto-Retry Logic** - Automatically retry failed payouts after delay
3. **Webhook Delivery Confirmation** - UI shows real-time status updates
4. **Points Scaling** - Convert points to INR with dynamic rates
5. **Tax Compliance** - TDS calculation and reporting
6. **Settlement Tracking** - Track settlement status in Razorpay account
7. **Multi-Beneficiary** - Support multiple payouts to different users
8. **Webhook Replay** - Manual webhook replay for failed events

---

## Monitoring & Debugging

### Key Metrics to Monitor
```sql
-- Recent redemptions and their status
SELECT 
  COUNT(*) as total,
  COUNTIF(status = 3) as successful,
  COUNTIF(status = 4) as failed,
  COUNTIF(status = 5) as refunded,
  AVG(CAST(metadata->>'response_time_ms' AS INTEGER)) as avg_api_time_ms
FROM redemptions
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Webhook delivery success rate
SELECT
  webhook_event_type,
  COUNT(*) as total_webhooks,
  COUNTIF(is_success = true) as successful,
  COUNTIF(is_success = false) as failed,
  ROUND(100.0 * COUNTIF(is_success = true) / COUNT(*), 2) as success_rate
FROM third_party_api_logs
WHERE provider = 'razorpay' AND api_type = 'webhook'
GROUP BY webhook_event_type;

-- Points refunded due to failures
SELECT
  user_id,
  COUNT(*) as refund_count,
  SUM(CAST(amount AS INTEGER)) as total_points_refunded
FROM <role>_ledger
WHERE remarks LIKE '%Refund%'
GROUP BY user_id
ORDER BY total_points_refunded DESC;
```

### Common Issues & Solutions

**Issue: Webhooks not received**
- Verify webhook URL in Razorpay dashboard
- Check firewall/security group allows Razorpay IPs
- Verify webhook secret matches env var
- Check application logs for errors

**Issue: Duplicate point refunds**
- Check idempotency logic in webhook handler
- Query `third_party_api_logs` for duplicate webhook entries
- Verify metadata tracking in redemptions table

**Issue: Signature verification failing**
- Verify `RAZORPAY_WEBHOOK_SECRET` matches dashboard
- Check webhook payload not modified in transit
- Verify HMAC-SHA256 implementation
- Test with sample payload generator script

**Issue: Slow webhook processing**
- Monitor `response_time_ms` in API logs
- Check database query performance
- Consider async processing for ledger updates
- Scale DB if under load

---

## Rollback Plan

If issues occur during production deployment:

### 1. Disable Webhooks Immediately
```bash
RAZORPAY_ENABLE_WEBHOOK_VERIFICATION=false
# Redeploy application
```

### 2. Revert Redemption Procedure Changes
```sql
-- Restore to synchronous (no payout) flow
-- Keep existing redemptions as-is
```

### 3. Manual Points Recovery
```sql
-- If points were incorrectly refunded
UPDATE <role>_ledger
SET status = 'REVERTED'
WHERE remarks LIKE '%Refund%' AND created_at > 'ROLLBACK_DATE';
```

### 4. Post-Mortem
- Analyze logs for root cause
- Fix issues
- Re-test before re-deployment

---

## Support & Documentation

### Files Created
- `src/controllers/razorpay.webhook.controller.ts` - Webhook handling
- `src/procedures/redemption.ts` - Updated with payout integration
- `src/routes/redemption.routes.ts` - Added webhook route
- `test/e2e/redemption-razorpay.test.ts` - E2E tests
- `test/MANUAL_TESTING_GUIDE.md` - Manual test guide
- `test/TESTING_CHECKLIST.md` - Testing checklist
- `scripts/generate-webhook-test.js` - Test payload generator

### Existing Files (Already Present)
- `src/services/razorpayService.ts` - Razorpay API client
- `src/config/razorpay.config.ts` - Configuration
- `src/schema/redemption_additions.ts` - Database schema

### For Questions/Issues
1. Check `test/MANUAL_TESTING_GUIDE.md` for common scenarios
2. Review `test/TESTING_CHECKLIST.md` for systematic verification
3. Run E2E tests: `npm test -- test/e2e/redemption-razorpay.test.ts`
4. Check database queries in `test/TESTING_CHECKLIST.md`
5. Generate test webhooks: `node scripts/generate-webhook-test.js`

---

**Last Updated:** January 25, 2026
**Version:** 1.0
**Status:** Ready for Testing ✅
