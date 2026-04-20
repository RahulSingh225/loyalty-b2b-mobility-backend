// // ============================================================================
// // REDEMPTION SCHEMA - TypeScript Definitions (Simplified Version)
// // ============================================================================
// // Add these table definitions to your src/schema/index.ts file
// // These tables support 4 redemption channels while preserving existing functionality
// // ============================================================================

// import { pgTable, foreignKey, serial, text, integer, jsonb, timestamp, unique, boolean, numeric } from "drizzle-orm/pg-core";
// import { sql } from "drizzle-orm";
// import { relations } from "drizzle-orm";

// // ============================================================================
// // CHANNEL-SPECIFIC TABLES
// // ============================================================================

// /**
//  * Bank Transfer Redemptions
//  * Stores normalized bank account details for Razorpay bank transfer payouts
//  */
// export const redemptionBankTransfers = pgTable("redemption_bank_transfers", {
//     id: serial().primaryKey().notNull(),
//     redemptionId: integer("redemption_id").notNull().unique(),

//     // Bank account details
//     accountNumber: text("account_number").notNull(),
//     ifscCode: text("ifsc_code").notNull(),
//     accountHolderName: text("account_holder_name").notNull(),
//     bankName: text("bank_name"),

//     // Razorpay transaction tracking
//     razorpayPayoutId: text("razorpay_payout_id"),
//     razorpayFundAccountId: text("razorpay_fund_account_id"),
//     razorpayContactId: text("razorpay_contact_id"),
//     utr: text("utr"), // Unique Transaction Reference from bank

//     // Processing timestamp
//     processedAt: timestamp("processed_at", { mode: 'string' }),

//     createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
//     updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
// }, (table) => [
//     foreignKey({
//         columns: [table.redemptionId],
//         foreignColumns: [redemptions.id],
//         name: "redemption_bank_transfers_redemption_id_fkey"
//     }).onDelete("cascade"),
// ]);

// /**
//  * UPI Redemptions
//  * Stores normalized UPI details for Razorpay UPI payouts
//  */
// export const redemptionUpi = pgTable("redemption_upi", {
//     id: serial().primaryKey().notNull(),
//     redemptionId: integer("redemption_id").notNull().unique(),

//     // UPI details
//     upiId: text("upi_id").notNull(),

//     // Razorpay transaction tracking
//     razorpayPayoutId: text("razorpay_payout_id"),
//     razorpayFundAccountId: text("razorpay_fund_account_id"),
//     razorpayContactId: text("razorpay_contact_id"),
//     utr: text("utr"), // UPI transaction reference

//     // Processing timestamp
//     processedAt: timestamp("processed_at", { mode: 'string' }),

//     createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
//     updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
// }, (table) => [
//     foreignKey({
//         columns: [table.redemptionId],
//         foreignColumns: [redemptions.id],
//         name: "redemption_upi_redemption_id_fkey"
//     }).onDelete("cascade"),
// ]);

// /**
//  * E-Voucher Redemptions
//  * Stores normalized voucher details for custom voucher platform
//  */
// export const redemptionVouchers = pgTable("redemption_vouchers", {
//     id: serial().primaryKey().notNull(),
//     redemptionId: integer("redemption_id").notNull().unique(),

//     // Voucher details
//     voucherCode: text("voucher_code").notNull().unique(),
//     voucherPin: text("voucher_pin"),

//     // Voucher platform specific
//     platformVoucherId: text("platform_voucher_id"),
//     platformOrderId: text("platform_order_id"),

//     // Validity
//     validFrom: timestamp("valid_from", { mode: 'string' }).defaultNow(),
//     validUntil: timestamp("valid_until", { mode: 'string' }),

//     // Redemption tracking
//     isRedeemed: boolean("is_redeemed").default(false),
//     redeemedAt: timestamp("redeemed_at", { mode: 'string' }),

//     // Voucher details
//     brand: text("brand"),
//     denomination: numeric("denomination", { precision: 10, scale: 2 }),

