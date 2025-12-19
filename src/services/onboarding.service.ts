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
import { z } from 'zod';
import db from '../config/db';

export const OnboardingInputSchema = z.object({
    name: z.string().min(1),
    phone: z.string().min(10),
    email: z.string().email().optional(),
    userType: z.enum(['retailer', 'electrician', 'counter_staff']),
    onboardingType: z.enum(['self', 'admin', 'api']).default('self'),

    // Common optional fields
    aadhaar: z.string().optional(),
    pan: z.string().optional(),
    gst: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    district: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    dob: z.string().optional(), // ISO date string
    referralCode: z.string().optional(),

    // Specific fields
    shopName: z.string().optional(), // For Retailer/Counter
    electricianCertificate: z.string().optional(), // For Electrician
    attachedRetailerId: z.number().optional(), // For Counter Staff

    // External
    sapCustomerCode: z.string().optional(),
});

export type OnboardingInput = z.infer<typeof OnboardingInputSchema>;

export class OnboardingService extends BaseService<typeof users> {
    constructor() {
        super(users, OnboardingInputSchema); // Validation handled manually or by BaseService if we passed full schema
    }

    async registerUser(data: OnboardingInput) {
        // 1. Validate input
        const parsed = OnboardingInputSchema.parse(data);

        return this.withTx(async (tx) => {
            // 2. Resolve Foreign Keys (Ids)

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
            const onboardingTypeId = onboardingType?.id || 1; // Fallback to 1 if not found ? Or throw.

            // Default Approval Status (Pending)
            const [pendingStatus] = await tx.select().from(approvalStatuses).where(eq(approvalStatuses.name, 'Pending'));
            const approvalStatusId = pendingStatus?.id || 1;

            // 3. Create User in `users` table
            const [newUser] = await tx.insert(users).values({
                name: parsed.name,
                phone: parsed.phone,
                email: parsed.email,
                roleId: userType.id,
                onboardingTypeId: onboardingTypeId,
                approvalStatusId: approvalStatusId,
                referralCode: parsed.referralCode, // This might need collision check or generation
                address: parsed.address,
                city: parsed.city,
                district: parsed.district,
                state: parsed.state,
                // Defaulting language to 1 (English) for now
                languageId: 1,
            }).returning();

            // 4. Create Role Specific Entry
            const uniqueId = await this.generateUniqueId(parsed.userType); // Helper implementation needed

            if (parsed.userType === 'retailer') {
                await tx.insert(retailers).values({
                    userId: newUser.id,
                    name: parsed.shopName || parsed.name, // Retailer often uses Shop Name
                    phone: parsed.phone,
                    uniqueId: uniqueId,
                    aadhaar: parsed.aadhaar || '', // Schema says Not Null, so provide empty or handle error
                    onboardingTypeId: onboardingTypeId,
                    // map other fields...
                    pan: parsed.pan,
                    gst: parsed.gst,
                    sapCustomerCode: parsed.sapCustomerCode,
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
                    // map others
                });
            }

            return newUser;
        });
    }

    // Simple unique ID generator stub
    private async generateUniqueId(prefix: string): Promise<string> {
        // In a real app, use a sequence or UUID or custom logic
        return `${prefix.toUpperCase().substring(0, 3)}-${Date.now()}`;
    }
}

export const onboardingService = new OnboardingService();
