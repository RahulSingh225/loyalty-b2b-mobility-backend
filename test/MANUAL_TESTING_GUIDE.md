/**
 * Manual Testing Guide: Razorpay Webhook Callbacks
 *
 * This guide explains how to manually test the redemption flow using Razorpay dashboard
 * to trigger real webhook callbacks to your system.
 */

// ============================================================================
// SETUP PREREQUISITES
// ============================================================================

/**
 * Before starting, ensure:
 *
 * 1. Environment Variables Configured
 *    ✓ RAZORPAY_KEY_ID=rzp_test_xxxxx
 *    ✓ RAZORPAY_KEY_SECRET=xxxxx
 *    ✓ RAZORPAY_ACCOUNT_NUMBER=your_account_number
 *    ✓ RAZORPAY_WEBHOOK_SECRET=whsec_xxxxx
 *
 * 2. Database Schema Updated
 *    ✓ redemption_bank_transfers table exists
 *    ✓ redemption_upi table exists
 *    ✓ third_party_api_logs table exists
 *    ✓ Redemption statuses exist: Pending, Processing, Success, Failed, Refunded
 *
 * 3. Webhook Endpoint Public
 *    ✓ POST /api/v1/redemption/webhooks/razorpay is publicly accessible
 *    ✓ Can be tested via: curl -X POST http://localhost:3000/api/v1/redemption/webhooks/razorpay
 *
 * 4. Razorpay Account Setup
 *    ✓ Webhook URL configured in Razorpay Dashboard
 *      Settings → Webhooks → Add new webhook
 *      URL: https://yourdomain.com/api/v1/redemption/webhooks/razorpay
 *    ✓ Events subscribed:
 *      - payout.processed
 *      - payout.failed
 *      - payout.reversed
 */

// ============================================================================
// WORKFLOW: Manual Testing with Razorpay Dashboard
// ============================================================================

/**
 * SCENARIO 1: Successful UPI Payout (payout.processed)
 * =====================================================
 *
 * Step 1: Create Redemption Request
 * ---------------------------------
 * curl -X POST http://localhost:3000/api/v1/redemption/request \
 *   -H "Content-Type: application/json" \
 *   -H "Authorization: Bearer <JWT_TOKEN>" \
 *   -d '{
 *     "channelId": 2,
 *     "pointsRedeemed": 100,
 *     "amount": 100,
 *     "redemptionType": "UPI"
 *   }'
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "redemptionId": "RED-1234567890-abc123xyz",
 *     "message": "Payout initiated for UPI. Processing in progress..."
 *   }
 * }
 *
 * Step 2: Check Database
 * ----------------------
 * SELECT * FROM redemptions WHERE id = <REDEMPTION_ID>;
 * - status should be "Processing" (ID = 5, adjust based on your DB)
 * - metadata contains "razorpayPayoutId"
 *
 * SELECT * FROM redemption_upi WHERE redemption_id = <REDEMPTION_ID>;
 * - upi_id populated
 * - razorpay_payout_id populated
 *
 * Step 3: Simulate Webhook in Razorpay Dashboard
 * -----------------------------------------------
 * 1. Log in to Razorpay Dashboard (https://dashboard.razorpay.com)
 * 2. Go to Settings → Webhooks
 * 3. Find your webhook URL
 * 4. Click "Test Webhook" or use Razorpay CLI to trigger payout.processed
 *
 * Using Razorpay CLI (if available):
 * $ razorpay webhooks trigger payout.processed \
 *   --webhook_id=whook_xxxxx \
 *   --payout_id=<PAYOUT_ID_FROM_DB>
 *
 * Step 4: Check System Logs & Database
 * ------------------------------------
 * Logs should show:
 * [Webhook] ✓ Payout processed for redemption: <ID> UTR: UTR1234567890
 *
 * Database check:
 * SELECT * FROM redemptions WHERE id = <REDEMPTION_ID>;
 * - status should be "Success" (ID = 3)
 * - metadata contains "utr": "UTR1234567890"
 * - metadata contains "webhookProcessedAt"
 *
 * SELECT * FROM redemption_upi WHERE redemption_id = <REDEMPTION_ID>;
 * - utr column populated
 * - processed_at timestamp set
 *
 * SELECT * FROM third_party_api_logs WHERE redemption_id = <REDEMPTION_ID>;
 * - Two entries: one for initial payout API call, one for webhook
 */

