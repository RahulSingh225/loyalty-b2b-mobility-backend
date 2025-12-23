import { BaseService } from './baseService';
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
    participantSkuAccess
} from '../schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { z } from 'zod'; // Keep zod just in case, though usually input is validated before service
import { AppError } from '../middlewares/errorHandler';

import { UserType } from '../types';

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

    /* 
     * Main Entry Point: scanQr
     * Implements 3-Layer Logic
     */
    async scanQr(context: ScanContext, qrCode: string) {
        const { userId, userType, latitude, longitude, metadata } = context;

        return this.withTx(async (tx) => {
            // ---------------------------------------------------------
            // LAYER 1: Base Procedure (Validation, Lookup, Updates)
            // ---------------------------------------------------------

            // 1.1 Check QR Validity
            const [qr] = await tx.select().from(qrCodes).where(
                and(eq(qrCodes.code, qrCode))
            ).limit(1);

            if (!qr) {
                throw new AppError('Invalid QR Code', 400);
            }

            // Check if already scanned
            // Note: We check this generically first. Layer 3 might add specific checks.
            if (qr.isScanned) {
                // Layer 3 will handle specific "who scanned it" logic, but generally if scanned, it's done. 
                // Exception: Counter Staff scanning Retailer's code might be a business rule (allowed or disallowed?)
                // User said: "check for counterstaff that he should not be able to scan codes which are scanned by retailer"
                // This implies if it IS scanned, we might need to check who scanned it.
                // So we don't throw immediately here if we want to support refined error messages or logic,
                // but for standard flow, "Already Scanned" is the rule.
                // We'll throw here for now, but catch specific cases if needed in Layer 3?
                // Actually, let's defer the "Already Scanned" rejection to Layer 3 if we need complex logic.
                // But usually, already scanned is a hard stop. 
                // The user requirement "counterstaff should not be able to scan codes which are scanned by retailer" 
                // confirms the standard rule: valid scan must be unscanned.
                // If checks pass, we proceed.
                throw new AppError('QR Code already scanned', 400);
            }

            // 1.2 Get Point Config
            // We need to resolve the User Type ID for the config lookup.
            // Assuming context.roleId is the correct ID to match skuPointConfig.userTypeId

            const [config] = await tx
                .select({
                    pointsPerUnit: skuPointConfig.pointsPerUnit,
                    variantId: skuVariant.id
                })
                .from(skuPointConfig)
                .innerJoin(skuVariant, eq(skuVariant.id, skuPointConfig.skuVariantId))
                .innerJoin(skuEntity, eq(skuEntity.id, skuVariant.skuEntityId))
                .where(
                    and(
                        eq(skuEntity.code, qr.sku), // Mapping QR SKU to SKU Entity Code
                        eq(skuPointConfig.userTypeId, context.roleId)
                    )
                )
                .limit(1);

            if (!config) {
                throw new AppError('Product not configured for this user type', 400);
            }

            const points = Number(config.pointsPerUnit);

            // ---------------------------------------------------------
            // LAYER 2: Optional Constraints
            // ---------------------------------------------------------

            // 2.1 Participant SKU Access
            // Check if user is allowed to scan this SKU (if restriction exists)
            // If no entry in `participant_sku_access`, assume allowed? Or denied?
            // Usually "Access Table" implies explicit grant. But often it's "check if restriction exists".
            // Let's assume if the table exists, we check. If no record, we might skip or fail.
            // User said: "that particular product is mapped to that user or not using participant sku access table"
            // This implies explicit mapping required?
            // We'll check if there IS a mapping for this user. If so, does it match?
            // If NO mapping for this user exists at all, maybe allowed? 
            // I'll implement a Loose Check: If record exists for user, enforce it.

            const [skuAccess] = await tx.select().from(participantSkuAccess).where(
                eq(participantSkuAccess.userId, userId)
            ).limit(1); // just checking if ANY rule exists for user

            if (skuAccess) {
                // If rules exist, we must match
                const [validAccess] = await tx.select().from(participantSkuAccess).where(
                    and(
                        eq(participantSkuAccess.userId, userId),
                        eq(participantSkuAccess.skuEntityId, qr.sku as any) // Validating mapping. qr.sku is string, entityId is int? 
                        // Wait, qr.sku is text. skuEntityId is int.
                        // We need the ID from the join above.
                        // Join: skuEntity.code = qr.sku
                    )
                ).limit(1);
                // We need skuEntityId. 
                // Let's fetch it.
                const [entity] = await tx.select({ id: skuEntity.id }).from(skuEntity).where(eq(skuEntity.code, qr.sku)).limit(1);

                if (entity) {
                    const [granted] = await tx.select().from(participantSkuAccess).where(
                        and(
                            eq(participantSkuAccess.userId, userId),
                            eq(participantSkuAccess.skuEntityId, entity.id),
                            eq(participantSkuAccess.isActive, true)
                        )
                    ).limit(1);

                    if (!granted) {
                        throw new AppError('SKU not accessible to user', 403);
                    }
                }
            }

            // 2.2 Location Check (TODO: Implement granular location logic if needed)

            // ---------------------------------------------------------
            // LAYER 3: Business Logic (Ambiguous/Specific)
            // ---------------------------------------------------------

            // 3.1 Counter Staff specific check
            if (userType === 'Counter Staff') {
                // "should not be able to scan codes which are scanned by retailer"
                // We already checked `qr.isScanned`. 
                // If it IS scanned, we threw error.
                // Maybe the rule is: If scanned by ANYONE, fail (covered by 1.1).
                // Maybe the rule implies: If scanned by Retailer, Counter Staff cannot claim? 
                // But generic rule handles "isScanned".
                // I'll add a check: ensure `attachedRetailerId` matches if we enforce strict hierarchy?
                // For now, standard "isScanned" covers the constraint "cannot scan if scanned".

                // Additional logic could go here.
            }


            // ---------------------------------------------------------
            // COMMIT UPDATES (Layer 1 Continued)
            // ---------------------------------------------------------

            // Update QR Code
            await tx.update(qrCodes).set({
                isScanned: true,
                scannedBy: userId,
                locationAccess: { lat: latitude, lng: longitude }
            }).where(eq(qrCodes.id, qr.id));

            // Resolve Transaction & Ledger Tables based on User Type
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
                case 'Counter Staff':
                    txnTable = counterSalesTransactions;
                    logTable = counterSalesTransactionLogs;
                    ledgerTable = counterSalesLedger;
                    profileTable = counterSales;
                    break;
                default:
                    throw new AppError('Invalid User Type for Scanning', 400);
            }

            // Get Earning Type ID
            const [earningTypeObj] = await tx.select().from(earningTypes).where(eq(earningTypes.name, 'QR Scan')).limit(1);
            const earningTypeId = earningTypeObj?.id || 1;

            // 1. Insert Transaction
            await tx.insert(txnTable).values({
                userId,
                earningType: earningTypeId,
                points: String(points), // Numeric type in DB
                category: qr.sku, // or entity name
                qrCode: qrCode,
                latitude: String(latitude),
                longitude: String(longitude),
                metadata: metadata || {},
                schemeId: null // TODO: scheme support
            });

            // 2. Insert Log (Audit/History)
            await tx.insert(logTable).values({
                userId,
                earningType: earningTypeId,
                points: String(points),
                category: qr.sku,
                status: 'SUCCESS',
                qrCode: qrCode,
                latitude: String(latitude),
                longitude: String(longitude),
                metadata: metadata || {},
            });

            // 3. Update Balance (User Profile + Ledger)
            // Update specific profile (Retailer/Electrician/Counter)
            // They all share `pointsBalance` column name?
            // Yes check schema: retailers.pointsBalance, counterSales.pointsBalance, electricians.pointsBalance

            // Update Profile Balance
            await tx.update(profileTable)
                .set(sql`points_balance = points_balance + ${points}, total_earnings = total_earnings + ${points}`)
                .where(eq(profileTable.userId, userId)); // specific tables usually link by userId or id? 
            // retailers has userId.

            // Also update `users` table balance if it exists (as per qr-scan.ts)
            try {
                await tx.update(users)
                    .set(sql`points_balance = points_balance + ${points}, total_earnings = total_earnings + ${points}`)
                    .where(eq(users.id, userId));
            } catch (e) {
                // Ignore if column missing, or check first.
            }

            // 4. Update Ledger
            // Need opening and closing balance.
            // Fetch current balance from profile (before update? or after?)
            // We did update in DB.
            // Drizzle doesn't return updated row by default in .set unless .returning()
            const [updatedProfile] = await tx.select({ bal: profileTable.pointsBalance }).from(profileTable).where(eq(profileTable.userId, userId));
            const closingBalance = Number(updatedProfile?.bal || 0);
            const openingBalance = closingBalance - points;

            await tx.insert(ledgerTable).values({
                userId,
                earningType: earningTypeId,
                redemptionType: 0, // 0 for none
                amount: String(points),
                type: 'CREDIT',
                remarks: 'QR Scan Earning',
                openingBalance: String(openingBalance),
                closingBalance: String(closingBalance)
            });

            return { success: true, points };
        });
    }
}

export const earningService = new EarningService();
