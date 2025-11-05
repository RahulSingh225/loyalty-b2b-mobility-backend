import { pgTable, foreignKey, unique, serial, integer, text, jsonb, boolean, timestamp, bigint, numeric, varchar, uniqueIndex, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	roleId: integer("role_id").notNull(),
	name: text().notNull(),
	phone: text().notNull(),
	email: text(),
	address: text(),
	city: text(),
	district: text(),
	state: text(),
	password: text(),
	branch: integer(),
	zone: integer(),
	location: jsonb(),
	referralCode: text("referral_code"),
	referrerId: integer("referrer_id"),
	onboardingTypeId: integer("onboarding_type_id").notNull(),
	approvalStatusId: integer("approval_status_id").notNull(),
	languageId: integer("language_id").default(1).notNull(),
	isSuspended: boolean("is_suspended").default(false),
	suspendedAt: timestamp("suspended_at", { mode: 'string' }),
	fcmToken: text("fcm_token"),
	lastLoginAt: timestamp("last_login_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [userTypeEntity.id],
			name: "users_role_id_fkey"
		}),
	foreignKey({
			columns: [table.referrerId],
			foreignColumns: [table.id],
			name: "users_referrer_id_fkey"
		}),
	foreignKey({
			columns: [table.onboardingTypeId],
			foreignColumns: [onboardingTypes.id],
			name: "users_onboarding_type_id_fkey"
		}),
	foreignKey({
			columns: [table.approvalStatusId],
			foreignColumns: [approvalStatuses.id],
			name: "users_approval_status_id_fkey"
		}),
	foreignKey({
			columns: [table.languageId],
			foreignColumns: [languages.id],
			name: "users_language_id_fkey"
		}),
	unique("users_phone_key").on(table.phone),
	unique("users_referral_code_key").on(table.referralCode),
]);

export const appConfigs = pgTable("app_configs", {
	id: serial().primaryKey().notNull(),
	key: text().notNull(),
	value: jsonb().notNull(),
	description: text(),
	updatedBy: integer("updated_by"),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.updatedBy],
			foreignColumns: [users.id],
			name: "app_configs_updated_by_fkey"
		}),
	unique("app_configs_key_key").on(table.key),
]);

export const userTypeEntity = pgTable("user_type_entity", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "user_type_entity_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	levelId: bigint("level_id", { mode: "number" }).notNull(),
	typeName: text("type_name").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	parentTypeId: bigint("parent_type_id", { mode: "number" }),
	isActive: boolean("is_active").default(true),
}, (table) => [
	foreignKey({
			columns: [table.levelId],
			foreignColumns: [userTypeLevelMaster.id],
			name: "user_type_entity_level_id_fkey"
		}),
	foreignKey({
			columns: [table.parentTypeId],
			foreignColumns: [table.id],
			name: "user_type_entity_parent_type_id_fkey"
		}),
]);

export const counterSales = pgTable("counter_sales", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	uniqueId: text("unique_id").notNull(),
	name: text().notNull(),
	phone: text().notNull(),
	email: text(),
	aadhaar: text().notNull(),
	pan: text(),
	gst: text(),
	address: text(),
	city: text(),
	district: text(),
	state: text(),
	dob: timestamp({ mode: 'string' }),
	referralCode: text("referral_code"),
	isKycVerified: boolean("is_kyc_verified").default(false),
	onboardingTypeId: integer("onboarding_type_id").notNull(),
	tdsConsent: boolean("tds_consent").default(false).notNull(),
	bankAccountNo: text("bank_account_no"),
	bankAccountIfsc: text("bank_account_ifsc"),
	bankAccountName: text("bank_account_name"),
	upiId: text("upi_id"),
	isBankValidated: boolean("is_bank_validated").default(false),
	pointsBalance: integer("points_balance").default(0),
	sapCustomerCode: text("sap_customer_code"),
	kycDocuments: jsonb("kyc_documents"),
	attachedRetailerId: integer("attached_retailer_id"),
	totalEarnings: numeric("total_earnings").default('0'),
	totalBalance: numeric("total_balance").default('0'),
	totalRedeemed: numeric("total_redeemed").default('0'),
	tdsPercentage: integer("tds_percentage").default(0),
	tdsKitty: numeric("tds_kitty").default('0'),
	tdsDeducted: numeric("tds_deducted").default('0'),
	lastSettlementDate: timestamp("last_settlement_date", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.attachedRetailerId],
			foreignColumns: [users.id],
			name: "counter_sales_attached_retailer_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "counter_sales_user_id_fkey"
		}),
	unique("counter_sales_unique_id_key").on(table.uniqueId),
	unique("counter_sales_phone_key").on(table.phone),
	unique("counter_sales_referral_code_key").on(table.referralCode),
]);

