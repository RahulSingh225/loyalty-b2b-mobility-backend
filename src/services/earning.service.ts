import { BaseService } from './baseService';
import db from '../config/db';
import {
    qrCodes,
    users,
    skuPointConfig,
    skuVariant,
    skuEntity,
    earningTypes,
    retailers,
    electricians,
    counterSales,
    retailerTransactions,
    electricianTransactions,
    counterSalesTransactions,
    retailerTransactionLogs,
    electricianTransactionLogs,
    counterSalesTransactionLogs,
    retailerLedger,
    electricianLedger,
    counterSalesLedger,
    participantSkuAccess,
    skuPointRules,
    tblInventory as InventoryModel,
    tblInventoryBatch as InventoryBatch,
    userAssociations,
    userTypeEntity,
    approvalStatuses,
    tdsRecords,
} from '../schema';
import { emit } from '../mq/mqService';
import { eq, and, sql, desc, or, inArray } from 'drizzle-orm';
import { z } from 'zod'; // Keep zod just in case, though usually input is validated before service
import { AppError } from '../middlewares/errorHandler';

import { UserType } from '../types';
import { TdsDeductionConstraint } from '../procedures/constraints/TdsDeduction';
import { notificationService as inAppNotificationService } from './notification.service';

// Helper types
interface ScanContext {
    userId: number;
    userType: UserType; // DB role name
    roleId: number;
    latitude: number;
    longitude: number;
    metadata?: any;
}

export class EarningService extends BaseService<typeof qrCodes> {
    constructor() {
        super(qrCodes);
    }

    private async logEvent(tx: any, eventCode: string, userId: number, entityId?: string | number, extraMetadata?: any) {
        try {
            await emit(eventCode, {
                userId,
                entityId,
                metadata: extraMetadata || {},
            });
        } catch (error) {
            console.error(`[EarningService] Failed to emit event ${eventCode}:`, error);
        }
    }

    private async checkDailyScanLimit(tx: any, userId: number, roleId: number, userType: UserType) {
        // 1. Get maxDailyScans for the user type
        const [roleInfo] = await tx.select({
            maxDailyScans: userTypeEntity.maxDailyScans
        })
            .from(userTypeEntity)
            .where(eq(userTypeEntity.id, roleId))
            .limit(1);

        const limit = roleInfo?.maxDailyScans ?? 50;

        // 2. Resolve transaction table
        let txnTable;
        switch (userType) {
            case 'Retailer':
                txnTable = retailerTransactions;
                break;
            case 'Electrician':
                txnTable = electricianTransactions;
                break;
            case 'Counter Staff':
            case 'CounterSales':
                txnTable = counterSalesTransactions;
                break;
            default:
                // If user type doesn't have a transaction table for scans, we skip limit check or throw
                return;
        }

        // 3. Count today's transactions
        const [result] = await tx.select({
            count: sql<number>`count(*)`
        })
            .from(txnTable)
            .where(
                and(
                    eq(txnTable.userId, userId),
                    sql`DATE(${txnTable.createdAt}) = CURRENT_DATE`
                )
            );

        const todayCount = Number(result?.count || 0);

        if (todayCount >= limit) {
            throw new AppError(`Daily scan limit of ${limit} reached`, 400);
        }
    }

    private async checkUserStatus(tx: any, userId: number) {
        const [user] = await tx
            .select({
                status: approvalStatuses.name,
                isSuspended: users.isSuspended,
                roleId: users.roleId
            })
            .from(users)
            .innerJoin(approvalStatuses, eq(users.approvalStatusId, approvalStatuses.id))
            .where(eq(users.id, userId))
            .limit(1);

        if (!user) {
            throw new AppError('User not found', 404);
        }

        if (user.isSuspended) {
            throw new AppError('Your account has been suspended. Please contact support.', 403);
        }

        const [role] = await tx.select().from(userTypeEntity).where(eq(userTypeEntity.id, user.roleId));

        if (role?.typeName === 'Counter Staff' || role?.typeName === 'CounterSales') {
            const allowedCsbStatuses = ['CSB_APPROVED', 'CSB_ACTIVE'];
            if (!allowedCsbStatuses.includes(user.status)) {
                throw new AppError('Please wait for Retailer approval', 403);
            }
        } else {
            const allowedStatuses = ['ACTIVE', 'KYC_APPROVED'];
            if (user.status === 'TDS_CONSENT_PENDING') {
                throw new AppError('Please complete your TDS consent to start earning rewards.', 403);
            }
            if (!allowedStatuses.includes(user.status.toUpperCase())) {
                throw new AppError(`Your profile is ${user.status.toLowerCase()}. Please ensure your KYC is approved to start earning.`, 400);
            }
        }
    }

