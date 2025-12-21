# KYC Update Implementation Review

## Current State Analysis

### Existing Components
1. **KycService** — Document verification (Aadhaar, PAN, GST) with stub APIs
2. **KycApproveProcedure** — Admin approval workflow via procedure pattern
3. **User Routes** — `/kyc/approve` (admin) + profile endpoints
4. **UserService** — Basic profile CRUD

### Issues with Current Approach
- ❌ No KYC document submission endpoint
- ❌ No verification result tracking (which docs passed/failed)
- ❌ No multi-step verification state tracking
- ❌ KYC approval tightly coupled with admin workflow
- ⚠️ No separation between user submission and system verification

---

## Recommended Architecture: **Dual-Endpoint Approach**

### Why NOT Single Profile Endpoint
```
❌ PUT /api/v1/profile { name, email, kyc_documents... }
```
**Problems:**
- KYC is a **process**, not just data storage
- Mixes account data (name, email) with verification workflows
- Difficult to track verification state (pending, verified, rejected)
- Admin approval required — can't be a simple profile update
- Audit trail gets complicated
- Hard to implement multi-doc workflows (Aadhaar → PAN → GST sequentially)

### ✅ Recommended: Separate KYC Endpoints

#### 1. **User KYC Submission Endpoints** (User-facing)
```
POST   /api/v1/kyc/submit
  → Submit document (Aadhaar, PAN, GST)
  → Triggers verification via external service
  → Stores result in kyc_documents table

GET    /api/v1/kyc/status
  → Get KYC verification status for each document type
  → Shows: pending, verified, rejected, expired

GET    /api/v1/kyc/documents/{type}
  → Retrieve stored document details

PUT    /api/v1/kyc/documents/{type}
  → Resubmit failed document for re-verification
```

#### 2. **Admin KYC Approval Endpoints** (Admin-facing)
```
GET    /api/v1/admin/kyc/pending
  → List users with pending KYC approvals

POST   /api/v1/admin/kyc/approve/{userId}
  → Admin approves user's KYC (all docs verified)
  → Sets isKycVerified=true on user table
  → Triggers notification to user

POST   /api/v1/admin/kyc/reject/{userId}
  → Admin rejects KYC with reason
  → Stores rejection reason
  → Allows user to resubmit
```

#### 3. **Profile Update Endpoint** (Remains separate)
```
PUT    /api/v1/profile
  → Update non-KYC fields (name, email, phone, address)
  → Read-only: KYC status (shows current verification state)
  → Does NOT trigger verification
```

---

## Data Model Design

### New Schema Tables

#### `kyc_documents` Table
```typescript
export const kycDocuments = pgTable("kyc_documents", {
  id: serial().primaryKey().notNull(),
  userId: integer("user_id").notNull(),
  documentType: text("document_type").notNull(), // 'AADHAR' | 'PAN' | 'GST'
  documentValue: text("document_value").notNull(), // encrypted
  submittedAt: timestamp("submitted_at").defaultNow(),
  verificationStatus: text("verification_status").notNull(), // 'pending' | 'verified' | 'rejected' | 'expired'
  verificationResult: jsonb("verification_result"), // {verified: bool, data: {...}, message: string}
  verifiedAt: timestamp("verified_at"),
  rejectionReason: text("rejection_reason"),
  expiryDate: timestamp("expiry_date"),
  metadata: jsonb(), // vendor-specific data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "kyc_documents_user_id_fkey"
  }).onDelete("cascade"),
  unique("kyc_documents_user_id_type_key").on(table.userId, table.documentType),
]);

// Track KYC approval workflow
export const kycApprovals = pgTable("kyc_approvals", {
  id: serial().primaryKey().notNull(),
  userId: integer("user_id").notNull(),
  allDocumentsVerified: boolean("all_documents_verified").default(false),
  approvedBy: integer("approved_by"), // admin user
  approvalStatus: text("approval_status").notNull(), // 'pending' | 'approved' | 'rejected'
  approvalReason: text("approval_reason"),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "kyc_approvals_user_id_fkey"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.approvedBy],
    foreignColumns: [users.id],
    name: "kyc_approvals_approved_by_fkey"
  }),
  unique("kyc_approvals_user_id_key").on(table.userId),
]);
```

### Update `users` Table
```typescript
// Add to existing users table:
isKycVerified: boolean("is_kyc_verified").default(false),
kycVerifiedAt: timestamp("kyc_verified_at"),
lastKycRejectionAt: timestamp("last_kyc_rejection_at"),
```

---

## Workflow Diagram

