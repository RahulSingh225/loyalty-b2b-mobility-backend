# TDS (Tax Deducted at Source) Implementation Guide

## Overview

TDS is a deduction applied to earnings on a per-transaction basis. The deducted amount accumulates in a "TDS Kitty" for each financial year. When the kitty exceeds ₹20,000, the excess is permanently deducted. At the end of each financial year (March 31st), the system performs a reset:

- **If TDS Kitty ≥ ₹20,000**: Deduct the full amount
- **If TDS Kitty < ₹20,000**: Revert to main point balance (no deduction)

Each user maintains a year-on-year record of their TDS transactions.

---

## Schema

### `tds_records` Table

Tracks TDS for each user, per financial year.

```sql
CREATE TABLE tds_records (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  financial_year TEXT NOT NULL,           -- e.g., "2024-2025"
  tds_kitty NUMERIC DEFAULT '0',          -- accumulated TDS in current FY
  tds_deducted NUMERIC DEFAULT '0',       -- final TDS amount deducted
  reversed_amount NUMERIC DEFAULT '0',    -- amount reverted if < 20k
  status TEXT DEFAULT 'active',           -- 'active' | 'settled' | 'reverted'
  settled_at TIMESTAMP,                   -- when FY reset occurred
  metadata JSONB DEFAULT '{}',            -- transactionCount, notes
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, financial_year)
);
```

**Fields**:
- `tds_kitty`: Running total of TDS deducted in current FY
- `tds_deducted`: Amount actually deducted (set on FY boundary if kitty ≥ 20k)
- `reversed_amount`: Amount reverted to user if kitty < 20k at FY end
- `status`: Tracks record lifecycle (active during FY, settled/reverted on boundary)
- `metadata`: Audit trail (transaction count, last deduction date, notes)

---

## Constraint Implementation

### `TdsDeductionConstraint`

Implements `ScanConstraint` interface. Applied to every earning for users with TDS enabled.

**Location**: `src/procedures/constraints/TdsDeduction.ts`

**Usage**:

```typescript
// In qr-scan procedure
const tdsConstraint = new TdsDeductionConstraint();
const ctx: ConstraintContext = {
  tx,
  userId: 123,
  userType: 'CounterSales',
  points: 100,        // gross points
  netPoints: 100,     // will be reduced by TDS
  qr: { code: '...' },
  primaryScan: true,
};

await tdsConstraint.execute(ctx);
// ctx.netPoints is now 95 (if 5% TDS, 100 - 5 = 95)
// TDS record updated with +5 in kitty
```

**Key Methods**:

- **`execute(ctx)`**: Main constraint execution
  - Fetches TDS % from master table (`TDS_PERCENTAGE_${userType}` or `TDS_PERCENTAGE`)
  - Calculates TDS on earning: `tdsAmount = netPoints * (tdsPercent / 100)`
  - Reduces `ctx.netPoints` by TDS amount
  - Updates TDS record, tracking kitty and deductions
  - Handles 20k threshold crossing silently

- **`handleFyReset(tx, userId, previousFy, newFy)`**: Manual FY boundary reset
  - Settles previous FY record (deduct if ≥ 20k, else revert)
  - Creates fresh FY record for new year

- **`getTdsSummary(tx, userId)`**: Fetch user's TDS across all years

---

## Service Layer

### `TdsService`

Extends `BaseService<tdsRecords>`. Provides administrative operations.

**Location**: `src/services/tdsService.ts`

**Key Methods**:

#### User-Facing
- **`getUserTdsSummary(userId)`**: Current FY kitty, total deducted, all year records
- **`getUserTdsHistory(userId, {page, pageSize})`**: Paginated history

#### Admin
- **`getTdsRecordsByFy(fy, {page, pageSize})`**: All users' TDS for a financial year
- **`getTdsRecordsByStatus(status, {page, pageSize})`**: Filter by active/settled/reverted
- **`getGlobalTdsStats()`**: System-wide metrics (total deducted, kitty, by FY, by status)
- **`auditUserTds(userId)`**: Detailed audit trail with metadata
- **`performFyReset(previousFy, newFy)`**: Bulk FY reset for all users (call on April 1)

---

## Controller & Routes

### Endpoints

**Base URL**: `/api/v1/tds`

#### User Endpoints (Authenticated)

- **`GET /summary`**
  - User's TDS summary (current FY, total deducted, history)
  - Response:
    ```json
    {
      "currentFy": "2024-2025",
      "currentKitty": 15000,
      "totalDeducted": 45000,
      "fyRecords": [
        {
          "financialYear": "2024-2025",
          "tdsKitty": 15000,
          "tdsDeducted": 0,
          "reversedAmount": 0,
          "status": "active",
          "transactionCount": 45,
          "settledAt": null
        }
      ]
    }
    ```

- **`GET /history?page=1&pageSize=20`**
  - Paginated TDS history across all years

#### Admin Endpoints (Authenticated, requires admin role)

