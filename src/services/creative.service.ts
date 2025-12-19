import { BaseService, PaginationOptions } from './baseService';
import db from '../config/db';
import { creatives, users, retailers, electricians, counterSales, locationEntity, skuEntity } from '../schema';
import { eq, and, sql, desc, lte, gte, or, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { AppError } from '../middlewares/errorHandler';

/* 
 * ----------------------------------------------------------------------
 * SAMPLE TARGET AUDIENCE JSON
 * ----------------------------------------------------------------------
 * {
 *   "userTypes": ["Retailer", "Electrician"], // Optional: Filter by Role Name
 *   "locations": [
 *      { "levelId": 1, "entityId": 10 }, // e.g. State Level (1), State ID (10) - Maharashtra
 *      { "levelId": 2, "entityId": 50 }  // e.g. City Level (2), City ID (50) - Mumbai
 *   ],
 *   "products": [
 *      { "levelId": 3, "entityId": 100 } // e.g. SKU Entity ID
 *   ]
 * }
 * 
 * LOGIC:
 * - User matches if they belong to ANY of the specified Locations (or their children).
 * - "Parent allows Child": If Target is State (Parent), User in City (Child) matches.
 * - "Child allows Parent": (Less common) If Target is City, User in State DOES NOT match (User is too broad).
 * - Requirement: "if target audience has parent also, allow them to pass" -> Implies Containment.
 * 
 * ----------------------------------------------------------------------
 */

// Target Audience Schema
const TargetAudienceSchema = z.object({
    userTypes: z.array(z.string()).optional(),
    locations: z.array(z.object({
        levelId: z.number(),
        entityId: z.number()
    })).optional(),
    products: z.array(z.object({
        levelId: z.number(),
        entityId: z.number()
    })).optional()
});

type TargetAudience = z.infer<typeof TargetAudienceSchema>;

interface UserContext {
    userId: number;
    role: string;
    locationIds: number[]; // Array of Entity IDs in the user's hierarchy (e.g. [StateID, CityID])
}

export class CreativeService extends BaseService<typeof creatives> {
    constructor() {
        super(creatives);
    }

    /**
     * Helper to build User Context from DB.
     * Fetches Role and resolves Location Hierarchy IDs.
     */
    async buildUserContext(userId: number, roleId: number): Promise<UserContext> {
        const context: UserContext = { userId, role: 'Unknown', locationIds: [] };

        // 1. Fetch Profile
        // We assume profiles store generic location references or we look up keys.
        // Current schema has `state`, `district`, `city` text columns in retailer/electrician tables.
        // To match ID-based Target Audience, we must resolve these Names to Entity IDs.

        let profileLocation = { state: '', district: '', city: '' };

        const [retailer] = await db.select().from(retailers).where(eq(retailers.userId, userId)).limit(1);
        if (retailer) {
            context.role = 'Retailer';
            profileLocation = { state: retailer.state || '', district: retailer.district || '', city: retailer.city || '' };
        } else {
            const [electrician] = await db.select().from(electricians).where(eq(electricians.userId, userId)).limit(1);
            if (electrician) {
                context.role = 'Electrician';
                profileLocation = { state: electrician.state || '', district: electrician.district || '', city: electrician.city || '' };
            } else {
                const [counter] = await db.select().from(counterSales).where(eq(counterSales.userId, userId)).limit(1);
                if (counter) {
                    context.role = 'Counter Staff';
                    profileLocation = { state: counter.state || '', district: counter.district || '', city: counter.city || '' };
                }
            }
        }

        // 2. Resolve Text Locations to IDs
        // We search `locationEntity` for case-insensitive matches.
        // Optimize: This could be heavy. Ideally profiles store IDs.
        // For now, we resolve concurrently.

        const locationNames = [profileLocation.state, profileLocation.district, profileLocation.city].filter(Boolean);

        if (locationNames.length > 0) {
            const entities = await db.select({ id: locationEntity.id })
                .from(locationEntity)
                .where(inArray(locationEntity.name, locationNames)); // Exact match for speed

            context.locationIds = entities.map(e => e.id);

            // Note: Hierarchy Logic
            // If User has City ID, do we implicitly have State ID? 
            // Database hierarchy (parentEntityId) exists.
            // If User is in City (Child), they are ALSO in State (Parent).
            // So if Target is State, User (City) matches.
            // To support this, we should fetch PARENTS of the user's location IDs.

            if (context.locationIds.length > 0) {
                const parents = await db.select({ parentId: locationEntity.parentEntityId })
                    .from(locationEntity)
                    .where(inArray(locationEntity.id, context.locationIds));

                const parentIds = parents.map(p => p.parentId).filter((id): id is number => id !== null);
                context.locationIds.push(...parentIds);
            }
        }

        return context;
    }

    async listCreativesForUser(userId: number, roleId: number) {
        const context = await this.buildUserContext(userId, roleId);
        const now = new Date().toISOString();

        const potentialCreatives = await db.select().from(creatives).where(
            and(
                eq(creatives.isActive, true),
                or(
                    sql`${creatives.startDate} IS NULL`,
                    lte(creatives.startDate, now)
                ),
                or(
                    sql`${creatives.endDate} IS NULL`,
                    gte(creatives.endDate, now)
                )
            )
        ).orderBy(desc(creatives.displayOrder));

        // Filter Engine
        return potentialCreatives.filter(c => {
            const audience = c.targetAudience as TargetAudience;
            if (!audience || Object.keys(audience).length === 0) return true;

            // A. User Type Check
            if (audience.userTypes && audience.userTypes.length > 0) {
                if (!audience.userTypes.includes(context.role)) return false;
            }

            // B. Location Check (ID & Hierarchy)
            if (audience.locations && audience.locations.length > 0) {
                // User Matches if ANY of their LocationContext IDs match ANY of the Target IDs.
                // Context.locationIds includes the User's City AND its Parent State.
                // So if Target is State (Parent), it will match the User's "Parent State ID".
                // If Target is City (Child), it will match the User's "City ID".

                const hasMatch = audience.locations.some(targetLoc =>
                    context.locationIds.includes(targetLoc.entityId)
                );

                if (!hasMatch) return false;
            }

            // C. Product Check (Placeholder)
            // Similar logic: Check if User has access to SKU Entity IDs.

            return true;
        });
    }
}

export const creativeService = new CreativeService();