export const retailers = pgTable("retailers", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	uniqueId: text("unique_id").notNull(),
	name: text().notNull(),
	phone: text().notNull(),
	email: text(),
	aadhaar: text().notNull(),
	pan: text(),
	gst: text(),
	address: text(),
	city: text(),
	district: text(),
	state: text(),
	dob: timestamp({ mode: 'string' }),
	referralCode: text("referral_code"),
	isKycVerified: boolean("is_kyc_verified").default(false),
	onboardingTypeId: integer("onboarding_type_id").notNull(),
	tdsConsent: boolean("tds_consent").default(false).notNull(),
	bankAccountNo: text("bank_account_no"),
	bankAccountIfsc: text("bank_account_ifsc"),
	bankAccountName: text("bank_account_name"),
	upiId: text("upi_id"),
	isBankValidated: boolean("is_bank_validated").default(false),
	pointsBalance: integer("points_balance").default(0),
	sapCustomerCode: text("sap_customer_code"),
	kycDocuments: jsonb("kyc_documents"),
	totalEarnings: numeric("total_earnings").default('0'),
	totalBalance: numeric("total_balance").default('0'),
	totalRedeemed: numeric("total_redeemed").default('0'),
	tdsPercentage: integer("tds_percentage").default(0),
	tdsKitty: numeric("tds_kitty").default('0'),
	tdsDeducted: numeric("tds_deducted").default('0'),
	lastSettlementDate: timestamp("last_settlement_date", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "retailers_user_id_fkey"
		}),
	unique("retailers_unique_id_key").on(table.uniqueId),
	unique("retailers_phone_key").on(table.phone),
	unique("retailers_referral_code_key").on(table.referralCode),
]);

export const electricians = pgTable("electricians", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	uniqueId: text("unique_id").notNull(),
	name: text().notNull(),
	phone: text().notNull(),
	email: text(),
	aadhaar: text().notNull(),
	pan: text(),
	gst: text(),
	address: text(),
	city: text(),
	district: text(),
	state: text(),
	dob: timestamp({ mode: 'string' }),
	referralCode: text("referral_code"),
	isKycVerified: boolean("is_kyc_verified").default(false),
	onboardingTypeId: integer("onboarding_type_id").notNull(),
	tdsConsent: boolean("tds_consent").default(false).notNull(),
	bankAccountNo: text("bank_account_no"),
	bankAccountIfsc: text("bank_account_ifsc"),
	bankAccountName: text("bank_account_name"),
	upiId: text("upi_id"),
	isBankValidated: boolean("is_bank_validated").default(false),
	pointsBalance: integer("points_balance").default(0),
	sapCustomerCode: text("sap_customer_code"),
	kycDocuments: jsonb("kyc_documents"),
	electricianCertificate: text("electrician_certificate"),
	totalEarnings: numeric("total_earnings").default('0'),
	totalBalance: numeric("total_balance").default('0'),
	totalRedeemed: numeric("total_redeemed").default('0'),
	tdsPercentage: integer("tds_percentage").default(0),
	tdsKitty: numeric("tds_kitty").default('0'),
	tdsDeducted: numeric("tds_deducted").default('0'),
	lastSettlementDate: timestamp("last_settlement_date", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "electricians_user_id_fkey"
		}),
	unique("electricians_unique_id_key").on(table.uniqueId),
	unique("electricians_phone_key").on(table.phone),
	unique("electricians_referral_code_key").on(table.referralCode),
]);