- **`GET /admin/stats`**
  - Global statistics
  - Response:
    ```json
    {
      "totalUsers": 500,
      "totalTdsDeducted": 2500000,
      "totalTdsInKitty": 750000,
      "totalReverted": 100000,
      "byStatus": { "active": 450, "settled": 40, "reverted": 10 },
      "byFy": {
        "2024-2025": {
          "deducted": 1200000,
          "kitty": 600000,
          "reverted": 50000,
          "userCount": 300
        }
      }
    }
    ```

- **`GET /admin/fy/:financialYear`**
  - All TDS records for a specific FY

- **`GET /admin/status/:status`**
  - Filter records by status (active, settled, reverted)

- **`GET /admin/audit/:userId`**
  - Detailed audit trail for user with full metadata

- **`POST /admin/fy-reset`**
  - Trigger FY boundary reset
  - Request body:
    ```json
    { "previousFy": "2023-2024", "newFy": "2024-2025" }
    ```
  - Response: `{ processed: 450, settled: 40, reverted: 10, errors: 0 }`

---

## Integration Points

### 1. QR Scan Procedure

In `src/procedures/qr-scan.ts` (or wherever earnings are credited):

```typescript
import { TdsDeductionConstraint } from './constraints/TdsDeduction';

const tdsConstraint = new TdsDeductionConstraint();

// In constraint execution loop
if (constraints.some(c => c.appliesTo.includes(userType))) {
  await tdsConstraint.execute(ctx);
}
```

### 2. Master Data Configuration

Add TDS percentage to `masterData` table:

```sql
INSERT INTO master_data (key, value, is_active) VALUES
('TDS_PERCENTAGE_COUNTERSALES', '5', true),
('TDS_PERCENTAGE_ELECTRICIAN', '3', true),
('TDS_PERCENTAGE_RETAILER', '7', true);
```

Or use generic fallback:
```sql
INSERT INTO master_data (key, value, is_active) VALUES
('TDS_PERCENTAGE', '5', true);
```

### 3. FY Boundary Scheduler

Create a cron job for April 1st at midnight:

```typescript
// In scheduler service or separate cron handler
import { TdsService } from '../services/tdsService';
import cron from 'node-cron';

const tdsService = new TdsService();

// Run at 00:00 on April 1st every year
cron.schedule('0 0 1 4 *', async () => {
  try {
    const currentYear = new Date().getFullYear();
    const result = await tdsService.performFyReset(
      `${currentYear - 1}-${currentYear}`,
      `${currentYear}-${currentYear + 1}`
    );
    console.log(`FY Reset completed:`, result);
  } catch (error) {
    console.error('FY Reset failed:', error);
  }
});
```

---

## Financial Year Logic

**FY Period**: April 1 - March 31

**Calculation**:

```typescript
getFinancialYear(date: Date = new Date()): string {
  const month = date.getMonth();  // 0=Jan, 3=April, 11=Dec
  const year = date.getFullYear();
  
  if (month >= 3) {               // April onwards
    return `${year}-${year + 1}`;
  } else {                        // Jan-Mar
    return `${year - 1}-${year}`;
  }
}

// Examples:
// May 2024 → "2024-2025"
// March 2024 → "2023-2024"
// April 2024 → "2024-2025"
```

---

## Example Workflow

### Scenario: CounterSales earning with 5% TDS

1. **User earns 1000 points** on QR scan
   - Master: `TDS_PERCENTAGE_COUNTERSALES = 5`
   - Constraint calculates: TDS = 1000 * 5% = 50 points
   - Final earning: 1000 - 50 = 950 points
   - TDS kitty updated: 0 + 50 = 50

2. **Multiple scans accumulate TDS**
   - After 400+ scans in FY: Kitty = 20,050
   - Threshold crossed! → `tdsDeducted = 20,050`, `status = 'settled'`, `tdsKitty = 0`

3. **At FY boundary (March 31)**
   - Old FY `tdsKitty < 20k` (e.g., 15,000)
   - Action: `reversedAmount = 15,000`, `status = 'reverted'`
   - Points credited back to user's main balance
   - New FY record created with `status = 'active'`

---

## Security & Audit

- All changes logged in `tdsRecords.metadata` with timestamps
- Cannot delete TDS records (cascade delete would corrupt audit)
- TDS deduction is atomic with earning transaction
- Admin endpoints require authentication + role check
- Financial year records are immutable once settled

---

## Testing

```bash
# Get user's TDS summary
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/v1/tds/summary

# Get TDS history
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/v1/tds/history?page=1

# Admin: Global stats
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/v1/tds/admin/stats

# Admin: Audit user
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/v1/tds/admin/audit/123

# Admin: Trigger FY reset
curl -X POST -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"previousFy":"2023-2024","newFy":"2024-2025"}' \
  http://localhost:3000/api/v1/tds/admin/fy-reset
```

---

## Environment Variables

```env
# Master data keys for TDS percentages
TDS_PERCENTAGE_COUNTERSALES=5      # %
TDS_PERCENTAGE_ELECTRICIAN=3       # %
TDS_PERCENTAGE_RETAILER=7          # %
TDS_THRESHOLD=20000                # points
```

Or configure via `masterData` table directly.
