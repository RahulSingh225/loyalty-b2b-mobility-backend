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
    { name: 'QR Scan', description: 'Points earned from scanning QR codes', isActive: true },
    { name: 'QR Scan - Indirect', description: 'Points earned from linked retailer scans', isActive: true },
    { name: 'Referral Bonus', description: 'Bonus points from referrals', isActive: true },
    { name: 'Registration Bonus', description: 'Welcome points for new users', isActive: true },
    { name: 'Scheme Bonus', description: 'Points from special schemes', isActive: true },
    { name: 'Redemption', description: 'Points deduction on redemption', isActive: true },
    { name: 'Referral', description: 'Legacy referral type', isActive: true },
  ]).onConflictDoNothing().execute();

  // 2.5. Event Master
  console.log('Seeding event master...');
  await db.insert(schema.eventMaster).values([
    { eventKey: 'SCAN_ATTEMPT', name: 'Scan Attempt', category: 'EARNING', isActive: true },
    { eventKey: 'SCAN_SUCCESS', name: 'Scan Success', category: 'EARNING', isActive: true },
    { eventKey: 'SCAN_FAILED', name: 'Scan Failed', category: 'EARNING', isActive: true },
    { eventKey: 'REFERRAL_EARNING', name: 'Referral Earning', category: 'EARNING', isActive: true },
    { eventKey: 'REGISTRATION_BONUS', name: 'Registration Bonus', category: 'EARNING', isActive: true },
    { eventKey: 'USER_REGISTRATION', name: 'User Registration Started', category: 'ONBOARDING', isActive: true },
    { eventKey: 'USER_REGISTERED', name: 'User Registered Successfully', category: 'ONBOARDING', isActive: true },
    { eventKey: 'KYC_APPROVE', name: 'KYC Approved', category: 'ONBOARDING', isActive: true },
    { eventKey: 'REDEMPTION_REQUEST', name: 'Redemption Requested', category: 'REDEMPTION', isActive: true },
    { eventKey: 'REDEMPTION_REJECTED', name: 'Redemption Rejected', category: 'REDEMPTION', isActive: true },
    { eventKey: 'PAYOUT_INITIATED', name: 'Payout Initiated', category: 'REDEMPTION', isActive: true },
    { eventKey: 'PAYOUT_FAILED', name: 'Payout Failed', category: 'REDEMPTION', isActive: true },
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
    tdsConsent: true,
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
  // try {
  //   await db.insert(schema.schemes).values([
  //     { name: 'Diwali Dhamaka', description: 'Points for heavy scanning', isActive: true, startDate: '2024-10-01', endDate: '2024-12-31' },
  //   ]).onConflictDoNothing().execute();

  //   const scheme = (await db.select().from(schema.schemes).limit(1))[0];

  //   // Earning History entry
  //   try {
  //     await db.insert(schema.retailerTransactions).values([
  //       { userId: mohan.id, earningType: earnMap['Sale'], points: 1000, qrCode: 'TEST-QR-123', schemeId: scheme.id, metadata: { product: 'Wire A' } as any },
  //       { userId: mohan.id, earningType: earnMap['Referral'], points: 500, remarks: 'Bonus for referring Sobhan' },
  //     ]).onConflictDoNothing().execute();
  //   } catch (e: any) {
  //     console.warn('Warning: seeding retailerTransactions failed - continuing. Reason:', e.message || e);
  //   }
  // } catch (e: any) {
  //   console.warn('Warning: seeding schemes failed - continuing. Reason:', e.message || e);
  // }

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

  // try {
  //   await db.insert(schema.creatives).values([
  //     { title: 'Big Offer', description: 'Get 2x points on wires', url: 'https://cdn.com/offer.jpg', typeId: cType.id, displayOrder: 1, targetAudience: { userTypes: ['electrician'] } as any, isActive: true },
  //     { title: 'New Arrival', description: 'New premium switches', url: 'https://cdn.com/new.jpg', typeId: cType.id, displayOrder: 2, isActive: true },
  //   ]).onConflictDoNothing().execute();
  // } catch (e: any) {
  //   console.warn('Warning: seeding creatives failed - continuing. Reason:', e.message || e);
  // }

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

  // 16. Marketplace Data
  console.log('Seeding marketplace data...');

  // Amazon Marketplace Products
  // Amazon Marketplace Products
  // await db.insert(schema.amazonMarketplaceProducts).values([
  //   {
  //     asinSku: 'B0BK1KS6ZD',
  //     name: 'Daikin (1 and 1.5 ton)',
  //     modelNo: 'Daikin 1.5 Ton 3 Star Inverter Split AC (Copper, PM 2.5 Filter, Triple Display, Dew Clean Technology, Coanda Airflow, 2024 Model, MTKL50U, White)',
  //     description: 'split ac with inverter swing compressor and hepta sense: dew clean technology; triple display; pm 2.5 filter to ensure healthy air capacity 1.5 ton: suitable for small sized rooms (111 to 150 sq.ft); 572 cfm with an air throw of 16 meters 3 star: energy efficiency warranty: 1 years on product, 5 years on pcb, 10 years on compressor copper condenser coil with patented dnns self heal coating for low maintenance & enhanced durability key features- cooling capacity @ 43�c: 100%; noise level: 30 db(a); ambient operation: 52�c special features: auto variable speed, triple display (power consumption %age, set/room temperature & auto error code); 3d airflow for uniform cooling and power chill for faster cooling',
  //     mrp: '58400.00',
  //     discountedPrice: '37000.00',
  //     cspPrice: '37490.00',
  //     inventoryCount: 0,
  //     points: 37000,
  //     diff: '490.00',
  //     url: 'https://www.amazon.in/Daikin-Inverter-Display-Technology-MTKL50U/dp/B0BK1KS6ZD',
  //     category: 'Home & Kitchen',
  //     categoryImage: 'https://m.media-amazon.com/images/G/31/img21/OHL/Halo/NOcallouts/Rec/CnD._SS300_QL85_.jpg',
  //     subCategory: 'Air Conditioners',
  //     subCategoryImage: 'https://m.media-amazon.com/images/G/31/IMG15/Yousf/BAU_May25/Top-deals-New_01.png',
  //     productImage: 'https://m.media-amazon.com/images/I/61JyEPdw3UL._SL1500_.jpg',
  //     commentsVendor: '-',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B0BK28T4BZ',
  //     name: 'Daikin (1 and 1.5 ton)',
  //     modelNo: 'Daikin 1 Ton 3 Star Inverter Split AC (Copper, PM 2.5 Filter, 2024 Model, MTKL35UV16, White)',
  //     description: 'split ac with inverter swing compressor and hepta sense: dew clean technology; triple display; pm 2.5 filter to ensure healthy air capacity 1 ton: suitable for small sized rooms (up to 100 sq.ft) 3 star: energy efficiency warranty: 1 years on product, 5 years on pcb, 10 years on compressor copper condenser coil with patented dnns self heal coating for low maintenance & enhanced durability key features- cooling capacity @ 43�c: 100%; noise level: 30 db(a); ambient operation: 52�c special features: auto variable speed, triple display (power consumption %age, set/room temperature & auto error code); 3d airflow for uniform cooling and power chill for faster cooling',
  //     mrp: '56700.00',
  //     discountedPrice: '33490.00',
  //     cspPrice: '33490.00',
  //     inventoryCount: 0,
  //     points: 33490,
  //     diff: '0.00',
  //     url: 'https://www.amazon.in/Daikin-Inverter-Copper-Filter-MTKL35UV16/dp/B0BK28T4BZ',
  //     category: 'Home & Kitchen',
  //     categoryImage: 'https://m.media-amazon.com/images/G/31/img21/OHL/Halo/NOcallouts/Rec/CnD._SS300_QL85_.jpg',
  //     subCategory: 'Air Conditioners',
  //     subCategoryImage: 'https://m.media-amazon.com/images/G/31/IMG15/Yousf/BAU_May25/Top-deals-New_01.png',
  //     productImage: 'https://m.media-amazon.com/images/I/61JyEPdw3UL._SL1500_.jpg',
  //     commentsVendor: '-',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B0DRY6T8B8',
  //     name: 'Samsung (1 and 1.5 ton)',
  //     modelNo: 'Samsung 1.5 Ton 3 Star AI Inverter Smart Split AC (WiFi, Energy Saving, Voice Control, Powerful Cooling, Copper, Digital Inverter, 4 Way swing, 5 Step Convertible, BESPOKE AI AR50F18D1LHNNA',
  //     description: 'Verstile International sockets (with child safety shutter) The safety shutter keeps children safe & also prevents dust from getting into unsend sockets overtime. 2 Meter Heavy duty cord A special nylon velcro cable tie has been provided on the long power',
  //     mrp: '56990.00',
  //     discountedPrice: '36490.00',
  //     cspPrice: '36490.00',
  //     inventoryCount: 0,
  //     points: 36490,
  //     diff: '0.00',
  //     url: 'https://www.amazon.in/Samsung-Inverter-Powerful-Convertible-AR50F18D1LHNNA/dp/B0DRY6T8B8',
  //     category: 'Home & Kitchen',
  //     categoryImage: 'https://m.media-amazon.com/images/G/31/img21/OHL/Halo/NOcallouts/Rec/CnD._SS300_QL85_.jpg',
  //     subCategory: 'Air Conditioners',
  //     subCategoryImage: 'https://m.media-amazon.com/images/G/31/IMG15/Yousf/BAU_May25/Top-deals-New_01.png',
  //     productImage: 'https://m.media-amazon.com/images/I/518jz8du8UL._SL1500_.jpg',
  //     commentsVendor: '-',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B0DRXXKPF1',
  //     name: 'Samsung (1 and 1.5 ton)',
  //     modelNo: 'Samsung 1 Ton 5 Star AI Inverter Smart Split AC (WiFi, Energy Saving, Voice Control, Powerful Cooling, Copper, Digital Inverter, 4 Way swing, 5 Step Convertible, BESPOKE AI AR50F12D1ZHNNA)',
  //     description: 'Samsung Air Conditioners powered with BESPOKE AI: Smart and powerful ACs with Wi-Fi and Voice control offering 30% additional Energy Savings with AI Energy Mode. Capacity (1Ton): Suitable for medium sized rooms (80 to 110 sq ft) Energy Rating: 5 Star BEE Rating with Power Saving Mode | ISEER rating of 5.15 W/W (better than industry benchmarks | Electricity Consumption : 626.62 Units Per Year Warranty: 5 years comprehensive warranty, 10 Years Warranty on Digital Inverter Compressor Copper Condenser Coil: Better cooling and requires low maintenance Key Features: BESPOKE AI, 30% Additional Energy Savings, 5 Step Convertible, 4 Way Swing, Wi-Fi, Voice Control with Alexa, Google & Bixby, SmartThings app, Auto Error Diagnosis, 3 Step Auto Clean, Digital Inverter Technology, Durafin Ultra, Triple Protection Plus, Copper Anti-Bacterial Filter, Coated Copper tubes Special Features: Fast Cooling, Artifical Intelligence (AI) Energy Savings, Cools even at 58 degrees C, Less noise, Connected living- supports Internet of Things (IoT)',
  //     mrp: '62490.00',
  //     discountedPrice: '37990.00',
  //     cspPrice: '37990.00',
  //     inventoryCount: 0,
  //     points: 37990,
  //     diff: '0.00',
  //     url: 'https://www.amazon.in/Samsung-Inverter-Powerful-Convertible-AR50F12D1ZHNNA/dp/B0DRXXKPF1',
  //     category: 'Home & Kitchen',
  //     categoryImage: 'https://m.media-amazon.com/images/G/31/img21/OHL/Halo/NOcallouts/Rec/CnD._SS300_QL85_.jpg',
  //     subCategory: 'Air Conditioners',
  //     subCategoryImage: 'https://m.media-amazon.com/images/G/31/IMG15/Yousf/BAU_May25/Top-deals-New_01.png',
  //     productImage: 'https://m.media-amazon.com/images/I/51wR3eiL46L._SL1500_.jpg',
  //     commentsVendor: '-',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B0C4PTLQ2J',
  //     name: 'American tourister',
  //     modelNo: 'American Tourister Liftoff 55 CM Small Cabin Polypropylene (PP) Hard 8 Wheels Spinner Luggage/Suitcase/Trolley Bag for Travel (Mid Blue)',
  //     description: 'Rolling Suitcase: Get through a crowded airport or down narrow airplane ailes easily with this stylish carry-on luggage with 360-degree multi-directional 8 spinner wheels, Airline Compatible with locking retractable push/pull handle Thorroughly Tested: Passed Global quality Assurance Tests like Drop test, Handle Jerk Test, Height Drop Test, Mileage Cycle Tests, Lock tests, Ovenage and Humidity Tests, Tumble tests and made with Dousaf Zippers for extra strong Zips. 3 Years Global Warranty: Travel anywhere without worry Secure and Durable: These trolley bags for travel give you ample space and made from durable polypropylene with fully lined interior; 3 digit Combination lock Convenient Side Handles: With reinforced padded top handle with an integrated side and bottom handle, this roller suitcase makes lifting and carrying your luggage easy',
  //     mrp: '7500.00',
  //     discountedPrice: '3199.00',
  //     cspPrice: '3199.00',
  //     inventoryCount: 0,
  //     points: 3199,
  //     diff: '0.00',
  //     url: 'https://www.amazon.in/American-Tourister-Polypropylene-Suitcase-Midnight/dp/B0C4PTLQ2J',
  //     category: 'Luggage',
  //     categoryImage: 'https://m.media-amazon.com/images/G/31/img21/Luggage/2025/March/AMERICAN_TOURISTERnnnnnnn_502x770._CB790605898_.jpg',
  //     subCategory: 'Bags & Luggages',
  //     subCategoryImage: 'https://m.media-amazon.com/images/I/41krtEHsy3L._AC._SR240,240.jpg',
  //     productImage: 'https://m.media-amazon.com/images/I/819Uq0vDWHL._SL1500_.jpg',
  //     commentsVendor: '-',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B0C4PR4MJZ',
  //     name: 'American tourister',
  //     modelNo: 'American Tourister Cabin Liftoff 55 CM Small Polypropylene (PP) Hard 8 Wheels Spinner Luggage/Suitcase/Trolley Bag for Travel (Olive)',
  //     description: 'Rolling Suitcase: Get through a crowded airport or down narrow airplane ailes easily with this stylish carry-on luggage with 360-degree multi-directional 8 spinner wheels, Airline Compatible with locking retractable push/pull handle Thorroughly Tested: Passed Global quality Assurance Tests like Drop test, Handle Jerk Test, Height Drop Test, Mileage Cycle Tests, Lock tests, Ovenage and Humidity Tests, Tumble tests and made with Dousaf Zippers for extra strong Zips. 3 Years Global Warranty: Travel anywhere without worry Secure and Durable: These trolley bags for travel give you ample space and made from durable polypropylene with fully lined interior; 3 digit Combination lock Convenient Side Handles: With reinforced padded top handle with an integrated side and bottom handle, this roller suitcase makes lifting and carrying your luggage easy',
  //     mrp: '7500.00',
  //     discountedPrice: '2599.00',
  //     cspPrice: '2599.00',
  //     inventoryCount: 0,
  //     points: 2599,
  //     diff: '0.00',
  //     url: 'https://www.amazon.in/American-Tourister-Liftoff-Polypropylene-Suitcase/dp/B0C4PR4MJZ',
  //     category: 'Luggage',
  //     categoryImage: 'https://m.media-amazon.com/images/I/61t83QteAEL._SX679_.jpg',
  //     subCategory: 'Bags & Luggages',
  //     subCategoryImage: 'https://m.media-amazon.com/images/I/71U7JVrbHJL._SL1500_.jpg',
  //     productImage: 'https://m.media-amazon.com/images/I/71GUiIwJjvL._SX679_.jpg',
  //     commentsVendor: 'RetailEZ Pvt Ltd',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B08CS8WX88',
  //     name: 'American tourister',
  //     modelNo: 'American Tourister Ivy Polypropylene 55 cms Black Hardsided Check-in Luggage (FO1 (0) 09 001) with TSA Lock',
  //     description: 'Scratch and impact resistant material, Extra packing space to accommodate your last-minute shopping, Extra packing space to accommodate your last-minute shopping, Colour matched 3-digit Recessed TSA lock Scratch and impact resistant material Meets most domestic check-in size requirements Colour matched 3-digit Recessed TSA lock Warranty type: Manufacturer; 3 year International warranty valid for 3 years from the original date of purchase',
  //     mrp: '7000.00',
  //     discountedPrice: '2299.00',
  //     cspPrice: '2399.00',
  //     inventoryCount: 0,
  //     points: 2299,
  //     diff: '100.00',
  //     url: 'https://www.amazon.in/American-Tourister-Polypropylene-FO1-001/dp/B08CS8WX88',
  //     category: 'Luggage',
  //     categoryImage: 'https://m.media-amazon.com/images/G/31/img21/Luggage/2025/March/AMERICAN_TOURISTERnnnnnnn_502x770._CB790605898_.jpg',
  //     subCategory: 'Bags & Luggages',
  //     subCategoryImage: 'https://m.media-amazon.com/images/I/41krtEHsy3L._AC._SR240,240.jpg',
  //     productImage: 'https://m.media-amazon.com/images/I/51Pco81tjkL._SL1080_.jpg',
  //     commentsVendor: '-',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B0CHFWKKG2',
  //     name: 'American tourister',
  //     modelNo: 'Kamiliant by American Tourister Harrier 3-Piece Luggage Set - 56, 68 & 78 cm Polypropylene Hard-Sided Spinner Suitcases With 4 Wheels (Coral Blue)',
  //     description: 'Boxy shape for maximum volume and retractable top and side handles for comfort Dual texture with matte finish and 3 digit fixed combination lock for extra security Cross ribbons in bottom compartment and U-shaped pocket for maximum packing space Sturdy and lightweight, with 360-degree smooth rolling wheels 50-50 packing makes organization and segregation easier',
  //     mrp: '29250.00',
  //     discountedPrice: '5999.00',
  //     cspPrice: '5999.00',
  //     inventoryCount: 0,
  //     points: 5999,
  //     diff: '0.00',
  //     url: 'https://www.amazon.in/Kamiliant-American-Tourister-Polypropylene-Suitcase/dp/B0CHFWKKG2',
  //     category: 'Luggage',
  //     categoryImage: 'https://m.media-amazon.com/images/G/31/img21/Luggage/2025/March/AMERICAN_TOURISTERnnnnnnn_502x770._CB790605898_.jpg',
  //     subCategory: 'Bags & Luggages',
  //     subCategoryImage: 'https://m.media-amazon.com/images/I/41krtEHsy3L._AC._SR240,240.jpg',
  //     productImage: 'https://m.media-amazon.com/images/I/510ZxHB7mQL._SL1280_.jpg',
  //     commentsVendor: '-',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B0F43X886V',
  //     name: 'Noise Power Series',
  //     modelNo: 'Noise Power Series 100W Braided Type-C To Type-C Cable, 1M, Fast Charge | Type C Cable For iPhones 15 And Later, All Type C Android Mobiles, Macbook, USB-C Laptops, Other USB-C Devices (Grey)',
  //     description: '100W fast charging at 5A: Power up laptops, phones, and more with high-speed, reliable charging. Universal compatibility: Supports a wide range of USB-C devices including Android phones, iPhones, tablets, laptops, and MacBooks. 480mbps data transfer: Transfer files, photos, and media quickly with smooth, lag-free performance. Durable braided design: Premium braided cable tested for up to 10,000 bends�built to last everyday wear and tear. 1-meter length: Ideal cable length for both on-the-go and desk setups�just the right reach for maximum convenience.',
  //     mrp: '799.00',
  //     discountedPrice: '549.00',
  //     cspPrice: '549.00',
  //     inventoryCount: 0,
  //     points: 549,
  //     diff: '0.00',
  //     url: 'https://www.amazon.in/Noise-Braided-iPhones-Android-Mobiles/dp/B0F43X886V',
  //     category: 'Mobile & Accessories',
  //     categoryImage: 'https://m.media-amazon.com/images/I/61MG5CT0D5L._SX679_.jpg',
  //     subCategory: 'Cables & Accessories',
  //     subCategoryImage: 'https://m.media-amazon.com/images/I/617aHHthsmL._SL1500_.jpg',
  //     productImage: 'https://m.media-amazon.com/images/I/61GdC+fTndL._SL1500_.jpg',
  //     commentsVendor: 'Cocoblu Retail.�Fulfilled by Amazon',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B0C9DY6SB1',
  //     name: 'Lifelong Gun Massager',
  //     modelNo: 'Lifelong Gun Massager for Pain Relief - Massage Gun Machine for Fully Body - Rechargeable with 6 Settings',
  //     description: 'Handheld gun massager for pain relief and body relaxation with 6-speed variations. 7 detachable heads flat, spherical, U-shaped, bullet, finger, cylinder and shovel, with each head targeting a different body part. 6 LED lights with alternate flash while charging. All 6 lights turn on when massager gets fully charged. Item Weight: 494 g; Unit Count Type: Count Item Weight: 494 g; Unit Count Type: Count',
  //     mrp: '3499.00',
  //     discountedPrice: '849.00',
  //     cspPrice: null,
  //     inventoryCount: 0,
  //     points: 849,
  //     diff: '0.00',
  //     url: 'https://www.amazon.in//dp/B0C9DY6SB1?th=1',
  //     category: 'Personal Care',
  //     categoryImage: 'https://m.media-amazon.com/images/I/6102sQF1HbL._SX679_.jpg',
  //     subCategory: 'Electric Massagers',
  //     subCategoryImage: 'https://m.media-amazon.com/images/I/71Uome0UqXL._SL1500_.jpg',
  //     productImage: 'https://m.media-amazon.com/images/I/71TwKcwhCRL._SL1500_.jpg',
  //     commentsVendor: '�Electronics Bazaar Store',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B08VJFZB95',
  //     name: 'Lifelong Gun Massager',
  //     modelNo: 'Lifelong Gun Massager | Percussion for Full Body Pain Relief | 6 Heads | LED Touch | 30 Speed Levels | Premium Bag | 1 Year Warranty (LLGM09, Black)',
  //     description: 'The Lifelong Gun Massager is a scientifically calibrated hand-held body massager that uses advanced percussion therapy to release pain, muscle stiffness and soreness. Included Components: 1u Massager, 1u Warranty Card, 1u Manual; Item Weight: 980 grams; Unit Count Type: Count',
  //     mrp: '5999.00',
  //     discountedPrice: '2615.00',
  //     cspPrice: '2615.00',
  //     inventoryCount: 0,
  //     points: 2615,
  //     diff: '0.00',
  //     url: 'https://www.amazon.in/Lifelong-LLGM09-Wireless-Massager-Specialized/dp/B08VJFZB95',
  //     category: 'Personal Care',
  //     categoryImage: 'https://m.media-amazon.com/images/I/61r8+Af6isL._SX679_.jpg',
  //     subCategory: 'Electric Massagers',
  //     subCategoryImage: 'https://m.media-amazon.com/images/I/71Xw7NVXCsL._SX679_.jpg',
  //     productImage: 'https://m.media-amazon.com/images/I/61A3IvhIUKL._SX679_.jpg',
  //     commentsVendor: 'Electronics Bazaar Store',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B06ZZWKV1V',
  //     name: 'Lifelong Foot Massager',
  //     modelNo: 'Lifelong Foot Massager Machine for Pain Relief with Kneading function - Also used as Leg Calf Massager - Corded Electric Foot Massage Machine for Home with Customizable Settings (LLM72, Brown)',
  //     description: 'Flexible rubber kneading pads that give the feeling of a real massage;4 automatic programs and 3 custom massage modes Powerful 40W motor, AC-220-240V, 50 Hz, Auto 15 minutes shut-off.;Helps relieve fatigue and improves overall wellness. Power Source: Power Cable. Massager Method: Vibration. Not subject to any time or space constraint: foot massage can be a part of your daily regime;The combination of the unique shape, design and distribution is perfect for relief Easily adjustable speed and steering;Simple, convenient, reliable, and durable to use; Perfect for you when you want to relax and enjoy some much-needed luxury Unit Count Type: Count; Warranty Description: 1 Year Warranty From The Date Of Purchase1 Year Warranty From The Date Of Purchase; Item Weight: 5600.0 Grams; Included Components: 1massager,1 Manual,1 Warranty Card',
  //     mrp: '16300.00',
  //     discountedPrice: '4999.00',
  //     cspPrice: null,
  //     inventoryCount: 0,
  //     points: 4999,
  //     diff: '0.00',
  //     url: 'https://www.amazon.in/dp/B06ZZWKV1V?th=1',
  //     category: 'Personal Care',
  //     categoryImage: 'https://m.media-amazon.com/images/I/6102sQF1HbL._SX679_.jpg',
  //     subCategory: 'Electric Massagers',
  //     subCategoryImage: 'https://m.media-amazon.com/images/I/814L4vGiQtL._SL1500_.jpg',
  //     productImage: 'https://m.media-amazon.com/images/I/71B3LvacqoL._SL1500_.jpg',
  //     commentsVendor: '�Electronics Bazaar Store',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B0C9ZQZ8PH',
  //     name: 'Fujifilm Instax Mini Camera',
  //     modelNo: 'Fujifilm Instax Mini 12 Happiness Box with 40 Films - Purple',
  //     description: 'ake bright photos no matter where and when',
  //     mrp: null,
  //     discountedPrice: '7899.00',
  //     cspPrice: '8968.00',
  //     inventoryCount: 0,
  //     points: 7899,
  //     diff: '1069.00',
  //     url: 'https://www.amazon.in/dp/B0C9ZQZ8PH',
  //     category: 'Cameras & Photography',
  //     categoryImage: 'https://m.media-amazon.com/images/I/5155FslZrqL.AC_SX500.jpg',
  //     subCategory: 'Film Cameras',
  //     subCategoryImage: 'https://m.media-amazon.com/images/I/41IiNH9wQHL._AC._SR240,240.jpg',
  //     productImage: 'https://m.media-amazon.com/images/I/61eHPXgzMGL._SL1200_.jpg',
  //     commentsVendor: '-',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B0BX8V53KM',
  //     name: 'Fujifilm Instax Mini 12',
  //     modelNo: 'Fujifilm Instax Mini 12 Gift Box with 10 Shots- Green',
  //     description: 'Portable Design: Compact and lightweight, ideal for on-the-go photography. User-Friendly: Simple controls make it accessible for all ages and skill levels. Perfect Gift: An exciting and thoughtful present for any occasion. Country of Origin: China Warranty: Fujifilm India 1 Year Warranty',
  //     mrp: '8499.00',
  //     discountedPrice: '7626.00',
  //     cspPrice: '8999.00',
  //     inventoryCount: 0,
  //     points: 7626,
  //     diff: '1373.00',
  //     url: 'https://www.amazon.in/dp/B0C9CKHC3Y?th=1',
  //     category: 'Cameras & Photography',
  //     categoryImage: 'https://m.media-amazon.com/images/I/5155FslZrqL.AC_SX500.jpg',
  //     subCategory: 'Film Cameras',
  //     subCategoryImage: 'https://m.media-amazon.com/images/I/41IiNH9wQHL._AC._SR240,240.jpg',
  //     productImage: 'https://m.media-amazon.com/images/I/61+jaO2GeDL._SL1500_.jpg',
  //     commentsVendor: '-',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B07DQ5ZH1D',
  //     name: 'SEAGATE external hard drive 1TB',
  //     modelNo: 'Seagate Portable 1TB External HDD � USB 3.0 for PC Laptop and Mac (STGX1000400)',
  //     description: 'Digital Storage Capacity - 1TB; Easily store and access 1TB of content on the go with the Seagate Portable Drive, a USB external hard drive Form Factor - Portable, Hardware Interface - USB 3.0, Drive RPM - 5400 Designed to work with Windows or Mac computers, this external hard drive makes backup a snap � just drag-and-drop! To get set up, connect the portable hard drive to a computer for automatic recognition � no software required Actual storage capacity may vary due to differences between decimal and binary calculations.',
  //     mrp: '6999.00',
  //     discountedPrice: '5479.00',
  //     cspPrice: '5499.00',
  //     inventoryCount: 0,
  //     points: 5479,
  //     diff: '20.00',
  //     url: 'https://www.amazon.in/Seagate-Portable-External-Hard-Drive/dp/B07DQ5ZH1D',
  //     category: 'Computers & Accessories',
  //     categoryImage: 'https://m.media-amazon.com/images/G/31/img22/pcacc/pd25/clp/bb/Mouse1_540x700._CB788685648_.jpg',
  //     subCategory: 'Hard disks',
  //     subCategoryImage: 'https://m.media-amazon.com/images/I/814SDu24dnL._AC._SR360,460.jpg',
  //     productImage: 'https://m.media-amazon.com/images/I/61V12HUGZ7L._SL1500_.jpg',
  //     commentsVendor: '-',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B08ZJG6TVT',
  //     name: 'SEAGATE external hard drive 2TB',
  //     modelNo: 'Seagate Expansion 2TB External HDD - USB 3.0 for Windows and Mac with 3 yr Data Recovery Services, Portable Hard Drive (STKM2000400)',
  //     description: 'Get an extra layer of protection for your data with the included 3 year Rescue Data Recovery Services. Sleek and simple portable drive design for taking photos, movies, music, and more on-the-go Automatic recognition of Windows and Mac computers for simple setup (Reformatting required for use with Time Machine) Drag-and-drop file saving USB 3.0 powered',
  //     mrp: '8699.00',
  //     discountedPrice: '7200.00',
  //     cspPrice: '7528.00',
  //     inventoryCount: 0,
  //     points: 7200,
  //     diff: '328.00',
  //     url: 'https://www.amazon.in/Seagate-Expansion-2TB-External-HDD/dp/B08ZJG6TVT',
  //     category: 'Computers & Accessories',
  //     categoryImage: 'https://m.media-amazon.com/images/G/31/img22/pcacc/pd25/clp/bb/Mouse1_540x700._CB788685648_.jpg',
  //     subCategory: 'Hard disks',
  //     subCategoryImage: 'https://m.media-amazon.com/images/I/814SDu24dnL._AC._SR360,460.jpg',
  //     productImage: 'https://m.media-amazon.com/images/I/814SDu24dnL._SL1500_.jpg',
  //     commentsVendor: '-',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B0D7M3QQQM',
  //     name: 'Samsung buds 3 pro',
  //     modelNo: 'Samsung Galaxy Buds 3 Pro (White) with Galaxy AI | Adaptive ANC | Real-time Interpreter | 24-bit Hi-Fi Audio | Up to 37H Battery | IP57',
  //     description: '[DESIGN] Galaxy Buds3 Pro\'s iconic new in-ear blade design with LED lighting features to express yourself & impress those around you. The sleek design is also functional - simply swipe up/down on the blade to adjust volume, and pinch to play/pause/skip. We make it easy. [COMFORT] Galaxy Buds 3 Pro is designed through 3D ear data analyses & simulations to deliver optimal comfort & fit. The soft rubber tips ensure that earbuds stay secured in your ear giving you ultimate comfort & listening experience [Hi-Fi AUDIO] The sound on our Galaxy Buds3 Pro is crystal clear & easily matches studio quality. The 24bit/96kHz support & enhanced two-way speaker with dual amp work in harmony to delivery truly pristine & immersive audio experience tailored to your preferences [PERFECT FIT] With Galaxy Buds3 Pro, say goodbye to constantly adjusting your earbuds to find that pitch-perfect sound experience. It intelligently tracks & analyses the sound inside & outside your ears to help apply the most suitable EQ & ANC algorithms real-time, allowing for an optimized ANC experience [INTELLIGENT SOUND] Listen to high quality optimized sound in real-time with sounds tailored to your surroundings. Galaxy Buds3 Pro powered by Galaxy AI listens & responds to your environment by eliminating unwanted noises. And what\'s more, our Galaxy Buds3 Pro can intelligently help allow speech or even safety sirens go through to your ears selectively so you can stay immersed both inside & out',
  //     mrp: '24999.00',
  //     discountedPrice: '16988.00',
  //     cspPrice: '17055.00',
  //     inventoryCount: 0,
  //     points: 16988,
  //     diff: '67.00',
  //     url: 'https://www.amazon.in/Samsung-Adaptive-Real-Time-Interpreter-Battery/dp/B0D7M3QQQM',
  //     category: 'Mobile & Accessories',
  //     categoryImage: 'https://m.media-amazon.com/images/G/31/img23/Wireless/nbshagun/PD25/7thJuly/1242xDealreveal_2_02._CB790215406_.jpg',
  //     subCategory: 'Earbuds',
  //     subCategoryImage: 'https://m.media-amazon.com/images/I/61hi1Qz5AaL._SL1500_.jpg',
  //     productImage: 'https://m.media-amazon.com/images/I/61fDBCned+L._SL1500_.jpg',
  //     commentsVendor: '-',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B09RKFPY9F',
  //     name: 'Garment steamer & Irons',
  //     modelNo: 'Inalsa Garment Steamer 1250 Watts Steam Iron For Clothes-Vertical & Horizontal ironing | Compact & Foldable',
  //     description: 'WRINKLE ERASER- Running late? Ready in just 90 SECONDS, you can take out even the toughest wrinkles in no time. This steamer will de-wrinkle and sanitize not only your clothes but curtains & drapery, tablecloths, bedding, upholstery, toys, and much more. With 1250W and rapid even heat technology, get better performance and perfect results every time!! PERFECT RESULT - Ceramic coated steam plate enables even heat distribution and fast heating for perfect results every time IRON THE WAY YOU WANT-Vertical Steam removes creases in hanging fabrics and slide the steamer across the garments on the table to get your clothes ready in no time. AUTOMATIC CONTINUOUS STEAM- Travel Pro releases powerful continuous 22g/min steam & heats up in just 26 seconds. It generates a wrinkle-removing steam flow to ensure professional results: fast ironing and efficient removal of the most stubborn creases. SAFE, SECURE & USER-FRIENDLY CONFIGURATION - No more worrying when you run out of water during steaming. When the water tank is empty the steamer will automatically shut off, preventing the unit from overheating and keeping you safe. The power indicator light indicates when the appliance is on. Big water inlet hole & large water tank of 130mL facilitates easy & super-fast filling of the water tank. Iron more clothes with fewer refills!! DETACHABLE FABRIC BRUSH AND BIG NOZZLE- The steamer comes with detachable fabric & steam brush which helps you with thicker garments & delivers better steam penetration giving a smoother finish. With Big sized steam, the nozzle achieves results quickly. Includes a convenient storage bag that helps you keep this garment steamer in proper place when not in use. Warranty: 1 year�s warranty by the manufacturer from the date of purchase',
  //     mrp: '4095.00',
  //     discountedPrice: '1800.00',
  //     cspPrice: '1994.00',
  //     inventoryCount: 0,
  //     points: 1800,
  //     diff: '194.00',
  //     url: 'https://www.amazon.in/INALSA-Garment-Steamer-Clothes-Steam/dp/B09RKFPY9F/',
  //     category: 'Home & Kitchen',
  //     categoryImage: 'https://m.media-amazon.com/images/G/31/OHL/PD25/themestore/final/Monsoon-essentials-8._CB791372277_.jpg',
  //     subCategory: 'Irons',
  //     subCategoryImage: 'https://m.media-amazon.com/images/I/31i0onyBe+L._AC._SR120,120.jpg',
  //     productImage: 'https://m.media-amazon.com/images/I/512XkIhDsBL._SL1200_.jpg',
  //     commentsVendor: '-',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B09B7WWJ3Z',
  //     name: 'Crompton Iron',
  //     modelNo: 'Crompton Greaves Rhino Plus 1250 Watt Blue Heavy weight Dry Iron with Golden American Heritage Coating, Large (ACGEI-RHINOPLUS)',
  //     description: 'PRODUCT : Crompton Rhino Plus 125 Watt Heavy weight Dry Iron, 1.8 kg; TECHNICAL SPECIFICATIONS : Watts 125 W, Dimesnions - 28*135*145 mm (L X W X H) mm WARRANTY: 2 year ; Provided by Crompton from date of purchase. For any questions, please contact us on 18 419 55 (Toll free) COATING : Rhino Plus comes with Golden American Heritage Coating for Easy gliding and Long Life CONVENIENT AND EASY TO USE : 36? swivel cord for easy cord movement and 6 pre-set fabric settings with variable temperature control Care Instructions: After Using The Iron, Let It Cool Off Before Keeping It In Its Storage Place',
  //     mrp: null,
  //     discountedPrice: '1201.00',
  //     cspPrice: '1189.00',
  //     inventoryCount: 0,
  //     points: 1201,
  //     diff: '-12.00',
  //     url: 'https://www.amazon.in/Cello-Opalware-Dazzle-Fiesta-Service/dp/B09B7WWJ3Z?th=1',
  //     category: 'Home & Kitchen',
  //     categoryImage: 'https://m.media-amazon.com/images/G/31/OHL/PD25/themestore/final/Monsoon-essentials-8._CB791372277_.jpg',
  //     subCategory: 'Irons',
  //     subCategoryImage: 'https://m.media-amazon.com/images/I/31i0onyBe+L._AC._SR120,120.jpg',
  //     productImage: 'https://m.media-amazon.com/images/I/61lQmyh+XmL._SL1500_.jpg',
  //     commentsVendor: 'ALBERTO INFOTECH',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B07DDSHTG8',
  //     name: 'Crompton Rhino',
  //     modelNo: 'Crompton Rhino 1000-Watt Heavy weight Dry Iron with Non Stick Teflon Coating (White/Silver)',
  //     description: 'PRODUCT: Crompton\'s dry iron with powerful heating element and shockproof plastic handle TECHNICAL SPECIFICATIONS: Wattage 1 W; Dimensions 262 X 11 X 128 (L X W X H) mm; Weight 1.5 Kg WARRANTY: 2 years; Provided by Crompton from date of purchase. For any questions, please contact us on 18 419 55 (Toll free) NON-STICK COATING: Two layer of Non-stick Teflon coating for smooth glide and durability, suitable for all fabrics CONVENIENT AND EASY TO USE: 36? swivel cord for easy cord movement and 6 pre-set fabric settings with variable temperature control',
  //     mrp: null,
  //     discountedPrice: '1067.00',
  //     cspPrice: null,
  //     inventoryCount: 0,
  //     points: 1067,
  //     diff: '0.00',
  //     url: 'https://www.amazon.in/Crompton-Rhino-1000-Watt-White-Silver/dp/B07DDSHTG8',
  //     category: 'Home & Kitchen',
  //     categoryImage: 'https://m.media-amazon.com/images/G/31/OHL/PD25/themestore/final/Monsoon-essentials-8._CB791372277_.jpg',
  //     subCategory: 'Irons',
  //     subCategoryImage: 'https://m.media-amazon.com/images/I/61M-d-7Dc8L._SL1500_.jpg',
  //     productImage: 'https://m.media-amazon.com/images/I/818tiPbSFPL._SL1500_.jpg',
  //     commentsVendor: 'ALBERTO INFOTECH',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B0D9LRSKF1',
  //     name: 'Inalsa Iron',
  //     modelNo: 'INALSA Steam Iron 2400 Watt|Quick Heat Up with up to 30g/min steam|100 gm/min Steam Boost|Scratch Resistant Ceramic Soleplate|Vertical steam, Anti Drip &Anti Calc Functions,2 Year Warranty(Onyx 2400)',
  //     description: 'Smart steam iron - Innovative Power Indicator Light on the handle to indicate operational readiness: -Red light while heating -Green light when ready to iron Scratch resistant, easy glide ceramic sole plate. 36 degree swivel cord make ironing strokes comfortable, effortless and quick Self-Cleaning system to prevent clogging of steam vents Horizontal and Vertical Steam Burst function for easy removal of wrinkle free',
  //     mrp: '4795.00',
  //     discountedPrice: '2006.00',
  //     cspPrice: '2180.00',
  //     inventoryCount: 0,
  //     points: 2006,
  //     diff: '174.00',
  //     url: 'https://www.amazon.in/dp/B0D9LRSKF1?th=1',
  //     category: 'Home & Kitchen',
  //     categoryImage: 'https://m.media-amazon.com/images/G/31/OHL/PD25/themestore/final/Monsoon-essentials-8._CB791372277_.jpg',
  //     subCategory: 'Irons',
  //     subCategoryImage: 'https://m.media-amazon.com/images/I/31i0onyBe+L._AC._SR120,120.jpg',
  //     productImage: 'https://m.media-amazon.com/images/I/61xqzyFCJ7L._SL1200_.jpg',
  //     commentsVendor: '-',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B094JCM5X3',
  //     name: 'Wonderchef Cookware',
  //     modelNo: 'Wonderchef Platinum Plus Non-Stick Cookware Set Of 4|Kadhai With Glass Lid 24Cm,Fry Pan 24Cm&Dosa Tawa 25Cm|Cool-Touch Bakelite Handle',
  //     description: 'Make wholesome nutritious healthy dishes including dosas, chillas, gravies, pancakes,stir-fried vegetables, and much more. Designer pans made with pure grade virgin aluminium for quick and even heat distribution. Health-friendly, 1% PFOA free, heavy metal and nickel-free Meta Tuff 5 layer non-stick coating for daily oil-free cooking. Ergonomically designed cool-touch Bakelite handles and knob provide a firm grip. Suitable for use on hot plate, hobs, hob tops, gas stove and ceramic plate.Wonderchef products are inspired by Italian Design and adhere to German Quality Standards. They are covered by Reliable Wonderchef Warranty.',
  //     mrp: '3500.00',
  //     discountedPrice: '1429.00',
  //     cspPrice: '1499.00',
  //     inventoryCount: 0,
  //     points: 1429,
  //     diff: '70.00',
  //     url: 'https://www.amazon.in/dp/B094JCM5X3',
  //     category: 'Home & Kitchen',
  //     categoryImage: 'https://m.media-amazon.com/images/G/31/OHL/PD25/themestore/final/Monsoon-essentials-8._CB791372277_.jpg',
  //     subCategory: 'Kitchen & Dining',
  //     subCategoryImage: 'https://m.media-amazon.com/images/G/31/CookwareDining/PD25/MyGate/image_125._CB790367795_.png',
  //     productImage: 'https://m.media-amazon.com/images/I/51QyvgxWUGS._SL1100_.jpg',
  //     commentsVendor: '-',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B01LYBZX6Y',
  //     name: 'Cello Canister',
  //     modelNo: 'CELLO Checkers Pet Plastic Airtight Canister Set | Food grade and BPA free canisters | Air tight seal & Stackable Transparent | 300ml x 6, 650ml x 6, 1200 x 6, Set of 18',
  //     description: 'Airtight Seal: The airtight seal mechanism preserves the freshness and flavor of your food items, whether it\'s pasta, cereal, rice, or snacks. Keep your ingredients at their best for longer periods. Durable & Shatterproof: Built to withstand the demands of everyday use, these canisters are both durable and shatterproof. Rest assured, they can handle the rigors of a busy kitchen without breaking. Food-Grade and BPA-Free: The Cello Checkers Canister Set is made from food-grade PET plastic, ensuring the safety of your stored ingredients. These canisters are also free from BPA (Bisphenol A), a harmful chemical often found in plastics. Odor-Free Storage: These canisters are designed to be free from any kind of odor retention. Your stored items will remain untainted by external odors, ensuring the purity of your ingredients. Versatile Usage: Ideal for storing a wide range of dry food items, these canisters are versatile additions to your kitchen. Use them for pasta, rice, coffee beans, sugar, flour, snacks, and more.',
  //     mrp: '1119.00',
  //     discountedPrice: '529.00',
  //     cspPrice: '579.00',
  //     inventoryCount: 0,
  //     points: 529,
  //     diff: '50.00',
  //     url: 'https://www.amazon.in/dp/B01LYBZX6Y?th=1',
  //     category: 'Home & Kitchen',
  //     categoryImage: 'https://m.media-amazon.com/images/G/31/OHL/PD25/themestore/final/Monsoon-essentials-8._CB791372277_.jpg',
  //     subCategory: 'Kitchen & Dining',
  //     subCategoryImage: 'https://m.media-amazon.com/images/G/31/CookwareDining/PD25/MyGate/image_125._CB790367795_.png',
  //     productImage: 'https://m.media-amazon.com/images/I/71PjqF8xEFL._SL1500_.jpg',
  //     commentsVendor: '-',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B0BC982MFC',
  //     name: 'Cello Container',
  //     modelNo: 'Cello Clario Plastic Storage Container Set of 24 | Wide Mouth Container | Stackable Lid & Air Tight Seal | (8 Unit- 300ml; 8 Units 650ml; 8 Units- 1200mll) | Clear, Blue',
  //     description: 'Clario container set is made from 100% food-grade material that is hygenic and safe to use. It is BPA free Stackable lid: These containers can be easily stacked one over other when in use and nested one inside the other when not in use, this helps save space and organize your kitchen. Air Tight Seal: These Containers have an air tight seal that completely locks the Crisp & flavour of the contents you put in as does not lose moisture. The taste and nutritive value of the contents remains intact for a long time making the containers very appropriate for storing dry food, pulses, and spices. Wide mouth container: These containers have a wide opening mouth that makes it simpler to access the things stored inside, this key feature also makes it easy to clean the container. See through Body: These containers have a transparent body that makes it easy to identify the contents without having to open each containers. The material used in this container is odourless and the shatterproof body makes the container impact resistant.',
  //     mrp: '2049.00',
  //     discountedPrice: '829.00',
  //     cspPrice: '899.00',
  //     inventoryCount: 0,
  //     points: 829,
  //     diff: '70.00',
  //     url: 'https://www.amazon.in/dp/B0BC982MFC?th=1',
  //     category: 'Home & Kitchen',
  //     categoryImage: 'https://m.media-amazon.com/images/G/31/OHL/PD25/themestore/final/Monsoon-essentials-8._CB791372277_.jpg',
  //     subCategory: 'Kitchen & Dining',
  //     subCategoryImage: 'https://m.media-amazon.com/images/G/31/CookwareDining/PD25/MyGate/image_125._CB790367795_.png',
  //     productImage: 'https://m.media-amazon.com/images/I/81mqkkMLxAL._SL1500_.jpg',
  //     commentsVendor: '-',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B083FVD1GS',
  //     name: 'Cello Lunch box',
  //     modelNo: 'CELLO Steelox Stainless Steel Lunch Box Set of 5 with Bag (Capacities - 50ml, 225ml, 375ml, 550ml, 375ml Tumbler), Blue | Tiffin Box with Jacket',
  //     description: 'Comprehensive Lunch Set: The Cello Steelox Lunch Box Set offers a complete meal solution with its 5 containers, each having a generous capacity. This allows you to carry a variety of dishes, ensuring a satisfying meal experience. Convenient Bag Included: The set comes with a thoughtfully designed bag, Insulated fabric jacket which keeps food warm for long. The jacket is easy to clean and quick dry. It also has handles for easy carrying. Stainless Steel Construction: Crafted from durable material, these tiffin boxes are built to withstand regular use. Their robust construction ensures they can endure the rigors of daily life, making them a reliable choice for your meal needs. Leakproof Design: The containers are airtight that completely lock the crisp and flavor of the contents you put in as they does not lose moisture. The Containers have easy lid locking system which helps from spilling item. Usage: Experience the ultimate convenience of our versatile lunch box, designed for seamless usage in various settings, whether it\'s school, picnics, or family outings.',
  //     mrp: '1019.00',
  //     discountedPrice: '625.00',
  //     cspPrice: '679.00',
  //     inventoryCount: 0,
  //     points: 625,
  //     diff: '54.00',
  //     url: 'https://www.amazon.in/dp/B083FVD1GS?th=1',
  //     category: 'Home & Kitchen',
  //     categoryImage: 'https://m.media-amazon.com/images/G/31/OHL/PD25/themestore/final/Monsoon-essentials-8._CB791372277_.jpg',
  //     subCategory: 'Kitchen & Dining',
  //     subCategoryImage: 'https://m.media-amazon.com/images/G/31/CookwareDining/PD25/MyGate/image_125._CB790367795_.png',
  //     productImage: 'https://m.media-amazon.com/images/I/71mjdHXaJGL._SL1500_.jpg',
  //     commentsVendor: '-',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B0DPHY3XZB',
  //     name: 'Wonderchef Nonstick cookware',
  //     modelNo: 'Wonderchef Sienna 4Pcs CW set Black Granite',
  //     description: 'Versatile Cookware Set: Kadhai, Fry Pan and Dosa Tawa let you cook various dishes like cutlets, dosas, omelettes, curries and gravies, and more with just one cookware set. Healthy Cooking Made Easy: Meta Tuff non-stick coating ensures minimal oil use for healthy cooking, excellent abrasion resistance and is 100% free from PFOA. Energy-Efficient: Pure grade virgin aluminium offers 9-times better heat conduction, cooking your meals faster, saving energy and me. Compatible with All Cooking Surfaces: Use on gas cooktops, induction and infrared cooktops for maximum flexibility in your kitchen. Comfortable & Stylish: Soft touch handles provide a firm grip and utmost convenience. Enjoy cooking with comfort and ease. Warranty: Wonderchef products are inspired by Italian Design and adhere to German Quality Standards. This product is covered by 2- year warranty. T&C apply.',
  //     mrp: '2049.00',
  //     discountedPrice: '1918.00',
  //     cspPrice: '2049.00',
  //     inventoryCount: 0,
  //     points: 1918,
  //     diff: '131.00',
  //     url: 'https://www.amazon.in/dp/B0DPHY3XZB?th=1',
  //     category: 'Home & Kitchen',
  //     categoryImage: 'https://m.media-amazon.com/images/G/31/OHL/PD25/themestore/final/Monsoon-essentials-8._CB791372277_.jpg',
  //     subCategory: 'Kitchen & Dining',
  //     subCategoryImage: 'https://m.media-amazon.com/images/G/31/CookwareDining/PD25/MyGate/image_125._CB790367795_.png',
  //     productImage: 'https://m.media-amazon.com/images/I/71jomDVyKNL._SL1500_.jpg',
  //     commentsVendor: '-',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B0B4DY7TD6',
  //     name: 'Prestige Omega Deluxe Non-Stick Cookware',
  //     modelNo: 'Prestige Omega Deluxe Non-Stick Cookware 3 Pc Set |PFOA Free 5-Layer Coating | Omni Tawa 25 cm | Fry Pan 24 cm | Kadai with Glass Lid 24 cm | Brown |�',
  //     description: 'India\'s First Non-Stick Cookware with 5-Layers Coating Durable Granite-finish Coating Two-layer Metallic Finish Exterior Superior Non-stick Surface Dishwasher Safe Stay-cool Bakelite Handles Gas Stove and Induction Compatible PFOA Free',
  //     mrp: '3895.00',
  //     discountedPrice: '1405.00',
  //     cspPrice: '1405.00',
  //     inventoryCount: 0,
  //     points: 1405,
  //     diff: '0.00',
  //     url: 'https://www.amazon.in/Prestige-Deluxe-Granite-Induction-Cookware/dp/B0B4DY7TD6',
  //     category: 'Home & Kitchen',
  //     categoryImage: 'https://m.media-amazon.com/images/I/61eTcL4tdkL._SX679_.jpg',
  //     subCategory: 'Kitchen & Dining',
  //     subCategoryImage: 'https://m.media-amazon.com/images/I/51EvQJJOeVL.jpg',
  //     productImage: 'https://m.media-amazon.com/images/I/418P+zkmvpL.jpg',
  //     commentsVendor: 'RetailEZ Pvt Ltd',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B0DF23RXX2',
  //     name: 'Wonderchef Nonstick cookware',
  //     modelNo: 'Wonderchef Milano Set',
  //     description: 'VERSATILE 4-PIECE SET - Kadhai with Lid 24 cm, Fry Pan 24 cm, Dosa Tawa 28 cm let you cook various dishes like cutlets, curries, dosas, omelettes, and more with just one cookware set. HEALTHY COOKING MADE EASY: MetaTuff 5-layer non-stick coating ensures minimal oil use, excellent abrasion resistance and is 100% free from PFOA. ENERGY-EFFICIENT: Pure grade virgin aluminium offers 9-times better heat conduction, cooking your meals faster while saving energy and time. COMPATIBLE WITH ALL COOKING SURFACES: Use on gas cooktops, hot plates, infrared cooktops, and ceramic cooktops for maximum flexibility in your kitchen. COMFORTABLE & STYLISH: Cool touch Bakelite handles provide a firm grip and utmost convenience. Enjoy cooking with comfort and ease. CONVENIENT: Easy to clean and dishwasher safe. Lightweight for daily use. WARRANTY: Wonderchef products are inspired by Italian Design and adhere to German Quality Standards. This product is covered by 2-year warranty. T&C apply.',
  //     mrp: '2025.00',
  //     discountedPrice: '1900.00',
  //     cspPrice: '2025.00',
  //     inventoryCount: 0,
  //     points: 1900,
  //     diff: '125.00',
  //     url: 'https://www.amazon.in/dp/B0DF23RXX2?th=1',
  //     category: 'Home & Kitchen',
  //     categoryImage: 'https://m.media-amazon.com/images/G/31/OHL/PD25/themestore/final/Monsoon-essentials-8._CB791372277_.jpg',
  //     subCategory: 'Kitchen & Dining',
  //     subCategoryImage: 'https://m.media-amazon.com/images/G/31/CookwareDining/PD25/MyGate/image_125._CB790367795_.png',
  //     productImage: 'https://m.media-amazon.com/images/I/71NsxP19s8L._SL1500_.jpg',
  //     commentsVendor: '-',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B09QPQPPK2',
  //     name: 'Wonderchef Valencia Non-Stick Cookware',
  //     modelNo: 'Wonderchef Valencia Non-Stick Cookware 4 Piece Set | Kadhai with Lid 24 cm, Fry Pan 24 cm, Dosa Tawa 28 cm | Pure Grade Aluminium| PFOA Free| 2 Years...',
  //     description: 'VERSATILE 4-PIECE SET - Kadhai with Lid 24 cm, Fry Pan 24 cm, Dosa Tawa 28 cm let you cook various dishes like cutlets, curries, dosas, omelets, and more with just one cookware set. HEALTHY COOKING MADE EASY: MetaTuff 5-layer non-stick coating ensures minimal oil use, excellent abrasion resistance and is 100% free from PFOA, lead, cadmium, nickel, and arsenic and approved by USFDA and European Food Safety Authority (EFSA). VERSATILE: Cook delicious cutlets, stir-fry veggies, curries, dosas, uttapams, sandwiches, omelets, and parathas with the fry pan, kadhai, and tawa. Complete your cookware needs with Valencia set! ENERGY-EFFICIENT: Pure grade virgin aluminium offers 9-times better heat conduction, cooking your meals faster while saving energy and time. COMPATIBLE WITH ALL COOKING SURFACES - Use on gas cooktopS, hot plates, infrared cooktops, and ceramic cooktops for maximum flexibility in your kitchen',
  //     mrp: '4000.00',
  //     discountedPrice: '1030.00',
  //     cspPrice: '1030.00',
  //     inventoryCount: 0,
  //     points: 1030,
  //     diff: '0.00',
  //     url: 'https://www.amazon.in/Wonderchef-Non-Stick-Induction-Aluminium-Black/dp/B09QPQPPK2',
  //     category: 'Home & Kitchen',
  //     categoryImage: 'https://m.media-amazon.com/images/I/41Q5gBIGLwL._SX679_.jpg',
  //     subCategory: 'Kitchen & Dining',
  //     subCategoryImage: 'https://m.media-amazon.com/images/I/61iL8PK0oJL._SL1100_.jpg',
  //     productImage: 'https://m.media-amazon.com/images/I/61ZeW2f5CJL._SL1100_.jpg',
  //     commentsVendor: 'RetailEZ Pvt Ltd.',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B0CHFLS7FF',
  //     name: 'OMEGA Nonstick cookware',
  //     modelNo: 'OMEGA DELUXE PLUS 3PC SET BYK',
  //     description: 'Metal Spoon Friendly- Metal Spoon Friendly Non-Stick coating for hassle free cooking Induction Base-Gas and Induction Compatible- Indias first cookware which is both Induction Cook-top and Gas Stove Compatible PFOA Free; Glass Lid; Healthy Durable Handles Omni Tawa 25 cm- 1U, Fry Pan 24 cm/1.7L -1 U & Kadai with Glass Lid 24 cm/2.4 L-1U Non-Stick Cookware Color-Black and Red',
  //     mrp: '4025.00',
  //     discountedPrice: '3500.00',
  //     cspPrice: '3540.00',
  //     inventoryCount: 0,
  //     points: 3500,
  //     diff: '40.00',
  //     url: 'https://www.amazon.in/dp/B0CHFLS7FF?th=1',
  //     category: 'Home & Kitchen',
  //     categoryImage: 'https://m.media-amazon.com/images/G/31/OHL/PD25/themestore/final/Monsoon-essentials-8._CB791372277_.jpg',
  //     subCategory: 'Kitchen & Dining',
  //     subCategoryImage: 'https://m.media-amazon.com/images/G/31/CookwareDining/PD25/MyGate/image_125._CB790367795_.png',
  //     productImage: 'https://m.media-amazon.com/images/I/61lQdQjtSwL._SL1500_.jpg',
  //     commentsVendor: '-',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B01H932RC4',
  //     name: 'Prestige Nonstick cookware',
  //     modelNo: 'PRESTIGE DELUXE GRANITE-BYK',
  //     description: 'Made using German technology and it lasts three times longer than ordinary non-stick cookware. Special spatter-coated surface looks new for longer and is also metal-spoon friendly Can be used on both gas and induction cook-tops. Durable Granite-finish Coating Dishwasher Safe Superior Non-stick Surface Cook & Serve Warranty : 2 Years Manufacturer Warranty',
  //     mrp: '3800.00',
  //     discountedPrice: '2199.00',
  //     cspPrice: '2590.00',
  //     inventoryCount: 0,
  //     points: 2199,
  //     diff: '391.00',
  //     url: 'https://www.amazon.in/dp/B01H932RC4',
  //     category: 'Home & Kitchen',
  //     categoryImage: 'https://m.media-amazon.com/images/G/31/OHL/PD25/themestore/final/Monsoon-essentials-8._CB791372277_.jpg',
  //     subCategory: 'Kitchen & Dining',
  //     subCategoryImage: 'https://m.media-amazon.com/images/G/31/CookwareDining/PD25/MyGate/image_125._CB790367795_.png',
  //     productImage: 'https://m.media-amazon.com/images/I/6166M3Wl9OL._SL1500_.jpg',
  //     commentsVendor: '-',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B01N1TZ4J5',
  //     name: 'Wonderchef OTG',
  //     modelNo: 'Wonderchef Oven Toaster Griller (OTG) - 19 litres, Black - with Auto-Shut Off, Heat-Resistant Tempered Glass, Multi-Stage Heat Selection | Bake, Grill, Roast | Easy clean',
  //     description: 'Bake delicious cakes, loaded pizzas, and the softest breads; roast chicken, grill vegetables and introduce a variety of new dishes in your kitchen conveniently High-efficiency stainless steel heating elements positioned on the top and bottom help evenly toast, bake, brown and reheat to perfection Auto-shut off timer function with ready bell to prevent over-cooking and under-cooking Heat-resistant tempered glass window can withstand high temperature & is safe to use Removable crumb tray for easy cleaning Full compact metal black housing High temperature control range up to 250 degrees to cook any dish Open your kitchen to a whole new world of quick, easy and smart cooking like a Masterchef every day! Cooking capability: Baking, Grilling, Toasting; Heat-resistant tempered glass window Includes OTG, Chromed wire rack, Baking and grilling tray and tray handle Capacity: 19 litres, Suitable for 2-3 people; Dimensions (mm): 475*355*337 mm Power Consumption: 220-230V~50Hz~1280W; Warranty: 2 years Material: Stainless Steel; Heating Type: Grill and Control Type: Rotating Knob; Heating element selector: top or bottom Wonderchef products are inspired by Italian Design and adhere to German Quality Standards. They are covered by Reliable Wonderchef Warranty, T&C apply',
  //     mrp: null,
  //     discountedPrice: '3884.00',
  //     cspPrice: '4499.00',
  //     inventoryCount: 0,
  //     points: 3884,
  //     diff: '615.00',
  //     url: 'https://www.amazon.in/Cello-Opalware-Dazzle-Fiesta-Service/dp/B01N1TZ4J5/?th=1',
  //     category: 'Home & Kitchen',
  //     categoryImage: 'https://m.media-amazon.com/images/G/31/OHL/PD25/themestore/final/Monsoon-essentials-8._CB791372277_.jpg',
  //     subCategory: 'Kitchen & Dining',
  //     subCategoryImage: 'https://m.media-amazon.com/images/G/31/CookwareDining/PD25/MyGate/image_125._CB790367795_.png',
  //     productImage: 'https://m.media-amazon.com/images/I/61Gc36RikXL._SL1100_.jpg',
  //     commentsVendor: '-',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B08V564T6R',
  //     name: 'Cello Serveware',
  //     modelNo: 'Cello Opalware Dazzle Tropical Lagoon Dinner Set, 13Pcs, White',
  //     description: 'Composition: 4 Units Full Plate(10 inch), 8 Units Veg Bowl (150ml 4 inch), 1 Units Serving Bowl (7 inch) It\'s perfect for everyday meals and special occasions alike. Lightweight and Durable: Crafted from premium opalware, this dinnerware set is incredibly lightweight, making it easy to handle for all members of the family. Despite its lightweight nature, it\'s remarkably durable, ensuring it stands the test of time. Easy Maintenance: The smooth, non-porous surface of opalware enhances its beauty while making it incredibly easy to clean. Spend less time on cleanup and more time enjoying your meals and company. Microwave and Dishwasher Safe: Designed to cater to your modern lifestyle, this dinner set is safe for use in the microwave, allowing you to reheat your dishes with ease. It\'s also dishwasher-safe, simplifying the post-meal cleanup. Perfect Gift: Whether you\'re enhancing your own dining collection or searching for a thoughtful gift, the Cello Opalware Dazzle Series Tropical Lagoon Dinner Set is an excellent choice. It adds a touch of tropical elegance to any dining space.',
  //     mrp: '1449.00',
  //     discountedPrice: '899.00',
  //     cspPrice: '949.00',
  //     inventoryCount: 0,
  //     points: 899,
  //     diff: '50.00',
  //     url: 'https://www.amazon.in/dp/B08V564T6R',
  //     category: 'Home & Kitchen',
  //     categoryImage: 'https://m.media-amazon.com/images/G/31/OHL/PD25/themestore/final/Monsoon-essentials-8._CB791372277_.jpg',
  //     subCategory: 'Kitchen & Dining',
  //     subCategoryImage: 'https://m.media-amazon.com/images/G/31/CookwareDining/PD25/MyGate/image_125._CB790367795_.png',
  //     productImage: 'https://m.media-amazon.com/images/I/81dIu+BqBXL._SL1500_.jpg',
  //     commentsVendor: '-',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B08V55264B',
  //     name: 'Cello Serveware',
  //     modelNo: 'Cello Opalware Dazzle Lush Fiesta Dinner Set, 13Pcs, White',
  //     description: 'BONE ASH FREE- The Cello Lush Fiesta Opalware dinner set is crafted from bone ash free material, ensuring a safe and hygienic dining experience. This means that the dinnerware is produced without using any bone ash, making it suitable for vegetarians and vegans. ??? SCRATCH AND CHIP RESISTANT- This dinner set is designed with scratch and chip-resistant properties, making it highly durable and suitable for daily use. Whether you\'re serving a casual family dinner or hosting a special occasion, you can rely on this dinner set to withstand the wear and tear of regular use. ?? MICROWAVE AND DISHWASHER SAFE- This dinner set is both microwave and dishwasher safe, offering convenience and ease of use. You can heat up your meals in the microwave directly on the plates without any concerns, and after your meal, simply place them in the dishwasher for a quick and effortless clean-up. ? LIGHTWEIGHT AND STACKABLE- Cello Lush Fiesta Opalware dinner set is both lightweight and stackable, providing easy handling and efficient storage in your kitchen cabinets or drawers.',
  //     mrp: '1599.00',
  //     discountedPrice: '849.00',
  //     cspPrice: null,
  //     inventoryCount: 0,
  //     points: 849,
  //     diff: '0.00',
  //     url: 'https://www.amazon.in/dp/B08V55264B?th=1',
  //     category: 'Home & Kitchen',
  //     categoryImage: 'https://m.media-amazon.com/images/G/31/OHL/PD25/themestore/final/Monsoon-essentials-8._CB791372277_.jpg',
  //     subCategory: 'Kitchen & Dining',
  //     subCategoryImage: 'https://m.media-amazon.com/images/G/31/CookwareDining/PD25/MyGate/image_125._CB790367795_.png',
  //     productImage: 'https://m.media-amazon.com/images/I/51UFTFvw5mS._SL1500_.jpg',
  //     commentsVendor: 'RetailEZ Pvt Ltd.',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B07G4TRBCL',
  //     name: 'Larah Snacks Set',
  //     modelNo: 'Larah by BOROSIL Opalware Snacks Set - 8Pcs, White',
  //     description: 'BONE-ASH FREE, 100% VEGETARIAN SNACK SET: All our Snack Sets are thoughtfully crafted to be completely free of any animal-derived components. Unlike traditional Mug & Bowl set, our products do not contain any bone-ash, making them the perfect choice for strict vegetarians. Enjoy every sip with peace of mind, knowing that our sets are truly vegetarian-friendly. MICROWAVE-SAFE & CHIP-RESISTANT: Elevate your everyday experience with the Larah by Borosil tea/coffee Snack Sets. Crafted with durable toughened opalware glass, this set is designed for daily use without chipping. It\'s microwave-safe you can heat your Tea/Coffee or Snack directly. Upgrade your collection and enjoy the perfect blend of style and durability. STAIN-RESISTANT & DISHWASHER-SAFE: Experience effortless cleaning with the Larah by Borosil Mug & Bowl Set. Designed to be stain-resistant, these sets ensure that no remnants linger in the form of stains or smells. They are dishwasher-safe. Upgrade your Tea/Coffee experience with Larah by Borosil and enjoy hassle-free maintenance. Make every sip a delightful and pristine affair. LIGHTWEIGHT - Experience the perfect balance of practicality and style with our Snack sets. They are lightweight, making them easy to use. Our Snacks are scratch-resistant, ensuring they maintain their pristine appearance no matter how frequently they are used.',
  //     mrp: '825.00',
  //     discountedPrice: '680.00',
  //     cspPrice: '680.00',
  //     inventoryCount: 0,
  //     points: 680,
  //     diff: '0.00',
  //     url: 'https://www.amazon.in/dp/B07G4TRBCL?th=1',
  //     category: 'Home & Kitchen',
  //     categoryImage: 'https://m.media-amazon.com/images/G/31/OHL/PD25/themestore/final/Monsoon-essentials-8._CB791372277_.jpg',
  //     subCategory: 'Kitchen & Dining',
  //     subCategoryImage: 'https://m.media-amazon.com/images/G/31/CookwareDining/PD25/MyGate/image_125._CB790367795_.png',
  //     productImage: 'https://m.media-amazon.com/images/I/61eMsCE8TPL._SL1000_.jpg',
  //     commentsVendor: 'RetailEZ Pvt Ltd.',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B07FTTFXMP',
  //     name: 'Larah By Borosil',
  //     modelNo: 'Larah By Borosil - Red Lily (LH) Opalware Cup and Saucer Set, 145ml, 12-Pieces, White and Red Lilly',
  //     description: 'Toughened glass Dishwasher safe Microwave safe 100 percent bone-ash free Extra strong Chip resistance Color: White, Material: Opalware',
  //     mrp: '715.00',
  //     discountedPrice: '536.00',
  //     cspPrice: null,
  //     inventoryCount: 0,
  //     points: 536,
  //     diff: '0.00',
  //     url: 'https://www.amazon.in/Larah-Borosil-Saucer-12-Pieces-HT12CS14RLI1/dp/B07FTTFXMP',
  //     category: 'Home & Kitchen',
  //     categoryImage: 'https://m.media-amazon.com/images/I/51Tkrp4UwBL._SX679_.jpg',
  //     subCategory: 'Kitchen & Dining',
  //     subCategoryImage: 'https://m.media-amazon.com/images/I/41wc2zU-1LL._SX679_.jpg',
  //     productImage: 'https://m.media-amazon.com/images/I/51Fu1YvUT0L._SX679_.jpg',
  //     commentsVendor: 'RetailEZ Pvt Ltd.',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B099ZY6WYS',
  //     name: 'Cello Dinner Set',
  //     modelNo: 'Cello Opalware Dazzle Lush Fiesta Dinner Set, 5 Units, Service for 2',
  //     description: 'BONE ASH FREE- The Cello Lush Fiesta Opalware dinner set is crafted from bone ash free material, ensuring a safe and hygienic dining experience. This means that the dinnerware is produced without using any bone ash, making it suitable for vegetarians and vegans. ??? SCRATCH AND CHIP RESISTANT- This dinner set is designed with scratch and chip-resistant properties, making it highly durable and suitable for daily use. Whether you\'re serving a casual family dinner or hosting a special occasion, you can rely on this dinner set to withstand the wear and tear of regular use. ?? MICROWAVE AND DISHWASHER SAFE- This dinner set is both microwave and dishwasher safe, offering convenience and ease of use. You can heat up your meals in the microwave directly on the plates without any concerns, and after your meal, simply place them in the dishwasher for a quick and effortless clean-up. ? LIGHTWEIGHT AND STACKABLE- Cello Lush Fiesta Opalware dinner set is both lightweight and stackable, providing easy handling and efficient storage in your kitchen cabinets or drawers. ? DESIGN AND USAGE- Graceful rich red and black tendrils make a splendid impression on this super white dinnerware set, whether it\'s a cozy family dinner or a festive holiday meal, this dinner set is perfect for creating cherished moments with your loved ones. Components- 2-Pieces Full Plate, 2-Pieces Veg Bowl, 1-Pieces Serving Bowl',
  //     mrp: '749.00',
  //     discountedPrice: '549.00',
  //     cspPrice: '549.00',
  //     inventoryCount: 0,
  //     points: 549,
  //     diff: '0.00',
  //     url: 'https://www.amazon.in/Cello-Opalware-Dazzle-Fiesta-Service/dp/B099ZY6WYS/?th=1',
  //     category: 'Home & Kitchen',
  //     categoryImage: 'https://m.media-amazon.com/images/I/51x15vgzI2L._SX569_.jpg',
  //     subCategory: 'Kitchen & Dining',
  //     subCategoryImage: 'https://m.media-amazon.com/images/G/31/CookwareDining/PD25/MyGate/image_125._CB790367795_.png',
  //     productImage: 'https://m.media-amazon.com/images/I/515Vd9eUGpL._SL1500_.jpg',
  //     commentsVendor: '-',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B06XPYRWV5',
  //     name: 'Pigeon Toaster',
  //     modelNo: 'Pigeon 2 Slice Auto Pop up Toaster.',
  //     description: '2 slice capacity and auto pop up Cool touch body and variable browning control Bread slice centering device for even toasting Easy slide out crumb tray and cord storage Power: 750 watts Warranty: 1 year warranty provided by the manufacturer from date of purchase',
  //     mrp: '1795.00',
  //     discountedPrice: '899.00',
  //     cspPrice: null,
  //     inventoryCount: 0,
  //     points: 899,
  //     diff: '0.00',
  //     url: 'https://www.amazon.in/Pigeon-2-Slice-Pop-up-Toaster-Black/dp/B06XPYRWV5',
  //     category: 'Home & Kitchen',
  //     categoryImage: 'https://m.media-amazon.com/images/I/51x15vgzI2L._SX569_.jpg',
  //     subCategory: 'Kitchen & Dining',
  //     subCategoryImage: 'https://m.media-amazon.com/images/G/31/CookwareDining/PD25/MyGate/image_125._CB790367795_.png',
  //     productImage: 'https://m.media-amazon.com/images/I/51x15vgzI2L._SL1080_.jpg',
  //     commentsVendor: 'RetailEZ Pvt Ltd.',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B0DZDDV7GC',
  //     name: 'Apple Macbook Air',
  //     modelNo: '13-inch MacBook Air (M4, 2025)',
  //     description: 'Apple 2025 MacBook Air (13-inch, Apple M4 chip with 10-core CPU and 8-core GPU, 16GB Unified Memory, 256GB) - Midnight',
  //     mrp: '99900.00',
  //     discountedPrice: '91900.00',
  //     cspPrice: '99900.00',
  //     inventoryCount: 0,
  //     points: 91900,
  //     diff: '8000.00',
  //     url: 'https://www.amazon.in/Apple-MacBook-13-inch-10-core-Unified/dp/B0DZDDV7GC/ref=zg_bs_g_22963796031_d_sccl_22/259-3485429-9812931?th=1',
  //     category: 'Computers & Accessories',
  //     categoryImage: 'https://m.media-amazon.com/images/G/31/img22/pcacc/pd25/clp/bb/Mouse1_540x700._CB788685648_.jpg',
  //     subCategory: 'Laptops',
  //     subCategoryImage: 'https://m.media-amazon.com/images/I/41GQ7vEjQlL.AC_SX250.jpg',
  //     productImage: 'https://m.media-amazon.com/images/I/71CjP9jmqZL._SL1500_.jpg',
  //     commentsVendor: 'Clicktech Retail Private Ltd',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B0DLHH4BJ9',
  //     name: 'Apple 2024 MacBook Air',
  //     modelNo: 'Apple 2024 MacBook Air (13-inch, Apple M3 chip with 8?core CPU and 10?core GPU, 24GB Unified Memory, 512GB) - Space Gray',
  //     description: 'Supercharged by M3 � The blazing-fast MacBook Air with the M3 chip is a super-portable laptop that sails through work and play. PORTABLE DESIGN � Lightweight and just over 1 cm thin, so you can take MacBook Air anywhere you go. UP TO 18 HOURS OF BATTERY LIFE � Amazing, all-day battery life so you can leave the power adapter at home. LOOK SHARP, SOUND GREAT � Everything looks and sounds amazing with a 1080p FaceTime HD camera, three mics and four speakers with Spatial Audio. APPS FLY WITH APPLE SILICON � All your favourites, from Microsoft 365 to Adobe Creative Cloud, run lightning fast in macOS',
  //     mrp: '154900.00',
  //     discountedPrice: '124990.00',
  //     cspPrice: '124990.00',
  //     inventoryCount: 0,
  //     points: 124990,
  //     diff: '0.00',
  //     url: 'https://www.amazon.in/Apple-MacBook-13-inch-10%E2%80%91core-Unified/dp/B0DLHH4BJ9',
  //     category: 'Computers & Accessories',
  //     categoryImage: 'https://m.media-amazon.com/images/I/711xdPNfEhL._SX679_.jpg',
  //     subCategory: 'Laptops',
  //     subCategoryImage: 'https://m.media-amazon.com/images/I/614r9FSvcZL._SL1500_.jpg',
  //     productImage: 'https://m.media-amazon.com/images/I/614IBnpYbYL._SL1500_.jpg',
  //     commentsVendor: 'Clicktech Retail Private Ltd',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B0CJM5Z6FY',
  //     name: 'HP Laptop',
  //     modelNo: 'HP 15s, 12th Gen Intel Core i5-1235U, 8GB DDR4, 512GB SSD, (Win 11, Office 21, Silver, 1.69kg), FY5008TU Anti-Glare, 15.6-inch(39.6cm), FHD Laptop, Intel UHD Graphics, Backlit KB, HD Camera, fq5329tu',
  //     description: '10-core 12th Gen Intel Core i5-1235U? With up to 4.4 GHz speed, a 12 MB L3 cache, and 12 threads, it ensures high performance for multitasking and demanding tasks. ?Intel Iris Graphics? Delivers exceptional visuals for a smoother computing experience, enhancing your work or entertainment journey ?Ample memory and storage? 8GB DDR4-3200 MHz RAM and 512GB PCIe NVMe M.2 SSD ensures swift operation and ample storage for all your files. ?FHD Micro-edge Display? The 15.6"" FHD (1920 x 1080) micro-edge, anti-glare display offers stunning clarity and color, enhancing your visual experience. ?Long-lasting battery? A 3-cell, 41Wh Li-ion battery offering long hours of uninterrupted usage, ensuring productivity at all times. Plus, with HP Fast Charge, you can recharge up to 50% in just 45 mins. ?Pre-loaded Win 11? Comes with the latest Windows 11 pre-installed, allowing you to dive into your tasks right away. ?Seamless Connectivity? Connect and collaborate effortlessly with Wi-Fi and Bluetooth 5.0. Plus, it offers 1 x USB Type-C, 2 x USB Type-A, 1 x headphone/microphone combo, and 1 x HDMI 1.4b ports for all your peripherals.',
  //     mrp: '50400.00',
  //     discountedPrice: '48675.00',
  //     cspPrice: '48675.00',
  //     inventoryCount: 0,
  //     points: 48675,
  //     diff: '0.00',
  //     url: 'https://www.amazon.in/HP-i5-1235U-FY5008TU-Anti-Glare-15-6-inch/dp/B0CJM5Z6FY/ref=zg_bs_g_22963796031_d_sccl_2/259-3485429-9812931?th=1',
  //     category: 'Computers & Accessories',
  //     categoryImage: 'https://m.media-amazon.com/images/G/31/img22/pcacc/pd25/clp/bb/Mouse1_540x700._CB788685648_.jpg',
  //     subCategory: 'Laptops',
  //     subCategoryImage: 'https://m.media-amazon.com/images/I/41GQ7vEjQlL.AC_SX250.jpg',
  //     productImage: 'https://m.media-amazon.com/images/I/713nDmiZaML._SL1500_.jpg',
  //     commentsVendor: '�tech junction',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B0D3HG5CMG',
  //     name: 'HP Laptop',
  //     modelNo: 'HP 15, AMD Ryzen 3 7320U, 8GB LPDDR5, 512GB SSD, Anti-Glare, Micro-Edge, 15.6-inch (39.6 cm), FHD, AMD Radeon Graphics, 1080p HD Camera, (Win 11, Silver, 1.59 kg), fc0154AU',
  //     description: 'Processor : AMD Ryzen 3 7320U (up to 4.1 GHz max boost clock, 4 MB L3 cache, 4cores, 8 threads)| Storage & Memory : 8 GB LPDDR5-5500 MHz RAM , 512 GB PCIe NVMe M.2 SSD Display: 39.6 cm (15.6"") diagonal, FHD (1920 x 1080), micro-edge, anti-glare, 250 nits, 45% NTSC Graphics & Networking : AMD Radeon Graphics|Networking: Realtek Wi-Fi 6 (2x2) and Bluetooth 5.3 wireless card (supporting gigabit data rate) Ports: 1 USB Type-C 5Gbps signaling rate (supports data transfer only and does not support charging or external monitors); 2 USB Type-A 5Gbps signaling rate; 1 AC smart pin; 1 HDMI 1.4b; 1 headphone/microphone combo Features: Camera: HP True Vision 1080p FHD camera with temporal noise reduction and integrated dual array digital microphones| Audio: Dual speakers|Keyboard: Full-size, soft grey keyboard with numeric keypad',
  //     mrp: '45995.00',
  //     discountedPrice: '30600.00',
  //     cspPrice: '29990.00',
  //     inventoryCount: 0,
  //     points: 30600,
  //     diff: '-610.00',
  //     url: 'https://www.amazon.in/HP-Laptop-15-6-inch-Graphics-fc0154AU/dp/B0D3HG5CMG/ref=zg_bs_g_22963796031_d_sccl_3/259-3485429-9812931?psc=1',
  //     category: 'Computers & Accessories',
  //     categoryImage: 'https://m.media-amazon.com/images/G/31/img22/pcacc/pd25/clp/bb/Mouse1_540x700._CB788685648_.jpg',
  //     subCategory: 'Laptops',
  //     subCategoryImage: 'https://m.media-amazon.com/images/I/41GQ7vEjQlL.AC_SX250.jpg',
  //     productImage: 'https://m.media-amazon.com/images/I/719OMbh40jL._SL1500_.jpg',
  //     commentsVendor: '-',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B0CJBL2QWY',
  //     name: 'HP Laptop',
  //     modelNo: 'HP 15s,12th Gen Intel Core i3-1215U, 8GB DDR4, 512 GB SSD(Win 11, Office 21, Silver, 1.69kg), Anti-Glare, 15.6inch(39.6Cm), FHD Laptop, Intel UHD Graphics, Dual Speakers, HD Camera, fy5006tu',
  //     description: 'Processor: Intel Core i3-1215U (up to 4.4 GHz with Intel Turbo Boost Technology, 10 MB L3 cache, 6 cores, 8 threads)| Memory: 8 GB DDR4-3200 MHz RAM (1 x 8 GB)| Storage: 512 GB PCIe NVMe M.2 SSD Display: 39.6 cm (15.6"") diagonal, FHD (1920 x 1080), micro-edge, anti-glare, 250 nits, 45% NTSC Operating System: Windows 11 Home Single Language |Microsoft Office Home & Student Edition 2021 Ports: 1 USB Type-C 5Gbps signaling rate (supports data transfer only and does not support charging or external monitors); 2 USB Type-A 5Gbps signaling rate; 1 AC smart pin; 1 HDMI 1.4b; 1 headphone/microphone combo | Networking: Realtek RTL8822CE 802.11a/b/g/n/ac (2x2) Wi-Fi and Bluetooth 5 wireless card Other Features: Camera: HP True Vision 720p HD camera with temporal noise reduction and integrated dual array digital microphones| Keyboard : Full-size, natural silver keyboard with numeric keypad |Battery: 3-cell, 41 Wh Li-ion; Up to 7 hours and 30 minutes |Audio: Dual speakers',
  //     mrp: '50903.00',
  //     discountedPrice: '34650.00',
  //     cspPrice: '33999.00',
  //     inventoryCount: 0,
  //     points: 34650,
  //     diff: '-651.00',
  //     url: 'https://www.amazon.in/HP-i3-1215U-Anti-Glare-15-6inch-Graphics/dp/B0CJBL2QWY/ref=zg_bs_g_22963796031_d_sccl_5/259-3485429-9812931?th=1',
  //     category: 'Computers & Accessories',
  //     categoryImage: 'https://m.media-amazon.com/images/G/31/img22/pcacc/pd25/clp/bb/Mouse1_540x700._CB788685648_.jpg',
  //     subCategory: 'Laptops',
  //     subCategoryImage: 'https://m.media-amazon.com/images/I/41GQ7vEjQlL.AC_SX250.jpg',
  //     productImage: 'https://m.media-amazon.com/images/I/71+gQ9gOTuL._SL1500_.jpg',
  //     commentsVendor: '-',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B0DTK9DZB4',
  //     name: 'HP Laptop',
  //     modelNo: 'HP 15, 13th Gen Intel Core i5-1334U (16GB DDR4, 512GB SSD) Microsoft365* Office2024, Win11, 15.6inch(39.6cm) FHD Laptop, Intel Iris Xe, FHD Camera w/Privacy Shutter, Backlit, Silver, 1.59kg, fd0467tu',
  //     description: '10-core 13th Gen Intel Core i5-1334U superior performance optimized for efficiency. Its 12 threads, and 12MB L3 cache offer smooth multitasking and quick response times. ?Longer streaming time?Dynamic visuals with Intel Iris Xe Graphics, perfect for casual gaming and streaming your favourite shows in HD. ?High-Capacity memory and storage?Real world multitasking with 16GB DDR4-3200 MHz RAM. The 512GB PCIe NVMe M.2 SSD provides generous storage. ?Micro-edge display? vivid details on the 15.6-inch, FHD micro-edge display. stunning clarity and immersive visuals that elevate your viewing experience. ?Digital Nomad Friendly?work on the move or in home use with a 3-cell, 41Wh battery. HP Fast Charge replenishes up to 50% battery in just 45 minutes.',
  //     mrp: '65387.00',
  //     discountedPrice: '58700.00',
  //     cspPrice: '58990.00',
  //     inventoryCount: 0,
  //     points: 58700,
  //     diff: '290.00',
  //     url: 'https://www.amazon.in/HP-i5-1334U-Microsoft365-Office2024-15-6inch/dp/B0DTK9DZB4/ref=zg_bs_g_22963796031_d_sccl_16/259-3485429-9812931?th=1',
  //     category: 'Computers & Accessories',
  //     categoryImage: 'https://m.media-amazon.com/images/I/71r0BBNmBOL._SX466_.jpg',
  //     subCategory: 'Laptops',
  //     subCategoryImage: 'https://m.media-amazon.com/images/I/41GQ7vEjQlL.AC_SX250.jpg',
  //     productImage: 'https://m.media-amazon.com/images/I/71bagLp2sXL._SL1500_.jpg',
  //     commentsVendor: '-',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B0BQJ68HHC',
  //     name: 'Dell Laptop',
  //     modelNo: 'Dell [Smartchoice] Windows 11 Home 3520 Laptop, Intel Core i3-1215U, 12Th Gen (8GB RAM /512GB SSD /Window 11 /MS Office\' 21 /15.6""(39.62 Cm) FHD Display /15 Month Mcafee /Black /1.69Kg Thin & Light',
  //     description: 'rocessor: Intel Core i3-1215U 12th Generation (up to 4.40 GHz, 10MB 6 Cores) RAM & Storage: 8 GB, 1 x 8 GB, DDR4, 2666 MHz, (2 DIMM Slots, Expandable up to 16GB) & 512GB SSD Software: Pre-Loaded Windows 11 Home with Lifetime Validity | MS Office Home and Student 2021 with lifetime validity| McAfee Multi-Device Security 15-month subscription Graphics & Keyboard: Integrated Onboard Graphics & Standard Keyboard Display: 15.6"" FHD WVA AG 120Hz 250 nits Narrow Border // Warranty: 1 Year Onsite Hardware Service Ports: 2 USB 3.2 Gen 1 ports, 1 USB 2.0 port, 1 Headset jack, 1 HDMI 1.4 port, 1 SD 3.0 card slot, 1 Flip-Down RJ-45 port 10/100/1000 Mbps Wi-fi & Bluetooth: 802.11ac 1x1 WiFi, Bluetooth wireless card',
  //     mrp: '48692.00',
  //     discountedPrice: '33990.00',
  //     cspPrice: '33990.00',
  //     inventoryCount: 0,
  //     points: 33990,
  //     diff: '0.00',
  //     url: 'https://www.amazon.in/Dell-Smartchoice-i3-1215U-Processor-Spill-Resistant/dp/B0BQJ68HHC',
  //     category: 'Computers & Accessories',
  //     categoryImage: 'https://m.media-amazon.com/images/I/41IMroAyzVL._SY300_SX300_QL70_FMwebp_.jpg',
  //     subCategory: 'Laptops',
  //     subCategoryImage: 'https://m.media-amazon.com/images/I/41GQ7vEjQlL.AC_SX250.jpg',
  //     productImage: 'https://m.media-amazon.com/images/I/61-Y-eWXqtL._SL1080_.jpg',
  //     commentsVendor: '-',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B0FG2RJ9NC',
  //     name: 'Dell Vostro, Intel Core i3 13th Gen',
  //     modelNo: 'Dell Vostro, Intel Core i3 13th Gen - 1305U, 16GB DDR4 RAM, 512GB, FHD 15.6""/39.6 cm, Windows 11, Office H&S 2024, Carbon Grey, 1.66Kg, 120Hz 250...',
  //     description: 'Processor: 13th Generation Intel Core i3-1305U (10MB, up to 4.50 GHz, 5 Core) RAM: 16GB: 2x8GB, DDR4, 2666 MHz & Storage: 512GB SSD Display: 15.6"" FHD WVA AG 120Hz 250 nits Narrow Border & Graphics: Intel UHD Graphics Keyboard: Standard Keyboard & Software: Win 11 + Office H&S 2024 Ports: 1 USB 2.0 port, 1 Headset jack, 1 HDMI 1.4 port*, 1 Flip-Down RJ-45 port 10/100/1000 Mbps, 1 SD 3.0 card slot, 1 USB 3.2 Gen 1 port, USB 3.2 Gen 1 Type-C (data only)',
  //     mrp: '53990.00',
  //     discountedPrice: '35990.00',
  //     cspPrice: '35990.00',
  //     inventoryCount: 0,
  //     points: 35990,
  //     diff: '0.00',
  //     url: 'https://www.amazon.in/Dell-i3-1305U-Display-Graphics-Windows/dp/B0FG2RJ9NC',
  //     category: 'Computers & Accessories',
  //     categoryImage: 'https://m.media-amazon.com/images/I/7156bBh8W2L._SX679_.jpg',
  //     subCategory: 'Laptops',
  //     subCategoryImage: 'https://m.media-amazon.com/images/I/61A47MqGucL._SL1500_.jpg',
  //     productImage: 'https://m.media-amazon.com/images/I/71S7O5rqAUL._SL1500_.jpg',
  //     commentsVendor: 'Clicktech Retail Private Ltd',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B0CRKXDX83',
  //     name: 'Dell Laptop',
  //     modelNo: 'Dell {Smartchoice} G15-5530 Core i5-13450HX| NVIDIA RTX 3050, 6GB (16GB RAM|1TB SSD, FHD|Window 11|MS Office\' 21|15.6"" (39.62cm)|Dark Shadow Grey|2.65Kg|Gaming Laptop',
  //     description: 'Processor: 13th Generation Intel Core i5-13450HX (up to 4.60 GHz, 10 Cores, 20MB) RAM & Storage: 16 GB: 2 x 8 GB, DDR5, 4800 MT/s & 1TB SSD Graphics & Display: NVIDIA GeForce RTX 3050, 6GB GDDR6 & 15.6"" FHD Narrow 120Hz 250 nits Keyboard: US English Orange Backlit Keyboard with Numeric Keypad and G-Key Warranty: 1 Year Basic Onsite Service after remote diagnosis with Hardware-Only Support Ports: 1) HDMI 2.1, (3) SuperSpeed USB 3.2 Gen 1 Type-A, (1) USB-C 3.2 Gen 2 with Display Port Alt-Mode, (1) Headphone/Mic, (1) RJ45 Software: Pre-Loaded Windows 11 Home with Lifetime Validity | MS Office Home and Student 2021 with lifetime validity| McAfee Multi-Device Security 15-month subscription',
  //     mrp: '105398.00',
  //     discountedPrice: '76500.00',
  //     cspPrice: '79990.00',
  //     inventoryCount: 0,
  //     points: 76500,
  //     diff: '3490.00',
  //     url: 'https://www.amazon.in/Dell-Smartchoice-G15-5530-Gaming-i5-13450HX/dp/B0CRKXDX83/ref=zg_bs_g_22963796031_d_sccl_43/259-3485429-9812931?th=1',
  //     category: 'Computers & Accessories',
  //     categoryImage: 'https://m.media-amazon.com/images/G/31/img22/pcacc/pd25/clp/bb/Mouse1_540x700._CB788685648_.jpg',
  //     subCategory: 'Laptops',
  //     subCategoryImage: 'https://m.media-amazon.com/images/I/41GQ7vEjQlL.AC_SX250.jpg',
  //     productImage: 'https://m.media-amazon.com/images/I/61LOOMpEgxL._SL1080_.jpg',
  //     commentsVendor: '-',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B08KH5S4BH',
  //     name: 'Godrej Counting Machine',
  //     modelNo: 'Godrej Security Solutions Bill Counter Crusader Lite Cash/Currency Counting Machine 1000 Notes/Min With Customer Display Unit | Fully Automatic & UV, MG & IR Sensors | Fake Note Detector For Bank Home',
  //     description: 'Automatic Detection With UV (Ultraviolet), MG (Megnetic), And IR (Infra-Red) With Big TFT Screen Display. Automatic Start, Stop And Clearing ""Loose Note Counting Machine With Fake Note Detect "" Customer needs to just check whether the UV and MG button is on also it is very important how the placement of notes are being done in pocket. If the currency notes are not kept properly in pocket it would not count the notes properly',
  //     mrp: '25023.00',
  //     discountedPrice: '13600.00',
  //     cspPrice: '13599.00',
  //     inventoryCount: 0,
  //     points: 13600,
  //     diff: '-1.00',
  //     url: 'https://www.amazon.in/Godrej-Security-Solutions-Solution-Countmatic/dp/B08KH5S4BH/',
  //     category: 'Office Products',
  //     categoryImage: 'https://m.media-amazon.com/images/I/41OvYK0JgaL.AC_SX250.jpg',
  //     subCategory: 'Money Handling Products',
  //     subCategoryImage: 'https://m.media-amazon.com/images/I/41LuQ8XWbOL._AC._SR180,230.jpg',
  //     productImage: 'https://m.media-amazon.com/images/I/51X86CG7Z6L._SL1120_.jpg',
  //     commentsVendor: '-',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B0DCNZGW36',
  //     name: 'Mi Power Bank 3i 20000mAh',
  //     modelNo: 'KS387',
  //     description: 'Xiaomi Power Bank 4i 20000mAh 33W Super Fast Charging PD | Power Delivery | QC 3.0|Type C Input & Output |Triple Output Ports|Blue|Supports Android,Apple, Tablets, Earbuds, Watches etc (MI) 33W Super Fast Charging for Input and Output Type-C Input and Output Ports Power Delivery and QC 3.0 Support Smart Power Management',
  //     mrp: '3999.00',
  //     discountedPrice: '2199.00',
  //     cspPrice: '2199.00',
  //     inventoryCount: 0,
  //     points: 2199,
  //     diff: '0.00',
  //     url: 'https://www.amazon.in/Xiaomi-20000mAh-Charging-Delivery-Supports/dp/B0DCNZGW36',
  //     category: 'Mobile & Accessories',
  //     categoryImage: 'https://m.media-amazon.com/images/G/31/img23/Wireless/nbshagun/PD25/7thJuly/1242xDealreveal_2_02._CB790215406_.jpg',
  //     subCategory: 'Power Banks',
  //     subCategoryImage: 'https://m.media-amazon.com/images/I/41vBAaU8clL._AC_UL480_QL65_.jpg',
  //     productImage: 'https://m.media-amazon.com/images/I/611J+4ry-vL._SL1500_.jpg',
  //     commentsVendor: '3i Model is EOL',
  //     isActive: true,
  //   },
  //   {
  //     asinSku: 'B0CHX6N27Y',
  //     name: 'Apple iPhone 15 (256 GB) - Blue',
  //     modelNo: 'Apple iPhone 15',
  //     description: 'Apple iPhone 15 (256 GB) - Blue',
  //     mrp: '70900.00',
  //     discountedPrice: '70900.00',
  //     cspPrice: '56999.00',
  //     inventoryCount: 372,
  //     points: 70900,
  //     diff: '-13901.00',
  //     url: 'https://www.amazon.in/dp/B0CHX6N27Y?th=1',
  //     category: 'Mobile & Accessories',
  //     categoryImage: 'https://m.media-amazon.com/images/G/31/img23/Wireless/nbshagun/PD25/7thJuly/1242xDealreveal_2_02._CB790215406_.jpg',
  //     subCategory: 'Smartphones',
  //     subCategoryImage: 'https://m.media-amazon.com/images/I/416t0eHB3SL._AC._SR180,230.jpg',
  //     productImage: 'https://m.media-amazon.com/images/I/31Q14qzdoZL._SY300_SX300_QL70_ML2_.jpg',
  //     commentsVendor: 'Clicktech Retail Private Ltd',
  //     isActive: true,
  //   },
  // ]).onConflictDoNothing().execute();

  //   // Physical Rewards Catalogue
  //   await db.insert(schema.physicalRewardsCatalogue).values([
  //     {
  //       name: 'Premium Coffee Maker',
  //       description: 'Automatic drip coffee maker with thermal carafe',
  //       category: 'Home Appliances',
  //       pointsRequired: 15000,
  //       mrp: '8999.00',
  //       inventoryCount: 10,
  //       imageUrl: 'https://example.com/coffee-maker.jpg',
  //       brand: 'Prestige',
  //       deliveryTime: '15-21 working days',
  //       isActive: true,
  //     },
  //     {
  //       name: 'Wireless Bluetooth Headphones',
  //       description: 'Noise cancelling over-ear headphones',
  //       category: 'Electronics',
  //       pointsRequired: 8000,
  //       mrp: '4999.00',
  //       inventoryCount: 20,
  //       imageUrl: 'https://example.com/headphones.jpg',
  //       brand: 'Boat',
  //       deliveryTime: '15-21 working days',
  //       isActive: true,
  //     },
  //     {
  //       name: 'Branded T-Shirt',
  //       description: 'Cotton branded t-shirt',
  //       category: 'Apparel',
  //       pointsRequired: 2000,
  //       mrp: '999.00',
  //       inventoryCount: 50,
  //       imageUrl: 'https://example.com/tshirt.jpg',
  //       brand: 'Puma',
  //       deliveryTime: '15-21 working days',
  //       isActive: true,
  //     },
  //   ]).onConflictDoNothing().execute();

  // 17. Redemption Approval System
  console.log('Seeding redemption approval system...');

  // Insert default approval roles
  await db.insert(schema.approvalRoles).values([
    { roleName: 'FINANCE_APPROVER', approvalLevel: 'FINANCE', maxApprovalLimit: 50000, canEscalate: true, isActive: true },
    { roleName: 'ADMIN_APPROVER', approvalLevel: 'ADMIN', maxApprovalLimit: 100000, canEscalate: true, isActive: true },
    { roleName: 'SUPER_ADMIN', approvalLevel: 'ALL', maxApprovalLimit: null, canEscalate: true, isActive: true },
  ]).onConflictDoNothing().execute();

  // Insert default thresholds
  await db.insert(schema.redemptionThresholds).values([
    { thresholdType: 'SINGLE_TRANSACTION', userType: 'ALL', thresholdValue: 50000, requiresApproval: true, approvalLevel: 'FINANCE', isActive: true },
    { thresholdType: 'SINGLE_TRANSACTION', userType: 'ALL', thresholdValue: 100000, requiresApproval: true, approvalLevel: 'ADMIN', isActive: true },
    { thresholdType: 'DAILY_LIMIT', userType: 'ALL', thresholdValue: 100000, requiresApproval: true, approvalLevel: 'FINANCE', isActive: true },
    { thresholdType: 'DAILY_LIMIT', userType: 'RETAILER', thresholdValue: 200000, requiresApproval: true, approvalLevel: 'FINANCE', isActive: true },
    { thresholdType: 'DAILY_LIMIT', userType: 'ELECTRICIAN', thresholdValue: 50000, requiresApproval: true, approvalLevel: 'FINANCE', isActive: true },
  ]).onConflictDoNothing().execute();

  // Create admin approval users
  console.log('Creating admin approval users...');

  // Get the admin user (System Admin)
  const adminUser = (await db.select().from(schema.users).where(eq(schema.users.phone, '9999999999')).limit(1))[0];

  if (adminUser) {
    // Get approval roles
    const financeRole = (await db.select().from(schema.approvalRoles).where(eq(schema.approvalRoles.roleName, 'FINANCE_APPROVER')).limit(1))[0];
    const superAdminRole = (await db.select().from(schema.approvalRoles).where(eq(schema.approvalRoles.roleName, 'SUPER_ADMIN')).limit(1))[0];

    // Assign super admin role to main admin
    if (superAdminRole) {
      await db.insert(schema.userApprovalRoles).values({
        userId: adminUser.id,
        roleId: superAdminRole?.roleId,
        assignedBy: adminUser.id,
        isActive: true,
      }).onConflictDoNothing().execute();
    }

    console.log('✓ Admin approval roles assigned');
  }

  console.log('--- Seeding Completed Successfully ---');
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
}).finally(() => pool.end());