/**
 * SCENARIO 2: Failed Payout (payout.failed)
 * =========================================
 *
 * Step 1: Create Redemption (same as Scenario 1)
 * ---------
 * Create UPI or Bank redemption
 *
 * Step 2: Trigger payout.failed webhook
 * ------------------------------------
 * Using Razorpay Dashboard or CLI:
 * $ razorpay webhooks trigger payout.failed \
 *   --webhook_id=whook_xxxxx \
 *   --payout_id=<PAYOUT_ID> \
 *   --failure_reason="Invalid VPA"
 *
 * Step 3: Verify System Response
 * ------------------------------
 * Logs should show:
 * [Webhook] ✓ Payout failed for redemption: <ID>
 * Reason: Invalid VPA
 * Points refunded: 100
 *
 * Database check:
 * SELECT * FROM redemptions WHERE id = <REDEMPTION_ID>;
 * - status should be "Failed" (ID = 4)
 * - metadata contains "failureReason": "Invalid VPA"
 *
 * SELECT * FROM <role>_ledger WHERE user_id = <USER_ID> ORDER BY id DESC LIMIT 1;
 * - type = "CREDIT"
 * - remarks contains "Refund"
 * - amount = "100"
 *
 * SELECT points_balance FROM retailers WHERE user_id = <USER_ID>;
 * - Points should be restored (back to original balance)
 */

/**
 * SCENARIO 3: Reversed Payout (payout.reversed)
 * ============================================
 *
 * Step 1: Create Redemption & Process Successfully
 * -----------------------------------------------
 * 1. Create redemption (Scenario 1, Steps 1-3)
 * 2. Payout marked as Success
 *
 * Step 2: Trigger payout.reversed webhook
 * -------
 * $ razorpay webhooks trigger payout.reversed \
 *   --webhook_id=whook_xxxxx \
 *   --payout_id=<PAYOUT_ID>
 *
 * Step 3: Verify System Response
 * -----------------------
 * Logs should show:
 * [Webhook] ✓ Payout reversed for redemption: <ID>
 * Points refunded: 100
 *
 * Database check:
 * SELECT * FROM redemptions WHERE id = <REDEMPTION_ID>;
 * - status should be "Refunded" (ID = need to check)
 * - metadata contains "webhookEvent": "payout.reversed"
 *
 * Points should be restored to user balance
 */

/**
 * SCENARIO 4: Duplicate Webhook (Idempotency Test)
 * ================================================
 *
 * Step 1: Create Redemption
 * --------
 * curl -X POST http://localhost:3000/api/v1/redemption/request \
 *   -H "Content-Type: application/json" \
 *   -H "Authorization: Bearer <JWT_TOKEN>" \
 *   -d '{...}'
 *
 * Step 2: Send First payout.processed webhook
 * ---
 * Status updated to Success, UTR stored
 *
 * Step 3: Send Same Webhook Again (duplicate)
 * -----------
 * Manually craft and send same webhook payload:
 *
 * curl -X POST http://localhost:3000/api/v1/redemption/webhooks/razorpay \
 *   -H "Content-Type: application/json" \
 *   -H "X-Razorpay-Signature: <SIGNATURE>" \
 *   -d '{
 *     "entity": "event",
 *     "event": "payout.processed",
 *     "payload": {
 *       "payout": {
 *         "id": "<PAYOUT_ID>",
 *         "reference_id": "<REDEMPTION_ID>",
 *         "status": "processed",
 *         "utr": "UTR1234567890",
 *         "amount": 10000,
 *         ...
 *       }
 *     }
 *   }'
 *
 * Step 4: Verify Idempotency
 * --
 * Response should be 200 with message: "Already processed"
 * Database should NOT have duplicate ledger entries
 * Points should NOT be credited twice
 *
 * SELECT COUNT(*) FROM <role>_ledger
 * WHERE user_id = <USER_ID> AND remarks LIKE '%UTR%';
 * - Should be 1 (only one entry for this payout)
 */

