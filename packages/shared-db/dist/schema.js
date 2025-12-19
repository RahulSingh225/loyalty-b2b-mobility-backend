"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.participantSkuAccess = exports.userScopeMapping = exports.userTypeLevelMaster = exports.ticketStatuses = exports.tickets = exports.ticketTypes = exports.userTypeEntity = exports.locationEntity = exports.creativesTypes = exports.users = exports.notifications = exports.skuEntity = exports.schemeTypes = exports.systemLogs = exports.skuVariant = exports.skuPointConfig = exports.skuLevelMaster = exports.retailers = exports.schemes = exports.redemptions = exports.qrTypes = exports.retailerTransactions = exports.retailerTransactionLogs = exports.retailerLedger = exports.redemptionChannels = exports.referrals = exports.redemptionStatuses = exports.pincodeMaster = exports.onboardingTypes = exports.qrCodes = exports.eventMaster = exports.languages = exports.locationEntityPincode = exports.locationLevelMaster = exports.earningTypes = exports.eventLogs = exports.electricians = exports.electricianTransactions = exports.electricianTransactionLogs = exports.electricianLedger = exports.counterSalesTransactionLogs = exports.creatives = exports.counterSalesTransactions = exports.appConfigs = exports.client = exports.counterSalesLedger = exports.approvalStatuses = exports.counterSales = exports.campaigns = exports.auditLogs = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
exports.auditLogs = (0, pg_core_1.pgTable)("audit_logs", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    tableName: (0, pg_core_1.text)("table_name").notNull(),
    recordId: (0, pg_core_1.integer)("record_id").notNull(),
    operation: (0, pg_core_1.text)().notNull(),
    action: (0, pg_core_1.text)().notNull(),
    changedBy: (0, pg_core_1.integer)("changed_by"),
    changeSource: (0, pg_core_1.text)("change_source"),
    correlationId: (0, pg_core_1.text)("correlation_id"),
    oldState: (0, pg_core_1.jsonb)("old_state"),
    newState: (0, pg_core_1.jsonb)("new_state"),
    ipAddress: (0, pg_core_1.varchar)("ip_address", { length: 45 }),
    userAgent: (0, pg_core_1.text)("user_agent"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.changedBy],
        foreignColumns: [exports.users.id],
        name: "audit_logs_changed_by_fkey"
    }),
]);
exports.campaigns = (0, pg_core_1.pgTable)("campaigns", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    name: (0, pg_core_1.text)().notNull(),
    schemeType: (0, pg_core_1.integer)("scheme_type").notNull(),
    description: (0, pg_core_1.text)(),
    startDate: (0, pg_core_1.timestamp)("start_date", { mode: 'string' }).notNull(),
    endDate: (0, pg_core_1.timestamp)("end_date", { mode: 'string' }).notNull(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    budget: (0, pg_core_1.integer)().default(0),
    spentBudget: (0, pg_core_1.integer)("spent_budget").default(0),
    config: (0, pg_core_1.jsonb)().default({}).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { mode: 'string' }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.schemeType],
        foreignColumns: [exports.schemeTypes.id],
        name: "campaigns_scheme_type_fkey"
    }),
]);
exports.counterSales = (0, pg_core_1.pgTable)("counter_sales", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    userId: (0, pg_core_1.integer)("user_id").notNull(),
    uniqueId: (0, pg_core_1.text)("unique_id").notNull(),
    name: (0, pg_core_1.text)().notNull(),
    phone: (0, pg_core_1.text)().notNull(),
    email: (0, pg_core_1.text)(),
    aadhaar: (0, pg_core_1.text)().notNull(),
    pan: (0, pg_core_1.text)(),
    gst: (0, pg_core_1.text)(),
    address: (0, pg_core_1.text)(),
    city: (0, pg_core_1.text)(),
    district: (0, pg_core_1.text)(),
    state: (0, pg_core_1.text)(),
    dob: (0, pg_core_1.timestamp)({ mode: 'string' }),
    referralCode: (0, pg_core_1.text)("referral_code"),
    isKycVerified: (0, pg_core_1.boolean)("is_kyc_verified").default(false),
    onboardingTypeId: (0, pg_core_1.integer)("onboarding_type_id").notNull(),
    tdsConsent: (0, pg_core_1.boolean)("tds_consent").default(false).notNull(),
    bankAccountNo: (0, pg_core_1.text)("bank_account_no"),
    bankAccountIfsc: (0, pg_core_1.text)("bank_account_ifsc"),
    bankAccountName: (0, pg_core_1.text)("bank_account_name"),
    upiId: (0, pg_core_1.text)("upi_id"),
    isBankValidated: (0, pg_core_1.boolean)("is_bank_validated").default(false),
    pointsBalance: (0, pg_core_1.integer)("points_balance").default(0),
    sapCustomerCode: (0, pg_core_1.text)("sap_customer_code"),
    kycDocuments: (0, pg_core_1.jsonb)("kyc_documents"),
    attachedRetailerId: (0, pg_core_1.integer)("attached_retailer_id"),
    totalEarnings: (0, pg_core_1.numeric)("total_earnings").default('0'),
    totalBalance: (0, pg_core_1.numeric)("total_balance").default('0'),
    totalRedeemed: (0, pg_core_1.numeric)("total_redeemed").default('0'),
    tdsPercentage: (0, pg_core_1.integer)("tds_percentage").default(0),
    tdsKitty: (0, pg_core_1.numeric)("tds_kitty").default('0'),
    tdsDeducted: (0, pg_core_1.numeric)("tds_deducted").default('0'),
    lastSettlementDate: (0, pg_core_1.timestamp)("last_settlement_date", { mode: 'string' }),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.attachedRetailerId],
        foreignColumns: [exports.users.id],
        name: "counter_sales_attached_retailer_id_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.id],
        name: "counter_sales_user_id_fkey"
    }),
    (0, pg_core_1.unique)("counter_sales_unique_id_key").on(table.uniqueId),
    (0, pg_core_1.unique)("counter_sales_phone_key").on(table.phone),
    (0, pg_core_1.unique)("counter_sales_referral_code_key").on(table.referralCode),
]);
exports.approvalStatuses = (0, pg_core_1.pgTable)("approval_statuses", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    name: (0, pg_core_1.text)().notNull(),
    description: (0, pg_core_1.text)(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
}, (table) => [
    (0, pg_core_1.unique)("approval_statuses_name_key").on(table.name),
]);
exports.counterSalesLedger = (0, pg_core_1.pgTable)("counter_sales_ledger", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    userId: (0, pg_core_1.integer)("user_id").notNull(),
    earningType: (0, pg_core_1.integer)("earning_type").notNull(),
    redemptionType: (0, pg_core_1.integer)("redemption_type").notNull(),
    amount: (0, pg_core_1.numeric)().notNull(),
    type: (0, pg_core_1.text)().notNull(),
    remarks: (0, pg_core_1.text)(),
    openingBalance: (0, pg_core_1.numeric)("opening_balance").notNull(),
    closingBalance: (0, pg_core_1.numeric)("closing_balance").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.id],
        name: "counter_sales_ledger_user_id_fkey"
    }).onDelete("cascade"),
]);
exports.client = (0, pg_core_1.pgTable)("client", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    name: (0, pg_core_1.varchar)({ length: 150 }).notNull(),
    code: (0, pg_core_1.text)(),
}, (table) => [
    (0, pg_core_1.unique)("client_code_key").on(table.code),
]);
exports.appConfigs = (0, pg_core_1.pgTable)("app_configs", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    key: (0, pg_core_1.text)().notNull(),
    value: (0, pg_core_1.jsonb)().notNull(),
    description: (0, pg_core_1.text)(),
    updatedBy: (0, pg_core_1.integer)("updated_by"),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { mode: 'string' }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.updatedBy],
        foreignColumns: [exports.users.id],
        name: "app_configs_updated_by_fkey"
    }),
    (0, pg_core_1.unique)("app_configs_key_key").on(table.key),
]);
exports.counterSalesTransactions = (0, pg_core_1.pgTable)("counter_sales_transactions", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    userId: (0, pg_core_1.integer)("user_id").notNull(),
    earningType: (0, pg_core_1.integer)("earning_type").notNull(),
    points: (0, pg_core_1.numeric)().notNull(),
    category: (0, pg_core_1.text)().notNull(),
    subcategory: (0, pg_core_1.text)(),
    sku: (0, pg_core_1.text)(),
    batchNumber: (0, pg_core_1.text)("batch_number"),
    serialNumber: (0, pg_core_1.text)("serial_number"),
    qrCode: (0, pg_core_1.text)("qr_code"),
    remarks: (0, pg_core_1.text)(),
    latitude: (0, pg_core_1.numeric)({ precision: 10, scale: 7 }),
    longitude: (0, pg_core_1.numeric)({ precision: 10, scale: 7 }),
    metadata: (0, pg_core_1.jsonb)().notNull(),
    schemeId: (0, pg_core_1.integer)("scheme_id"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.id],
        name: "counter_sales_transactions_user_id_fkey"
    }).onDelete("cascade"),
    (0, pg_core_1.foreignKey)({
        columns: [table.earningType],
        foreignColumns: [exports.earningTypes.id],
        name: "counter_sales_transactions_earning_type_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.schemeId],
        foreignColumns: [exports.schemes.id],
        name: "counter_sales_transactions_scheme_id_fkey"
    }),
]);
exports.creatives = (0, pg_core_1.pgTable)("creatives", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    typeId: (0, pg_core_1.integer)("type_id").notNull(),
    url: (0, pg_core_1.varchar)({ length: 500 }).notNull(),
    title: (0, pg_core_1.text)().notNull(),
    description: (0, pg_core_1.text)(),
    carouselName: (0, pg_core_1.text)("carousel_name").notNull(),
    displayOrder: (0, pg_core_1.integer)("display_order").default(0),
    targetAudience: (0, pg_core_1.jsonb)("target_audience").default({}),
    metadata: (0, pg_core_1.jsonb)().default({}),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    startDate: (0, pg_core_1.timestamp)("start_date", { mode: 'string' }),
    endDate: (0, pg_core_1.timestamp)("end_date", { mode: 'string' }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.typeId],
        foreignColumns: [exports.creativesTypes.id],
        name: "creatives_type_id_fkey"
    }).onDelete("restrict"),
]);
exports.counterSalesTransactionLogs = (0, pg_core_1.pgTable)("counter_sales_transaction_logs", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    userId: (0, pg_core_1.integer)("user_id").notNull(),
    earningType: (0, pg_core_1.integer)("earning_type").notNull(),
    points: (0, pg_core_1.numeric)().notNull(),
    category: (0, pg_core_1.text)().notNull(),
    subcategory: (0, pg_core_1.text)(),
    sku: (0, pg_core_1.text)(),
    status: (0, pg_core_1.text)().notNull(),
    batchNumber: (0, pg_core_1.text)("batch_number"),
    serialNumber: (0, pg_core_1.text)("serial_number"),
    qrCode: (0, pg_core_1.text)("qr_code"),
    remarks: (0, pg_core_1.text)(),
    latitude: (0, pg_core_1.numeric)({ precision: 10, scale: 7 }),
    longitude: (0, pg_core_1.numeric)({ precision: 10, scale: 7 }),
    metadata: (0, pg_core_1.jsonb)().notNull(),
    schemeId: (0, pg_core_1.integer)("scheme_id"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.id],
        name: "counter_sales_transaction_logs_user_id_fkey"
    }).onDelete("cascade"),
    (0, pg_core_1.foreignKey)({
        columns: [table.earningType],
        foreignColumns: [exports.earningTypes.id],
        name: "counter_sales_transaction_logs_earning_type_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.schemeId],
        foreignColumns: [exports.schemes.id],
        name: "counter_sales_transaction_logs_scheme_id_fkey"
    }),
]);
exports.electricianLedger = (0, pg_core_1.pgTable)("electrician_ledger", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    userId: (0, pg_core_1.integer)("user_id").notNull(),
    earningType: (0, pg_core_1.integer)("earning_type").notNull(),
    redemptionType: (0, pg_core_1.integer)("redemption_type").notNull(),
    amount: (0, pg_core_1.numeric)().notNull(),
    type: (0, pg_core_1.text)().notNull(),
    remarks: (0, pg_core_1.text)(),
    openingBalance: (0, pg_core_1.numeric)("opening_balance").notNull(),
    closingBalance: (0, pg_core_1.numeric)("closing_balance").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.id],
        name: "electrician_ledger_user_id_fkey"
    }).onDelete("cascade"),
]);
exports.electricianTransactionLogs = (0, pg_core_1.pgTable)("electrician_transaction_logs", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    userId: (0, pg_core_1.integer)("user_id").notNull(),
    earningType: (0, pg_core_1.integer)("earning_type").notNull(),
    points: (0, pg_core_1.numeric)().notNull(),
    category: (0, pg_core_1.text)().notNull(),
    subcategory: (0, pg_core_1.text)(),
    sku: (0, pg_core_1.text)(),
    status: (0, pg_core_1.text)().notNull(),
    batchNumber: (0, pg_core_1.text)("batch_number"),
    serialNumber: (0, pg_core_1.text)("serial_number"),
    qrCode: (0, pg_core_1.text)("qr_code"),
    remarks: (0, pg_core_1.text)(),
    latitude: (0, pg_core_1.numeric)({ precision: 10, scale: 7 }),
    longitude: (0, pg_core_1.numeric)({ precision: 10, scale: 7 }),
    metadata: (0, pg_core_1.jsonb)().notNull(),
    schemeId: (0, pg_core_1.integer)("scheme_id"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.id],
        name: "electrician_transaction_logs_user_id_fkey"
    }).onDelete("cascade"),
    (0, pg_core_1.foreignKey)({
        columns: [table.earningType],
        foreignColumns: [exports.earningTypes.id],
        name: "electrician_transaction_logs_earning_type_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.schemeId],
        foreignColumns: [exports.schemes.id],
        name: "electrician_transaction_logs_scheme_id_fkey"
    }),
]);
exports.electricianTransactions = (0, pg_core_1.pgTable)("electrician_transactions", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    userId: (0, pg_core_1.integer)("user_id").notNull(),
    earningType: (0, pg_core_1.integer)("earning_type").notNull(),
    points: (0, pg_core_1.numeric)().notNull(),
    category: (0, pg_core_1.text)().notNull(),
    subcategory: (0, pg_core_1.text)(),
    sku: (0, pg_core_1.text)(),
    batchNumber: (0, pg_core_1.text)("batch_number"),
    serialNumber: (0, pg_core_1.text)("serial_number"),
    qrCode: (0, pg_core_1.text)("qr_code"),
    remarks: (0, pg_core_1.text)(),
    latitude: (0, pg_core_1.numeric)({ precision: 10, scale: 7 }),
    longitude: (0, pg_core_1.numeric)({ precision: 10, scale: 7 }),
    metadata: (0, pg_core_1.jsonb)().notNull(),
    schemeId: (0, pg_core_1.integer)("scheme_id"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.id],
        name: "electrician_transactions_user_id_fkey"
    }).onDelete("cascade"),
    (0, pg_core_1.foreignKey)({
        columns: [table.earningType],
        foreignColumns: [exports.earningTypes.id],
        name: "electrician_transactions_earning_type_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.schemeId],
        foreignColumns: [exports.schemes.id],
        name: "electrician_transactions_scheme_id_fkey"
    }),
]);
exports.electricians = (0, pg_core_1.pgTable)("electricians", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    userId: (0, pg_core_1.integer)("user_id").notNull(),
    uniqueId: (0, pg_core_1.text)("unique_id").notNull(),
    name: (0, pg_core_1.text)().notNull(),
    phone: (0, pg_core_1.text)().notNull(),
    email: (0, pg_core_1.text)(),
    aadhaar: (0, pg_core_1.text)().notNull(),
    pan: (0, pg_core_1.text)(),
    gst: (0, pg_core_1.text)(),
    address: (0, pg_core_1.text)(),
    city: (0, pg_core_1.text)(),
    district: (0, pg_core_1.text)(),
    state: (0, pg_core_1.text)(),
    dob: (0, pg_core_1.timestamp)({ mode: 'string' }),
    referralCode: (0, pg_core_1.text)("referral_code"),
    isKycVerified: (0, pg_core_1.boolean)("is_kyc_verified").default(false),
    onboardingTypeId: (0, pg_core_1.integer)("onboarding_type_id").notNull(),
    tdsConsent: (0, pg_core_1.boolean)("tds_consent").default(false).notNull(),
    bankAccountNo: (0, pg_core_1.text)("bank_account_no"),
    bankAccountIfsc: (0, pg_core_1.text)("bank_account_ifsc"),
    bankAccountName: (0, pg_core_1.text)("bank_account_name"),
    upiId: (0, pg_core_1.text)("upi_id"),
    isBankValidated: (0, pg_core_1.boolean)("is_bank_validated").default(false),
    pointsBalance: (0, pg_core_1.integer)("points_balance").default(0),
    sapCustomerCode: (0, pg_core_1.text)("sap_customer_code"),
    kycDocuments: (0, pg_core_1.jsonb)("kyc_documents"),
    electricianCertificate: (0, pg_core_1.text)("electrician_certificate"),
    totalEarnings: (0, pg_core_1.numeric)("total_earnings").default('0'),
    totalBalance: (0, pg_core_1.numeric)("total_balance").default('0'),
    totalRedeemed: (0, pg_core_1.numeric)("total_redeemed").default('0'),
    tdsPercentage: (0, pg_core_1.integer)("tds_percentage").default(0),
    tdsKitty: (0, pg_core_1.numeric)("tds_kitty").default('0'),
    tdsDeducted: (0, pg_core_1.numeric)("tds_deducted").default('0'),
    lastSettlementDate: (0, pg_core_1.timestamp)("last_settlement_date", { mode: 'string' }),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.id],
        name: "electricians_user_id_fkey"
    }),
    (0, pg_core_1.unique)("electricians_unique_id_key").on(table.uniqueId),
    (0, pg_core_1.unique)("electricians_phone_key").on(table.phone),
    (0, pg_core_1.unique)("electricians_referral_code_key").on(table.referralCode),
]);
exports.eventLogs = (0, pg_core_1.pgTable)("event_logs", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    userId: (0, pg_core_1.integer)("user_id"),
    eventId: (0, pg_core_1.integer)("event_id").notNull(),
    action: (0, pg_core_1.text)().notNull(),
    eventType: (0, pg_core_1.text)("event_type").notNull(),
    entityId: (0, pg_core_1.text)("entity_id"),
    correlationId: (0, pg_core_1.text)("correlation_id"),
    metadata: (0, pg_core_1.jsonb)(),
    ipAddress: (0, pg_core_1.varchar)("ip_address", { length: 45 }),
    userAgent: (0, pg_core_1.text)("user_agent"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.id],
        name: "event_logs_user_id_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.eventId],
        foreignColumns: [exports.eventMaster.id],
        name: "event_logs_event_id_fkey"
    }).onDelete("restrict"),
]);
exports.earningTypes = (0, pg_core_1.pgTable)("earning_types", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    name: (0, pg_core_1.text)().notNull(),
    description: (0, pg_core_1.text)(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
}, (table) => [
    (0, pg_core_1.unique)("earning_types_name_key").on(table.name),
]);
exports.locationLevelMaster = (0, pg_core_1.pgTable)("location_level_master", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    clientId: (0, pg_core_1.integer)("client_id").notNull(),
    levelNo: (0, pg_core_1.integer)("level_no").notNull(),
    levelName: (0, pg_core_1.text)("level_name").notNull(),
    parentLevelId: (0, pg_core_1.integer)("parent_level_id"),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.clientId],
        foreignColumns: [exports.client.id],
        name: "fk_level_client"
    }),
]);
exports.locationEntityPincode = (0, pg_core_1.pgTable)("location_entity_pincode", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    entityId: (0, pg_core_1.integer)("entity_id").notNull(),
    pincodeId: (0, pg_core_1.integer)("pincode_id").notNull(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.entityId],
        foreignColumns: [exports.locationEntity.id],
        name: "location_entity_pincode_entity_id_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.pincodeId],
        foreignColumns: [exports.pincodeMaster.id],
        name: "location_entity_pincode_pincode_id_fkey"
    }),
]);
exports.languages = (0, pg_core_1.pgTable)("languages", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    name: (0, pg_core_1.text)().notNull(),
    code: (0, pg_core_1.text)(),
    description: (0, pg_core_1.text)(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
}, (table) => [
    (0, pg_core_1.unique)("languages_name_key").on(table.name),
]);
exports.eventMaster = (0, pg_core_1.pgTable)("event_master", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    eventKey: (0, pg_core_1.text)("event_key").notNull(),
    name: (0, pg_core_1.text)().notNull(),
    description: (0, pg_core_1.text)(),
    category: (0, pg_core_1.text)(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.unique)("event_master_event_key_key").on(table.eventKey),
    (0, pg_core_1.unique)("event_master_name_key").on(table.name),
]);
exports.qrCodes = (0, pg_core_1.pgTable)("qr_codes", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    sku: (0, pg_core_1.text)().notNull(),
    batchNumber: (0, pg_core_1.text)("batch_number").notNull(),
    typeId: (0, pg_core_1.integer)("type_id").notNull(),
    code: (0, pg_core_1.text)().notNull(),
    securityCode: (0, pg_core_1.text)("security_code").notNull(),
    manufacturingDate: (0, pg_core_1.timestamp)("manufacturing_date", { mode: 'string' }).notNull(),
    monoSubMonoId: (0, pg_core_1.text)("mono_sub_mono_id"),
    parentQrId: (0, pg_core_1.integer)("parent_qr_id"),
    isScanned: (0, pg_core_1.boolean)("is_scanned").default(false),
    scannedBy: (0, pg_core_1.integer)("scanned_by"),
    monthlyVolume: (0, pg_core_1.integer)("monthly_volume"),
    locationAccess: (0, pg_core_1.jsonb)("location_access"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.typeId],
        foreignColumns: [exports.qrTypes.id],
        name: "qr_codes_type_id_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.parentQrId],
        foreignColumns: [table.id],
        name: "qr_codes_parent_qr_id_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.scannedBy],
        foreignColumns: [exports.users.id],
        name: "qr_codes_scanned_by_fkey"
    }),
    (0, pg_core_1.unique)("qr_codes_code_key").on(table.code),
]);
exports.onboardingTypes = (0, pg_core_1.pgTable)("onboarding_types", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    name: (0, pg_core_1.text)().notNull(),
    description: (0, pg_core_1.text)(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
}, (table) => [
    (0, pg_core_1.unique)("onboarding_types_name_key").on(table.name),
]);
exports.pincodeMaster = (0, pg_core_1.pgTable)("pincode_master", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    pincode: (0, pg_core_1.text)().notNull(),
    city: (0, pg_core_1.text)(),
    district: (0, pg_core_1.text)(),
    state: (0, pg_core_1.text)(),
});
exports.redemptionStatuses = (0, pg_core_1.pgTable)("redemption_statuses", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    name: (0, pg_core_1.text)().notNull(),
    description: (0, pg_core_1.text)(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
}, (table) => [
    (0, pg_core_1.unique)("redemption_statuses_name_key").on(table.name),
]);
exports.referrals = (0, pg_core_1.pgTable)("referrals", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    referrerId: (0, pg_core_1.integer)("referrer_id").notNull(),
    referredId: (0, pg_core_1.integer)("referred_id").notNull(),
    status: (0, pg_core_1.text)().default('pending').notNull(),
    bonusAwarded: (0, pg_core_1.integer)("bonus_awarded").default(0),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.referrerId],
        foreignColumns: [exports.users.id],
        name: "referrals_referrer_id_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.referredId],
        foreignColumns: [exports.users.id],
        name: "referrals_referred_id_fkey"
    }),
]);
exports.redemptionChannels = (0, pg_core_1.pgTable)("redemption_channels", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    name: (0, pg_core_1.text)().notNull(),
    description: (0, pg_core_1.text)(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
}, (table) => [
    (0, pg_core_1.unique)("redemption_channels_name_key").on(table.name),
]);
exports.retailerLedger = (0, pg_core_1.pgTable)("retailer_ledger", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    userId: (0, pg_core_1.integer)("user_id").notNull(),
    earningType: (0, pg_core_1.integer)("earning_type").notNull(),
    redemptionType: (0, pg_core_1.integer)("redemption_type").notNull(),
    amount: (0, pg_core_1.numeric)().notNull(),
    type: (0, pg_core_1.text)().notNull(),
    remarks: (0, pg_core_1.text)(),
    openingBalance: (0, pg_core_1.numeric)("opening_balance").notNull(),
    closingBalance: (0, pg_core_1.numeric)("closing_balance").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.id],
        name: "retailer_ledger_user_id_fkey"
    }).onDelete("cascade"),
]);
exports.retailerTransactionLogs = (0, pg_core_1.pgTable)("retailer_transaction_logs", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    userId: (0, pg_core_1.integer)("user_id").notNull(),
    earningType: (0, pg_core_1.integer)("earning_type").notNull(),
    points: (0, pg_core_1.numeric)().notNull(),
    category: (0, pg_core_1.text)().notNull(),
    subcategory: (0, pg_core_1.text)(),
    sku: (0, pg_core_1.text)(),
    status: (0, pg_core_1.text)().notNull(),
    batchNumber: (0, pg_core_1.text)("batch_number"),
    serialNumber: (0, pg_core_1.text)("serial_number"),
    qrCode: (0, pg_core_1.text)("qr_code"),
    remarks: (0, pg_core_1.text)(),
    latitude: (0, pg_core_1.numeric)({ precision: 10, scale: 7 }),
    longitude: (0, pg_core_1.numeric)({ precision: 10, scale: 7 }),
    metadata: (0, pg_core_1.jsonb)().notNull(),
    schemeId: (0, pg_core_1.integer)("scheme_id"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.id],
        name: "retailer_transaction_logs_user_id_fkey"
    }).onDelete("cascade"),
    (0, pg_core_1.foreignKey)({
        columns: [table.earningType],
        foreignColumns: [exports.earningTypes.id],
        name: "retailer_transaction_logs_earning_type_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.schemeId],
        foreignColumns: [exports.schemes.id],
        name: "retailer_transaction_logs_scheme_id_fkey"
    }),
]);
exports.retailerTransactions = (0, pg_core_1.pgTable)("retailer_transactions", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    userId: (0, pg_core_1.integer)("user_id").notNull(),
    earningType: (0, pg_core_1.integer)("earning_type").notNull(),
    points: (0, pg_core_1.numeric)().notNull(),
    category: (0, pg_core_1.text)().notNull(),
    subcategory: (0, pg_core_1.text)(),
    sku: (0, pg_core_1.text)(),
    batchNumber: (0, pg_core_1.text)("batch_number"),
    serialNumber: (0, pg_core_1.text)("serial_number"),
    qrCode: (0, pg_core_1.text)("qr_code"),
    remarks: (0, pg_core_1.text)(),
    latitude: (0, pg_core_1.numeric)({ precision: 10, scale: 7 }),
    longitude: (0, pg_core_1.numeric)({ precision: 10, scale: 7 }),
    metadata: (0, pg_core_1.jsonb)().notNull(),
    schemeId: (0, pg_core_1.integer)("scheme_id"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.id],
        name: "retailer_transactions_user_id_fkey"
    }).onDelete("cascade"),
    (0, pg_core_1.foreignKey)({
        columns: [table.earningType],
        foreignColumns: [exports.earningTypes.id],
        name: "retailer_transactions_earning_type_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.schemeId],
        foreignColumns: [exports.schemes.id],
        name: "retailer_transactions_scheme_id_fkey"
    }),
]);
exports.qrTypes = (0, pg_core_1.pgTable)("qr_types", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    name: (0, pg_core_1.text)().notNull(),
    description: (0, pg_core_1.text)(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
}, (table) => [
    (0, pg_core_1.unique)("qr_types_name_key").on(table.name),
]);
exports.redemptions = (0, pg_core_1.pgTable)("redemptions", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    userId: (0, pg_core_1.integer)("user_id").notNull(),
    redemptionId: (0, pg_core_1.text)("redemption_id").notNull(),
    channelId: (0, pg_core_1.integer)("channel_id").notNull(),
    pointsRedeemed: (0, pg_core_1.integer)("points_redeemed").notNull(),
    amount: (0, pg_core_1.integer)(),
    status: (0, pg_core_1.integer)().notNull(),
    schemeId: (0, pg_core_1.integer)("scheme_id"),
    metadata: (0, pg_core_1.jsonb)().notNull(),
    approvedBy: (0, pg_core_1.integer)("approved_by"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.id],
        name: "redemptions_user_id_fkey"
    }).onDelete("cascade"),
    (0, pg_core_1.foreignKey)({
        columns: [table.channelId],
        foreignColumns: [exports.redemptionChannels.id],
        name: "redemptions_channel_id_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.status],
        foreignColumns: [exports.redemptionStatuses.id],
        name: "redemptions_status_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.schemeId],
        foreignColumns: [exports.schemes.id],
        name: "redemptions_scheme_id_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.approvedBy],
        foreignColumns: [exports.users.id],
        name: "redemptions_approved_by_fkey"
    }),
    (0, pg_core_1.unique)("redemptions_redemption_id_key").on(table.redemptionId),
]);
exports.schemes = (0, pg_core_1.pgTable)("schemes", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    name: (0, pg_core_1.text)().notNull(),
    schemeType: (0, pg_core_1.integer)("scheme_type").notNull(),
    description: (0, pg_core_1.text)(),
    startDate: (0, pg_core_1.timestamp)("start_date", { mode: 'string' }).notNull(),
    endDate: (0, pg_core_1.timestamp)("end_date", { mode: 'string' }).notNull(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    budget: (0, pg_core_1.integer)().default(0),
    spentBudget: (0, pg_core_1.integer)("spent_budget").default(0),
    config: (0, pg_core_1.jsonb)().default({}).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { mode: 'string' }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.schemeType],
        foreignColumns: [exports.schemeTypes.id],
        name: "schemes_scheme_type_fkey"
    }),
]);
exports.retailers = (0, pg_core_1.pgTable)("retailers", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    userId: (0, pg_core_1.integer)("user_id").notNull(),
    uniqueId: (0, pg_core_1.text)("unique_id").notNull(),
    name: (0, pg_core_1.text)().notNull(),
    phone: (0, pg_core_1.text)().notNull(),
    email: (0, pg_core_1.text)(),
    aadhaar: (0, pg_core_1.text)().notNull(),
    pan: (0, pg_core_1.text)(),
    gst: (0, pg_core_1.text)(),
    address: (0, pg_core_1.text)(),
    city: (0, pg_core_1.text)(),
    district: (0, pg_core_1.text)(),
    state: (0, pg_core_1.text)(),
    dob: (0, pg_core_1.timestamp)({ mode: 'string' }),
    referralCode: (0, pg_core_1.text)("referral_code"),
    isKycVerified: (0, pg_core_1.boolean)("is_kyc_verified").default(false),
    onboardingTypeId: (0, pg_core_1.integer)("onboarding_type_id").notNull(),
    tdsConsent: (0, pg_core_1.boolean)("tds_consent").default(false).notNull(),
    bankAccountNo: (0, pg_core_1.text)("bank_account_no"),
    bankAccountIfsc: (0, pg_core_1.text)("bank_account_ifsc"),
    bankAccountName: (0, pg_core_1.text)("bank_account_name"),
    upiId: (0, pg_core_1.text)("upi_id"),
    isBankValidated: (0, pg_core_1.boolean)("is_bank_validated").default(false),
    pointsBalance: (0, pg_core_1.integer)("points_balance").default(0),
    sapCustomerCode: (0, pg_core_1.text)("sap_customer_code"),
    kycDocuments: (0, pg_core_1.jsonb)("kyc_documents"),
    totalEarnings: (0, pg_core_1.numeric)("total_earnings").default('0'),
    totalBalance: (0, pg_core_1.numeric)("total_balance").default('0'),
    totalRedeemed: (0, pg_core_1.numeric)("total_redeemed").default('0'),
    tdsPercentage: (0, pg_core_1.integer)("tds_percentage").default(0),
    tdsKitty: (0, pg_core_1.numeric)("tds_kitty").default('0'),
    tdsDeducted: (0, pg_core_1.numeric)("tds_deducted").default('0'),
    lastSettlementDate: (0, pg_core_1.timestamp)("last_settlement_date", { mode: 'string' }),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.id],
        name: "retailers_user_id_fkey"
    }),
    (0, pg_core_1.unique)("retailers_unique_id_key").on(table.uniqueId),
    (0, pg_core_1.unique)("retailers_phone_key").on(table.phone),
    (0, pg_core_1.unique)("retailers_referral_code_key").on(table.referralCode),
]);
exports.skuLevelMaster = (0, pg_core_1.pgTable)("sku_level_master", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    clientId: (0, pg_core_1.integer)("client_id").notNull(),
    levelNo: (0, pg_core_1.integer)("level_no").notNull(),
    levelName: (0, pg_core_1.text)("level_name").notNull(),
    parentLevelId: (0, pg_core_1.integer)("parent_level_id"),
}, (table) => [
    (0, pg_core_1.uniqueIndex)("uq_client_level").using("btree", table.clientId.asc().nullsLast().op("int4_ops"), table.levelNo.asc().nullsLast().op("int4_ops")),
    (0, pg_core_1.foreignKey)({
        columns: [table.clientId],
        foreignColumns: [exports.client.id],
        name: "sku_level_master_client_id_fkey"
    }),
]);
exports.skuPointConfig = (0, pg_core_1.pgTable)("sku_point_config", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    clientId: (0, pg_core_1.integer)("client_id").notNull(),
    skuVariantId: (0, pg_core_1.integer)("sku_variant_id").notNull(),
    userTypeId: (0, pg_core_1.integer)("user_type_id").notNull(),
    pointsPerUnit: (0, pg_core_1.numeric)("points_per_unit", { precision: 10, scale: 2 }).notNull(),
    validFrom: (0, pg_core_1.timestamp)("valid_from", { mode: 'string' }),
    validTo: (0, pg_core_1.timestamp)("valid_to", { mode: 'string' }),
    remarks: (0, pg_core_1.text)(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)("uq_sku_user_type").using("btree", table.clientId.asc().nullsLast().op("int4_ops"), table.skuVariantId.asc().nullsLast().op("int4_ops"), table.userTypeId.asc().nullsLast().op("int4_ops")),
    (0, pg_core_1.foreignKey)({
        columns: [table.clientId],
        foreignColumns: [exports.client.id],
        name: "sku_point_config_client_id_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.skuVariantId],
        foreignColumns: [exports.skuVariant.id],
        name: "sku_point_config_sku_variant_id_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.userTypeId],
        foreignColumns: [exports.userTypeEntity.id],
        name: "sku_point_config_user_type_id_fkey"
    }),
]);
exports.skuVariant = (0, pg_core_1.pgTable)("sku_variant", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    skuEntityId: (0, pg_core_1.integer)("sku_entity_id").notNull(),
    variantName: (0, pg_core_1.varchar)("variant_name", { length: 150 }).notNull(),
    packSize: (0, pg_core_1.text)("pack_size"),
    mrp: (0, pg_core_1.numeric)({ precision: 10, scale: 2 }),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.skuEntityId],
        foreignColumns: [exports.skuEntity.id],
        name: "sku_variant_sku_entity_id_fkey"
    }),
]);
exports.systemLogs = (0, pg_core_1.pgTable)("system_logs", {
    logId: (0, pg_core_1.serial)("log_id").primaryKey().notNull(),
    logLevel: (0, pg_core_1.text)("log_level").notNull(),
    componentName: (0, pg_core_1.text)("component_name").notNull(),
    message: (0, pg_core_1.text)().notNull(),
    exceptionTrace: (0, pg_core_1.text)("exception_trace"),
    action: (0, pg_core_1.text)().notNull(),
    correlationId: (0, pg_core_1.text)("correlation_id"),
    apiEndpoint: (0, pg_core_1.text)("api_endpoint"),
    userId: (0, pg_core_1.integer)("user_id"),
    ipAddress: (0, pg_core_1.varchar)("ip_address", { length: 45 }),
    userAgent: (0, pg_core_1.text)("user_agent"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.id],
        name: "system_logs_user_id_fkey"
    }),
]);
exports.schemeTypes = (0, pg_core_1.pgTable)("scheme_types", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    name: (0, pg_core_1.text)().notNull(),
    description: (0, pg_core_1.text)(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
}, (table) => [
    (0, pg_core_1.unique)("scheme_types_name_key").on(table.name),
]);
exports.skuEntity = (0, pg_core_1.pgTable)("sku_entity", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    clientId: (0, pg_core_1.integer)("client_id").notNull(),
    levelId: (0, pg_core_1.integer)("level_id").notNull(),
    name: (0, pg_core_1.varchar)({ length: 200 }).notNull(),
    code: (0, pg_core_1.text)(),
    parentEntityId: (0, pg_core_1.integer)("parent_entity_id"),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.clientId],
        foreignColumns: [exports.client.id],
        name: "sku_entity_client_id_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.levelId],
        foreignColumns: [exports.skuLevelMaster.id],
        name: "sku_entity_level_id_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.parentEntityId],
        foreignColumns: [table.id],
        name: "sku_entity_parent_entity_id_fkey"
    }),
]);
exports.notifications = (0, pg_core_1.pgTable)("notifications", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    userId: (0, pg_core_1.integer)("user_id"),
    type: (0, pg_core_1.text)().notNull(),
    channel: (0, pg_core_1.text)().notNull(),
    templateKey: (0, pg_core_1.text)("template_key"),
    trigger: (0, pg_core_1.text)().notNull(),
    isSent: (0, pg_core_1.boolean)("is_sent").default(false),
    sentAt: (0, pg_core_1.timestamp)("sent_at", { mode: 'string' }),
    metadata: (0, pg_core_1.jsonb)(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.id],
        name: "notifications_user_id_fkey"
    }),
]);
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    roleId: (0, pg_core_1.integer)("role_id").notNull(),
    name: (0, pg_core_1.text)().notNull(),
    phone: (0, pg_core_1.text)().notNull(),
    email: (0, pg_core_1.text)(),
    address: (0, pg_core_1.text)(),
    city: (0, pg_core_1.text)(),
    district: (0, pg_core_1.text)(),
    state: (0, pg_core_1.text)(),
    password: (0, pg_core_1.text)(),
    branch: (0, pg_core_1.integer)(),
    zone: (0, pg_core_1.integer)(),
    location: (0, pg_core_1.jsonb)(),
    referralCode: (0, pg_core_1.text)("referral_code"),
    referrerId: (0, pg_core_1.integer)("referrer_id"),
    onboardingTypeId: (0, pg_core_1.integer)("onboarding_type_id").notNull(),
    approvalStatusId: (0, pg_core_1.integer)("approval_status_id").notNull(),
    languageId: (0, pg_core_1.integer)("language_id").default(1).notNull(),
    isSuspended: (0, pg_core_1.boolean)("is_suspended").default(false),
    suspendedAt: (0, pg_core_1.timestamp)("suspended_at", { mode: 'string' }),
    fcmToken: (0, pg_core_1.text)("fcm_token"),
    lastLoginAt: (0, pg_core_1.timestamp)("last_login_at", { mode: 'string' }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { mode: 'string' }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.roleId],
        foreignColumns: [exports.userTypeEntity.id],
        name: "users_role_id_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.referrerId],
        foreignColumns: [table.id],
        name: "users_referrer_id_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.onboardingTypeId],
        foreignColumns: [exports.onboardingTypes.id],
        name: "users_onboarding_type_id_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.approvalStatusId],
        foreignColumns: [exports.approvalStatuses.id],
        name: "users_approval_status_id_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.languageId],
        foreignColumns: [exports.languages.id],
        name: "users_language_id_fkey"
    }),
    (0, pg_core_1.unique)("users_phone_key").on(table.phone),
    (0, pg_core_1.unique)("users_referral_code_key").on(table.referralCode),
]);
exports.creativesTypes = (0, pg_core_1.pgTable)("creatives_types", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    name: (0, pg_core_1.text)().notNull(),
    description: (0, pg_core_1.text)(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.unique)("creatives_types_name_key").on(table.name),
]);
exports.locationEntity = (0, pg_core_1.pgTable)("location_entity", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    clientId: (0, pg_core_1.integer)("client_id").notNull(),
    levelId: (0, pg_core_1.integer)("level_id").notNull(),
    name: (0, pg_core_1.varchar)({ length: 150 }).notNull(),
    code: (0, pg_core_1.text)(),
    parentEntityId: (0, pg_core_1.integer)("parent_entity_id"),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.levelId],
        foreignColumns: [exports.locationLevelMaster.id],
        name: "location_entity_level_id_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.parentEntityId],
        foreignColumns: [table.id],
        name: "location_entity_parent_entity_id_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.clientId],
        foreignColumns: [exports.client.id],
        name: "fk_entity_client"
    }),
]);
exports.userTypeEntity = (0, pg_core_1.pgTable)("user_type_entity", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    levelId: (0, pg_core_1.integer)("level_id").notNull(),
    accessType: (0, pg_core_1.text)('access_type')
        .notNull()
        .$type(),
    typeName: (0, pg_core_1.text)("type_name").notNull(),
    parentTypeId: (0, pg_core_1.integer)("parent_type_id"),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.levelId],
        foreignColumns: [exports.userTypeLevelMaster.id],
        name: "user_type_entity_level_id_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.parentTypeId],
        foreignColumns: [table.id],
        name: "user_type_entity_parent_type_id_fkey"
    }),
]);
exports.ticketTypes = (0, pg_core_1.pgTable)("ticket_types", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    name: (0, pg_core_1.text)().notNull(),
    description: (0, pg_core_1.text)(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.unique)("ticket_types_name_key").on(table.name),
]);
exports.tickets = (0, pg_core_1.pgTable)("tickets", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    typeId: (0, pg_core_1.integer)("type_id").notNull(),
    statusId: (0, pg_core_1.integer)("status_id").notNull(),
    subject: (0, pg_core_1.text)().notNull(),
    description: (0, pg_core_1.text)().notNull(),
    imageUrl: (0, pg_core_1.varchar)("image_url", { length: 500 }),
    videoUrl: (0, pg_core_1.varchar)("video_url", { length: 500 }),
    priority: (0, pg_core_1.text)().default('Medium'),
    assigneeId: (0, pg_core_1.integer)("assignee_id"),
    createdBy: (0, pg_core_1.integer)("created_by").notNull(),
    resolutionNotes: (0, pg_core_1.text)("resolution_notes"),
    resolvedAt: (0, pg_core_1.timestamp)("resolved_at", { mode: 'string' }),
    attachments: (0, pg_core_1.jsonb)().default([]),
    metadata: (0, pg_core_1.jsonb)().default({}),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.typeId],
        foreignColumns: [exports.ticketTypes.id],
        name: "tickets_type_id_fkey"
    }).onDelete("restrict"),
    (0, pg_core_1.foreignKey)({
        columns: [table.statusId],
        foreignColumns: [exports.ticketStatuses.id],
        name: "tickets_status_id_fkey"
    }).onDelete("restrict"),
]);
exports.ticketStatuses = (0, pg_core_1.pgTable)("ticket_statuses", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    name: (0, pg_core_1.text)().notNull(),
    description: (0, pg_core_1.text)(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.unique)("ticket_statuses_name_key").on(table.name),
]);
exports.userTypeLevelMaster = (0, pg_core_1.pgTable)("user_type_level_master", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    levelNo: (0, pg_core_1.integer)("level_no").notNull(),
    levelName: (0, pg_core_1.text)("level_name").notNull(),
    parentLevelId: (0, pg_core_1.integer)("parent_level_id"),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.parentLevelId],
        foreignColumns: [table.id],
        name: "user_type_level_master_parent_level_id_fkey"
    }),
]);
exports.userScopeMapping = (0, pg_core_1.pgTable)("user_scope_mapping", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    userTypeId: (0, pg_core_1.integer)("user_type_id"),
    userId: (0, pg_core_1.integer)("user_id"),
    scopeType: (0, pg_core_1.varchar)("scope_type", { length: 20 }).notNull(),
    scopeLevelId: (0, pg_core_1.integer)("scope_level_id").notNull(),
    scopeEntityId: (0, pg_core_1.integer)("scope_entity_id"),
    accessType: (0, pg_core_1.varchar)("access_type", { length: 20 }).default('specific').notNull(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)("user_scope_mapping_unique").using("btree", table.userTypeId.asc().nullsLast().op("int4_ops"), table.userId.asc().nullsLast().op("int4_ops"), table.scopeType.asc().nullsLast().op("int4_ops"), table.scopeLevelId.asc().nullsLast().op("int4_ops"), table.scopeEntityId.asc().nullsLast().op("text_ops")).where((0, drizzle_orm_1.sql) `(is_active = true)`),
    (0, pg_core_1.foreignKey)({
        columns: [table.userTypeId],
        foreignColumns: [exports.userTypeEntity.id],
        name: "user_scope_mapping_user_type_id_fkey"
    }).onDelete("cascade"),
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.id],
        name: "user_scope_mapping_user_id_fkey"
    }).onDelete("cascade"),
]);
exports.participantSkuAccess = (0, pg_core_1.pgTable)("participant_sku_access", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    userId: (0, pg_core_1.integer)("user_id").notNull(),
    skuLevelId: (0, pg_core_1.integer)("sku_level_id").notNull(),
    skuEntityId: (0, pg_core_1.integer)("sku_entity_id"),
    accessType: (0, pg_core_1.varchar)("access_type", { length: 20 }).default('specific'),
    validFrom: (0, pg_core_1.timestamp)("valid_from", { mode: 'string' }).default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    validTo: (0, pg_core_1.timestamp)("valid_to", { mode: 'string' }),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.id],
        name: "participant_sku_access_user_id_fkey"
    }).onDelete("cascade"),
    (0, pg_core_1.foreignKey)({
        columns: [table.skuLevelId],
        foreignColumns: [exports.skuLevelMaster.id],
        name: "participant_sku_access_sku_level_id_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.skuEntityId],
        foreignColumns: [exports.skuEntity.id],
        name: "participant_sku_access_sku_entity_id_fkey"
    }),
    (0, pg_core_1.unique)("participant_sku_access_user_id_sku_level_id_sku_entity_id_key").on(table.userId, table.skuLevelId, table.skuEntityId),
]);
