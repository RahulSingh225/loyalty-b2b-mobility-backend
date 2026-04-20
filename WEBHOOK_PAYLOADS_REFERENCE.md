# Sample Razorpay Webhook Payloads

These are real-world examples of webhook payloads you'll receive from Razorpay. Use these for testing and reference.

---

## 1. Payout Processed (Success)

When a payout is successfully completed, Razorpay sends this webhook:

```json
{
  "entity": "event",
  "event": "payout.processed",
  "contains": ["payout"],
  "payload": {
    "payout": {
      "id": "pout_K7Jqk7tgPZd8HK",
      "entity": "payout",
      "fund_account_id": "fa_Jq6bX6p2N1dgsd",
      "account_id": "acc_0000000000001",
      "amount": 10000,
      "currency": "INR",
      "notes": {
        "redemptionId": "123",
        "userId": "1",
        "type": "UPI"
      },
      "fees": 0,
      "tax": 0,
      "status": "processed",
      "purpose": "refund",
      "description": null,
      "amount_settled": 10000,
      "fees_settled": 0,
      "tax_settled": 0,
      "utr": "1568176960vd4e5t",
      "mode": "UPI",
      "reference_id": "123",
      "narration": "Redemption RED-1234567890",
      "batch_id": null,
      "failure_reason": null,
      "recipient_settlement_id": null,
      "created_at": 1663408218,
      "fee_type": null,
      "on_hold": false,
      "on_hold_until": null,
      "recipient_settlement": null,
      "error": null,
      "initiated_by": "admin",
      "initiated_at": 1663408118,
      "scheduled_at": null,
      "processed_at": 1663408218,
      "reversed_at": null,
      "payout_link_id": null,
      "recurring": false,
      "short_url": "https://rzp.io/l/xxxxxxxxx",
      "user_id": null,
      "vpa": "user@upi",
      "email": "user@example.com",
      "contact_id": "cont_JqK7lBH50fYZ5d",
      "linked_account_notes": null,
      "metadata": null
    }
  },
  "created_at": 1663408218
}
```

**Key Points:**
- `status`: `"processed"` - Payout succeeded
- `utr`: `"1568176960vd4e5t"` - Unique Transaction Reference (proof of transfer)
- `reference_id`: `"123"` - Your redemption ID (to link back)
- `amount`: `10000` - In paise (100 INR)
- `mode`: `"UPI"` - Transfer method
- No `failure_reason`

**Your Handler Should:**
```
1. Verify signature
2. Extract reference_id = 123
3. Update redemptions.status = 3 (Success)
4. Store metadata.utr = "1568176960vd4e5t"
5. Update redemption_upi.utr = "1568176960vd4e5t"
6. Log webhook event
7. Return 200
```

---

## 2. Payout Failed

When a payout fails (insufficient funds, invalid UPI, etc.):

```json
{
  "entity": "event",
  "event": "payout.failed",
  "contains": ["payout"],
  "payload": {
    "payout": {
      "id": "pout_K7Jqk7tgPZd8HJ",
      "entity": "payout",
      "fund_account_id": "fa_Jq6bX6p2N1dgsd",
      "account_id": "acc_0000000000001",
      "amount": 10000,
      "currency": "INR",
      "notes": {
        "redemptionId": "124",
        "userId": "1",
        "type": "BANK_TRANSFER"
      },
      "fees": 0,
      "tax": 0,
      "status": "failed",
      "purpose": "refund",
      "description": null,
      "amount_settled": 0,
      "fees_settled": 0,
      "tax_settled": 0,
      "utr": null,
      "mode": "NEFT",
      "reference_id": "124",
      "narration": "Redemption RED-1234567891",
      "batch_id": null,
      "failure_reason": "Insufficient account balance",
      "recipient_settlement_id": null,
      "created_at": 1663408300,
      "fee_type": null,
      "on_hold": false,
      "on_hold_until": null,
      "recipient_settlement": null,
      "error": {
        "source": "razorpay",
        "reason": "insufficient_balance",
        "description": "Insufficient account balance",
        "code": "PAYOUT_FAILED",
        "step": "processing",
        "metadata": {}
      },
      "initiated_by": "admin",
      "initiated_at": 1663408200,
      "scheduled_at": null,
      "processed_at": null,
      "reversed_at": null,
      "payout_link_id": null,
      "recurring": false,
      "short_url": "https://rzp.io/l/yyyyyyyyy",
      "user_id": null,
      "bank_account": {
        "ifsc": "HDFC0000001",
        "bank_name": "HDFC Bank",
        "name": "John Doe",
        "notes": {},
        "contact_id": "cont_JqK7lBH50fYZ5d",
        "account_number": "1121431121541121"
      },
      "contact_id": "cont_JqK7lBH50fYZ5d",
      "linked_account_notes": null,
      "metadata": null
    }
  },
  "created_at": 1663408300
}
```

