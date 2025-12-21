# Redemptions Table Analysis

## Current Table Structure
```
redemptions {
  id, userId, redemptionId, channelId, pointsRedeemed, amount, status, 
  schemeId, metadata (JSONB), approvedBy, createdAt
}
```

## Redemption Types & Requirements

| Type | Data Needed | Current Support |
|------|------------|-----------------|
| **UPI Redemption** | UPI ID, amount, txn_ref, status | ✓ metadata (JSONB) |
| **Bank Redemption** | Account#, IFSC, Account Name, Amount | ✓ metadata (can store) but *risky* |
| **E-Vouchers** | Voucher Code, Expiry, Terms, Validity | ✓ metadata |
| **Physical Reward (Marketplace)** | Product details, Quantity, Shipping Address, Tracking# | ✗ **Missing shipping & tracking** |
| **Marketplace History** | Order tracking, Status updates, Product history | ✗ **Missing order tracking** |
| **Redemption History** | Status timeline, Approval chain, Timestamps | ⚠ **Partial - need history table** |
| **Bank Details (Fetch)** | Multiple saved bank accounts per user | ✗ **Missing user bank account table** |

## Issues with Current Schema

1. **Security Risk**: Storing bank details in `metadata` (JSONB) is unencrypted and auditable—bank account data should be encrypted and separate.
2. **No History Tracking**: Status changes not tracked—`metadata` can't track approval workflow.
3. **No Shipping/Tracking**: Physical rewards need dedicated fields for shipping address, courier, tracking number.
4. **No Saved Instruments**: Can't track user's saved UPI/bank accounts separately.
5. **Marketplace Integration**: No order-level tracking for physical marketplace rewards.

## Recommended Schema Extensions

### Option A: Add Specific Columns (Lightweight)
```sql
-- Add to redemptions table:
upiId TEXT                                -- UPI identifier
bankAccountNo TEXT (ENCRYPTED)            -- Bank account (encrypted)
bankIfsc TEXT (ENCRYPTED)                 -- Bank IFSC (encrypted)
bankAccountName TEXT                      -- Account holder name
shippingAddress JSONB                     -- {street, city, state, pincode}
trackingNumber TEXT                       -- Courier/marketplace tracking
trackingUrl TEXT                          -- Tracking URL
voucherCode TEXT                          -- E-voucher code
voucherExpiry TIMESTAMP                   -- Voucher expiry
```

### Option B: Create Separate Tables (Recommended)
```
user_payment_instruments {
  id, userId, type (upi|bank), identifier, data (JSONB), isDefault, isActive, createdAt
}

redemption_bank_detail {
  redemptionId, accountNo (encrypted), ifsc (encrypted), accountName, bankName
}

redemption_shipping {
  redemptionId, address, city, state, pincode, trackingNumber, trackingUrl, courier
}

redemption_status_history {
  id, redemptionId, status, changedBy, changedAt, reason
}

redemption_voucher {
  redemptionId, code, terms, expiryDate, validFrom
}

redemption_marketplace_order {
  redemptionId, productId, quantity, orderId, shippingStatus, trackingNumber, url
}
```

### Option C: Hybrid (Best Balance)
Enhance `redemptions` table with essential fields + use related tables for complex data:

```typescript
export const redemptions = pgTable("redemptions", {
  // ... existing fields ...
  
  // New fields for common data
  redemptionType: text().notNull(),  // 'upi' | 'bank' | 'voucher' | 'marketplace' | 'physical'
  
  // Recipient details (flexible for all types)
  recipientIdentifier: text(),        // UPI ID / Email / Phone
  recipientDetails: jsonb(),          // {upiId?, accountNo?, voucherCode?, etc}
  
  // Shipping for physical rewards
  shippingAddress: jsonb(),           // {street, city, state, pincode, phone}
  trackingNumber: text(),
  trackingUrl: text(),
  
  // Status tracking
  statusUpdatedAt: timestamp(),
  statusUpdatedBy: integer(),
  
  // Metadata for redemption-type-specific data
  metadata: jsonb(),
});

// Related tables
export const redemptionStatusHistory = pgTable("redemption_status_history", {
  id, redemptionId, status, changedBy, changedAt, reason
});

export const userPaymentInstruments = pgTable("user_payment_instruments", {
  id, userId, type, identifier, data (encrypted JSONB), isDefault, createdAt
});

export const redemptionDetails = pgTable("redemption_details", {
  id, redemptionId, detailType, detailKey, detailValue, createdAt
});
```

## Recommendation

**Use Option C (Hybrid Approach)**:
- ✅ Keeps `redemptions` table lean but extensible
- ✅ Adds common fields (type, recipientIdentifier, shippingAddress, tracking)
- ✅ Uses related tables for sensitive data (bank, UPI) and audit trails
- ✅ Supports all 7 redemption types
- ✅ Enables status history tracking
- ✅ Maintains backward compatibility

## Migration Script Needed
```sql
ALTER TABLE redemptions ADD COLUMN redemption_type TEXT NOT NULL DEFAULT 'upi';
ALTER TABLE redemptions ADD COLUMN recipient_identifier TEXT;
ALTER TABLE redemptions ADD COLUMN recipient_details JSONB;
ALTER TABLE redemptions ADD COLUMN shipping_address JSONB;
ALTER TABLE redemptions ADD COLUMN tracking_number TEXT;
ALTER TABLE redemptions ADD COLUMN tracking_url TEXT;
ALTER TABLE redemptions ADD COLUMN status_updated_at TIMESTAMP;
ALTER TABLE redemptions ADD COLUMN status_updated_by INTEGER;

-- Create related tables for sensitive/audit data
CREATE TABLE redemption_status_history { ... };
CREATE TABLE user_payment_instruments { ... };
```

Would you like me to:
1. Generate the complete schema definitions for these tables?
2. Create service/controller for redemption management?
3. Build routes for each redemption type (UPI, Bank, Voucher, Marketplace)?