    private async checkSkuDailyLimit(tx: any, userId: number, sku: string, limit: number | null, userType: UserType) {
        if (limit === null || limit === undefined) return;

        let txnTable;
        switch (userType) {
            case 'Retailer':
                txnTable = retailerTransactions;
                break;
            case 'Electrician':
                txnTable = electricianTransactions;
                break;
            case 'Counter Staff':
            case 'CounterSales':
                txnTable = counterSalesTransactions;
                break;
            default:
                return;
        }

        const [result] = await tx.select({
            count: sql<number>`count(*)`
        })
            .from(txnTable)
            .where(
                and(
                    eq(txnTable.userId, userId),
                    eq(txnTable.sku, sku),
                    sql`DATE(${txnTable.createdAt}) = CURRENT_DATE`
                )
            );

        const todayCount = Number(result?.count || 0);

        if (todayCount >= limit) {
            throw new AppError(`Daily scan limit for SKU ${sku} reached (${limit} scans allowed)`, 400);
        }
    }

    private async logScanFailure(context: ScanContext, qrCode: string, error: any) {
        try {
            // 1. Resolve Tables
            let logTable;
            switch (context.userType) {
                case 'Retailer':
                    logTable = retailerTransactionLogs;
                    break;
                case 'Electrician':
                    logTable = electricianTransactionLogs;
                    break;
                case 'Counter Staff':
                case 'CounterSales':
                    logTable = counterSalesTransactionLogs;
                    break;
                default:
                    console.error('[EarningService] Unknown user type for scan failure log:', context.userType);
                    return;
            }

            // 2. Resolve Earning Type ID
            const [earningTypeObj] = await db.select().from(earningTypes).where(eq(earningTypes.name, 'QR Scan')).limit(1);
            const earningTypeId = earningTypeObj?.id || 1;

            const errorMessage = error instanceof Error ? error.message : String(error);

            // 3. Attempt to resolve SKU details from QR
            let sku = 'N/A';
            let category = 'N/A';
            let subcategory = 'N/A';
            let batchNumber = 'N/A';

            try {
                const [inventoryItem] = await db.select().from(InventoryModel).where(eq(InventoryModel.serialNumber, qrCode)).limit(1);
                if (inventoryItem) {
                    batchNumber = String(inventoryItem.batchId);
                    const [batch] = await db.select().from(InventoryBatch).where(eq(InventoryBatch.batchId, inventoryItem.batchId)).limit(1);

                    if (batch && batch.skuCode) {
                        sku = batch.skuCode;

                        // Resolve Category/Subcategory
                        const [variant] = await db
                            .select({
                                variantName: skuVariant.variantName,
                                entityId: skuEntity.id
                            })
                            .from(skuVariant)
                            .innerJoin(skuEntity, eq(skuEntity.id, skuVariant.skuEntityId))
                            .where(eq(skuVariant.variantName, sku))
                            .limit(1);

                        if (variant) {
                            const chain = await this.async_getSkuHierarchy(db, variant.entityId);
                            chain.forEach(entity => {
                                if (entity.levelId === 3) category = entity.name;
                                if (entity.levelId === 4) subcategory = entity.name;
                            });
                            if (!subcategory) subcategory = variant.variantName;
                        }
                    }
                }
            } catch (resolveError) {
                console.warn('[EarningService] Failed to resolve SKU details for failed scan:', resolveError);
            }

            // 4. Insert Log
            await db.insert(logTable).values({
                userId: context.userId,
                earningType: earningTypeId,
                points: '0',
                category: category,
                subcategory: subcategory,
                sku: sku,
                batchNumber: batchNumber,
                serialNumber: qrCode,
                qrCode: qrCode,
                status: 'FAILED',
                remarks: errorMessage,
                latitude: String(context.latitude || 0),
                longitude: String(context.longitude || 0),
                metadata: {
                    ...context.metadata,
                    failureReason: errorMessage,
                    stack: error instanceof Error ? error.stack : undefined
                },
            });
        } catch (logError) {
            console.error('[EarningService] Failed to log scan failure:', logError);
        }
    }
    private async validateQrCode(tx: any, qrCode: string, userType: UserType) {
        const [inventoryItem] = await tx
            .select()
            .from(InventoryModel)
            .where(eq(InventoryModel.serialNumber, qrCode))
            .limit(1);

        if (!inventoryItem) {
            throw new AppError('Invalid QR Code', 400);
        }
        if (!inventoryItem.isActive) {
            throw new AppError('QR Code inactive', 400);
        }
        if (inventoryItem.isQrScanned) {
            throw new AppError('QR already scanned', 400);
        }

        const [batch] = await tx
            .select()
            .from(InventoryBatch)
            .where(eq(InventoryBatch.batchId, inventoryItem.batchId))
            .limit(1);

        if (!batch || !batch.skuCode) {
            throw new AppError('SKU not found', 400);
        }

        if (batch.type === 'outer' && userType !== 'Retailer') {
            throw new AppError('Outer QR only for Retailer', 400);
        }
        if (batch.type === 'inner' && userType !== 'Electrician') {
            throw new AppError('Inner QR only for Electrician', 400);
        }

        return { inventoryItem, batch };
    }