/**
 * SCENARIO 5: Invalid Signature (Security Test)
 * =============================================
 *
 * Step 1: Create Redemption & Get Payout ID
 * --
 * (from previous scenarios)
 *
 * Step 2: Send Webhook with Invalid Signature
 * ---
 * curl -X POST http://localhost:3000/api/v1/redemption/webhooks/razorpay \
 *   -H "Content-Type: application/json" \
 *   -H "X-Razorpay-Signature: invalid_signature_12345" \
 *   -d '{
 *     "event": "payout.processed",
 *     "payload": { ... }
 *   }'
 *
 * Step 3: Verify Rejection
 * -
 * Response: 401 Unauthorized
 * Response body: { "error": { "message": "Invalid signature" } }
 * Database: Status should NOT change
 * Logs: Should show signature verification failure
 */

// ============================================================================
// GENERATING VALID WEBHOOK SIGNATURES FOR MANUAL TESTING
// ============================================================================

/**
 * To manually test webhooks with valid signatures, use this script:
 *
 * file: scripts/generate-webhook-test.js
 *
 * const crypto = require('crypto');
 *
 * const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'test-secret';
 * const REDEMPTION_ID = process.argv[2]; // From command line
 * const PAYOUT_ID = process.argv[3];
 * const EVENT_TYPE = process.argv[4] || 'payout.processed';
 * const UTR = process.argv[5] || `UTR${Date.now()}`;
 *
 * const payload = {
 *   entity: 'event',
 *   event: EVENT_TYPE,
 *   contains: ['payout'],
 *   payload: {
 *     payout: {
 *       id: PAYOUT_ID,
 *       entity: 'payout',
 *       fund_account_id: `fa_${REDEMPTION_ID}`,
 *       amount: 10000,
 *       currency: 'INR',
 *       notes: { redemptionId: REDEMPTION_ID },
 *       fees: 0,
 *       tax: 0,
 *       status: EVENT_TYPE === 'payout.processed' ? 'processed' : 'failed',
 *       purpose: 'refund',
 *       utr: EVENT_TYPE === 'payout.processed' ? UTR : null,
 *       mode: 'UPI',
 *       reference_id: REDEMPTION_ID,
 *       narration: `Redemption ${REDEMPTION_ID}`,
 *       batch_id: null,
 *       failure_reason: EVENT_TYPE === 'payout.failed' ? 'Invalid UPI ID' : null,
 *       created_at: Math.floor(Date.now() / 1000),
 *       fee_type: null,
 *     },
 *   },
 *   created_at: Math.floor(Date.now() / 1000),
 * };
 *
 * const payloadString = JSON.stringify(payload);
 * const signature = crypto
 *   .createHmac('sha256', WEBHOOK_SECRET)
 *   .update(payloadString)
 *   .digest('hex');
 *
 * console.log('Webhook Payload:');
 * console.log(JSON.stringify(payload, null, 2));
 * console.log('\nSignature:');
 * console.log(signature);
 * console.log('\ncurl command:');
 * console.log(`curl -X POST http://localhost:3000/api/v1/redemption/webhooks/razorpay \\`);
 * console.log(`  -H "Content-Type: application/json" \\`);
 * console.log(`  -H "X-Razorpay-Signature: ${signature}" \\`);
 * console.log(`  -d '${payloadString}'`);
 *
 * Usage:
 * node scripts/generate-webhook-test.js <REDEMPTION_ID> <PAYOUT_ID> payout.processed UTR123
 */

// ============================================================================
// VERIFICATION QUERIES
// ============================================================================

/**
 * Query 1: Check Redemption Status
 * ================================
 * SELECT
 *   id,
 *   redemption_id,
 *   user_id,
 *   status,
 *   metadata->>'razorpayPayoutId' as payout_id,
 *   metadata->>'utr' as utr,
 *   metadata->>'webhookEvent' as last_webhook,
 *   created_at,
 *   updated_at
 * FROM redemptions
 * WHERE user_id = <USER_ID>
 * ORDER BY created_at DESC
 * LIMIT 10;
 */

/**
 * Query 2: Check UPI Records with Payout Details
 * =============================================
 * SELECT
 *   r.id as redemption_id,
 *   r.redemption_id,
 *   u.upi_id,
 *   u.razorpay_payout_id,
 *   u.razorpay_fund_account_id,
 *   u.utr,
 *   u.processed_at
 * FROM redemptions r
 * LEFT JOIN redemption_upi u ON r.channel_reference_id = u.id
 * WHERE r.user_id = <USER_ID> AND r.redemption_type = 'UPI'
 * ORDER BY r.created_at DESC
 * LIMIT 10;
 */