export const onboardingTypes = pgTable("onboarding_types", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("onboarding_types_name_key").on(table.name),
]);

export const approvalStatuses = pgTable("approval_statuses", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("approval_statuses_name_key").on(table.name),
]);

export const languages = pgTable("languages", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	code: text(),
	description: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("languages_name_key").on(table.name),
]);

export const retailerTransactions = pgTable("retailer_transactions", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	earningType: integer("earning_type").notNull(),
	points: numeric().notNull(),
	category: text().notNull(),
	subcategory: text(),
	sku: text(),
	batchNumber: text("batch_number"),
	serialNumber: text("serial_number"),
	qrCode: text("qr_code"),
	remarks: text(),
	latitude: numeric({ precision: 10, scale:  7 }),
	longitude: numeric({ precision: 10, scale:  7 }),
	metadata: jsonb().notNull(),
	schemeId: integer("scheme_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "retailer_transactions_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.earningType],
			foreignColumns: [earningTypes.id],
			name: "retailer_transactions_earning_type_fkey"
		}),
	foreignKey({
			columns: [table.schemeId],
			foreignColumns: [schemes.id],
			name: "retailer_transactions_scheme_id_fkey"
		}),
]);

export const counterSalesTransactions = pgTable("counter_sales_transactions", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	earningType: integer("earning_type").notNull(),
	points: numeric().notNull(),
	category: text().notNull(),
	subcategory: text(),
	sku: text(),
	batchNumber: text("batch_number"),
	serialNumber: text("serial_number"),
	qrCode: text("qr_code"),
	remarks: text(),
	latitude: numeric({ precision: 10, scale:  7 }),
	longitude: numeric({ precision: 10, scale:  7 }),
	metadata: jsonb().notNull(),
	schemeId: integer("scheme_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "counter_sales_transactions_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.earningType],
			foreignColumns: [earningTypes.id],
			name: "counter_sales_transactions_earning_type_fkey"
		}),
	foreignKey({
			columns: [table.schemeId],
			foreignColumns: [schemes.id],
			name: "counter_sales_transactions_scheme_id_fkey"
		}),
]);

export const electricianTransactions = pgTable("electrician_transactions", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	earningType: integer("earning_type").notNull(),
	points: numeric().notNull(),
	category: text().notNull(),
	subcategory: text(),
	sku: text(),
	batchNumber: text("batch_number"),
	serialNumber: text("serial_number"),
	qrCode: text("qr_code"),
	remarks: text(),
	latitude: numeric({ precision: 10, scale:  7 }),
	longitude: numeric({ precision: 10, scale:  7 }),
	metadata: jsonb().notNull(),
	schemeId: integer("scheme_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "electrician_transactions_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.earningType],
			foreignColumns: [earningTypes.id],
			name: "electrician_transactions_earning_type_fkey"
		}),
	foreignKey({
			columns: [table.schemeId],
			foreignColumns: [schemes.id],
			name: "electrician_transactions_scheme_id_fkey"
		}),
]);

export const retailerTransactionLogs = pgTable("retailer_transaction_logs", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	earningType: integer("earning_type").notNull(),
	points: numeric().notNull(),
	category: text().notNull(),
	subcategory: text(),
	sku: text(),
	status: text().notNull(),
	batchNumber: text("batch_number"),
	serialNumber: text("serial_number"),
	qrCode: text("qr_code"),
	remarks: text(),
	latitude: numeric({ precision: 10, scale:  7 }),
	longitude: numeric({ precision: 10, scale:  7 }),
	metadata: jsonb().notNull(),
	schemeId: integer("scheme_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "retailer_transaction_logs_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.earningType],
			foreignColumns: [earningTypes.id],
			name: "retailer_transaction_logs_earning_type_fkey"
		}),
	foreignKey({
			columns: [table.schemeId],
			foreignColumns: [schemes.id],
			name: "retailer_transaction_logs_scheme_id_fkey"
		}),
]);

