# Razorpay Integration - Quick Reference

## 🚀 Quick Start

### 1. Test Locally with Generated Webhooks

**Create a redemption:**
```bash
curl -X POST http://localhost:3000/api/v1/redemption/request \
  -H "Authorization: Bearer <JWT>" \
  -d '{"channelId": 2, "pointsRedeemed": 100, "amount": 100, "redemptionType": "UPI"}'
```

**Note the Redemption ID from response, then generate a test webhook:**
```bash
node scripts/generate-webhook-test.js <REDEMPTION_ID> pout_test_id payout.processed
```

**This outputs a cURL command. Copy and run it:**
```bash
curl -X POST http://localhost:3000/api/v1/redemption/webhooks/razorpay \
  -H "Content-Type: application/json" \
  -H "X-Razorpay-Signature: <SIGNATURE>" \
  -d '{"event":"payout.processed",...}'
```

**Verify status changed:**
```sql
SELECT status FROM redemptions WHERE id = <REDEMPTION_ID>;
-- Should show: 3 (Success) instead of 5 (Processing)
```

---

## 📋 Key Files

| File | Purpose | Key Changes |
|------|---------|-------------|
| `src/controllers/razorpay.webhook.controller.ts` | Webhook handlers | ✨ NEW |
| `src/procedures/redemption.ts` | Redemption logic | ✏️ Added payout call |
| `src/routes/redemption.routes.ts` | API routes | ✏️ Added webhook route |
| `src/services/razorpayService.ts` | Razorpay API | ✅ Already exists |
| `src/config/razorpay.config.ts` | Configuration | ✅ Already exists |
| `test/e2e/redemption-razorpay.test.ts` | Tests | ✨ NEW |
| `test/TESTING_CHECKLIST.md` | Test guide | ✨ NEW |
| `RAZORPAY_IMPLEMENTATION.md` | Full docs | ✨ NEW |

---

## 🔍 Workflow Visualization

```
┌─────────────────────┐
│ User requests UPI   │
│ redemption: 100pts  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────┐
│ System validates:                │
│ ✓ User has UPI ID               │
│ ✓ Has enough points             │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│ Create redemption record        │
│ Status: Pending                 │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│ Call Razorpay API               │
│ → Create payout                 │
└──────────┬──────────────────────┘
           │
         ┌─┴──────────────┐
         │                │
    SUCCESS           FAILURE
         │                │
         ▼                ▼
    Status: PROCESSING   Status: FAILED
    Store payout ID      Refund points
    Return success       Return error
         │                │
         ▼                ▼
    [Waiting for webhook] [Done]
         │
         ├─ payout.processed
         │  ├─ Update status to SUCCESS
         │  ├─ Store UTR
         │  └─ Return 200
         │
         ├─ payout.failed
         │  ├─ Update status to FAILED
         │  ├─ Refund points
         │  └─ Return 200
         │
         └─ payout.reversed
            ├─ Update status to REFUNDED
            ├─ Refund points
            └─ Return 200
```

---

## ✅ Testing Scenarios

### Scenario 1: Successful UPI Payout
```bash
# 1. Create redemption
RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/redemption/request \
  -H "Authorization: Bearer <JWT>" \
  -d '{"channelId": 2, "pointsRedeemed": 100, "amount": 100, "redemptionType": "UPI"}')

REDEMPTION_ID=$(echo $RESPONSE | jq -r '.data.redemptionId')

# 2. Check database (status should be Processing)
psql -d <DB> -c "SELECT status FROM redemptions WHERE id = $REDEMPTION_ID;"

# 3. Generate successful webhook
node scripts/generate-webhook-test.js $REDEMPTION_ID pout_test123 payout.processed

# 4. Copy-paste the cURL command output and run it

# 5. Verify status changed to Success
psql -d <DB> -c "SELECT status, metadata->>'utr' FROM redemptions WHERE id = $REDEMPTION_ID;"
```

### Scenario 2: Failed Payout (Manual Refund)
```bash
# 1. Create redemption
# 2. Get initial balance
BALANCE_BEFORE=$(psql -d <DB> -c "SELECT points_balance FROM retailers WHERE user_id = 1;" -t)

# 3. Generate failed webhook
node scripts/generate-webhook-test.js $REDEMPTION_ID pout_test456 payout.failed

# 4. Run the webhook cURL command

# 5. Verify points refunded
BALANCE_AFTER=$(psql -d <DB> -c "SELECT points_balance FROM retailers WHERE user_id = 1;" -t)
echo "Before: $BALANCE_BEFORE, After: $BALANCE_AFTER"
# After should be = Before + 100
```

### Scenario 3: Idempotency Test
```bash
# 1. Send same webhook twice
WEBHOOK_CMD="curl -X POST http://localhost:3000/api/v1/redemption/webhooks/razorpay ..."

$WEBHOOK_CMD  # First time - status updates to Success
echo "First webhook sent ✓"

$WEBHOOK_CMD  # Second time - should be ignored
echo "Second webhook sent (should be ignored) ✓"

# 2. Verify status didn't change to double-success
psql -d <DB> -c "SELECT COUNT(*) FROM <role>_ledger WHERE remarks LIKE '%UTR%';"
# Should be 1, not 2
```

---

## 🐛 Troubleshooting