//     createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
//     updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
// }, (table) => [
//     foreignKey({
//         columns: [table.redemptionId],
//         foreignColumns: [redemptions.id],
//         name: "redemption_vouchers_redemption_id_fkey"
//     }).onDelete("cascade"),
//     unique("redemption_vouchers_voucher_code_key").on(table.voucherCode),
// ]);

// // ============================================================================
// // THIRD PARTY API LOGS TABLE
// // ============================================================================

// /**
//  * Third Party API Logs
//  * Stores all API calls, webhooks, and callbacks from Razorpay and Voucher Platform
//  * Includes request/response payloads for debugging and compliance
//  */
// export const thirdPartyApiLogs = pgTable("third_party_api_logs", {
//     id: serial().primaryKey().notNull(),

//     // Link to redemption (optional - some webhooks arrive before redemption created)
//     redemptionId: integer("redemption_id"),

//     // API provider
//     provider: text("provider").notNull(), // 'razorpay', 'voucher_platform'
//     apiType: text("api_type").notNull(), // 'request', 'callback', 'webhook'

//     // Request details
//     apiEndpoint: text("api_endpoint").notNull(),
//     httpMethod: text("http_method"), // GET, POST, PUT (null for webhooks)

//     // Request/Response payloads
//     requestPayload: jsonb("request_payload"),
//     responsePayload: jsonb("response_payload"),

//     // Response status
//     httpStatusCode: integer("http_status_code"),
//     isSuccess: boolean("is_success"),
//     errorMessage: text("error_message"),

//     // Webhook specific (for Razorpay event notifications)
//     webhookEventType: text("webhook_event_type"), // e.g., 'payout.processed', 'payout.failed'
//     webhookSignature: text("webhook_signature"),

//     // Performance timing
//     responseTimeMs: integer("response_time_ms"),

//     // Additional metadata
//     metadata: jsonb().default({}),

//     createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
// }, (table) => [
//     foreignKey({
//         columns: [table.redemptionId],
//         foreignColumns: [redemptions.id],
//         name: "third_party_api_logs_redemption_id_fkey"
//     }).onDelete("set null"), // Keep logs even if redemption is deleted
// ]);

// // ============================================================================
// // DRIZZLE RELATIONS (Optional - for better query experience)
// // ============================================================================

// /**
//  * Redemptions Relations
//  * Extend existing redemptions relations with new channel-specific tables
//  */
// export const redemptionsRelations = relations(redemptions, ({ one, many }) => ({
//     // Existing relations...
//     user: one(users, {
//         fields: [redemptions.userId],
//         references: [users.id]
//     }),
//     channel: one(redemptionChannels, {
//         fields: [redemptions.channelId],
//         references: [redemptionChannels.id]
//     }),
//     status: one(redemptionStatuses, {
//         fields: [redemptions.status],
//         references: [redemptionStatuses.id]
//     }),

//     // NEW: One-to-one relations to channel-specific tables
//     bankTransfer: one(redemptionBankTransfers, {
//         fields: [redemptions.id],
//         references: [redemptionBankTransfers.redemptionId]
//     }),
//     upi: one(redemptionUpi, {
//         fields: [redemptions.id],
//         references: [redemptionUpi.redemptionId]
//     }),
//     voucher: one(redemptionVouchers, {
//         fields: [redemptions.id],
//         references: [redemptionVouchers.redemptionId]
//     }),

//     // NEW: One-to-many relation to API logs
//     apiLogs: many(thirdPartyApiLogs),
// }));

// export const redemptionBankTransfersRelations = relations(redemptionBankTransfers, ({ one }) => ({
//     redemption: one(redemptions, {
//         fields: [redemptionBankTransfers.redemptionId],
//         references: [redemptions.id]
//     }),
// }));

// export const redemptionUpiRelations = relations(redemptionUpi, ({ one }) => ({
//     redemption: one(redemptions, {
//         fields: [redemptionUpi.redemptionId],
//         references: [redemptions.id]
//     }),
// }));

// export const redemptionVouchersRelations = relations(redemptionVouchers, ({ one }) => ({
//     redemption: one(redemptions, {
//         fields: [redemptionVouchers.redemptionId],
//         references: [redemptions.id]
//     }),
// }));