export const counterSalesTransactionLogs = pgTable("counter_sales_transaction_logs", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	earningType: integer("earning_type").notNull(),
	points: numeric().notNull(),
	category: text().notNull(),
	subcategory: text(),
	sku: text(),
	status: text().notNull(),
	batchNumber: text("batch_number"),
	serialNumber: text("serial_number"),
	qrCode: text("qr_code"),
	remarks: text(),
	latitude: numeric({ precision: 10, scale:  7 }),
	longitude: numeric({ precision: 10, scale:  7 }),
	metadata: jsonb().notNull(),
	schemeId: integer("scheme_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "counter_sales_transaction_logs_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.earningType],
			foreignColumns: [earningTypes.id],
			name: "counter_sales_transaction_logs_earning_type_fkey"
		}),
	foreignKey({
			columns: [table.schemeId],
			foreignColumns: [schemes.id],
			name: "counter_sales_transaction_logs_scheme_id_fkey"
		}),
]);

export const retailerLedger = pgTable("retailer_ledger", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	earningType: integer("earning_type").notNull(),
	redemptionType: integer("redemption_type").notNull(),
	amount: numeric().notNull(),
	type: text().notNull(),
	remarks: text(),
	openingBalance: numeric("opening_balance").notNull(),
	closingBalance: numeric("closing_balance").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "retailer_ledger_user_id_fkey"
		}).onDelete("cascade"),
]);

export const electricianLedger = pgTable("electrician_ledger", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	earningType: integer("earning_type").notNull(),
	redemptionType: integer("redemption_type").notNull(),
	amount: numeric().notNull(),
	type: text().notNull(),
	remarks: text(),
	openingBalance: numeric("opening_balance").notNull(),
	closingBalance: numeric("closing_balance").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "electrician_ledger_user_id_fkey"
		}).onDelete("cascade"),
]);

export const counterSalesLedger = pgTable("counter_sales_ledger", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	earningType: integer("earning_type").notNull(),
	redemptionType: integer("redemption_type").notNull(),
	amount: numeric().notNull(),
	type: text().notNull(),
	remarks: text(),
	openingBalance: numeric("opening_balance").notNull(),
	closingBalance: numeric("closing_balance").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "counter_sales_ledger_user_id_fkey"
		}).onDelete("cascade"),
]);

export const electricianTransactionLogs = pgTable("electrician_transaction_logs", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	earningType: integer("earning_type").notNull(),
	points: numeric().notNull(),
	category: text().notNull(),
	subcategory: text(),
	sku: text(),
	status: text().notNull(),
	batchNumber: text("batch_number"),
	serialNumber: text("serial_number"),
	qrCode: text("qr_code"),
	remarks: text(),
	latitude: numeric({ precision: 10, scale:  7 }),
	longitude: numeric({ precision: 10, scale:  7 }),
	metadata: jsonb().notNull(),
	schemeId: integer("scheme_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "electrician_transaction_logs_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.earningType],
			foreignColumns: [earningTypes.id],
			name: "electrician_transaction_logs_earning_type_fkey"
		}),
	foreignKey({
			columns: [table.schemeId],
			foreignColumns: [schemes.id],
			name: "electrician_transaction_logs_scheme_id_fkey"
		}),
]);

export const earningTypes = pgTable("earning_types", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("earning_types_name_key").on(table.name),
]);

export const schemes = pgTable("schemes", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	schemeType: integer("scheme_type").notNull(),
	description: text(),
	startDate: timestamp("start_date", { mode: 'string' }).notNull(),
	endDate: timestamp("end_date", { mode: 'string' }).notNull(),
	isActive: boolean("is_active").default(true),
	budget: integer().default(0),
	spentBudget: integer("spent_budget").default(0),
	config: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.schemeType],
			foreignColumns: [schemeTypes.id],
			name: "schemes_scheme_type_fkey"
		}),
]);

export const qrTypes = pgTable("qr_types", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("qr_types_name_key").on(table.name),
]);

