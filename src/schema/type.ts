import { redemptionBankTransfers, redemptionUpi, redemptionVouchers, thirdPartyApiLogs } from ".";

export type RedemptionBankTransfer = typeof redemptionBankTransfers.$inferSelect;
export type NewRedemptionBankTransfer = typeof redemptionBankTransfers.$inferInsert;

export type RedemptionUpi = typeof redemptionUpi.$inferSelect;
export type NewRedemptionUpi = typeof redemptionUpi.$inferInsert;

export type RedemptionVoucher = typeof redemptionVouchers.$inferSelect;
export type NewRedemptionVoucher = typeof redemptionVouchers.$inferInsert;

export type ThirdPartyApiLog = typeof thirdPartyApiLogs.$inferSelect;
export type NewThirdPartyApiLog = typeof thirdPartyApiLogs.$inferInsert;