**Key Points:**
- `status`: `"failed"` - Payout did not succeed
- `failure_reason`: `"Insufficient account balance"` - Why it failed
- `utr`: `null` - No UTR since transfer didn't happen
- `error.reason`: `"insufficient_balance"` - Machine-readable error code
- `reference_id`: `"124"` - Your redemption ID

**Your Handler Should:**
```
1. Verify signature
2. Extract reference_id = 124
3. Update redemptions.status = 4 (Failed)
4. Store metadata.failureReason = "Insufficient account balance"
5. Call redemptionService.refundPoints(124, userId, 100, "Payout failed: ...")
6. Update <role>_ledger with CREDIT entry
7. Log webhook event
8. Return 200
```

---

## 3. Payout Failed (Invalid UPI)

Example of UPI-specific failure:

```json
{
  "entity": "event",
  "event": "payout.failed",
  "contains": ["payout"],
  "payload": {
    "payout": {
      "id": "pout_K7Jqk7tgPZd8HK",
      "entity": "payout",
      "amount": 10000,
      "status": "failed",
      "purpose": "refund",
      "utr": null,
      "mode": "UPI",
      "reference_id": "125",
      "failure_reason": "Invalid UPI",
      "error": {
        "code": "BAD_REQUEST_ERROR",
        "description": "Invalid UPI",
        "reason": "invalid_vpa",
        "source": "razorpay"
      },
      "vpa": "invalidupi@bank",
      "created_at": 1663408400,
      "initiated_by": "admin"
    }
  },
  "created_at": 1663408400
}
```

**Key Points:**
- `failure_reason`: `"Invalid UPI"` - User provided wrong UPI ID
- `vpa`: `"invalidupi@bank"` - The invalid UPI that was attempted

**Your Handler Should:**
- Refund points
- User error message: "Invalid UPI ID. Please verify and try again."

---

## 4. Payout Reversed

When a payout is reversed (refunded back to Razorpay account), typically after successful processing:

```json
{
  "entity": "event",
  "event": "payout.reversed",
  "contains": ["payout"],
  "payload": {
    "payout": {
      "id": "pout_K7Jqk7tgPZd8HK",
      "entity": "payout",
      "fund_account_id": "fa_Jq6bX6p2N1dgsd",
      "account_id": "acc_0000000000001",
      "amount": 10000,
      "currency": "INR",
      "notes": {
        "redemptionId": "123",
        "userId": "1",
        "type": "UPI"
      },
      "fees": 0,
      "tax": 0,
      "status": "reversed",
      "purpose": "refund",
      "utr": "1568176960vd4e5t",
      "mode": "UPI",
      "reference_id": "123",
      "narration": "Redemption RED-1234567890",
      "batch_id": null,
      "failure_reason": null,
      "created_at": 1663408218,
      "processed_at": 1663408218,
      "reversed_at": 1663495618,
      "error": null,
      "vpa": "user@upi",
      "contact_id": "cont_JqK7lBH50fYZ5d"
    }
  },
  "created_at": 1663495618
}
```

**Key Points:**
- `status`: `"reversed"` - Payout was reversed
- `reversed_at`: `1663495618` - When it was reversed (Unix timestamp)
- `utr`: Still present (it was processed, then reversed)
- Still has original `reference_id` and `amount`

**Your Handler Should:**
```
1. Verify signature
2. Extract reference_id = 123
3. Update redemptions.status = 6 (Refunded, or custom status)
4. Store metadata.webhookEvent = "payout.reversed"
5. Call redemptionService.refundPoints(123, userId, 100, "Payout reversed")
6. Update <role>_ledger with CREDIT entry
7. Log webhook event
8. Return 200
```

---

## 5. Payout Cancelled

(Not commonly triggered, but for reference):

```json
{
  "entity": "event",
  "event": "payout.cancelled",
  "contains": ["payout"],
  "payload": {
    "payout": {
      "id": "pout_K7Jqk7tgPZd8HK",
      "status": "cancelled",
      "reference_id": "126",
      "amount": 10000,
      "reason": "Cancelled by admin",
      "created_at": 1663408218,
      "cancelled_at": 1663408300
    }
  },
  "created_at": 1663408300
}
```