### Problem: Webhook not received
**Check:**
1. Is webhook endpoint accessible?
   ```bash
   curl -X POST http://localhost:3000/api/v1/redemption/webhooks/razorpay \
     -H "Content-Type: application/json" -d '{}' -v
   ```
   Should get 4xx response, not connection refused

2. Is webhook URL configured in Razorpay dashboard?
   - Settings → Webhooks → Add new webhook
   - URL: `https://yourdomain.com/api/v1/redemption/webhooks/razorpay`

3. Is webhook secret correct?
   ```bash
   echo $RAZORPAY_WEBHOOK_SECRET  # Should match dashboard
   ```

### Problem: "Invalid signature" error
**Check:**
1. `RAZORPAY_WEBHOOK_SECRET` env var matches dashboard secret
2. Test with generator script:
   ```bash
   node scripts/generate-webhook-test.js 123 pout_xxx payout.processed
   ```

### Problem: Points not refunded on failure
**Check:**
1. Is user a Retailer/Electrician/Counter Staff?
   ```sql
   SELECT u.id, ut.type_name FROM users u
   JOIN user_type_entity ut ON u.role_id = ut.id
   WHERE u.id = <USER_ID>;
   ```

2. Was failure webhook processed?
   ```sql
   SELECT webhook_event_type, is_success FROM third_party_api_logs
   WHERE redemption_id = <REDEMPTION_ID> AND webhook_event_type = 'payout.failed';
   ```

---

## 📊 Status Codes Reference

| Status | ID | Meaning | Next State |
|--------|----|---------|----|
| Pending | 1 | Created, awaiting processing | Processing / Failed |
| Processing | 5 | Payout submitted to Razorpay | Success / Failed |
| Success | 3 | Payout completed, UTR received | (final) |
| Failed | 4 | Payout failed at Razorpay | (final, points refunded) |
| Refunded | ? | Payout was reversed | (final, points refunded) |

**To find exact IDs:**
```sql
SELECT id, name FROM redemption_statuses WHERE name IN ('Pending', 'Processing', 'Success', 'Failed', 'Refunded');
```

---

## 🔐 Security Checklist

- [ ] `RAZORPAY_WEBHOOK_SECRET` is long and random (32+ chars)
- [ ] Secret is same in Razorpay dashboard and env var
- [ ] Webhook endpoint is HTTPS in production
- [ ] Signature verification enabled in production
- [ ] No sensitive data logged (email, phone, account numbers)
- [ ] Rate limiting configured on webhook endpoint (optional)
- [ ] Firewall rules allow Razorpay IPs (optional)

---

## 📝 Environment Variables

```env
# Required
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_ACCOUNT_NUMBER=2323230052006085
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxx

# Optional (defaults provided)
RAZORPAY_DEFAULT_BANK_MODE=NEFT
RAZORPAY_DEFAULT_PURPOSE=refund
RAZORPAY_ENABLE_WEBHOOK_VERIFICATION=true
```

---

## 🎯 Next Steps

1. **Local Testing** (this session)
   - [ ] Run E2E tests: `npm test -- test/e2e/redemption-razorpay.test.ts`
   - [ ] Use webhook generator: `node scripts/generate-webhook-test.js`
   - [ ] Follow TESTING_CHECKLIST.md

2. **Staging Deployment**
   - [ ] Deploy to staging environment
   - [ ] Configure Razorpay test account webhook
   - [ ] Test with real Razorpay test payouts

3. **Production Deployment**
   - [ ] Switch to production Razorpay credentials
   - [ ] Configure production webhook URL
   - [ ] Monitor webhook delivery and status
   - [ ] Monitor points accuracy

---

## 📞 Reference Documentation

| Document | Location | Purpose |
|----------|----------|---------|
| Full Implementation | `RAZORPAY_IMPLEMENTATION.md` | Complete details |
| Testing Guide | `test/MANUAL_TESTING_GUIDE.md` | Manual test scenarios |
| Testing Checklist | `test/TESTING_CHECKLIST.md` | Systematic verification |
| E2E Tests | `test/e2e/redemption-razorpay.test.ts` | Automated tests |
| Webhook Generator | `scripts/generate-webhook-test.js` | Test payload generation |

---

## 💡 Common Commands

```bash
# Run all tests
npm test -- test/e2e/redemption-razorpay.test.ts

# Generate test webhook payload
node scripts/generate-webhook-test.js 123 pout_xxx payout.processed

# Check redemption status
psql -d <DB> -c "SELECT id, status, metadata FROM redemptions ORDER BY created_at DESC LIMIT 5;"

# Check webhook logs
psql -d <DB> -c "SELECT * FROM third_party_api_logs WHERE api_type = 'webhook' ORDER BY created_at DESC LIMIT 10;"

# Check points refunds
psql -d <DB> -c "SELECT * FROM retailer_ledger WHERE remarks LIKE '%Refund%' ORDER BY created_at DESC LIMIT 5;"

# Monitor recent redemptions
watch -n 2 "psql -d <DB> -c 'SELECT id, status, updated_at FROM redemptions ORDER BY created_at DESC LIMIT 10;'"
```

---

**Ready to test? Start with:** `node scripts/generate-webhook-test.js <REDEMPTION_ID> <PAYOUT_ID> payout.processed`