    private async resolveSkuConfig(tx: any, configContext: { roleId: number }, batch: any) {
        const [config] = await tx
            .select({
                pointsPerUnit: skuPointConfig.pointsPerUnit,
                clientId: skuPointConfig.clientId,
                maxScansPerDay: skuPointConfig.maxScansPerDay,
                variantId: skuVariant.id,
                variantName: skuVariant.variantName,
                entityId: skuEntity.id,
            })
            .from(skuPointConfig)
            .innerJoin(skuVariant, eq(skuVariant.id, skuPointConfig.skuVariantId))
            .innerJoin(skuEntity, eq(skuEntity.id, skuVariant.skuEntityId))
            .where(
                and(
                    eq(skuVariant.variantName, batch.skuCode),
                    eq(skuPointConfig.userTypeId, configContext.roleId),
                    eq(skuPointConfig.isActive, true),
                    sql`(${skuPointConfig.validFrom} IS NULL OR ${skuPointConfig.validFrom} <= CURRENT_TIMESTAMP)`,
                    sql`(${skuPointConfig.validTo} IS NULL OR ${skuPointConfig.validTo} >= CURRENT_TIMESTAMP)`
                )
            )
            .limit(1);

        if (!config) {
            throw new AppError('Product not configured for user', 400);
        }

        return config;
    }

    private async calculatePointsAndMetadata(tx: any, roleId: number, config: any) {
        const chain = await this.async_getSkuHierarchy(tx, config.entityId);
        const entityHierarchy = chain.map(e => e.id);

        let category = '';
        let subcategory = '';
        const hierarchyMeta: Record<string, string> = {};

        chain.forEach(entity => {
            hierarchyMeta[`level_${entity.levelId}`] = entity.name;
            if (entity.levelId === 3) category = entity.name;
            if (entity.levelId === 4) subcategory = entity.name;
        });

        if (!subcategory) {
            subcategory = config.variantName;
        }

        let grossPoints = Number(config.pointsPerUnit);

        const overridePoints = await this.applyPointRules(tx, grossPoints, {
            clientId: config.clientId,
            roleId,
            variantId: config.variantId,
            entityHierarchy
        });

        if (overridePoints !== grossPoints) {
            console.log(`[EarningService] Point override applied: ${grossPoints} -> ${overridePoints}`);
            grossPoints = overridePoints;
        }

        return { grossPoints, category, subcategory, hierarchyMeta };
    }