export const qrCodes = pgTable("qr_codes", {
	id: serial().primaryKey().notNull(),
	sku: text().notNull(),
	batchNumber: text("batch_number").notNull(),
	typeId: integer("type_id").notNull(),
	code: text().notNull(),
	securityCode: text("security_code").notNull(),
	manufacturingDate: timestamp("manufacturing_date", { mode: 'string' }).notNull(),
	monoSubMonoId: text("mono_sub_mono_id"),
	parentQrId: integer("parent_qr_id"),
	isScanned: boolean("is_scanned").default(false),
	scannedBy: integer("scanned_by"),
	monthlyVolume: integer("monthly_volume"),
	locationAccess: jsonb("location_access"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.typeId],
			foreignColumns: [qrTypes.id],
			name: "qr_codes_type_id_fkey"
		}),
	foreignKey({
			columns: [table.parentQrId],
			foreignColumns: [table.id],
			name: "qr_codes_parent_qr_id_fkey"
		}),
	foreignKey({
			columns: [table.scannedBy],
			foreignColumns: [users.id],
			name: "qr_codes_scanned_by_fkey"
		}),
	unique("qr_codes_code_key").on(table.code),
]);

export const schemeTypes = pgTable("scheme_types", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("scheme_types_name_key").on(table.name),
]);

export const campaigns = pgTable("campaigns", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	schemeType: integer("scheme_type").notNull(),
	description: text(),
	startDate: timestamp("start_date", { mode: 'string' }).notNull(),
	endDate: timestamp("end_date", { mode: 'string' }).notNull(),
	isActive: boolean("is_active").default(true),
	budget: integer().default(0),
	spentBudget: integer("spent_budget").default(0),
	config: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.schemeType],
			foreignColumns: [schemeTypes.id],
			name: "campaigns_scheme_type_fkey"
		}),
]);

export const redemptions = pgTable("redemptions", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	redemptionId: text("redemption_id").notNull(),
	channelId: integer("channel_id").notNull(),
	pointsRedeemed: integer("points_redeemed").notNull(),
	amount: integer(),
	status: integer().notNull(),
	schemeId: integer("scheme_id"),
	metadata: jsonb().notNull(),
	approvedBy: integer("approved_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "redemptions_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.channelId],
			foreignColumns: [redemptionChannels.id],
			name: "redemptions_channel_id_fkey"
		}),
	foreignKey({
			columns: [table.status],
			foreignColumns: [redemptionStatuses.id],
			name: "redemptions_status_fkey"
		}),
	foreignKey({
			columns: [table.schemeId],
			foreignColumns: [schemes.id],
			name: "redemptions_scheme_id_fkey"
		}),
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [users.id],
			name: "redemptions_approved_by_fkey"
		}),
	unique("redemptions_redemption_id_key").on(table.redemptionId),
]);

export const redemptionChannels = pgTable("redemption_channels", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("redemption_channels_name_key").on(table.name),
]);

export const redemptionStatuses = pgTable("redemption_statuses", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("redemption_statuses_name_key").on(table.name),
]);

export const auditLogs = pgTable("audit_logs", {
	id: serial().primaryKey().notNull(),
	tableName: text("table_name").notNull(),
	recordId: integer("record_id").notNull(),
	operation: text().notNull(),
	action: text().notNull(),
	changedBy: integer("changed_by"),
	changeSource: text("change_source"),
	correlationId: text("correlation_id"),
	oldState: jsonb("old_state"),
	newState: jsonb("new_state"),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.changedBy],
			foreignColumns: [users.id],
			name: "audit_logs_changed_by_fkey"
		}),
]);

export const systemLogs = pgTable("system_logs", {
	logId: serial("log_id").primaryKey().notNull(),
	logLevel: text("log_level").notNull(),
	componentName: text("component_name").notNull(),
	message: text().notNull(),
	exceptionTrace: text("exception_trace"),
	action: text().notNull(),
	correlationId: text("correlation_id"),
	apiEndpoint: text("api_endpoint"),
	userId: integer("user_id"),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "system_logs_user_id_fkey"
		}),
]);

export const eventLogs = pgTable("event_logs", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id"),
	action: text().notNull(),
	eventType: text("event_type").notNull(),
	entityId: text("entity_id"),
	correlationId: text("correlation_id"),
	metadata: jsonb(),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "event_logs_user_id_fkey"
		}),
]);

export const notifications = pgTable("notifications", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id"),
	type: text().notNull(),
	channel: text().notNull(),
	templateKey: text("template_key"),
	trigger: text().notNull(),
	isSent: boolean("is_sent").default(false),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "notifications_user_id_fkey"
		}),
]);

