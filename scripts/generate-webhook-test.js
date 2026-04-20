#!/usr/bin/env node

/**
 * Webhook Test Payload Generator
 * Generates valid webhook payloads with proper signatures for testing
 *
 * Usage:
 *   node scripts/generate-webhook-test.js <REDEMPTION_ID> <PAYOUT_ID> [EVENT_TYPE] [UTR]
 *
 * Examples:
 *   node scripts/generate-webhook-test.js 123 pout_K7Jqk7tgPZd8HK payout.processed
 *   node scripts/generate-webhook-test.js 123 pout_K7Jqk7tgPZd8HK payout.failed
 *   node scripts/generate-webhook-test.js 123 pout_K7Jqk7tgPZd8HK payout.reversed
 *
 * Output: cURL command ready to send to your webhook endpoint
 */

const crypto = require('crypto');
const path = require('path');

// Load environment
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'test-secret';
const REDEMPTION_ID = process.argv[2];
const PAYOUT_ID = process.argv[3];
const EVENT_TYPE = process.argv[4] || 'payout.processed';
const UTR = process.argv[5] || `UTR${Math.random().toString(36).substr(2, 12).toUpperCase()}`;

if (!REDEMPTION_ID || !PAYOUT_ID) {
  console.error('Usage: node generate-webhook-test.js <REDEMPTION_ID> <PAYOUT_ID> [EVENT_TYPE] [UTR]');
  console.error('Example: node generate-webhook-test.js 123 pout_K7Jqk7tgPZd8HK payout.processed');
  process.exit(1);
}

// Validate event type
const VALID_EVENTS = ['payout.processed', 'payout.failed', 'payout.reversed'];
if (!VALID_EVENTS.includes(EVENT_TYPE)) {
  console.error(`Invalid event type. Must be one of: ${VALID_EVENTS.join(', ')}`);
  process.exit(1);
}

// Determine payout status
let payoutStatus = 'processing';
let failureReason = null;

if (EVENT_TYPE === 'payout.processed') {
  payoutStatus = 'processed';
} else if (EVENT_TYPE === 'payout.failed') {
  payoutStatus = 'failed';
  failureReason = 'Insufficient account balance';
} else if (EVENT_TYPE === 'payout.reversed') {
  payoutStatus = 'reversed';
}

// Build payload
const payload = {
  entity: 'event',
  event: EVENT_TYPE,
  contains: ['payout'],
  payload: {
    payout: {
      id: PAYOUT_ID,
      entity: 'payout',
      fund_account_id: `fa_${Math.random().toString(36).substr(2, 12)}`,
      amount: 10000,
      currency: 'INR',
      notes: {
        redemptionId: String(REDEMPTION_ID),
        userId: '1',
        type: 'UPI',
      },
      fees: 0,
      tax: 0,
      status: payoutStatus,
      purpose: 'refund',
      utr: EVENT_TYPE === 'payout.processed' ? UTR : null,
      mode: 'UPI',
      reference_id: String(REDEMPTION_ID),
      narration: `Redemption RED-${REDEMPTION_ID}`,
      batch_id: null,
      failure_reason: failureReason,
      created_at: Math.floor(Date.now() / 1000),
      fee_type: null,
    },
  },
  created_at: Math.floor(Date.now() / 1000),
};

// Generate signature
const payloadString = JSON.stringify(payload);
const signature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(payloadString)
  .digest('hex');

// Output results
console.log('\n' + '='.repeat(80));
console.log('WEBHOOK TEST PAYLOAD GENERATOR');
console.log('='.repeat(80) + '\n');

console.log('📋 Payload Details:');
console.log(`  Event Type: ${EVENT_TYPE}`);
console.log(`  Redemption ID: ${REDEMPTION_ID}`);
console.log(`  Payout ID: ${PAYOUT_ID}`);
console.log(`  Status: ${payoutStatus}`);
if (EVENT_TYPE === 'payout.processed') {
  console.log(`  UTR: ${UTR}`);
}
if (failureReason) {
  console.log(`  Failure Reason: ${failureReason}`);
}
console.log(`  Webhook Secret: ${WEBHOOK_SECRET.substring(0, 10)}...`);

console.log('\n📦 Full Payload:');
console.log(JSON.stringify(payload, null, 2));

console.log('\n🔐 Signature:');
console.log(signature);

console.log('\n' + '='.repeat(80));
console.log('CURL COMMAND (Ready to Send):');
console.log('='.repeat(80) + '\n');

const curlCommand = `curl -X POST http://localhost:3000/api/v1/redemption/webhooks/razorpay \\
  -H "Content-Type: application/json" \\
  -H "X-Razorpay-Signature: ${signature}" \\
  -d '${payloadString.replace(/'/g, "'\\''")}'`;

console.log(curlCommand);

console.log('\n' + '='.repeat(80));
console.log('INSTRUCTIONS:');
console.log('='.repeat(80) + '\n');

if (EVENT_TYPE === 'payout.processed') {
  console.log('1. This webhook simulates a successful payout');
  console.log('2. Expected outcome:');
  console.log('   - Redemption status → "Success"');
  console.log('   - UTR stored in database');
  console.log('   - User receives email/SMS notification');
} else if (EVENT_TYPE === 'payout.failed') {
  console.log('1. This webhook simulates a failed payout');
  console.log('2. Expected outcome:');
  console.log('   - Redemption status → "Failed"');
  console.log('   - Points refunded to user balance');
  console.log('   - Ledger entry created for refund');
  console.log('   - User receives email/SMS about failure');
} else if (EVENT_TYPE === 'payout.reversed') {
  console.log('1. This webhook simulates a reversed payout');
  console.log('2. Expected outcome:');
  console.log('   - Redemption status → "Refunded"');
  console.log('   - Points refunded to user balance');
  console.log('   - Ledger entry created for refund');
}

console.log('\n3. To test:');
console.log('   a) Copy the curl command above');
console.log('   b) Paste and run in your terminal');
console.log('   c) Check response: should be 200 with {"success": true}');
console.log('   d) Verify database changes:');
console.log(`      SELECT * FROM redemptions WHERE id = ${REDEMPTION_ID};`);

console.log('\n4. Verify webhook was processed:');
console.log(`   SELECT * FROM third_party_api_logs WHERE redemption_id = ${REDEMPTION_ID};`);
console.log(`   - Should have webhook entry with status 200`);

console.log('\n' + '='.repeat(80) + '\n');

// Also save to file for reference
const fs = require('fs');
const outputFile = path.join(__dirname, `../webhook-test-${EVENT_TYPE.replace('.', '-')}-${REDEMPTION_ID}.json`);
fs.writeFileSync(outputFile, JSON.stringify({
  event: EVENT_TYPE,
  redemptionId: REDEMPTION_ID,
  payoutId: PAYOUT_ID,
  signature,
  payload,
  curlCommand,
  generatedAt: new Date().toISOString(),
}, null, 2));

console.log(`✅ Payload saved to: ${outputFile}`);
console.log('\n');