    private async recordScan(tx: any, params: {
        userId: number;
        userType: UserType;
        grossPoints: number;
        netPoints: number;
        tdsAmount: number;
        category: string;
        subcategory: string;
        skuCode: string;
        batchId: number;
        qrCode: string;
        latitude: number;
        longitude: number;
        metadata: any;
    }) {
        const {
            userId, userType, grossPoints, netPoints, tdsAmount,
            category, subcategory, skuCode, batchId, qrCode,
            latitude, longitude, metadata
        } = params;

        let txnTable, logTable, ledgerTable, profileTable;

        switch (userType) {
            case 'Retailer':
                txnTable = retailerTransactions;
                logTable = retailerTransactionLogs;
                ledgerTable = retailerLedger;
                profileTable = retailers;
                break;
            case 'Electrician':
                txnTable = electricianTransactions;
                logTable = electricianTransactionLogs;
                ledgerTable = electricianLedger;
                profileTable = electricians;
                break;
            default:
                throw new AppError('Invalid user type for transaction record', 400);
        }

        const [earningType] = await tx
            .select()
            .from(earningTypes)
            .where(eq(earningTypes.name, 'QR Scan'))
            .limit(1);

        const earningTypeId = earningType?.id || 1;
        const finalMetadata = { ...metadata, grossPoints, tdsAmount };

        await tx.insert(txnTable).values({
            userId,
            earningType: earningTypeId,
            points: String(grossPoints),
            category: category,
            subcategory: subcategory,
            sku: skuCode,
            batchNumber: String(batchId),
            serialNumber: qrCode,
            qrCode,
            latitude: String(latitude),
            longitude: String(longitude),
            metadata: finalMetadata,
            schemeId: null
        });

        await tx.insert(logTable).values({
            userId,
            earningType: earningTypeId,
            points: String(grossPoints),
            category: category,
            subcategory: subcategory,
            sku: skuCode,
            batchNumber: String(batchId),
            serialNumber: qrCode,
            status: 'SUCCESS',
            qrCode,
            latitude: String(latitude),
            longitude: String(longitude),
            metadata: finalMetadata,
        });

        const { tdsRecords: tdsTable } = await import('../schema').then(m => ({ tdsRecords: m.tdsRecords }));
        const fy = new TdsDeductionConstraint().getFinancialYear();
        const [tdsRecord] = await tx
            .select({ kitty: tdsTable.tdsKitty, deducted: tdsTable.tdsDeducted })
            .from(tdsTable)
            .where(and(eq(tdsTable.userId, userId), eq(tdsTable.financialYear, fy)))
            .limit(1);

        await tx
            .update(profileTable)
            .set({
                pointsBalance: sql`${profileTable.pointsBalance} + ${grossPoints}`,
                totalEarnings: sql`${profileTable.totalEarnings} + ${grossPoints}`,
                totalBalance: sql`${profileTable.totalBalance} + ${grossPoints}`,
                redeemablePoints: sql`${profileTable.redeemablePoints} + ${netPoints}`,
                tdsKitty: tdsRecord?.kitty || '0',
                tdsDeducted: tdsRecord?.deducted || '0',
            })
            .where(eq(profileTable.userId, userId));

        const [profile] = await tx
            .select({ bal: profileTable.pointsBalance })
            .from(profileTable)
            .where(eq(profileTable.userId, userId));

        const closingBalance = Number(profile?.bal || 0);
        const openingBalance = closingBalance - netPoints;

        await tx.insert(ledgerTable).values({
            userId,
            earningType: earningTypeId,
            amount: String(netPoints),
            redemptionType: 0,
            type: 'CREDIT',
            openingBalance: String(openingBalance),
            closingBalance: String(closingBalance),
            remarks: 'QR Scan Earning',
        });

        return earningTypeId;
    }