export const referrals = pgTable("referrals", {
	id: serial().primaryKey().notNull(),
	referrerId: integer("referrer_id").notNull(),
	referredId: integer("referred_id").notNull(),
	status: text().default('pending').notNull(),
	bonusAwarded: integer("bonus_awarded").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.referrerId],
			foreignColumns: [users.id],
			name: "referrals_referrer_id_fkey"
		}),
	foreignKey({
			columns: [table.referredId],
			foreignColumns: [users.id],
			name: "referrals_referred_id_fkey"
		}),
]);

export const client = pgTable("client", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "client_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	name: varchar({ length: 150 }).notNull(),
	code: text(),
}, (table) => [
	unique("client_code_key").on(table.code),
]);

export const locationLevelMaster = pgTable("location_level_master", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "location_level_master_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	clientId: bigint("client_id", { mode: "number" }).notNull(),
	levelNo: integer("level_no").notNull(),
	levelName: text("level_name").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	parentLevelId: bigint("parent_level_id", { mode: "number" }),
}, (table) => [
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
			name: "fk_level_client"
		}),
]);

export const locationEntity = pgTable("location_entity", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "location_entity_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	clientId: bigint("client_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	levelId: bigint("level_id", { mode: "number" }).notNull(),
	name: varchar({ length: 150 }).notNull(),
	code: text(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	parentEntityId: bigint("parent_entity_id", { mode: "number" }),
}, (table) => [
	foreignKey({
			columns: [table.levelId],
			foreignColumns: [locationLevelMaster.id],
			name: "location_entity_level_id_fkey"
		}),
	foreignKey({
			columns: [table.parentEntityId],
			foreignColumns: [table.id],
			name: "location_entity_parent_entity_id_fkey"
		}),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
			name: "fk_entity_client"
		}),
]);

export const locationEntityPincode = pgTable("location_entity_pincode", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "location_entity_pincode_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	entityId: bigint("entity_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pincodeId: bigint("pincode_id", { mode: "number" }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.entityId],
			foreignColumns: [locationEntity.id],
			name: "location_entity_pincode_entity_id_fkey"
		}),
	foreignKey({
			columns: [table.pincodeId],
			foreignColumns: [pincodeMaster.id],
			name: "location_entity_pincode_pincode_id_fkey"
		}),
]);

export const pincodeMaster = pgTable("pincode_master", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "pincode_master_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	pincode: text().notNull(),
	city: text(),
	district: text(),
	state: text(),
});

export const skuLevelMaster = pgTable("sku_level_master", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "sku_level_master_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	clientId: bigint("client_id", { mode: "number" }).notNull(),
	levelNo: integer("level_no").notNull(),
	levelName: text("level_name").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	parentLevelId: bigint("parent_level_id", { mode: "number" }),
}, (table) => [
	uniqueIndex("uq_client_level").using("btree", table.clientId.asc().nullsLast().op("int4_ops"), table.levelNo.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
			name: "sku_level_master_client_id_fkey"
		}),
]);

export const skuEntity = pgTable("sku_entity", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "sku_entity_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	clientId: bigint("client_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	levelId: bigint("level_id", { mode: "number" }).notNull(),
	name: varchar({ length: 200 }).notNull(),
	code: text(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	parentEntityId: bigint("parent_entity_id", { mode: "number" }),
	isActive: boolean("is_active").default(true),
}, (table) => [
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
			name: "sku_entity_client_id_fkey"
		}),
	foreignKey({
			columns: [table.levelId],
			foreignColumns: [skuLevelMaster.id],
			name: "sku_entity_level_id_fkey"
		}),
	foreignKey({
			columns: [table.parentEntityId],
			foreignColumns: [table.id],
			name: "sku_entity_parent_entity_id_fkey"
		}),
]);

