import { relations } from "drizzle-orm/relations";
import { users, auditLogs, counterSalesTransactionLogs, earningTypes, schemes, electricianLedger, qrTypes, qrCodes, redemptions, redemptionChannels, redemptionStatuses, retailers, userTypeEntity, onboardingTypes, approvalStatuses, languages, schemeTypes, campaigns, counterSales, appConfigs, counterSalesLedger, counterSalesTransactions, electricianTransactionLogs, electricianTransactions, electricians, eventLogs, eventMaster, notifications, referrals, retailerLedger, retailerTransactionLogs, retailerTransactions, systemLogs, userScopeMapping, participantSkuAccess, skuLevelMaster, skuEntity, locationLevelMaster, locationEntity, client, skuPointConfig, skuVariant, locationEntityPincode, pincodeMaster, creativesTypes, creatives, userTypeLevelMaster, ticketTypes, tickets, ticketStatuses } from "./schema";

export const auditLogsRelations = relations(auditLogs, ({one}) => ({
	user: one(users, {
		fields: [auditLogs.changedBy],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	auditLogs: many(auditLogs),
	counterSalesTransactionLogs: many(counterSalesTransactionLogs),
	electricianLedgers: many(electricianLedger),
	qrCodes: many(qrCodes),
	redemptions_userId: many(redemptions, {
		relationName: "redemptions_userId_users_id"
	}),
	redemptions_approvedBy: many(redemptions, {
		relationName: "redemptions_approvedBy_users_id"
	}),
	retailers: many(retailers),
	userTypeEntity: one(userTypeEntity, {
		fields: [users.roleId],
		references: [userTypeEntity.id]
	}),
	user: one(users, {
		fields: [users.referrerId],
		references: [users.id],
		relationName: "users_referrerId_users_id"
	}),
	users: many(users, {
		relationName: "users_referrerId_users_id"
	}),
	onboardingType: one(onboardingTypes, {
		fields: [users.onboardingTypeId],
		references: [onboardingTypes.id]
	}),
	approvalStatus: one(approvalStatuses, {
		fields: [users.approvalStatusId],
		references: [approvalStatuses.id]
	}),
	language: one(languages, {
		fields: [users.languageId],
		references: [languages.id]
	}),
	counterSales_attachedRetailerId: many(counterSales, {
		relationName: "counterSales_attachedRetailerId_users_id"
	}),
	counterSales_userId: many(counterSales, {
		relationName: "counterSales_userId_users_id"
	}),
	appConfigs: many(appConfigs),
	counterSalesLedgers: many(counterSalesLedger),
	counterSalesTransactions: many(counterSalesTransactions),
	electricianTransactionLogs: many(electricianTransactionLogs),
	electricianTransactions: many(electricianTransactions),
	electricians: many(electricians),
	eventLogs: many(eventLogs),
	notifications: many(notifications),
	referrals_referrerId: many(referrals, {
		relationName: "referrals_referrerId_users_id"
	}),
	referrals_referredId: many(referrals, {
		relationName: "referrals_referredId_users_id"
	}),
	retailerLedgers: many(retailerLedger),
	retailerTransactionLogs: many(retailerTransactionLogs),
	retailerTransactions: many(retailerTransactions),
	systemLogs: many(systemLogs),
	userScopeMappings: many(userScopeMapping),
	participantSkuAccesses: many(participantSkuAccess),
}));

export const counterSalesTransactionLogsRelations = relations(counterSalesTransactionLogs, ({one}) => ({
	user: one(users, {
		fields: [counterSalesTransactionLogs.userId],
		references: [users.id]
	}),
	earningType: one(earningTypes, {
		fields: [counterSalesTransactionLogs.earningType],
		references: [earningTypes.id]
	}),
	scheme: one(schemes, {
		fields: [counterSalesTransactionLogs.schemeId],
		references: [schemes.id]
	}),
}));

export const earningTypesRelations = relations(earningTypes, ({many}) => ({
	counterSalesTransactionLogs: many(counterSalesTransactionLogs),
	counterSalesTransactions: many(counterSalesTransactions),
	electricianTransactionLogs: many(electricianTransactionLogs),
	electricianTransactions: many(electricianTransactions),
	retailerTransactionLogs: many(retailerTransactionLogs),
	retailerTransactions: many(retailerTransactions),
}));

export const schemesRelations = relations(schemes, ({one, many}) => ({
	counterSalesTransactionLogs: many(counterSalesTransactionLogs),
	redemptions: many(redemptions),
	counterSalesTransactions: many(counterSalesTransactions),
	electricianTransactionLogs: many(electricianTransactionLogs),
	electricianTransactions: many(electricianTransactions),
	retailerTransactionLogs: many(retailerTransactionLogs),
	retailerTransactions: many(retailerTransactions),
	schemeType: one(schemeTypes, {
		fields: [schemes.schemeType],
		references: [schemeTypes.id]
	}),
}));

export const electricianLedgerRelations = relations(electricianLedger, ({one}) => ({
	user: one(users, {
		fields: [electricianLedger.userId],
		references: [users.id]
	}),
}));

export const qrCodesRelations = relations(qrCodes, ({one, many}) => ({
	qrType: one(qrTypes, {
		fields: [qrCodes.typeId],
		references: [qrTypes.id]
	}),
	qrCode: one(qrCodes, {
		fields: [qrCodes.parentQrId],
		references: [qrCodes.id],
		relationName: "qrCodes_parentQrId_qrCodes_id"
	}),
	qrCodes: many(qrCodes, {
		relationName: "qrCodes_parentQrId_qrCodes_id"
	}),
	user: one(users, {
		fields: [qrCodes.scannedBy],
		references: [users.id]
	}),
}));

export const qrTypesRelations = relations(qrTypes, ({many}) => ({
	qrCodes: many(qrCodes),
}));

export const redemptionsRelations = relations(redemptions, ({one}) => ({
	user_userId: one(users, {
		fields: [redemptions.userId],
		references: [users.id],
		relationName: "redemptions_userId_users_id"
	}),
	redemptionChannel: one(redemptionChannels, {
		fields: [redemptions.channelId],
		references: [redemptionChannels.id]
	}),
	redemptionStatus: one(redemptionStatuses, {
		fields: [redemptions.status],
		references: [redemptionStatuses.id]
	}),
	scheme: one(schemes, {
		fields: [redemptions.schemeId],
		references: [schemes.id]
	}),
	user_approvedBy: one(users, {
		fields: [redemptions.approvedBy],
		references: [users.id],
		relationName: "redemptions_approvedBy_users_id"
	}),
}));

export const redemptionChannelsRelations = relations(redemptionChannels, ({many}) => ({
	redemptions: many(redemptions),
}));

export const redemptionStatusesRelations = relations(redemptionStatuses, ({many}) => ({
	redemptions: many(redemptions),
}));

export const retailersRelations = relations(retailers, ({one}) => ({
	user: one(users, {
		fields: [retailers.userId],
		references: [users.id]
	}),
}));

export const userTypeEntityRelations = relations(userTypeEntity, ({one, many}) => ({
	users: many(users),
	userScopeMappings: many(userScopeMapping),
	skuPointConfigs: many(skuPointConfig),
	userTypeLevelMaster: one(userTypeLevelMaster, {
		fields: [userTypeEntity.levelId],
		references: [userTypeLevelMaster.id]
	}),
	userTypeEntity: one(userTypeEntity, {
		fields: [userTypeEntity.parentTypeId],
		references: [userTypeEntity.id],
		relationName: "userTypeEntity_parentTypeId_userTypeEntity_id"
	}),
	userTypeEntities: many(userTypeEntity, {
		relationName: "userTypeEntity_parentTypeId_userTypeEntity_id"
	}),
}));

export const onboardingTypesRelations = relations(onboardingTypes, ({many}) => ({
	users: many(users),
}));

export const approvalStatusesRelations = relations(approvalStatuses, ({many}) => ({
	users: many(users),
}));

export const languagesRelations = relations(languages, ({many}) => ({
	users: many(users),
}));

export const campaignsRelations = relations(campaigns, ({one}) => ({
	schemeType: one(schemeTypes, {
		fields: [campaigns.schemeType],
		references: [schemeTypes.id]
	}),
}));

export const schemeTypesRelations = relations(schemeTypes, ({many}) => ({
	campaigns: many(campaigns),
	schemes: many(schemes),
}));

export const counterSalesRelations = relations(counterSales, ({one}) => ({
	user_attachedRetailerId: one(users, {
		fields: [counterSales.attachedRetailerId],
		references: [users.id],
		relationName: "counterSales_attachedRetailerId_users_id"
	}),
	user_userId: one(users, {
		fields: [counterSales.userId],
		references: [users.id],
		relationName: "counterSales_userId_users_id"
	}),
}));

export const appConfigsRelations = relations(appConfigs, ({one}) => ({
	user: one(users, {
		fields: [appConfigs.updatedBy],
		references: [users.id]
	}),
}));

export const counterSalesLedgerRelations = relations(counterSalesLedger, ({one}) => ({
	user: one(users, {
		fields: [counterSalesLedger.userId],
		references: [users.id]
	}),
}));

export const counterSalesTransactionsRelations = relations(counterSalesTransactions, ({one}) => ({
	user: one(users, {
		fields: [counterSalesTransactions.userId],
		references: [users.id]
	}),
	earningType: one(earningTypes, {
		fields: [counterSalesTransactions.earningType],
		references: [earningTypes.id]
	}),
	scheme: one(schemes, {
		fields: [counterSalesTransactions.schemeId],
		references: [schemes.id]
	}),
}));

export const electricianTransactionLogsRelations = relations(electricianTransactionLogs, ({one}) => ({
	user: one(users, {
		fields: [electricianTransactionLogs.userId],
		references: [users.id]
	}),
	earningType: one(earningTypes, {
		fields: [electricianTransactionLogs.earningType],
		references: [earningTypes.id]
	}),
	scheme: one(schemes, {
		fields: [electricianTransactionLogs.schemeId],
		references: [schemes.id]
	}),
}));

export const electricianTransactionsRelations = relations(electricianTransactions, ({one}) => ({
	user: one(users, {
		fields: [electricianTransactions.userId],
		references: [users.id]
	}),
	earningType: one(earningTypes, {
		fields: [electricianTransactions.earningType],
		references: [earningTypes.id]
	}),
	scheme: one(schemes, {
		fields: [electricianTransactions.schemeId],
		references: [schemes.id]
	}),
}));

export const electriciansRelations = relations(electricians, ({one}) => ({
	user: one(users, {
		fields: [electricians.userId],
		references: [users.id]
	}),
}));

export const eventLogsRelations = relations(eventLogs, ({one}) => ({
	user: one(users, {
		fields: [eventLogs.userId],
		references: [users.id]
	}),
	eventMaster: one(eventMaster, {
		fields: [eventLogs.eventId],
		references: [eventMaster.id]
	}),
}));

export const eventMasterRelations = relations(eventMaster, ({many}) => ({
	eventLogs: many(eventLogs),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	user: one(users, {
		fields: [notifications.userId],
		references: [users.id]
	}),
}));

export const referralsRelations = relations(referrals, ({one}) => ({
	user_referrerId: one(users, {
		fields: [referrals.referrerId],
		references: [users.id],
		relationName: "referrals_referrerId_users_id"
	}),
	user_referredId: one(users, {
		fields: [referrals.referredId],
		references: [users.id],
		relationName: "referrals_referredId_users_id"
	}),
}));

export const retailerLedgerRelations = relations(retailerLedger, ({one}) => ({
	user: one(users, {
		fields: [retailerLedger.userId],
		references: [users.id]
	}),
}));

export const retailerTransactionLogsRelations = relations(retailerTransactionLogs, ({one}) => ({
	user: one(users, {
		fields: [retailerTransactionLogs.userId],
		references: [users.id]
	}),
	earningType: one(earningTypes, {
		fields: [retailerTransactionLogs.earningType],
		references: [earningTypes.id]
	}),
	scheme: one(schemes, {
		fields: [retailerTransactionLogs.schemeId],
		references: [schemes.id]
	}),
}));

export const retailerTransactionsRelations = relations(retailerTransactions, ({one}) => ({
	user: one(users, {
		fields: [retailerTransactions.userId],
		references: [users.id]
	}),
	earningType: one(earningTypes, {
		fields: [retailerTransactions.earningType],
		references: [earningTypes.id]
	}),
	scheme: one(schemes, {
		fields: [retailerTransactions.schemeId],
		references: [schemes.id]
	}),
}));

export const systemLogsRelations = relations(systemLogs, ({one}) => ({
	user: one(users, {
		fields: [systemLogs.userId],
		references: [users.id]
	}),
}));

export const userScopeMappingRelations = relations(userScopeMapping, ({one}) => ({
	userTypeEntity: one(userTypeEntity, {
		fields: [userScopeMapping.userTypeId],
		references: [userTypeEntity.id]
	}),
	user: one(users, {
		fields: [userScopeMapping.userId],
		references: [users.id]
	}),
}));

export const participantSkuAccessRelations = relations(participantSkuAccess, ({one}) => ({
	user: one(users, {
		fields: [participantSkuAccess.userId],
		references: [users.id]
	}),
	skuLevelMaster: one(skuLevelMaster, {
		fields: [participantSkuAccess.skuLevelId],
		references: [skuLevelMaster.id]
	}),
	skuEntity: one(skuEntity, {
		fields: [participantSkuAccess.skuEntityId],
		references: [skuEntity.id]
	}),
}));

export const skuLevelMasterRelations = relations(skuLevelMaster, ({one, many}) => ({
	participantSkuAccesses: many(participantSkuAccess),
	skuEntities: many(skuEntity),
	client: one(client, {
		fields: [skuLevelMaster.clientId],
		references: [client.id]
	}),
}));

export const skuEntityRelations = relations(skuEntity, ({one, many}) => ({
	participantSkuAccesses: many(participantSkuAccess),
	client: one(client, {
		fields: [skuEntity.clientId],
		references: [client.id]
	}),
	skuLevelMaster: one(skuLevelMaster, {
		fields: [skuEntity.levelId],
		references: [skuLevelMaster.id]
	}),
	skuEntity: one(skuEntity, {
		fields: [skuEntity.parentEntityId],
		references: [skuEntity.id],
		relationName: "skuEntity_parentEntityId_skuEntity_id"
	}),
	skuEntities: many(skuEntity, {
		relationName: "skuEntity_parentEntityId_skuEntity_id"
	}),
	skuVariants: many(skuVariant),
}));

export const locationEntityRelations = relations(locationEntity, ({one, many}) => ({
	locationLevelMaster: one(locationLevelMaster, {
		fields: [locationEntity.levelId],
		references: [locationLevelMaster.id]
	}),
	locationEntity: one(locationEntity, {
		fields: [locationEntity.parentEntityId],
		references: [locationEntity.id],
		relationName: "locationEntity_parentEntityId_locationEntity_id"
	}),
	locationEntities: many(locationEntity, {
		relationName: "locationEntity_parentEntityId_locationEntity_id"
	}),
	client: one(client, {
		fields: [locationEntity.clientId],
		references: [client.id]
	}),
	locationEntityPincodes: many(locationEntityPincode),
}));

export const locationLevelMasterRelations = relations(locationLevelMaster, ({one, many}) => ({
	locationEntities: many(locationEntity),
	client: one(client, {
		fields: [locationLevelMaster.clientId],
		references: [client.id]
	}),
}));

export const clientRelations = relations(client, ({many}) => ({
	locationEntities: many(locationEntity),
	locationLevelMasters: many(locationLevelMaster),
	skuEntities: many(skuEntity),
	skuLevelMasters: many(skuLevelMaster),
	skuPointConfigs: many(skuPointConfig),
}));

export const skuPointConfigRelations = relations(skuPointConfig, ({one}) => ({
	client: one(client, {
		fields: [skuPointConfig.clientId],
		references: [client.id]
	}),
	skuVariant: one(skuVariant, {
		fields: [skuPointConfig.skuVariantId],
		references: [skuVariant.id]
	}),
	userTypeEntity: one(userTypeEntity, {
		fields: [skuPointConfig.userTypeId],
		references: [userTypeEntity.id]
	}),
}));

export const skuVariantRelations = relations(skuVariant, ({one, many}) => ({
	skuPointConfigs: many(skuPointConfig),
	skuEntity: one(skuEntity, {
		fields: [skuVariant.skuEntityId],
		references: [skuEntity.id]
	}),
}));

export const locationEntityPincodeRelations = relations(locationEntityPincode, ({one}) => ({
	locationEntity: one(locationEntity, {
		fields: [locationEntityPincode.entityId],
		references: [locationEntity.id]
	}),
	pincodeMaster: one(pincodeMaster, {
		fields: [locationEntityPincode.pincodeId],
		references: [pincodeMaster.id]
	}),
}));

export const pincodeMasterRelations = relations(pincodeMaster, ({many}) => ({
	locationEntityPincodes: many(locationEntityPincode),
}));

export const creativesRelations = relations(creatives, ({one}) => ({
	creativesType: one(creativesTypes, {
		fields: [creatives.typeId],
		references: [creativesTypes.id]
	}),
}));

export const creativesTypesRelations = relations(creativesTypes, ({many}) => ({
	creatives: many(creatives),
}));

export const userTypeLevelMasterRelations = relations(userTypeLevelMaster, ({one, many}) => ({
	userTypeEntities: many(userTypeEntity),
	userTypeLevelMaster: one(userTypeLevelMaster, {
		fields: [userTypeLevelMaster.parentLevelId],
		references: [userTypeLevelMaster.id],
		relationName: "userTypeLevelMaster_parentLevelId_userTypeLevelMaster_id"
	}),
	userTypeLevelMasters: many(userTypeLevelMaster, {
		relationName: "userTypeLevelMaster_parentLevelId_userTypeLevelMaster_id"
	}),
}));

export const ticketsRelations = relations(tickets, ({one}) => ({
	ticketType: one(ticketTypes, {
		fields: [tickets.typeId],
		references: [ticketTypes.id]
	}),
	ticketStatus: one(ticketStatuses, {
		fields: [tickets.statusId],
		references: [ticketStatuses.id]
	}),
}));

export const ticketTypesRelations = relations(ticketTypes, ({many}) => ({
	tickets: many(tickets),
}));

export const ticketStatusesRelations = relations(ticketStatuses, ({many}) => ({
	tickets: many(tickets),
}));