    async scanQrWithTdsDeduction(context: ScanContext, qrCode: string) {
        const { userId, userType, latitude, longitude, metadata, roleId } = context;

        try {
            return await this.withTx(async (tx) => {
                if (userType === 'Counter Staff' || userType === 'CounterSales') {
                    throw new AppError('Counter Staff cannot scan QR codes directly. Points are awarded when associated Retailers scan.', 403);
                }

                await this.checkUserStatus(tx, userId);
                await this.checkDailyScanLimit(tx, userId, roleId, userType);

                const { inventoryItem, batch } = await this.validateQrCode(tx, qrCode, userType);
                const skuCode = batch.skuCode;

                const config = await this.resolveSkuConfig(tx, { roleId }, batch);
                await this.checkSkuDailyLimit(tx, userId, skuCode, config.maxScansPerDay, userType);

                const { grossPoints, category, subcategory, hierarchyMeta } = await this.calculatePointsAndMetadata(tx, roleId, config);
                const finalMetadata = { ...metadata, ...hierarchyMeta };

                let netPoints = grossPoints;
                let tdsAmount = 0;

                if (userType?.toLowerCase().trim() !== 'electrician') {
                    const tdsConstraint = new TdsDeductionConstraint();
                    const tdsContext = {
                        tx,
                        userId,
                        userType,
                        roleId,
                        points: grossPoints,
                        netPoints: grossPoints,
                        qr: { code: qrCode },
                        primaryScan: true,
                    };
                    netPoints = await tdsConstraint.execute(tdsContext as any);
                    tdsAmount = grossPoints - netPoints;
                }

                await tx
                    .update(InventoryModel)
                    .set({ isQrScanned: true })
                    .where(eq(InventoryModel.inventoryId, inventoryItem.inventoryId));

                const earningTypeId = await this.recordScan(tx, {
                    userId,
                    userType,
                    grossPoints,
                    netPoints,
                    tdsAmount,
                    category,
                    subcategory,
                    skuCode,
                    batchId: inventoryItem.batchId,
                    qrCode,
                    latitude,
                    longitude,
                    metadata: finalMetadata
                });

                if (userType === 'Retailer') {
                    await this.distributeCounterStaffBonus({
                        tx,
                        userId,
                        skuCode,
                        earningTypeId,
                        metadata: finalMetadata,
                        latitude,
                        longitude,
                        batchId: inventoryItem.batchId,
                        qrCode,
                        category,
                        subcategory
                    });
                }

                return {
                    success: true,
                    grossPoints,
                    netPoints,
                    tdsDeducted: tdsAmount,
                };
            });
        } catch (error) {
            await this.logScanFailure(context, qrCode, error);
            throw error;
        }
    }