/**
 * Query 3: Check Bank Transfer Records
 * ==================================
 * SELECT
 *   r.id as redemption_id,
 *   r.redemption_id,
 *   b.account_holder_name,
 *   b.account_number,
 *   b.ifsc_code,
 *   b.razorpay_payout_id,
 *   b.utr,
 *   b.processed_at
 * FROM redemptions r
 * LEFT JOIN redemption_bank_transfers b ON r.channel_reference_id = b.id
 * WHERE r.user_id = <USER_ID> AND r.redemption_type = 'BANK_TRANSFER'
 * ORDER BY r.created_at DESC
 * LIMIT 10;
 */

/**
 * Query 4: Check API Logs for Debugging
 * ====================================
 * SELECT
 *   id,
 *   redemption_id,
 *   provider,
 *   api_type,
 *   endpoint,
 *   http_status_code,
 *   is_success,
 *   error_message,
 *   webhook_event_type,
 *   response_time_ms,
 *   created_at
 * FROM third_party_api_logs
 * WHERE redemption_id = <REDEMPTION_ID>
 * ORDER BY created_at DESC;
 */

/**
 * Query 5: Check Ledger for Points Refunds
 * =====================================
 * SELECT
 *   id,
 *   user_id,
 *   type,
 *   amount,
 *   opening_balance,
 *   closing_balance,
 *   remarks,
 *   created_at
 * FROM retailer_ledger  -- or electrician_ledger, counter_sales_ledger
 * WHERE user_id = <USER_ID>
 * ORDER BY created_at DESC
 * LIMIT 20;
 */

// ============================================================================
// TROUBLESHOOTING CHECKLIST
// ============================================================================

/**
 * If webhooks are not being received:
 *
 * ✓ Check 1: Webhook URL is publicly accessible
 *   curl -X POST https://yourdomain.com/api/v1/redemption/webhooks/razorpay \
 *   -H "Content-Type: application/json" \
 *   -d '{"test": "payload"}' \
 *   Expected: 500 or response (not connection refused)
 *
 * ✓ Check 2: Razorpay dashboard webhook URL is correct
 *   Settings → Webhooks → Verify URL matches your domain
 *
 * ✓ Check 3: Webhook secret is correct
 *   Compare: RAZORPAY_WEBHOOK_SECRET env var with dashboard secret
 *
 * ✓ Check 4: Events subscribed in dashboard
 *   Settings → Webhooks → Ensure these events are checked:
 *   - payout.processed
 *   - payout.failed
 *   - payout.reversed
 *
 * ✓ Check 5: Logs show webhook attempts
 *   tail -f <LOG_FILE> | grep "Webhook"
 *   Should show signature verification, success/failure
 *
 * ✓ Check 6: Redemption status after payout creation
 *   Should be "Processing" immediately after redemption request
 *   If showing "Failed", check error logs
 *
 * ✓ Check 7: Razorpay API credentials valid
 *   Test: curl -u <KEY_ID>:<KEY_SECRET> https://api.razorpay.com/v1/payouts/pout_xxxx
 *   Should return payout details or 401 if credentials invalid
 */

// ============================================================================
// SAMPLE TEST COMMANDS
// ============================================================================

/**
 * Test 1: Create UPI Redemption
 * ---
 * REDEMPTION=$(curl -s -X POST http://localhost:3000/api/v1/redemption/request \
 *   -H "Content-Type: application/json" \
 *   -H "Authorization: Bearer $(cat .jwt_token)" \
 *   -d '{
 *     "channelId": 2,
 *     "pointsRedeemed": 100,
 *     "amount": 100,
 *     "redemptionType": "UPI"
 *   }' | jq -r '.data.redemptionId')
 *
 * echo "Redemption created: $REDEMPTION"
 */

/**
 * Test 2: Query Redemption Status
 * ---
 * psql -d <DB_NAME> -c "
 *   SELECT id, status, metadata FROM redemptions
 *   WHERE redemption_id = '$REDEMPTION'
 *   LIMIT 1;
 * "
 */

/**
 * Test 3: Generate and Send Test Webhook
 * ---
 * node scripts/generate-webhook-test.js 123 pout_test123 payout.processed
 */

export {};