// export const thirdPartyApiLogsRelations = relations(thirdPartyApiLogs, ({ one }) => ({
//     redemption: one(redemptions, {
//         fields: [thirdPartyApiLogs.redemptionId],
//         references: [redemptions.id]
//     }),
// }));

// // ============================================================================
// // TYPE EXPORTS (for use in services/controllers)
// // ============================================================================

// export type RedemptionBankTransfer = typeof redemptionBankTransfers.$inferSelect;
// export type NewRedemptionBankTransfer = typeof redemptionBankTransfers.$inferInsert;

// export type RedemptionUpi = typeof redemptionUpi.$inferSelect;
// export type NewRedemptionUpi = typeof redemptionUpi.$inferInsert;

// export type RedemptionVoucher = typeof redemptionVouchers.$inferSelect;
// export type NewRedemptionVoucher = typeof redemptionVouchers.$inferInsert;

// export type ThirdPartyApiLog = typeof thirdPartyApiLogs.$inferSelect;
// export type NewThirdPartyApiLog = typeof thirdPartyApiLogs.$inferInsert;

// // ============================================================================
// // USAGE EXAMPLES
// // ============================================================================

// /**
//  * Example: Create bank transfer redemption with API logging
//  * 
//  * const [redemption] = await db.insert(redemptions).values({
//  *   userId,
//  *   redemptionId: `RED-${Date.now()}`,
//  *   channelId,
//  *   pointsRedeemed,
//  *   amount,
//  *   status: pendingStatusId,
//  *   metadata: { redemptionType: 'BANK_TRANSFER' }
//  * }).returning();
//  * 
//  * const [bankTransfer] = await db.insert(redemptionBankTransfers).values({
//  *   redemptionId: redemption.id,
//  *   accountNumber: userBankDetails.accountNumber,
//  *   ifscCode: userBankDetails.ifscCode,
//  *   accountHolderName: userBankDetails.accountHolderName
//  * }).returning();
//  * 
//  * // Update redemption with reference
//  * await db.update(redemptions)
//  *   .set({ channelReferenceId: bankTransfer.id })
//  *   .where(eq(redemptions.id, redemption.id));
//  * 
//  * // Call Razorpay API
//  * const razorpayResponse = await callRazorpayPayout(...);
//  * 
//  * // Log API call
//  * await db.insert(thirdPartyApiLogs).values({
//  *   redemptionId: redemption.id,
//  *   provider: 'razorpay',
//  *   apiType: 'request',
//  *   apiEndpoint: '/v1/payouts',
//  *   httpMethod: 'POST',
//  *   requestPayload: { ... },
//  *   responsePayload: razorpayResponse,
//  *   httpStatusCode: 200,
//  *   isSuccess: true
//  * });
//  * 
//  * // Update bank transfer with Razorpay data
//  * await db.update(redemptionBankTransfers)
//  *   .set({
//  *     razorpayPayoutId: razorpayResponse.id,
//  *     utr: razorpayResponse.utr,
//  *     processedAt: new Date()
//  *   })
//  *   .where(eq(redemptionBankTransfers.redemptionId, redemption.id));
//  */

// /**
//  * Example: Log Razorpay webhook
//  * 
//  * await db.insert(thirdPartyApiLogs).values({
//  *   provider: 'razorpay',
//  *   apiType: 'webhook',
//  *   apiEndpoint: '/webhooks/razorpay',
//  *   responsePayload: webhookBody,
//  *   webhookEventType: webhookBody.event,
//  *   webhookSignature: headers['x-razorpay-signature'],
//  *   isSuccess: true
//  * });
//  */

// /**
//  * Example: Query redemption with all details
//  * 
//  * const redemptionWithDetails = await db.query.redemptions.findFirst({
//  *   where: eq(redemptions.id, redemptionId),
//  *   with: {
//  *     user: true,
//  *     channel: true,
//  *     status: true,
//  *     bankTransfer: true,
//  *     upi: true,
//  *     voucher: true,
//  *     apiLogs: {
//  *       orderBy: desc(thirdPartyApiLogs.createdAt),
//  *       limit: 10
//  *     }
//  *   }
//  * });
//  */