    private async distributeCounterStaffBonus(params: {
        tx: any,
        userId: number,
        skuCode: string,
        earningTypeId: number,
        metadata: any,
        latitude: number,
        longitude: number,
        batchId: number,
        qrCode: string,
        category: string,
        subcategory: string
    }) {
        const { tx, userId, skuCode, earningTypeId, metadata, latitude, longitude, batchId, qrCode, category, subcategory } = params;

        try {
            // 1. Fetch mapped counter sales users from userAssociations
            const mappedUsers = await tx
                .select({
                    userId: userAssociations.childUserId,
                })
                .from(userAssociations)
                .where(
                    and(
                        eq(userAssociations.parentUserId, userId),
                        eq(userAssociations.associationType, 'counter_staff_to_retailer'),
                        eq(userAssociations.status, 'CSB_ACTIVE')
                    )
                );

            if (mappedUsers.length > 0) {
                // 2. Fetch Counter Staff Role ID
                const [csRole] = await tx
                    .select({ id: userTypeEntity.id })
                    .from(userTypeEntity)
                    .where(eq(userTypeEntity.typeName, 'Counter Staff'))
                    .limit(1);

                if (csRole) {
                    // 3. Fetch CS Point Config
                    const [csConfig] = await tx
                        .select({
                            pointsPerUnit: skuPointConfig.pointsPerUnit,
                        })
                        .from(skuPointConfig)
                        .innerJoin(skuVariant, eq(skuVariant.id, skuPointConfig.skuVariantId))
                        .where(
                            and(
                                eq(skuVariant.variantName, skuCode),
                                eq(skuPointConfig.userTypeId, csRole.id)
                            )
                        )
                        .limit(1);

                    if (csConfig) {
                        const totalCSPoints = Number(csConfig.pointsPerUnit);
                        const pointsPerUser = totalCSPoints / mappedUsers.length;
                        const pointsPerUserFixed = Number(pointsPerUser.toFixed(2));

                        if (pointsPerUserFixed > 0) {
                            const tdsConstraint = new TdsDeductionConstraint();

                            for (const buser of mappedUsers) {
                                // Calculate TDS
                                const tdsContext = {
                                    tx,
                                    userId: buser.userId,
                                    userType: 'Counter Staff' as UserType,
                                    roleId: csRole.id,
                                    points: pointsPerUserFixed,
                                    netPoints: pointsPerUserFixed,
                                    qr: { code: qrCode },
                                    primaryScan: false, // Bonus distribution
                                };

                                let netPoints = await tdsConstraint.execute(tdsContext as any);
                                const tdsAmount = pointsPerUserFixed - netPoints;

                                // A. Insert Transaction
                                await tx.insert(counterSalesTransactions).values({
                                    userId: buser.userId,
                                    earningType: earningTypeId,
                                    points: String(pointsPerUserFixed),
                                    category: category,
                                    subcategory: subcategory,
                                    sku: skuCode,
                                    batchNumber: String(batchId),
                                    serialNumber: qrCode,
                                    qrCode: qrCode,
                                    latitude: String(latitude),
                                    longitude: String(longitude),
                                    metadata: { ...metadata, source: 'Retailer Scan Bonus', retailerId: userId, grossPoints: pointsPerUserFixed, tdsAmount },
                                    schemeId: null
                                });

                                // B. Insert Log
                                await tx.insert(counterSalesTransactionLogs).values({
                                    userId: buser.userId,
                                    earningType: earningTypeId,
                                    points: String(pointsPerUserFixed),
                                    category, subcategory, sku: skuCode,
                                    batchNumber: String(batchId),
                                    serialNumber: qrCode,
                                    status: 'SUCCESS',
                                    qrCode,
                                    latitude: String(latitude),
                                    longitude: String(longitude),
                                    metadata: { ...metadata, source: 'Retailer Scan Bonus', retailerId: userId, grossPoints: pointsPerUserFixed, tdsAmount }
                                });

                                // A. Insert Transaction
                                // Fetch latest TDS for CS user
                                const fyCs = new TdsDeductionConstraint().getFinancialYear();
                                const [tdsRecordCs] = await tx
                                    .select({ kitty: tdsRecords.tdsKitty, deducted: tdsRecords.tdsDeducted })
                                    .from(tdsRecords)
                                    .where(and(eq(tdsRecords.userId, buser.userId), eq(tdsRecords.financialYear, fyCs)))
                                    .limit(1);

                                const [updatedUser] = await tx.update(counterSales)
                                    .set({
                                        pointsBalance: sql`${counterSales.pointsBalance} + ${pointsPerUserFixed}`,
                                        totalEarnings: sql`${counterSales.totalEarnings} + ${pointsPerUserFixed}`,
                                        totalBalance: sql`${counterSales.totalBalance} + ${pointsPerUserFixed}`,
                                        redeemablePoints: sql`${counterSales.redeemablePoints} + ${netPoints}`,
                                        tdsKitty: tdsRecordCs?.kitty || '0',
                                        tdsDeducted: tdsRecordCs?.deducted || '0',
                                    })
                                    .where(eq(counterSales.userId, buser.userId))
                                    .returning({ pointsBalance: counterSales.pointsBalance });

                                const closingBalance = Number(updatedUser?.pointsBalance || 0);
                                const openingBalance = closingBalance - netPoints;

                                // D. Ledger
                                await tx.insert(counterSalesLedger).values({
                                    userId: buser.userId,
                                    earningType: earningTypeId,
                                    amount: String(netPoints),
                                    redemptionType: 0,
                                    type: 'CREDIT',
                                    openingBalance: String(openingBalance),
                                    closingBalance: String(closingBalance),
                                    remarks: 'Retailer Scan Bonus',
                                });

                                // 🔔 NOTIFY COUNTER STAFF (In-App)
                                await inAppNotificationService.createNotification({
                                    userId: buser.userId,
                                    title: 'Bonus Points Received! 🎁',
                                    body: `Retailer scan bonus: You recieved ${pointsPerUserFixed} points.`,
                                    category: 'SCAN',
                                    metadata: {
                                        source: 'Retailer Bonus',
                                        points: pointsPerUserFixed,
                                        retailerId: userId
                                    }
                                });

                                // 📲 PUSH NOTIFICATION via Event Bus
                                await emit('EARNING_SCAN', {
                                    userId: buser.userId,
                                    metadata: { points: pointsPerUserFixed, source: 'Retailer Bonus' }
                                }).catch(e => console.error(`[EarningService] CS Bonus emit failed:`, e));
                            }
                        }
                    } else {
                        console.log(`[CSB_DISTRIBUTION] No SKU point config found for SKU: ${skuCode} and RoleID: ${csRole.id}`);
                    }
                } else {
                    console.log(`[CSB_DISTRIBUTION] Role 'Counter Staff' not found in system (DB role check).`);
                }
            } else {
                console.log(`[CSB_DISTRIBUTION] No associated Counter Staff found for Retailer ID: ${userId} with status CSB_ACTIVE or CSB_APPROVED`);
            }
        } catch (error) {
            console.error("Error distributing CS points:", error);
            throw error;
        }
    }

