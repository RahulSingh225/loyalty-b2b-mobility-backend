import { BaseService } from './baseService';
import {
    users,
    retailers,
    electricians,
    counterSales,
    onboardingTypes,
    userTypeEntity,
    approvalStatuses
} from '../schema';
import { eq, sql } from 'drizzle-orm';
import db from '../config/db';
import { AppError } from '../middlewares/errorHandler';
// import { generateUniqueReferralCode } from '../utils/referralCode';
import { hashPassword } from '../utils/password';
import { OnboardingInputSchema, OnboardingInput } from '../middlewares/zod';
import { EarningCreditService } from "./earningcredit";
import { earningTypes } from "../schema";
import { APPROVAL_STATUS } from '../utils/approvalStatus';

export class OnboardingService extends BaseService<typeof users> {
    constructor() {
        super(users, OnboardingInputSchema); // Validation handled manually or by BaseService if we passed full schema
    }

    async registerUser(data: OnboardingInput) {
        // 1. Validate input
        const parsed: OnboardingInput = OnboardingInputSchema.parse(data);

        return this.withTx(async (tx) => {
            try {
                // 2. Validate referral code if provided and get referrer ID
                let referrerId: number | undefined = undefined;
                if (parsed.referralCode) {
                    const [referrer] = await tx.select().from(users).where(eq(users.referralCode, parsed.referralCode));
                    if (!referrer) {
                        throw new AppError('Invalid referral code', 400);
                    }

                    // Check if referrer has reached max referrals
                    const [referrerRole] = await tx.select().from(userTypeEntity).where(eq(userTypeEntity.id, referrer.roleId));
                    if (referrerRole && referrerRole.maxReferrals !== null) {
                        const [referralCount] = await tx.select({ count: sql<number>`count(*)` })
                            .from(users)
                            .where(eq(users.referrerId, referrer.id));

                        if (Number(referralCount.count) >= referrerRole.maxReferrals) {
                            throw new AppError('Referral limit reached for this code', 400);
                        }
                    }

                    referrerId = referrer.id;
                }

                // 3. Resolve Foreign Keys (Ids)

                // Resolve User Type ID
                // Map 'retailer' -> 'Retailer', etc. or assume DB has strict casing. 
                // I'll assume DB has 'Retailer', 'Electrician', 'Counter Staff' or similar. 
                // Ideally we fetch these from a cache, but for now query DB.
                // We map our strict enum to DB values.
                const typeMap: Record<string, string> = {
                    'retailer': 'Retailer',
                    'electrician': 'Electrician',
                    'counter_staff': 'Counter Staff'
                };
                const dbUserTypeName = typeMap[parsed.userType];

                const [userType] = await tx.select().from(userTypeEntity).where(eq(userTypeEntity.typeName, dbUserTypeName));
                if (!userType) throw new Error(`Invalid user type configuration: ${dbUserTypeName}`);

                // Resolve Onboarding Type ID
                const [onboardingType] = await tx.select().from(onboardingTypes).where(eq(onboardingTypes.name, parsed.onboardingType));
                const onboardingTypeId: number = onboardingType?.id || 1; // Fallback to 1 if not found ? Or throw.

                // Default Approval Status (ONBOARDED)
                const [onboardedStatus] = await tx.select().from(approvalStatuses).where(eq(approvalStatuses.name, APPROVAL_STATUS.ONBOARDED));
                const approvalStatusId: number = onboardedStatus?.id || 1;

                // Generate unique referral code for the new user
                // const referralCode = await generateUniqueReferralCode();

                // Hash the password before storing
                const hashedPassword: string = await hashPassword(parsed.password);

                // 3. Create User in `users` table
                const [newUser] = await tx.insert(users).values({
                    name: parsed.name,
                    phone: parsed.phone,
                    email: parsed.email,
                    password: hashedPassword,
                    roleId: userType.id,
                    onboardingTypeId: onboardingTypeId,
                    approvalStatusId: approvalStatusId,
                    address: parsed.address,
                    city: parsed.city,
                    district: parsed.district,
                    state: parsed.state,
                    referrerId: referrerId,
                    // referralCode: referralCode, // Skipped for now
                    // Defaulting language to 1 (English) for now
                    languageId: 1,
                }).returning();

                // 4. Create Role Specific Entry
                const uniqueId: string = await this.generateUniqueId(parsed.userType); // Helper implementation needed

                if (parsed.userType === 'retailer') {
                    await tx.insert(retailers).values({
                        userId: newUser.id,
                        name: parsed.shopName || parsed.name || '', // Retailer often uses Shop Name
                        phone: parsed.phone,
                        uniqueId: uniqueId,
                        aadhaar: parsed.aadhaar || '', // Schema says Not Null, so provide empty or handle error
                        onboardingTypeId: onboardingTypeId,
                        // map other fields...
                        pan: parsed.pan,
                        gst: parsed.gst,
                        sapCustomerCode: parsed.sapCustomerCode,
                        tdsPercentage: 20
                    });
                } else if (parsed.userType === 'electrician') {
                    await tx.insert(electricians).values({
                        userId: newUser.id,
                        name: parsed.name,
                        phone: parsed.phone,
                        uniqueId: uniqueId,
                        aadhaar: parsed.aadhaar || '',
                        onboardingTypeId: onboardingTypeId,
                        electricianCertificate: parsed.electricianCertificate,
                        tdsPercentage: 20
                        // map others
                    });
                } else if (parsed.userType === 'counter_staff') {
                    await tx.insert(counterSales).values({
                        userId: newUser.id,
                        name: parsed.name,
                        phone: parsed.phone,
                        uniqueId: uniqueId,
                        aadhaar: parsed.aadhaar || '',
                        onboardingTypeId: onboardingTypeId,
                        attachedRetailerId: parsed.attachedRetailerId,
                        tdsPercentage: 20
                        // map others
                    });
                }

                // 5. Trigger Registration Bonus
                try {
                    const bonusPoints = 100;

                    // Ensure registration bonus earning type exists
                    // let [regEarningType] = await tx.select().from(earningTypes).where(eq(earningTypes.name, 'Registration Bonus')).limit(1);
                    // if (!regEarningType) {
                    //     await tx.insert(earningTypes).values({
                    //         name: 'Registration Bonus',
                    //         description: 'Welcome bonus for new registration'
                    //     });
                    // }

                    // await EarningCreditService.credit(tx, newUser.id, dbUserTypeName as any, bonusPoints, {
                    //     earningTypeName: 'Registration Bonus',
                    //     remarks: 'Welcome bonus for registration',
                    // });
                } catch (e) {
                    console.error('Failed to award registration bonus in onboarding service:', e);
                }

                return newUser;
            } catch (error: any) {
                if (error?.cause?.code === '23505') {
                    if (error.cause.constraint === 'users_phone_key') {
                        throw new AppError('Phone number already registered', 409);
                    }
                    if (error.cause.constraint === 'users_email_unique_not_null') {
                        throw new AppError('Email already registered', 409);
                    }
                }

                throw error; // rethrow unknown errors
            }
        });
    }

    // Simple unique ID generator stub
    private async generateUniqueId(prefix: string): Promise<string> {
        // In a real app, use a sequence or UUID or custom logic
        return `${prefix.toUpperCase().substring(0, 3)}-${Date.now()}`;
    }
}

export const onboardingService = new OnboardingService();
