import { db } from '../config/db';
import * as schema from '../schema';
import { eq } from 'drizzle-orm';
import { APPROVAL_STATUS } from '../utils/approvalStatus';

export const seedMasters = async () => {
  // onboarding_types
  await db.insert(schema.onboardingTypes).values([
    { name: 'Retail', description: 'Retail user onboarding', isActive: true },
    { name: 'Electrician', description: 'Electrician user onboarding', isActive: true },
    { name: 'Counter Sales', description: 'Counter sales user onboarding', isActive: true },
  ]).onConflictDoNothing().execute();

  // languages
  await db.insert(schema.languages).values([
    { name: 'English', code: 'en', description: 'English language', isActive: true },
    { name: 'Hindi', code: 'hi', description: 'Hindi language', isActive: true },
  ]).onConflictDoNothing().execute();

  // approval_statuses
  // Combine legacy and new statuses to ensure no conflicts if legacy data exists
  const statuses = [
    { name: 'Pending', description: 'Approval pending', isActive: true },
    { name: 'Approved', description: 'User approved', isActive: true },
    { name: 'Rejected', description: 'User rejected', isActive: true },
    // New statuses from APPROVAL_STATUS constant
    { name: APPROVAL_STATUS.PHONE_NUMBER_VERIFIED, description: 'Phone number verified', isActive: true },
    { name: APPROVAL_STATUS.PAN_VERIFIED, description: 'PAN verification completed', isActive: true },
    { name: APPROVAL_STATUS.GST_NUMBER_VERIFIED, description: 'GST verification completed', isActive: true },
    { name: APPROVAL_STATUS.BANK_ACCOUNT_VERIFIED, description: 'Bank account verified', isActive: true },
    { name: APPROVAL_STATUS.KYC_PENDING, description: 'KYC pending', isActive: true },
    { name: APPROVAL_STATUS.DIGILOCKER_COMPLETED, description: 'DigiLocker verification completed', isActive: true },
    { name: APPROVAL_STATUS.PROFILE_UPDATED, description: 'Profile updated', isActive: true },
    { name: APPROVAL_STATUS.KYC_APPROVED, description: 'KYC approved', isActive: true },
    { name: APPROVAL_STATUS.ONBOARDED, description: 'User onboarded', isActive: true },
    { name: APPROVAL_STATUS.ACTIVE, description: 'User active', isActive: true },
    { name: APPROVAL_STATUS.INACTIVE, description: 'User inactive', isActive: true },
    { name: APPROVAL_STATUS.SCAN_BLOCKED, description: 'Scanning blocked', isActive: true },
    { name: APPROVAL_STATUS.REDEMPTION_BLOCKED, description: 'Redemption blocked', isActive: true },
    { name: APPROVAL_STATUS.BLOCKED, description: 'User blocked', isActive: true },
    { name: APPROVAL_STATUS.DELETE, description: 'User deleted (soft)', isActive: true },
  ];

  await db.insert(schema.approvalStatuses).values(statuses).onConflictDoNothing().execute();

  // client
  await db.insert(schema.client).values([{ name: 'Default Client', code: 'DEFAULT' }]).onConflictDoNothing().execute();

  // sku levels
  const defaultClient = await db.select().from(schema.client).where(eq(schema.client.code, 'DEFAULT')).limit(1);
  const defaultClientId = defaultClient[0]?.id || 1;

  await db.insert(schema.skuLevelMaster).values([
    { clientId: defaultClientId, levelNo: 1, levelName: 'Category' },
    { clientId: defaultClientId, levelNo: 2, levelName: 'Subcategory', parentLevelId: 1 },
  ]).onConflictDoNothing().execute();

  // sku entities
  const skuCategoryLevel = await db.select().from(schema.skuLevelMaster).where(eq(schema.skuLevelMaster.levelName, 'Category')).limit(1);
  const skuSubcategoryLevel = await db.select().from(schema.skuLevelMaster).where(eq(schema.skuLevelMaster.levelName, 'Subcategory')).limit(1);
  const categoryLevelId = skuCategoryLevel[0]?.id || 1;
  const subcategoryLevelId = skuSubcategoryLevel[0]?.id || 2;

  await db.insert(schema.skuEntity).values([
    { clientId: defaultClientId, levelId: categoryLevelId, name: 'Electronics', code: 'ELEC', isActive: true },
    { clientId: defaultClientId, levelId: subcategoryLevelId, name: 'Wires', code: 'WIRES', parentEntityId: 1, isActive: true },
  ]).onConflictDoNothing().execute();

  // sku variant
  const wiresEntity = await db.select().from(schema.skuEntity).where(eq(schema.skuEntity.name, 'Wires')).limit(1);
  const wiresId = wiresEntity[0]?.id || 2;

  await db.insert(schema.skuVariant).values([
    { skuEntityId: wiresId, variantName: 'Copper Wire 1mm', packSize: '10m', mrp: "100.00", isActive: true },
  ]).onConflictDoNothing().execute();

  // user type levels and entities
  await db.insert(schema.userTypeLevelMaster).values([{ levelNo: 1, levelName: 'Role Level' }]).onConflictDoNothing().execute();
  const roleLevel = await db.select().from(schema.userTypeLevelMaster).where(eq(schema.userTypeLevelMaster.levelName, 'Role Level')).limit(1);
  const roleLevelId = roleLevel[0]?.id || 1;

  await db.insert(schema.userTypeEntity).values([
    { levelId: roleLevelId, typeName: 'Admin', isActive: true },
    { levelId: roleLevelId, typeName: 'Retailer', isActive: true },
    { levelId: roleLevelId, typeName: 'Electrician', isActive: true },
  ]).onConflictDoNothing().execute();

  // sku point config placeholder (safe if variant exists)
  const wireVariant = await db.select().from(schema.skuVariant).where(eq(schema.skuVariant.variantName, 'Copper Wire 1mm')).limit(1);
  const wireVariantId = wireVariant[0]?.id;
  const userTypeAdmin = await db.select().from(schema.userTypeEntity).where(eq(schema.userTypeEntity.typeName, 'Admin')).limit(1);
  const adminRoleId = userTypeAdmin[0]?.id;
  if (wireVariantId && adminRoleId) {
    await db.insert(schema.skuPointConfig).values([
      { clientId: defaultClientId, skuVariantId: wireVariantId, userTypeId: adminRoleId, pointsPerUnit: "1.00", remarks: 'bootstrap default' },
    ]).onConflictDoNothing().execute();
  }

  // app configs
  const adminUser = await db.select().from(schema.users).where(eq(schema.users.name, 'Admin User')).limit(1);
  const adminUserId = adminUser[0]?.id || null;
  await db.insert(schema.appConfigs).values([
    { key: 'app_version', value: { version: '1.0.0', build: 1 }, description: 'Current app version', updatedBy: adminUserId },
  ]).onConflictDoNothing().execute();

  return { ok: true };
};

export default { seedMasters };