    private async applyPointRules(
        tx: any,
        basePoints: number,
        context: {
            clientId: number;
            roleId: number;
            variantId: number;
            entityHierarchy: number[];
            locationEntityId?: number;
        }
    ): Promise<number> {
        const { clientId, roleId, variantId, entityHierarchy } = context;

        // Fetch active rules that match our context, ordered by priority
        const rules = await tx
            .select()
            .from(skuPointRules)
            .where(
                and(
                    eq(skuPointRules.isActive, true),
                    eq(skuPointRules.clientId, clientId),
                    or(
                        eq(skuPointRules.skuVariantId, variantId),
                        inArray(skuPointRules.skuEntityId, entityHierarchy),
                        eq(skuPointRules.userTypeId, roleId)
                    ),
                    sql`(${skuPointRules.validFrom} IS NULL OR ${skuPointRules.validFrom} <= CURRENT_TIMESTAMP)`,
                    sql`(${skuPointRules.validTo} IS NULL OR ${skuPointRules.validTo} >= CURRENT_TIMESTAMP)`
                )
            )
            .orderBy(desc(skuPointRules.priority));

        if (rules.length === 0) return basePoints;

        // Apply highest priority rule
        const rule = rules[0];
        if (rule.actionType === 'fixed') {
            return Number(rule.actionValue);
        } else if (rule.actionType === 'percentage') {
            return basePoints * (1 + Number(rule.actionValue) / 100);
        }

        return basePoints;
    }

    private async async_getSkuHierarchy(tx: any, startEntityId: number): Promise<{ id: number; name: string; levelId: number }[]> {
        const chain: { id: number; name: string; levelId: number }[] = [];
        let currentEntityId: number | null = startEntityId;

        while (currentEntityId) {
            const [entity] = await tx.select({
                id: skuEntity.id,
                name: skuEntity.name,
                levelId: skuEntity.levelId,
                parentEntityId: skuEntity.parentEntityId
            }).from(skuEntity).where(eq(skuEntity.id, currentEntityId)).limit(1);

            if (!entity) break;

            chain.push({
                id: entity.id,
                name: entity.name,
                levelId: entity.levelId
            });

            currentEntityId = entity.parentEntityId;
        }

        return chain;
    }
}

export const earningService = new EarningService();
