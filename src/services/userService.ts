import { BaseService } from './baseService';
import { referrals, users, userAssociations, counterSales, retailers, electricians } from '../schema';
import { emit } from '../mq/mqService';
import { z } from 'zod';
import { db } from '../config/db';
import { eq, aliasedTable, desc, count, or } from 'drizzle-orm';
import { AppError } from '../middlewares/errorHandler';
import { APPROVAL_STATUS } from '../utils/approvalStatus';

interface ProfileUpdateInput {
  addressLine1?: string;
  addressLine2?: string;
  pincode?: string;
  name?: string;
  email?: string;
  profilePhotoUrl?: string;
  shopName?: string; // For Retailer usertype
  [key: string]: any;
}

const userZ = z.object({
  roleId: z.number(),
  name: z.string(),
  phone: z.string(),
  email: z.string().optional(),
});

class UserService extends BaseService<typeof users> {
  private async logEvent(userId: number, eventCode: string, entityId?: string | number, extraMetadata?: any) {
    try {
      await emit(eventCode, {
        userId,
        entityId,
        metadata: extraMetadata || {},
      });
    } catch (error) {
      console.error(`[UserService] Failed to emit event ${eventCode}:`, error);
    }
  }

  /**
   * Get referrals history for a user
   * @param userId User ID to get referrals for
   * @param opts Pagination options
   */
  async getReferralsHistory(userId: number, opts: { page: number; pageSize: number; }) {
    const { page, pageSize } = opts;
    const offset = (page - 1) * pageSize;

    const referredUser = aliasedTable(users, 'referred_user');
    const referrerUser = aliasedTable(users, 'referrer_user');

    const query = db
      .select({
        id: referrals.id,
        //status: referrals.status,
        bonusAwarded: referrals.bonusAwarded,
        createdAt: referrals.createdAt,
        //referrerId: referrals.referrerId,
        referrerName: referrerUser.name,
        //referrerPhone: referrerUser.phone,
        //referredId: referrals.referredId,
        referredName: referredUser.name,
        //referredPhone: referredUser.phone,
        //referredProfilePhotoUrl: referredUser.profilePhotoUrl,
      })
      .from(referrals)
      .leftJoin(referrerUser, eq(referrals.referrerId, referrerUser.id))
      .leftJoin(referredUser, eq(referrals.referredId, referredUser.id))
      .where(eq(referrals.referrerId, userId))
      .orderBy(desc(referrals.createdAt))
      .limit(pageSize)
      .offset(offset);

    const countQuery = db
      .select({ total: count() })
      .from(referrals)
      .where(eq(referrals.referrerId, userId));

    const [rows, [{ total }]] = await Promise.all([query, countQuery]);
    const totalPages = Math.ceil(total / pageSize);

    return {
      rows,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Get user profile by user ID with dob and gender from role-specific table
   * @param userId User ID
   * @returns User profile including dob and gender
   */
  async getProfile(userId: number, options: { isTrimmed?: boolean } = {}) {
    const [user] = await this.findOne({ id: userId });

    if (!user) {
      throw new Error('User not found');
    }

    // Import schema to access role-specific tables
    const schema = await import('../schema');
    const { eq } = await import('drizzle-orm');
    const { cacheMaster } = await import('../utils/masterCache');

    // Get user types to determine which table to join
    const userTypes = await cacheMaster(
      'userTypes',
      async () => db.select().from(schema.userTypeEntity).execute()
    );

    const userRole = userTypes.find((type) => type.id === user.roleId);

    if (options.isTrimmed) {
      let pointsummary = { currentBalance: '0' };

      if (userRole) {
        if (userRole.typeName === 'Retailer') {
          const [retailer] = await db
            .select({
              currentBalance: schema.retailers.totalBalance,

            })
            .from(schema.retailers)
            .where(eq(schema.retailers.userId, userId))
            .limit(1);
          if (retailer) pointsummary = retailer;
        } else if (userRole.typeName === 'Electrician') {
          const [electrician] = await db
            .select({
              currentBalance: schema.electricians.totalBalance,

            })
            .from(schema.electricians)
            .where(eq(schema.electricians.userId, userId))
            .limit(1);
          if (electrician) pointsummary = electrician;
        } else if (userRole.typeName === 'CounterSales' || userRole.typeName === 'Counter Staff') {
          const [counterSales] = await db
            .select({
              currentBalance: schema.counterSales.totalBalance,

            })
            .from(schema.counterSales)
            .where(eq(schema.counterSales.userId, userId))
            .limit(1);
          if (counterSales) pointsummary = counterSales;
        }
      }

      return {
        userId: user.id,
        name: user.name,
        mobileNumber: user.phone,
        email: user.email,
        currentBalance: pointsummary?.currentBalance,
        timestamp: new Date().toISOString()
      };
    }

    let dob = null;
    let gender = null;
    let pan = null;
    let addressDetails = {};
    let bankDetails = {};
    let financialDetails = {};

    // Fetch dob, gender, pan, address, bank and financial details from the appropriate role-specific table
    if (userRole) {
      if (userRole.typeName === 'Retailer') {
        const [retailer] = await db
          .select()
          .from(schema.retailers)
          .where(eq(schema.retailers.userId, userId))
          .limit(1);
        if (retailer) {
          dob = retailer.dob;
          gender = retailer.gender;
          pan = retailer.pan;
          addressDetails = {
            addressLine1: retailer.addressLine1,
            addressLine2: retailer.addressLine2,
            pincode: retailer.pincode,
            city: retailer.city,
            district: retailer.district,
            state: retailer.state,
            shopName: retailer.shopName,
          };
          bankDetails = {
            bankAccountNo: retailer.bankAccountNo,
            bankAccountIfsc: retailer.bankAccountIfsc,
            bankAccountName: retailer.bankAccountName,
            upiId: retailer.upiId,
          };
          financialDetails = {
            pointsBalance: retailer.totalBalance,
            redeemablePoints: retailer.redeemablePoints,
            totalEarnings: retailer.totalEarnings,
            totalBalance: retailer.totalBalance,
            totalRedeemed: retailer.totalRedeemed,
            tdsPercentage: retailer.tdsPercentage,
            tdsKitty: retailer.tdsKitty,
            tdsDeducted: retailer.tdsDeducted,
          };
        }
      } else if (userRole.typeName === 'Electrician') {
        const [electrician] = await db
          .select()
          .from(schema.electricians)
          .where(eq(schema.electricians.userId, userId))
          .limit(1);
        if (electrician) {
          dob = electrician.dob;
          gender = electrician.gender;
          pan = electrician.pan;
          addressDetails = {
            addressLine1: electrician.addressLine1,
            addressLine2: electrician.addressLine2,
            pincode: electrician.pincode,
            city: electrician.city,
            district: electrician.district,
            state: electrician.state,
          };
          bankDetails = {
            bankAccountNo: electrician.bankAccountNo,
            bankAccountIfsc: electrician.bankAccountIfsc,
            bankAccountName: electrician.bankAccountName,
            upiId: electrician.upiId,
          };
          financialDetails = {
            pointsBalance: electrician.totalBalance,
            redeemablePoints: electrician.redeemablePoints,
            totalEarnings: electrician.totalEarnings,
            totalBalance: electrician.totalBalance,
            totalRedeemed: electrician.totalRedeemed,
            // TDS fields omitted for Electricians as they are not applicable
          };
        }
      } else if (userRole.typeName === 'CounterSales' || userRole.typeName === 'Counter Staff') {
        const [counterSales] = await db
          .select()
          .from(schema.counterSales)
          .where(eq(schema.counterSales.userId, userId))
          .limit(1);
        if (counterSales) {
          dob = counterSales.dob;
          gender = counterSales.gender;
          pan = counterSales.pan;
          addressDetails = {
            addressLine1: counterSales.addressLine1,
            addressLine2: counterSales.addressLine2,
            pincode: counterSales.pincode,
            city: counterSales.city,
            district: counterSales.district,
            state: counterSales.state,
          };
          bankDetails = {
            bankAccountNo: counterSales.bankAccountNo,
            bankAccountIfsc: counterSales.bankAccountIfsc,
            bankAccountName: counterSales.bankAccountName,
            upiId: counterSales.upiId,
          };
          financialDetails = {
            pointsBalance: counterSales.totalBalance,
            redeemablePoints: counterSales.redeemablePoints,
            totalEarnings: counterSales.totalEarnings,
            totalBalance: counterSales.totalBalance,
            totalRedeemed: counterSales.totalRedeemed,
            tdsPercentage: counterSales.tdsPercentage,
            tdsKitty: counterSales.tdsKitty,
            tdsDeducted: counterSales.tdsDeducted,
          };
        }
      }
    }

    // Exclude password from the response and add dob, gender and pan
    const { password, ...userProfile } = user;

    let profilePhotoSignedUrl = null;

    // Generate signed URL for profile photo if it exists
    if (userProfile.profilePhotoUrl) {
      if (userProfile.profilePhotoUrl.startsWith('http')) {
        profilePhotoSignedUrl = userProfile.profilePhotoUrl;
      } else {
        try {
          const { S3Connector } = await import('../connectors/s3Connector');
          const s3 = new S3Connector();
          // Extract key from s3://bucket/key format or just use the value if it's a key
          let key = userProfile.profilePhotoUrl;
          if (key.startsWith('s3://')) {
            const parts = key.split('/');
            key = parts.slice(3).join('/'); // s3://bucket/path/to/file -> path/to/file
          }
          profilePhotoSignedUrl = await s3.getSignedUrl(key);
        } catch (error) {
          console.error('Error generating signed URL for profile photo:', error);
          // Keep the original URL or set to null on error? Keeping original for now.
        }
      }
    }

    // Fetch approval status name to return as blockStatus
    const approvalStatusesList = await db.select().from(schema.approvalStatuses).execute();
    const approvalStatus = approvalStatusesList.find((s: any) => s.id === user.approvalStatusId);

    // Format DOB to dd-mm-yyyy
    const formatDate = (dateString: string | null) => {
      if (!dateString) return null;
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    };

    return {
      ...userProfile,
      blockStatus: approvalStatus ? approvalStatus.name : userProfile.blockStatus,
      profilePhotoSignedUrl,
      dob: formatDate(dob) || dob,
      gender,
      pan,
      ...addressDetails,
      bankDetails: Object.keys(bankDetails).length > 0 ? bankDetails : undefined,
      pointsSummary: Object.keys(financialDetails).length > 0 ? financialDetails : undefined,
      isPinSet: !!user.pin,
    };


  }

  /**
   * Update user profile
   * @param userId User ID
   * @param updates Profile updates (name, email, address fields)
   * @returns Updated user profile
   */
  async updateProfile(userId: number, updates: ProfileUpdateInput) {
    // Validate request
    const validatedUpdates = updates;
    const { addressLine1, addressLine2, pincode, shopName, ...userUpdates } = validatedUpdates;

    // 1. Update Base User Table (name, email)
    if (Object.keys(userUpdates).length > 0) {
      await db.update(users)
        .set(userUpdates)
        .where(eq(users.id, userId));
    }

    // 2. Handle Address Updates in Role Specific Tables
    if (addressLine1 || addressLine2 || pincode || shopName) {
      const schema = await import('../schema');
      const { cacheMaster } = await import('../utils/masterCache');

      // Fetch city/state/district if pincode is provided
      let geoDetails = {};
      if (pincode) {
        const pincodeData = await db.query.pincodeMaster.findFirst({
          where: eq(schema.pincodeMaster.pincode, pincode),
        });
        if (pincodeData) {
          geoDetails = {
            city: pincodeData.city,
            district: pincodeData.district,
            state: pincodeData.state,
          };
        }
      }

      const addressUpdates = {
        ...(addressLine1 && { addressLine1 }),
        ...(addressLine2 && { addressLine2 }),
        ...(pincode && { pincode }),
        ...geoDetails,
      };

      // Identify Role and Update
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (user) {
        const userTypes = await cacheMaster(
          'userTypes',
          async () => db.select().from(schema.userTypeEntity).execute()
        );
        const userRole = userTypes.find((type) => type.id === user.roleId);

        if (userRole) {
          if (userRole.typeName === 'Retailer') {
            const retailerUpdates = {
              ...addressUpdates,
              ...(shopName && { shopName }),
            };
            await db.update(schema.retailers)
              .set(retailerUpdates)
              .where(eq(schema.retailers.userId, userId));
          } else if (userRole.typeName === 'Electrician') {
            await db.update(schema.electricians)
              .set(addressUpdates)
              .where(eq(schema.electricians.userId, userId));
          } else if (userRole.typeName === 'CounterSales' || userRole.typeName === 'Counter Staff') {
            await db.update(schema.counterSales)
              .set(addressUpdates)
              .where(eq(schema.counterSales.userId, userId));
          }
        }
      }
    }

    // Return the fresh profile
    return this.getProfile(userId);
  }

  /**
   * Update user profile via registration flow
   * @param userId User ID
   * @param updates Profile updates
   * @returns Updated user profile
   */
  async updateRegistrationProfile(userId: number, updates: ProfileUpdateInput, context?: any) {
    const schema = await import('../schema');
    const { cacheMaster } = await import('../utils/masterCache');

    // 0. Validate current block status
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const userTypes = await cacheMaster(
      'userTypes',
      async () => db.select().from(schema.userTypeEntity).execute()
    );
    const userRole = userTypes.find((type) => type.id === user.roleId);

    if (!userRole) {
      throw new AppError('User role not found', 404);
    }

    // Get Approval Statuses
    // Get Approval Statuses
    /*
    const approvalStatusesList = await cacheMaster(
      'approvalStatuses',
      async () => db.select().from(schema.approvalStatuses).execute()
    );
    */
    const approvalStatusesList = await db.select().from(schema.approvalStatuses).execute();
    const getStatusId = (name: string) => approvalStatusesList.find((s: any) => s.name === name)?.id;

    const roleName = userRole.typeName;
    const currentStatusId = user.approvalStatusId;

    if (roleName === 'Electrician') {
      const panVerifiedId = getStatusId(APPROVAL_STATUS.PAN_VERIFIED);
      const digilockerId = getStatusId(APPROVAL_STATUS.DIGILOCKER_COMPLETED);
      if (currentStatusId !== panVerifiedId && currentStatusId !== digilockerId) {
        throw new AppError(`Electricians must be in 'PAN_VERIFIED' or 'DIGILOCKER_COMPLETED' status to update profile.`, 400);
      }
    } else if (roleName === 'Retailer') {
      const bankVerifiedId = getStatusId(APPROVAL_STATUS.BANK_ACCOUNT_VERIFIED);
      if (currentStatusId !== bankVerifiedId) {
        throw new AppError(`Retailers must be in 'BANK_ACCOUNT_VERIFIED' status to update profile.`, 400);
      }
    } else if (roleName === 'CounterSales' || roleName === 'Counter Staff') {
      const panVerifiedId = getStatusId(APPROVAL_STATUS.PAN_VERIFIED);
      if (currentStatusId !== panVerifiedId) {
        throw new AppError(`Counter Sales users must be in 'PAN_VERIFIED' status to update profile.`, 400);
      }
    }

    // 1. Update Profile using existing logic
    await this.updateProfile(userId, updates);

    // 2. Update status to 'PROFILE_UPDATED'
    const profileUpdatedId = getStatusId(APPROVAL_STATUS.PROFILE_UPDATED);
    if (profileUpdatedId) {
      await db.update(users)
        .set({ approvalStatusId: profileUpdatedId })
        .where(eq(users.id, userId));
    } else {
      console.warn('PROFILE_UPDATED status ID not found, skipping status update');
    }

    // 📋 Audit Log for profile update
    await this.logEvent(userId, 'PROFILE_UPDATE', userId, {
      updates: Object.keys(updates),
      ...context
    });

    return this.getProfile(userId);
  }

  /**
   * List users with enforced role filtering and limited fields
   * Returns only shop information for retailers
   * Only returns ACTIVE and non-suspended users
   * @param filters Object with filter criteria (search, city, state, phone, name)
   * @param opts Pagination options
   * @param roleTypeName Role type name to filter by (e.g., 'Retailer')
   * @returns Paginated list with only shop information
   */
  async listUsersWithRoleFilter(
    filters: Record<string, any>,
    opts: { page: number; pageSize: number },
    roleTypeName: string
  ) {
    // Import dependencies needed for this method
    const { cacheMaster } = await import('../utils/masterCache');
    const schema = await import('../schema');
    const { eq, and, or, count, ilike, isNull } = await import('drizzle-orm');

    // Get user types from cache to find the roleId for the specified role type
    const userTypes = await cacheMaster(
      'userTypes',
      async () => db.select().from(schema.userTypeEntity).execute()
    );

    const roleType = userTypes.find((type) => type.typeName === roleTypeName);

    if (!roleType) {
      throw new Error(`Role type '${roleTypeName}' not found`);
    }

    // Get Approval Statuses to find the 'ACTIVE' status ID
    const approvalStatusesList = await db.select().from(schema.approvalStatuses).execute();
    const activeStatus = approvalStatusesList.find((s: any) => s.name === APPROVAL_STATUS.ACTIVE);
    
    if (!activeStatus) {
      throw new Error(`Approval status 'ACTIVE' not found`);
    }

    // Build where conditions
    const { page, pageSize } = opts;
    const offset = (page - 1) * pageSize;

    // Build filter conditions
    const conditions: any[] = [];

    // Base conditions: Correct Role, Active Status, Not Suspended
    conditions.push(eq(users.roleId, roleType.id));
    conditions.push(eq(users.approvalStatusId, activeStatus.id));
    conditions.push(or(eq(users.isSuspended, false), isNull(users.isSuspended)));

    // Handle search parameter - search across name, shopName, phone, city and pincode
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      const searchConditions = [
        ilike(schema.retailers.shopName, searchTerm),
        ilike(schema.retailers.pincode, searchTerm),
        ilike(schema.retailers.name, searchTerm),
        ilike(schema.retailers.phone, searchTerm),
        ilike(schema.retailers.city, searchTerm)
      ];
      conditions.push(or(...searchConditions));
    }

    // Apply additional filters if provided
    if (filters.city) {
      conditions.push(eq(schema.retailers.city, filters.city));
    }
    if (filters.state) {
      conditions.push(eq(schema.retailers.state, filters.state));
    }
    if (filters.phone) {
      conditions.push(eq(schema.retailers.phone, filters.phone));
    }
    if (filters.name) {
      conditions.push(eq(schema.retailers.name, filters.name));
    }
    if (filters.shopName) {
      conditions.push(ilike(schema.retailers.shopName, `%${filters.shopName}%`));
    }
    if (filters.pincode) {
      conditions.push(eq(schema.retailers.pincode, filters.pincode));
    }

    const whereClause = and(...conditions);

    // Query retailers with user join to ensure roleId and active status filter
    const query = db
      .select({
        id: schema.retailers.id,
        userId: schema.retailers.userId,
        name: schema.retailers.name,
        shopName: schema.retailers.shopName,
        addressLine1: schema.retailers.addressLine1,
        addressLine2: schema.retailers.addressLine2,
        pincode: schema.retailers.pincode,
        city: schema.retailers.city,
        district: schema.retailers.district,
        state: schema.retailers.state,
      })
      .from(schema.retailers)
      .innerJoin(users, eq(users.id, schema.retailers.userId))
      .where(whereClause)
      .limit(pageSize)
      .offset(offset);

    // Count query for pagination
    const countQuery = db
      .select({ total: count() })
      .from(schema.retailers)
      .innerJoin(users, eq(users.id, schema.retailers.userId))
      .where(whereClause);

    const [rows, [{ total }]] = await Promise.all([query, countQuery]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      rows,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Transition user to DELETE status
   * @param userId User ID
   * @returns Success response
   */
  async deleteProfile(userId: number) {
    // Import schema
    const schema = await import('../schema');
    
    // Get Approval Status for DELETE
    const approvalStatusesList = await db.select().from(schema.approvalStatuses).execute();
    const deleteStatus = approvalStatusesList.find((s: any) => s.name === APPROVAL_STATUS.DELETE);
    
    if (!deleteStatus) {
      throw new AppError(`Approval status 'DELETE' not found`, 500);
    }

    const suspendedAtTimestamp = new Date().toISOString();

    return await db.transaction(async (tx) => {
      // 1. Update main user status
      await tx.update(users)
        .set({ 
          approvalStatusId: deleteStatus.id,
          isSuspended: true,
          suspendedAt: suspendedAtTimestamp,
        })
        .where(eq(users.id, userId));

      // 2. Update role-specific tables (Retailer, Electrician, CounterSales)
      await Promise.all([
        tx.update(retailers)
          .set({ 
            totalBalance: '0'  // Reset balance on suspension
          })
          .where(eq(retailers.userId, userId)),
        
        tx.update(electricians)
          .set({ 
            totalBalance: '0'  // Reset balance on suspension
          })
          .where(eq(electricians.userId, userId)),
        
        tx.update(counterSales)
          .set({ 
            totalBalance: '0'  // Reset balance on suspension
          })
          .where(eq(counterSales.userId, userId))
      ]);

      // 3. Inactivate user associations
      await tx.update(userAssociations)
        .set({ 
          status: 'inactive',
          updatedAt: new Date().toISOString()
        })
        .where(or(
          eq(userAssociations.childUserId, userId),
          eq(userAssociations.parentUserId, userId)
        ));

      // 4. Audit log within transaction
      await this.logEvent(userId, 'ACCOUNT_DELETION_REQUESTED', userId, {
        statusId: deleteStatus.id,
        suspendedAt: suspendedAtTimestamp,
        timestamp: new Date().toISOString()
      });

      return { success: true, message: 'Account deleted successfully' };
    });
  }
}

export const userService = new UserService(users as any, userZ);