---

## Testing with Sample Payloads

### Option 1: Use Generator Script
```bash
node scripts/generate-webhook-test.js 123 pout_K7Jqk7tgPZd8HK payout.processed
```

### Option 2: Manual cURL with Sample Payload

```bash
# Save payload to file
cat > webhook_payload.json << 'EOF'
{
  "entity": "event",
  "event": "payout.processed",
  "contains": ["payout"],
  "payload": {
    "payout": {
      "id": "pout_K7Jqk7tgPZd8HK",
      "entity": "payout",
      "amount": 10000,
      "currency": "INR",
      "status": "processed",
      "purpose": "refund",
      "utr": "1568176960vd4e5t",
      "mode": "UPI",
      "reference_id": "123",
      "narration": "Redemption RED-1234567890",
      "created_at": 1663408218,
      "vpa": "user@upi",
      "contact_id": "cont_JqK7lBH50fYZ5d"
    }
  },
  "created_at": 1663408218
}
EOF

# Generate signature
PAYLOAD=$(cat webhook_payload.json)
SIGNATURE=$(node -e "const crypto = require('crypto'); console.log(crypto.createHmac('sha256', 'whsec_test_secret').update('$PAYLOAD').digest('hex'))")

# Send webhook
curl -X POST http://localhost:3000/api/v1/redemption/webhooks/razorpay \
  -H "Content-Type: application/json" \
  -H "X-Razorpay-Signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

### Option 3: Python Script for Testing

```python
import requests
import json
import hmac
import hashlib

# Configuration
WEBHOOK_URL = "http://localhost:3000/api/v1/redemption/webhooks/razorpay"
WEBHOOK_SECRET = "whsec_test_secret"

# Payload
payload = {
    "entity": "event",
    "event": "payout.processed",
    "contains": ["payout"],
    "payload": {
        "payout": {
            "id": "pout_K7Jqk7tgPZd8HK",
            "entity": "payout",
            "amount": 10000,
            "currency": "INR",
            "status": "processed",
            "purpose": "refund",
            "utr": "1568176960vd4e5t",
            "mode": "UPI",
            "reference_id": "123",
            "created_at": 1663408218
        }
    },
    "created_at": 1663408218
}

# Generate signature
payload_str = json.dumps(payload)
signature = hmac.new(
    WEBHOOK_SECRET.encode(),
    payload_str.encode(),
    hashlib.sha256
).hexdigest()

# Send request
headers = {
    "Content-Type": "application/json",
    "X-Razorpay-Signature": signature
}

response = requests.post(WEBHOOK_URL, json=payload, headers=headers)
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")
```

---

## Webhook Event Reference

| Event | Status | Meaning | Action |
|-------|--------|---------|--------|
| `payout.processed` | `processed` | ✅ Success | Store UTR, update to SUCCESS |
| `payout.failed` | `failed` | ❌ Failed | Refund points, update to FAILED |
| `payout.reversed` | `reversed` | ↩️ Reversed | Refund points, update to REFUNDED |
| `payout.cancelled` | `cancelled` | 🛑 Cancelled | Refund points (optional) |
| `payout.queued` | `queued` | ⏳ Queued | Track (optional) |

---

## Error Codes You Might See

### Payout Failure Reasons

| Reason | Code | Meaning |
|--------|------|---------|
| Invalid VPA | `invalid_vpa` | UPI ID format wrong |
| Invalid Account | `invalid_account` | Bank account invalid |
| Insufficient Funds | `insufficient_balance` | Not enough in payout account |
| Network Error | `timeout_error` | Network issue with bank |
| Invalid Beneficiary | `invalid_beneficiary` | Beneficiary details wrong |
| Duplicate Request | `duplicate_request` | Same request sent twice |

---

## Best Practices for Testing

1. **Always verify signature** before processing
2. **Log every webhook** for debugging
3. **Check reference_id exists** before updating
4. **Handle duplicates** gracefully (idempotency)
5. **Return 200 immediately** for successful webhooks
6. **Don't retry on 200** - Let Razorpay know it's processed
7. **Store complete payload** for debugging
8. **Monitor webhook latency** - Should be < 500ms

---

**Use these samples to test your webhook handler with `curl`, Python, or the generator script.**