```
User Submission Flow:
├── POST /kyc/submit {documentType, documentValue}
│   └── KycService.verifyDocument()
│       └── External vendor API call
│           └── Store result in kyc_documents table
│               └── verificationStatus = 'pending' | 'verified' | 'rejected'
│
├── GET /kyc/status
│   └── Show: Aadhaar (verified), PAN (pending), GST (rejected)
│
└── PUT /kyc/documents/{type}
    └── Resubmit rejected document (if allowed)

Admin Approval Flow:
├── GET /admin/kyc/pending
│   └── List users where all kyc_documents are 'verified'
│       AND kycApprovals.approvalStatus = 'pending'
│
├── POST /admin/kyc/approve/{userId}
│   └── Atomic transaction:
│       ├── Update users.isKycVerified = true
│       ├── Update users.kycVerifiedAt = now()
│       ├── Update kycApprovals.approvalStatus = 'approved'
│       ├── Publish MQ event: kyc.approved
│       └── Send notification to user
│
└── POST /admin/kyc/reject/{userId}
    └── Update kycApprovals.approvalStatus = 'rejected'
        └── Allow user to resubmit documents
```

---

## Service Architecture

### `KycService` (Enhanced)
```typescript
class KycService extends BaseService {
  // Document verification
  async submitDocument(userId, documentType, documentValue)
  async getDocumentStatus(userId, documentType)
  async getAllDocumentsStatus(userId)
  
  // Admin approval flow
  async getPendingKycApprovals(filters, pagination)
  async approveKyc(userId, approvedBy, reason?)
  async rejectKyc(userId, rejectedBy, reason)
  async canUserResubmit(userId)
}
```

### `KycHistoryService` (New)
```typescript
class KycHistoryService {
  async getKycHistory(userId) // Timeline of submissions
  async getVerificationAttempts(userId, documentType) // Retry tracking
  async getApprovalHistory(userId) // Admin approvals/rejections
}
```

---

## API Endpoints Summary

### User Endpoints (Authenticated)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/v1/kyc/submit` | Submit document for verification |
| GET | `/api/v1/kyc/status` | Get KYC verification status |
| GET | `/api/v1/kyc/documents/{type}` | Get document details |
| PUT | `/api/v1/kyc/documents/{type}` | Resubmit document |
| GET | `/api/v1/kyc/history` | Get KYC submission history |

### Admin Endpoints (Auth + Admin Role)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/admin/kyc/pending` | List pending KYC approvals |
| POST | `/api/v1/admin/kyc/approve/{userId}` | Approve user KYC |
| POST | `/api/v1/admin/kyc/reject/{userId}` | Reject KYC |
| GET | `/api/v1/admin/kyc/{userId}/history` | View user's KYC history |

### Profile Endpoint (Unchanged)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| PUT | `/api/v1/profile` | Update name, email, address (NOT KYC) |

---

## Implementation Checklist

- [ ] Create `kyc_documents` and `kyc_approvals` tables in schema
- [ ] Create `KycDocumentService` (CRUD for documents)
- [ ] Enhance `KycService` with multi-step verification logic
- [ ] Create `KycHistoryService` for audit trails
- [ ] Create KYC controllers (user + admin)
- [ ] Create KYC routes (user + admin)
- [ ] Add encryption for document_value field
- [ ] Add MQ event publishing: `kyc.submitted`, `kyc.verified`, `kyc.approved`, `kyc.rejected`
- [ ] Add Swagger documentation
- [ ] Add Zod validation schemas
- [ ] Implement rate limiting on document submission
- [ ] Add email notifications (submission, approval, rejection)

---

## Key Design Principles

1. **Separation of Concerns**
   - User submission ≠ System verification ≠ Admin approval
   - Each has its own endpoints and state

2. **Auditability**
   - Every submission, verification, and approval is tracked
   - Immutable history for compliance

3. **Reusability**
   - Users can resubmit after rejection
   - Documents can expire and require renewal

4. **Async-First**
   - Verification can be slow (external APIs)
   - Use MQ events for downstream processes

5. **Atomic Operations**
   - KYC approval updates user table atomically
   - No partial state updates

---

## Comparison: Single vs. Dual Endpoint

### Single Endpoint (NOT Recommended)
```typescript
PUT /profile {
  name, email, kyc_aadhaar, kyc_pan, kyc_gst
}
```
❌ Couples unrelated data
❌ Hard to track verification state
❌ Cannot reflect async verification
❌ Admin approval logic unclear

### Dual Endpoint (RECOMMENDED)
```typescript
PUT /profile { name, email, phone }    // Fast, immediate
POST /kyc/submit { type, value }       // Async, verification
POST /admin/kyc/approve { userId }     // Admin workflow
```
✅ Clear separation
✅ Async-friendly
✅ Easy to track state
✅ Audit trail naturally emerges
✅ Scales to more doc types easily

---

## Conclusion

**Use Separate KYC Endpoints** because:
- KYC is a **process**, not just profile data
- Multi-step verification requires state tracking
- Admin approval is a separate workflow
- Audit and compliance requirements demand clear separation
- Easier to extend (add more doc types, approval levels, etc.)
