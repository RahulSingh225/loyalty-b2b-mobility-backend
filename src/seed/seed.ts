import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../schema';
import { eq } from 'drizzle-orm';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});
const db = drizzle(pool, { schema });

async function seed() {
  console.log('--- Starting Comprehensive Seeding ---');

  // 1. Onboarding Types
  console.log('Seeding onboarding types...');
  await db.insert(schema.onboardingTypes).values([
    { name: 'mobile', description: 'Mobile onboarding flow', isActive: true },
    { name: 'api', description: 'API onboarding flow', isActive: true },
    { name: 'admin', description: 'Admin onboarding flow', isActive: true },
  ]).onConflictDoNothing().execute();

  const onboardingRetail = (await db.select().from(schema.onboardingTypes).where(eq(schema.onboardingTypes.name, 'mobile')).limit(1))[0];
  const onboardingElectrician = (await db.select().from(schema.onboardingTypes).where(eq(schema.onboardingTypes.name, 'mobile')).limit(1))[0];
  const onboardingCounterStaff = (await db.select().from(schema.onboardingTypes).where(eq(schema.onboardingTypes.name, 'mobile')).limit(1))[0];
  const onboardingMobile = (await db.select().from(schema.onboardingTypes).where(eq(schema.onboardingTypes.name, 'mobile')).limit(1))[0];
  const onboardingApi = (await db.select().from(schema.onboardingTypes).where(eq(schema.onboardingTypes.name, 'api')).limit(1))[0];
  const onboardingAdmin = (await db.select().from(schema.onboardingTypes).where(eq(schema.onboardingTypes.name, 'admin')).limit(1))[0];

  // 2. Earning Types
  console.log('Seeding earning types...');
  await db.insert(schema.earningTypes).values([
    { name: 'Sale', description: 'Points from product sales', isActive: true },
    { name: 'Referral', description: 'Bonus from referrals', isActive: true },
    { name: 'Scheme Bonus', description: 'Points from special schemes', isActive: true },
    { name: 'Redemption', description: 'Points deduction on redemption', isActive: true },
  ]).onConflictDoNothing().execute();

  const earns = await db.select().from(schema.earningTypes).execute();
  const earnMap = Object.fromEntries(earns.map(e => [e.name, e.id]));

  // 3. Redemption Channels & Statuses
  console.log('Seeding redemption setup...');
  await db.insert(schema.redemptionChannels).values([
    { name: 'UPI', description: 'UPI transfer', isActive: true },
    { name: 'Bank Transfer', description: 'Bank transfer', isActive: true },
  ]).onConflictDoNothing().execute();

  await db.insert(schema.redemptionStatuses).values([
    { name: 'Pending', description: 'Request awaiting review', isActive: true },
    { name: 'Approved', description: 'Request approved', isActive: true },
    { name: 'Rejected', description: 'Request rejected', isActive: true },
  ]).onConflictDoNothing().execute();

  const redChannels = await db.select().from(schema.redemptionChannels).execute();
  const redStatuses = await db.select().from(schema.redemptionStatuses).execute();
  const upiChannelId = redChannels.find(c => c.name === 'UPI')?.id;
  const redStatusPendingId = redStatuses.find(s => s.name === 'Pending')?.id;

  // 4. User Roles (UserTypeEntity)
  console.log('Seeding user roles...');
  await db.insert(schema.userTypeLevelMaster).values([
    { levelNo: 1, levelName: 'System Level' },
  ]).onConflictDoNothing().execute();

  const roleLevel = (await db.select().from(schema.userTypeLevelMaster).limit(1))[0];
  // userTypeEntity schema may differ between environments; wrap insert in try/catch
  try {
    await db.insert(schema.userTypeEntity).values([
      { levelId: roleLevel.id, typeName: 'Admin', isActive: true },
      { levelId: roleLevel.id, typeName: 'Retailer', isActive: true },
      { levelId: roleLevel.id, typeName: 'Electrician', isActive: true },
      { levelId: roleLevel.id, typeName: 'Counter Staff', isActive: true },
    ]).onConflictDoNothing().execute();
  } catch (e: any) {
    console.warn('Warning: seeding userTypeEntity failed - continuing. Reason:', e.message || e);
  }

  const roles = await db.select().from(schema.userTypeEntity).execute();
  const roleMap = Object.fromEntries(roles.map(r => [r.typeName, r.id]));

  // 5. Basic Masters
  console.log('Seeding basic masters...');
  await db.insert(schema.languages).values([
    { name: 'English', code: 'en', isActive: true },
    { name: 'Hindi', code: 'hi', isActive: true },
  ]).onConflictDoNothing().execute();

  await db.insert(schema.approvalStatuses).values([
    { name: 'Pending', isActive: true },
    { name: 'Approved', isActive: true },
    { name: 'Rejected', isActive: true },
  ]).onConflictDoNothing().execute();

  const langEn = (await db.select().from(schema.languages).where(eq(schema.languages.code, 'en')).limit(1))[0];
  const statusApproved = (await db.select().from(schema.approvalStatuses).where(eq(schema.approvalStatuses.name, 'Approved')).limit(1))[0];
  const statusPending = (await db.select().from(schema.approvalStatuses).where(eq(schema.approvalStatuses.name, 'Pending')).limit(1))[0];

  // 6. Users (Auth)
  console.log('Seeding users...');
  const testUsers = [
    { roleId: roleMap['Admin'], name: 'System Admin', phone: '9999999999', email: 'admin@system.com', password: 'password123', onboardingTypeId: onboardingAdmin?.id || onboardingRetail.id, approvalStatusId: statusApproved.id, languageId: langEn.id },
    { roleId: roleMap['Retailer'], name: 'Mohan Retailer', phone: '9888888888', email: 'mohan@retail.com', password: 'password123', onboardingTypeId: onboardingMobile?.id || onboardingRetail.id, approvalStatusId: statusApproved.id, languageId: langEn.id },
    { roleId: roleMap['Electrician'], name: 'Sohan Electrician', phone: '9777777777', email: 'sohan@elec.com', password: 'password123', onboardingTypeId: onboardingApi?.id || onboardingElectrician.id, approvalStatusId: statusApproved.id, languageId: langEn.id },
    { roleId: roleMap['Counter Staff'], name: 'Rohan Counter', phone: '9666666666', email: 'rohan@counter.com', password: 'password123', onboardingTypeId: onboardingAdmin?.id || onboardingCounterStaff.id, approvalStatusId: statusPending.id, languageId: langEn.id },
    { roleId: roleMap['Retailer'], name: 'Referred User', phone: '9555555555', email: 'referred@user.com', password: 'password123', onboardingTypeId: onboardingMobile?.id || onboardingRetail.id, approvalStatusId: statusApproved.id, languageId: langEn.id },
  ];

  for (const u of testUsers) {
    await db.insert(schema.users).values(u).onConflictDoNothing().execute();
  }

  const mohan = (await db.select().from(schema.users).where(eq(schema.users.name, 'Mohan Retailer')).limit(1))[0];
  const sohan = (await db.select().from(schema.users).where(eq(schema.users.name, 'Sohan Electrician')).limit(1))[0];
  const rohan = (await db.select().from(schema.users).where(eq(schema.users.name, 'Rohan Counter')).limit(1))[0];
  const referred = (await db.select().from(schema.users).where(eq(schema.users.name, 'Referred User')).limit(1))[0];

  // 7. Profile Specific Tables
  console.log('Seeding profiles...');
  await db.insert(schema.retailers).values({
    userId: mohan.id,
    uniqueId: 'RET-MOHAN',
    name: 'Mohan Retailer',
    phone: '9888888888',
    email: mohan.email,
    aadhaar: '123412341234',
    pan: 'ABCDE1234F',
    gst: '27ABCDE1234F1Z5',
    address: 'Shop 12, Market Road',
    district: 'Mumbai Suburban',
    dob: '1980-01-01',
    
    referralCode: 'REF-MOHAN',
    isKycVerified: true,
    onboardingTypeId: onboardingRetail.id,
    pointsBalance: 5000,
    totalEarnings: 7500,
    totalBalance: 5000,
    totalRedeemed: 2500,
    state: 'Maharashtra',
    city: 'Mumbai',
  } as any).onConflictDoNothing().execute();

  await db.insert(schema.electricians).values({
    userId: sohan.id,
    uniqueId: 'ELEC-SOHAN',
    name: 'Sohan Electrician',
    phone: '9777777777',
    isKycVerified: true,
    aadhaar: '123412341234',
    pan: 'ABCDE1234F',
    
        onboardingTypeId: onboardingRetail.id,
    pointsBalance: 1200,
    totalEarnings: 1500,
    totalBalance: 1200,
  } as any).onConflictDoNothing().execute();

  await db.insert(schema.counterSales).values({
    userId: rohan.id,
    uniqueId: 'CS-ROHAN',
    name: 'Rohan Counter',
    phone: '9666666666',
    aadhaar: '123412341234',
    pan: 'ABCDE1234F',
    
    attachedRetailerId: mohan.id,
    isKycVerified: false,
        onboardingTypeId: onboardingRetail.id,

    pointsBalance: 0,
  } as any).onConflictDoNothing().execute();

  // 8. KYC Documents
  console.log('Seeding KYC records...');
  await db.insert(schema.kycDocuments).values([
    { userId: mohan.id, documentType: 'AADHAR', documentValue: '123412341234', verificationStatus: 'verified', verifiedAt: new Date().toISOString() },
    { userId: mohan.id, documentType: 'PAN', documentValue: 'ABCDE1234F', verificationStatus: 'verified', verifiedAt: new Date().toISOString() },
    { userId: rohan.id, documentType: 'AADHAR', documentValue: '987698769876', verificationStatus: 'pending' },
  ]).onConflictDoNothing().execute();

  // 9. TDS Records
  console.log('Seeding TDS records...');
  await db.insert(schema.tdsRecords).values([
    { userId: mohan.id, financialYear: '2024-2025', tdsKitty: '25000', tdsDeducted: '1250', status: 'active' },
    { userId: sohan.id, financialYear: '2024-2025', tdsKitty: '15000', tdsDeducted: '0', status: 'active' },
  ]).onConflictDoNothing().execute();

  // 10. Referrals
  console.log('Seeding referrals...');
  await db.insert(schema.referrals).values([
    { referrerId: mohan.id, referredId: referred.id, status: 'approved', bonusAwarded: 500 },
  ]).onConflictDoNothing().execute();

  // 11. Schemes & Transactions
  console.log('Seeding schemes & transactions...');
  try {
    await db.insert(schema.schemes).values([
      { name: 'Diwali Dhamaka', description: 'Points for heavy scanning', isActive: true, startDate: '2024-10-01', endDate: '2024-12-31' },
    ]).onConflictDoNothing().execute();

    const scheme = (await db.select().from(schema.schemes).limit(1))[0];

    // Earning History entry
    try {
      await db.insert(schema.retailerTransactions).values([
        { userId: mohan.id, earningType: earnMap['Sale'], points: 1000, qrCode: 'TEST-QR-123', schemeId: scheme.id, metadata: { product: 'Wire A' } as any },
        { userId: mohan.id, earningType: earnMap['Referral'], points: 500, remarks: 'Bonus for referring Sobhan' },
      ]).onConflictDoNothing().execute();
    } catch (e: any) {
      console.warn('Warning: seeding retailerTransactions failed - continuing. Reason:', e.message || e);
    }
  } catch (e: any) {
    console.warn('Warning: seeding schemes failed - continuing. Reason:', e.message || e);
  }

  // 12. Redemptions
  console.log('Seeding redemptions...');
  await db.insert(schema.redemptions).values([
    { userId: mohan.id, redemptionId: 'RED-001', channelId: upiChannelId, pointsRedeemed: 2500, amount: 2000, status: redStatusPendingId, metadata: { upiId: 'mohan@upi' } as any },
  ]).onConflictDoNothing().execute();

  // 13. Tickets
  console.log('Seeding tickets...');
  await db.insert(schema.ticketTypes).values([{ name: 'App Issue' }, { name: 'Points Correction' }]).onConflictDoNothing().execute();
  await db.insert(schema.ticketStatuses).values([{ name: 'Open' }, { name: 'Closed' }]).onConflictDoNothing().execute();

  const tType = (await db.select().from(schema.ticketTypes).limit(1))[0];
  const tStatus = (await db.select().from(schema.ticketStatuses).limit(1))[0];

  await db.insert(schema.tickets).values({
    typeId: tType.id,
    statusId: tStatus.id,
    subject: 'Points not credited',
    description: 'Scanned 5 QRs but only 3 credited',
    createdBy: mohan.id,
    priority: 'High',
  } as any).onConflictDoNothing().execute();

  // 14. Creatives
  console.log('Seeding creatives...');
  await db.insert(schema.creativesTypes).values([{ name: 'Banner' }, { name: 'Popup' }]).onConflictDoNothing().execute();
  const cType = (await db.select().from(schema.creativesTypes).limit(1))[0];

  try {
    await db.insert(schema.creatives).values([
      { title: 'Big Offer', description: 'Get 2x points on wires', url: 'https://cdn.com/offer.jpg', typeId: cType.id, displayOrder: 1, targetAudience: { userTypes: ['electrician'] } as any, isActive: true },
      { title: 'New Arrival', description: 'New premium switches', url: 'https://cdn.com/new.jpg', typeId: cType.id, displayOrder: 2, isActive: true },
    ]).onConflictDoNothing().execute();
  } catch (e: any) {
    console.warn('Warning: seeding creatives failed - continuing. Reason:', e.message || e);
  }

  // 15. Client, SKU & QR setup (required for /transaction/scan and /earning/scan)
  console.log('Seeding product / SKU / QR setup...');
  await db.insert(schema.client).values({ name: 'Default Client', code: 'DEFAULT' }).onConflictDoNothing().execute();
  const client = (await db.select().from(schema.client).where(eq(schema.client.code, 'DEFAULT')).limit(1))[0];

  // SKU level
  await db.insert(schema.skuLevelMaster).values({ clientId: client.id, levelNo: 1, levelName: 'Default Level' }).onConflictDoNothing().execute();
  const skuLevel = (await db.select().from(schema.skuLevelMaster).where(eq(schema.skuLevelMaster.clientId, client.id)).limit(1))[0];

  // SKU entity and variant
  await db.insert(schema.skuEntity).values({ clientId: client.id, levelId: skuLevel.id, name: 'Wire A', code: 'WIRE-A' }).onConflictDoNothing().execute();
  const sku = (await db.select().from(schema.skuEntity).where(eq(schema.skuEntity.code, 'WIRE-A')).limit(1))[0];

  await db.insert(schema.skuVariant).values({ skuEntityId: sku.id, variantName: 'Wire A - 1m', packSize: '1m', mrp: '100.00' }).onConflictDoNothing().execute();
  const variant = (await db.select().from(schema.skuVariant).where(eq(schema.skuVariant.skuEntityId, sku.id)).limit(1))[0];

  // Points config for user types
  await db.insert(schema.skuPointConfig).values([
    { clientId: client.id, skuVariantId: variant.id, userTypeId: roleMap['Retailer'], pointsPerUnit: '100' },
    { clientId: client.id, skuVariantId: variant.id, userTypeId: roleMap['Electrician'], pointsPerUnit: '50' },
    { clientId: client.id, skuVariantId: variant.id, userTypeId: roleMap['Counter Staff'], pointsPerUnit: '20' },
  ]).onConflictDoNothing().execute();

  // QR types and QR codes
  await db.insert(schema.qrTypes).values({ name: 'Product QR', description: 'Product level QR' }).onConflictDoNothing().execute();
  const qrType = (await db.select().from(schema.qrTypes).where(eq(schema.qrTypes.name, 'Product QR')).limit(1))[0];

  // Create a QR matching the retailerTransactions entry used earlier (TEST-QR-123)
  await db.insert(schema.qrCodes).values({ sku: sku.code, batchNumber: 'BATCH-1', typeId: qrType.id, code: 'TEST-QR-123', securityCode: 'SEC-123', manufacturingDate: new Date().toISOString() }).onConflictDoNothing().execute();

  // Participant SKU access: allow our seeded users to access this SKU
  await db.insert(schema.participantSkuAccess).values([
    { userId: mohan.id, skuLevelId: skuLevel.id, skuEntityId: sku.id, accessType: 'specific', isActive: true },
    { userId: sohan.id, skuLevelId: skuLevel.id, skuEntityId: sku.id, accessType: 'specific', isActive: true },
    { userId: rohan.id, skuLevelId: skuLevel.id, skuEntityId: sku.id, accessType: 'specific', isActive: true },
  ]).onConflictDoNothing().execute();

  // 16. Master config entries (TDS percentages) and app configs
  // try {
  //   await db.insert(schema.appConfigs).values([
  //     { key: 'TDS_PERCENTAGE_RETAILER', value: '5', description: 'Retailer default TDS' },
  //     { key: 'TDS_PERCENTAGE_ELECTRICIAN', value: '3', description: 'Electrician default TDS' },
  //     { key: 'TDS_PERCENTAGE_COUNTERSALES', value: '2', description: 'Counter staff default TDS' },
  //     { key: 'TDS_PERCENTAGE', value: '3', description: 'Generic TDS fallback' },
  //   ]).onConflictDoNothing().execute();
  // } catch (e) {
  //   // Ignore if schema differs
  // }

  // 17. OTP seeds (useful for testing OTP verify endpoints)
  // const expires = new Date(Date.now() + 1000 * 60 * 60).toISOString();
  // try {
  //   await db.insert(schema.otps).values([
  //     { phone: '9888888888', otp: '111111', type: 'login', user_id: mohan.id, attempts: 0, is_used: false, expires_at: expires },
  //     { phone: '9777777777', otp: '222222', type: 'login', user_id: sohan.id, attempts: 0, is_used: false, expires_at: expires },
  //     { phone: '9666666666', otp: '333333', type: 'login', user_id: rohan.id, attempts: 0, is_used: false, expires_at: expires },
  //   ]).onConflictDoNothing().execute();
  // } catch (e: any) {
  //   console.warn('Warning: seeding otps failed - continuing. Reason:', e.message || e);
  // }

  console.log('--- Seeding Completed Successfully ---');
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
}).finally(() => pool.end());