export const skuVariant = pgTable("sku_variant", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "sku_variant_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	skuEntityId: bigint("sku_entity_id", { mode: "number" }).notNull(),
	variantName: varchar("variant_name", { length: 150 }).notNull(),
	packSize: text("pack_size"),
	mrp: numeric({ precision: 10, scale:  2 }),
	isActive: boolean("is_active").default(true),
}, (table) => [
	foreignKey({
			columns: [table.skuEntityId],
			foreignColumns: [skuEntity.id],
			name: "sku_variant_sku_entity_id_fkey"
		}),
]);

export const userTypeLevelMaster = pgTable("user_type_level_master", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "user_type_level_master_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	levelNo: integer("level_no").notNull(),
	levelName: text("level_name").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	parentLevelId: bigint("parent_level_id", { mode: "number" }),
}, (table) => [
	foreignKey({
			columns: [table.parentLevelId],
			foreignColumns: [table.id],
			name: "user_type_level_master_parent_level_id_fkey"
		}),
]);

export const skuPointConfig = pgTable("sku_point_config", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "sku_point_config_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	clientId: bigint("client_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	skuVariantId: bigint("sku_variant_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	userTypeId: bigint("user_type_id", { mode: "number" }).notNull(),
	pointsPerUnit: numeric("points_per_unit", { precision: 10, scale:  2 }).notNull(),
	validFrom: timestamp("valid_from", { mode: 'string' }),
	validTo: timestamp("valid_to", { mode: 'string' }),
	remarks: text(),
}, (table) => [
	uniqueIndex("uq_sku_user_type").using("btree", table.clientId.asc().nullsLast().op("int8_ops"), table.skuVariantId.asc().nullsLast().op("int8_ops"), table.userTypeId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
			name: "sku_point_config_client_id_fkey"
		}),
	foreignKey({
			columns: [table.skuVariantId],
			foreignColumns: [skuVariant.id],
			name: "sku_point_config_sku_variant_id_fkey"
		}),
	foreignKey({
			columns: [table.userTypeId],
			foreignColumns: [userTypeEntity.id],
			name: "sku_point_config_user_type_id_fkey"
		}),
]);

export const creativesTypes = pgTable("creatives_types", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("creatives_types_name_key").on(table.name),
]);

export const creatives = pgTable("creatives", {
	id: serial().primaryKey().notNull(),
	typeId: integer("type_id").notNull(),
	url: varchar({ length: 500 }).notNull(),
	title: text().notNull(),
	description: text(),
	carouselName: text("carousel_name").notNull(),
	displayOrder: integer("display_order").default(0),
	targetAudience: jsonb("target_audience").default({}),
	metadata: jsonb().default({}),
	isActive: boolean("is_active").default(true),
	startDate: timestamp("start_date", { mode: 'string' }),
	endDate: timestamp("end_date", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("creatives_active_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops"), table.startDate.asc().nullsLast().op("timestamp_ops"), table.endDate.asc().nullsLast().op("bool_ops")),
	index("creatives_carousel_idx").using("btree", table.carouselName.asc().nullsLast().op("text_ops")),
	index("creatives_type_idx").using("btree", table.typeId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.typeId],
			foreignColumns: [creativesTypes.id],
			name: "creatives_type_id_fkey"
		}).onDelete("restrict"),
]);

export const ticketTypes = pgTable("ticket_types", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("ticket_types_name_key").on(table.name),
]);

export const tickets = pgTable("tickets", {
	id: serial().primaryKey().notNull(),
	typeId: integer("type_id").notNull(),
	statusId: integer("status_id").notNull(),
	subject: text().notNull(),
	description: text().notNull(),
	imageUrl: varchar("image_url", { length: 500 }),
	videoUrl: varchar("video_url", { length: 500 }),
	priority: text().default('Medium'),
	assigneeId: integer("assignee_id"),
	createdBy: integer("created_by").notNull(),
	resolutionNotes: text("resolution_notes"),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	attachments: jsonb().default([]),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.typeId],
			foreignColumns: [ticketTypes.id],
			name: "tickets_type_id_fkey"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.statusId],
			foreignColumns: [ticketStatuses.id],
			name: "tickets_status_id_fkey"
		}).onDelete("restrict"),
]);

export const ticketStatuses = pgTable("ticket_statuses", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("ticket_statuses_name_key").on(table.name),
]);
