import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../schema'; // Adjust import path to your schema file
import { eq } from 'drizzle-orm';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});
const db = drizzle(pool, { schema });
const testPool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});

async function testConnection() {
  try {
    const client = await testPool.connect();
    console.log('Connected to PostgreSQL successfully!');
    client.release();
  } catch (err) {
    console.error('Failed to connect to PostgreSQL:', err);
    process.exit(1);
  }
}



async function seed() {
  await testConnection();
  console.log('Seeding database...');

  // Seed lookup tables (enums/types)

  // onboarding_types
  await db.insert(schema.onboardingTypes).values([
    { name: 'Retail', description: 'Retail user onboarding', isActive: true },
    { name: 'Electrician', description: 'Electrician user onboarding', isActive: true },
    { name: 'Counter Sales', description: 'Counter sales user onboarding', isActive: true },
  ]).onConflictDoNothing().execute(); // Use onConflictDoNothing for upsert on unique name

  const onboardingRetail = await db.select().from(schema.onboardingTypes).where(eq(schema.onboardingTypes.name, 'Retail')).limit(1);
  const onboardingElectrician = await db.select().from(schema.onboardingTypes).where(eq(schema.onboardingTypes.name, 'Electrician')).limit(1);
  const onboardingCounterSales = await db.select().from(schema.onboardingTypes).where(eq(schema.onboardingTypes.name, 'Counter Sales')).limit(1);
  const onboardingTypeRetailId = onboardingRetail[0]?.id;
  const onboardingTypeElectricianId = onboardingElectrician[0]?.id;
  const onboardingTypeCounterSalesId = onboardingCounterSales[0]?.id;

  // earning_types
  await db.insert(schema.earningTypes).values([
    { name: 'Sale', description: 'Points from product sales', isActive: true },
    { name: 'Referral', description: 'Bonus from referrals', isActive: true },
    { name: 'Redemption', description: 'Points deduction on redemption', isActive: true },
  ]).onConflictDoNothing().execute();

  const earningSale = await db.select().from(schema.earningTypes).where(eq(schema.earningTypes.name, 'Sale')).limit(1);
  const earningReferral = await db.select().from(schema.earningTypes).where(eq(schema.earningTypes.name, 'Referral')).limit(1);
  const earningRedemption = await db.select().from(schema.earningTypes).where(eq(schema.earningTypes.name, 'Redemption')).limit(1);
  const earningTypeSaleId = earningSale[0]?.id;
  const earningTypeReferralId = earningReferral[0]?.id;
  const earningTypeRedemptionId = earningRedemption[0]?.id;

  // redemption_channels
  await db.insert(schema.redemptionChannels).values([
    { name: 'UPI', description: 'UPI transfer redemption', isActive: true },
    { name: 'Bank Transfer', description: 'Bank account transfer', isActive: true },
    { name: 'Cash', description: 'Cash redemption', isActive: true },
  ]).onConflictDoNothing().execute();

  const redemptionUpi = await db.select().from(schema.redemptionChannels).where(eq(schema.redemptionChannels.name, 'UPI')).limit(1);
  const redemptionBank = await db.select().from(schema.redemptionChannels).where(eq(schema.redemptionChannels.name, 'Bank Transfer')).limit(1);
  const redemptionCash = await db.select().from(schema.redemptionChannels).where(eq(schema.redemptionChannels.name, 'Cash')).limit(1);
  const redemptionChannelUpiId = redemptionUpi[0]?.id;
  const redemptionChannelBankId = redemptionBank[0]?.id;
  const redemptionChannelCashId = redemptionCash[0]?.id;

  // scheme_types
  await db.insert(schema.schemeTypes).values([
    { name: 'Points Scheme', description: 'Standard points earning scheme', isActive: true },
    { name: 'Cashback', description: 'Cashback based scheme', isActive: true },
  ]).onConflictDoNothing().execute();

  const schemePoints = await db.select().from(schema.schemeTypes).where(eq(schema.schemeTypes.name, 'Points Scheme')).limit(1);
  const schemeCashback = await db.select().from(schema.schemeTypes).where(eq(schema.schemeTypes.name, 'Cashback')).limit(1);
  const schemeTypePointsId = schemePoints[0]?.id;
  const schemeTypeCashbackId = schemeCashback[0]?.id;

  // redemption_statuses
  await db.insert(schema.redemptionStatuses).values([
    { name: 'Pending', description: 'Redemption request pending', isActive: true },
    { name: 'Approved', description: 'Redemption approved', isActive: true },
    { name: 'Rejected', description: 'Redemption rejected', isActive: true },
  ]).onConflictDoNothing().execute();

  const redemptionPending = await db.select().from(schema.redemptionStatuses).where(eq(schema.redemptionStatuses.name, 'Pending')).limit(1);
  const redemptionApproved = await db.select().from(schema.redemptionStatuses).where(eq(schema.redemptionStatuses.name, 'Approved')).limit(1);
  const redemptionRejected = await db.select().from(schema.redemptionStatuses).where(eq(schema.redemptionStatuses.name, 'Rejected')).limit(1);
  const redemptionStatusPendingId = redemptionPending[0]?.id;
  const redemptionStatusApprovedId = redemptionApproved[0]?.id;
  const redemptionStatusRejectedId = redemptionRejected[0]?.id;

  // qr_types
  await db.insert(schema.qrTypes).values([
    { name: 'Product QR', description: 'Individual product QR code', isActive: true },
    { name: 'Batch QR', description: 'Batch level QR code', isActive: true },
  ]).onConflictDoNothing().execute();

  const qrProduct = await db.select().from(schema.qrTypes).where(eq(schema.qrTypes.name, 'Product QR')).limit(1);
  const qrBatch = await db.select().from(schema.qrTypes).where(eq(schema.qrTypes.name, 'Batch QR')).limit(1);
  const qrTypeProductId = qrProduct[0]?.id;
  const qrTypeBatchId = qrBatch[0]?.id;

  // languages
  await db.insert(schema.languages).values([
    { name: 'English', code: 'en', description: 'English language', isActive: true },
    { name: 'Hindi', code: 'hi', description: 'Hindi language', isActive: true },
  ]).onConflictDoNothing().execute();

  const languageEnglish = await db.select().from(schema.languages).where(eq(schema.languages.name, 'English')).limit(1);
  const languageHindi = await db.select().from(schema.languages).where(eq(schema.languages.name, 'Hindi')).limit(1);
  const languageIdEnglish = languageEnglish[0]?.id;
  const languageIdHindi = languageHindi[0]?.id;

  // approval_statuses
  await db.insert(schema.approvalStatuses).values([
    { name: 'Pending', description: 'Approval pending', isActive: true },
    { name: 'Approved', description: 'User approved', isActive: true },
    { name: 'Rejected', description: 'User rejected', isActive: true },
  ]).onConflictDoNothing().execute();

  const approvalPending = await db.select().from(schema.approvalStatuses).where(eq(schema.approvalStatuses.name, 'Pending')).limit(1);
  const approvalApproved = await db.select().from(schema.approvalStatuses).where(eq(schema.approvalStatuses.name, 'Approved')).limit(1);
  const approvalRejected = await db.select().from(schema.approvalStatuses).where(eq(schema.approvalStatuses.name, 'Rejected')).limit(1);
  const approvalStatusPendingId = approvalPending[0]?.id;
  const approvalStatusApprovedId = approvalApproved[0]?.id;
  const approvalStatusRejectedId = approvalRejected[0]?.id;

  // creatives_types
  await db.insert(schema.creativesTypes).values([
    { name: 'Banner', description: 'Banner creative type', isActive: true },
    { name: 'Carousel', description: 'Carousel creative type', isActive: true },
  ]).onConflictDoNothing().execute();

  const creativesBanner = await db.select().from(schema.creativesTypes).where(eq(schema.creativesTypes.name, 'Banner')).limit(1);
  const creativesCarousel = await db.select().from(schema.creativesTypes).where(eq(schema.creativesTypes.name, 'Carousel')).limit(1);
  const creativesTypeBannerId = creativesBanner[0]?.id;
  const creativesTypeCarouselId = creativesCarousel[0]?.id;

  // ticket_types
  await db.insert(schema.ticketTypes).values([
    { name: 'Support', description: 'General support ticket', isActive: true },
    { name: 'KYC Issue', description: 'KYC related issues', isActive: true },
  ]).onConflictDoNothing().execute();

  const ticketSupport = await db.select().from(schema.ticketTypes).where(eq(schema.ticketTypes.name, 'Support')).limit(1);
  const ticketKyc = await db.select().from(schema.ticketTypes).where(eq(schema.ticketTypes.name, 'KYC Issue')).limit(1);
  const ticketTypeSupportId = ticketSupport[0]?.id;
  const ticketTypeKycId = ticketKyc[0]?.id;

  // ticket_statuses
  await db.insert(schema.ticketStatuses).values([
    { name: 'Open', description: 'Ticket is open', isActive: true },
    { name: 'In Progress', description: 'Ticket in progress', isActive: true },
    { name: 'Closed', description: 'Ticket closed', isActive: true },
  ]).onConflictDoNothing().execute();

  const ticketOpen = await db.select().from(schema.ticketStatuses).where(eq(schema.ticketStatuses.name, 'Open')).limit(1);
  const ticketInProgress = await db.select().from(schema.ticketStatuses).where(eq(schema.ticketStatuses.name, 'In Progress')).limit(1);
  const ticketClosed = await db.select().from(schema.ticketStatuses).where(eq(schema.ticketStatuses.name, 'Closed')).limit(1);
  const ticketStatusOpenId = ticketOpen[0]?.id;
  const ticketStatusInProgressId = ticketInProgress[0]?.id;
  const ticketStatusClosedId = ticketClosed[0]?.id;

  // Seed hierarchical masters (client, levels, etc.)

  // client
  await db.insert(schema.client).values([
    { name: 'Default Client', code: 'DEFAULT' },
  ]).onConflictDoNothing().execute();

  const defaultClient = await db.select().from(schema.client).where(eq(schema.client.code, 'DEFAULT')).limit(1);
  const defaultClientId = defaultClient[0]?.id || 1;

  // location_level_master
  await db.insert(schema.locationLevelMaster).values([
    { clientId: defaultClientId, levelNo: 1, levelName: 'State' },
    { clientId: defaultClientId, levelNo: 2, levelName: 'District', parentLevelId: 1 },
    { clientId: defaultClientId, levelNo: 3, levelName: 'City', parentLevelId: 2 },
  ]).onConflictDoNothing().execute();

  const locationStateLevel = await db.select().from(schema.locationLevelMaster).where(eq(schema.locationLevelMaster.levelName, 'State')).limit(1);
  const locationDistrictLevel = await db.select().from(schema.locationLevelMaster).where(eq(schema.locationLevelMaster.levelName, 'District')).limit(1);
  const locationCityLevel = await db.select().from(schema.locationLevelMaster).where(eq(schema.locationLevelMaster.levelName, 'City')).limit(1);
  const stateLevelId = locationStateLevel[0]?.id || 1;
  const districtLevelId = locationDistrictLevel[0]?.id || 2;
  const cityLevelId = locationCityLevel[0]?.id || 3;

  // location_entity (hierarchical)
  await db.insert(schema.locationEntity).values([
    { clientId: defaultClientId, levelId: stateLevelId, name: 'Maharashtra', code: 'MH' },
    { clientId: defaultClientId, levelId: districtLevelId, name: 'Mumbai Suburban', code: 'MS', parentEntityId: 1 },
    { clientId: defaultClientId, levelId: cityLevelId, name: 'Mumbai', code: 'MUM', parentEntityId: 2 },
  ]).onConflictDoNothing().execute();

  const mumbaiEntity = await db.select().from(schema.locationEntity).where(eq(schema.locationEntity.name, 'Mumbai')).limit(1);
  const mumbaiCityEntityId = mumbaiEntity[0]?.id || 3;

  // pincode_master
  await db.insert(schema.pincodeMaster).values([
    { pincode: '400001', city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  ]).onConflictDoNothing().execute();

  const mumbaiPincode = await db.select().from(schema.pincodeMaster).where(eq(schema.pincodeMaster.pincode, '400001')).limit(1);
  const mumbaiPincodeId = mumbaiPincode[0]?.id || 1;

  // location_entity_pincode
  await db.insert(schema.locationEntityPincode).values([
    { entityId: mumbaiCityEntityId, pincodeId: mumbaiPincodeId },
  ]).onConflictDoNothing().execute();

  // sku_level_master
  await db.insert(schema.skuLevelMaster).values([
    { clientId: defaultClientId, levelNo: 1, levelName: 'Category' },
    { clientId: defaultClientId, levelNo: 2, levelName: 'Subcategory', parentLevelId: 1 },
  ]).onConflictDoNothing().execute();

  const skuCategoryLevel = await db.select().from(schema.skuLevelMaster).where(eq(schema.skuLevelMaster.levelName, 'Category')).limit(1);
  const skuSubcategoryLevel = await db.select().from(schema.skuLevelMaster).where(eq(schema.skuLevelMaster.levelName, 'Subcategory')).limit(1);
  const categoryLevelId = skuCategoryLevel[0]?.id || 1;
  const subcategoryLevelId = skuSubcategoryLevel[0]?.id || 2;

  // sku_entity
  await db.insert(schema.skuEntity).values([
    { clientId: defaultClientId, levelId: categoryLevelId, name: 'Electronics', code: 'ELEC', isActive: true },
    { clientId: defaultClientId, levelId: subcategoryLevelId, name: 'Wires', code: 'WIRES', parentEntityId: 1, isActive: true },
  ]).onConflictDoNothing().execute();

  const electronicsEntity = await db.select().from(schema.skuEntity).where(eq(schema.skuEntity.name, 'Electronics')).limit(1);
  const wiresEntity = await db.select().from(schema.skuEntity).where(eq(schema.skuEntity.name, 'Wires')).limit(1);
  const electronicsId = electronicsEntity[0]?.id || 1;
  const wiresId = wiresEntity[0]?.id || 2;

  // sku_variant
  await db.insert(schema.skuVariant).values([
    { skuEntityId: wiresId, variantName: 'Copper Wire 1mm', packSize: '10m', mrp: "100.00", isActive: true },
  ]).onConflictDoNothing().execute();

  const wireVariant = await db.select().from(schema.skuVariant).where(eq(schema.skuVariant.variantName, 'Copper Wire 1mm')).limit(1);
  const wireVariantId = wireVariant[0]?.id || 1;

  // user_type_level_master
  await db.insert(schema.userTypeLevelMaster).values([
    { levelNo: 1, levelName: 'Role Level' },
  ]).onConflictDoNothing().execute();

  const userTypeRoleLevel = await db.select().from(schema.userTypeLevelMaster).where(eq(schema.userTypeLevelMaster.levelName, 'Role Level')).limit(1);
  const roleLevelId = userTypeRoleLevel[0]?.id || 1;

  // user_type_entity
  await db.insert(schema.userTypeEntity).values([
    { levelId: roleLevelId, typeName: 'Admin', isActive: true },
    { levelId: roleLevelId, typeName: 'Retailer', isActive: true },
    { levelId: roleLevelId, typeName: 'Electrician', isActive: true },
  ]).onConflictDoNothing().execute();

  const userTypeAdmin = await db.select().from(schema.userTypeEntity).where(eq(schema.userTypeEntity.typeName, 'Admin')).limit(1);
  const userTypeRetailer = await db.select().from(schema.userTypeEntity).where(eq(schema.userTypeEntity.typeName, 'Retailer')).limit(1);
  const userTypeElectrician = await db.select().from(schema.userTypeEntity).where(eq(schema.userTypeEntity.typeName, 'Electrician')).limit(1);
  const adminRoleId = userTypeAdmin[0]?.id || 1;
  const retailerRoleId = userTypeRetailer[0]?.id || 2;
  const electricianRoleId = userTypeElectrician[0]?.id || 3;

  // sku_point_config
  await db.insert(schema.skuPointConfig).values([
    { 
      clientId: defaultClientId, 
      skuVariantId: wireVariantId, 
      userTypeId: retailerRoleId, 
      pointsPerUnit: "5.00", 
      validFrom: new Date('2025-01-01T00:00:00.000Z').toISOString(), 
      validTo: new Date('2025-12-31T23:59:59.999Z').toISOString(), 
      remarks: 'Standard points for retailers' 
    },
  ]).onConflictDoNothing().execute();

  // Seed users (after roles, languages, etc.)
  await db.insert(schema.users).values([
    {
      roleId: adminRoleId,
      name: 'Admin User',
      phone: '+919999999999',
      email: 'admin@example.com',
      password: 'hashed_password_here', // In real scenario, hash this
      onboardingTypeId: onboardingTypeRetailId,
      approvalStatusId: approvalStatusApprovedId,
      languageId: languageIdEnglish,
    },
    {
      roleId: retailerRoleId,
      name: 'John Retailer',
      phone: '+919888888888',
      email: 'john@example.com',
      password: 'hashed_password_here',
      onboardingTypeId: onboardingTypeRetailId,
      approvalStatusId: approvalStatusApprovedId,
      languageId: languageIdEnglish,
    },
    {
      roleId: electricianRoleId,
      name: 'Jane Electrician',
      phone: '+919777777777',
      email: 'jane@example.com',
      password: 'hashed_password_here',
      onboardingTypeId: onboardingTypeElectricianId,
      approvalStatusId: approvalStatusApprovedId,
      languageId: languageIdEnglish,
    },
  ]).onConflictDoNothing().execute();

  const adminUser = await db.select().from(schema.users).where(eq(schema.users.name, 'Admin User')).limit(1);
  const johnUser = await db.select().from(schema.users).where(eq(schema.users.name, 'John Retailer')).limit(1);
  const janeUser = await db.select().from(schema.users).where(eq(schema.users.name, 'Jane Electrician')).limit(1);
  const adminUserId = adminUser[0]?.id || 1;
  const johnUserId = johnUser[0]?.id || 2;
  const janeUserId = janeUser[0]?.id || 3;

  // Seed retailers
  await db.insert(schema.retailers).values([
    {
      userId: johnUserId,
      uniqueId: 'RET001',
      name: 'John Retail Store',
      phone: '9888888888',
      email: 'john@example.com',
      aadhaar: '123456789012',
      pan: 'ABCDE1234F',
      gst: '27ABCDE1234F1Z5',
      address: '123 Main St',
      city: 'Mumbai',
      district: 'Mumbai Suburban',
      state: 'Maharashtra',
      dob: new Date('1990-01-01T00:00:00.000Z').toISOString(),
      referralCode: 'REF001',
      isKycVerified: true,
      onboardingTypeId: onboardingTypeRetailId,
      tdsConsent: true,
      bankAccountNo: '1234567890',
      bankAccountIfsc: 'SBIN0001234',
      bankAccountName: 'John Doe',
      upiId: 'john@upi',
      isBankValidated: true,
      pointsBalance: 100,
      sapCustomerCode: 'CUST001',
      kycDocuments: { aadhaarFront: 'url1', aadhaarBack: 'url2' } as const,
      totalEarnings: 500.00,
      totalBalance: 400.00,
      totalRedeemed: 100.00,
      tdsPercentage: 10,
      tdsKitty: 50.00,
      tdsDeducted: 50.00,
      lastSettlementDate: new Date('2025-10-01T00:00:00.000Z').toISOString(),
    },
  ] as any).onConflictDoNothing().execute();

  // Seed electricians
  await db.insert(schema.electricians).values([
    {
      userId: janeUserId,
      uniqueId: 'ELEC001',
      name: 'Jane Electric Services',
      phone: '+919777777777',
      email: 'jane@example.com',
      aadhaar: '987654321098',
      pan: 'FGHIJ5678K',
      gst: '27FGHIJ5678K1Z5',
      address: '456 High St',
      city: 'Mumbai',
      district: 'Mumbai Suburban',
      state: 'Maharashtra',
      dob: new Date('1985-05-15T00:00:00.000Z').toISOString(),
      referralCode: 'REF002',
      isKycVerified: true,
      onboardingTypeId: onboardingTypeElectricianId,
      tdsConsent: true,
      bankAccountNo: '0987654321',
      bankAccountIfsc: 'HDFC0005678',
      bankAccountName: 'Jane Smith',
      upiId: 'jane@upi',
      isBankValidated: true,
      pointsBalance: 200,
      sapCustomerCode: 'CUST002',
      kycDocuments: { aadhaarFront: 'url3', aadhaarBack: 'url4' } as const,
      electricianCertificate: 'cert_url',
      totalEarnings: 1000.00,
      totalBalance: 800.00,
      totalRedeemed: 200.00,
      tdsPercentage: 10,
      tdsKitty: 100.00,
      tdsDeducted: 100.00,
      lastSettlementDate: new Date('2025-09-15T00:00:00.000Z').toISOString(),
    },
  ]as any).onConflictDoNothing().execute();

  // Seed counter_sales (example with attached retailer)
  await db.insert(schema.counterSales).values([
    {
      userId: johnUserId, // Same user as retailer for simplicity
      uniqueId: 'CS001',
      name: 'John Counter Sales',
      phone: '+919888888889',
      email: 'counter@john.com',
      aadhaar: '123456789013',
      pan: 'ABCDE1234G',
      gst: '27ABCDE1234G1Z5',
      address: '123 Main St',
      city: 'Mumbai',
      district: 'Mumbai Suburban',
      state: 'Maharashtra',
      dob: new Date('1992-03-10T00:00:00.000Z').toISOString(),
      referralCode: 'REF003',
      isKycVerified: true,
      onboardingTypeId: onboardingTypeCounterSalesId,
      tdsConsent: true,
      bankAccountNo: '1234567891',
      bankAccountIfsc: 'SBIN0001235',
      bankAccountName: 'John Counter',
      upiId: 'counter@upi',
      isBankValidated: true,
      pointsBalance: 50,
      sapCustomerCode: 'CUST003',
      kycDocuments: { aadhaarFront: 'url5', aadhaarBack: 'url6' } as const,
      attachedRetailerId: johnUserId,
      totalEarnings: 250.00,
      totalBalance: 200.00,
      totalRedeemed: 50.00,
      tdsPercentage: 10,
      tdsKitty: 25.00,
      tdsDeducted: 25.00,
      lastSettlementDate: new Date('2025-10-05T00:00:00.000Z').toISOString(),
    },
  ]as any).onConflictDoNothing().execute();

  // Seed schemes
  await db.insert(schema.schemes).values([
    {
      name: 'Welcome Points',
      schemeType: schemeTypePointsId,
      description: 'Initial points for new users',
      startDate: new Date('2025-01-01T00:00:00.000Z').toISOString(),
      endDate: new Date('2025-12-31T23:59:59.999Z').toISOString(),
      isActive: true,
      budget: 100000,
      spentBudget: 0,
      config: { minPoints: 100 } as const,
    },
  ]).onConflictDoNothing().execute();

  const welcomeScheme = await db.select().from(schema.schemes).where(eq(schema.schemes.name, 'Welcome Points')).limit(1);
  const welcomeSchemeId = welcomeScheme[0]?.id || 1;

  // Seed campaigns (similar to schemes)
  await db.insert(schema.campaigns).values([
    {
      name: 'Holiday Promo',
      schemeType: schemeTypeCashbackId,
      description: 'Holiday cashback campaign',
      startDate: new Date('2025-11-01T00:00:00.000Z').toISOString(),
      endDate: new Date('2025-12-31T23:59:59.999Z').toISOString(),
      isActive: true,
      budget: 50000,
      spentBudget: 0,
      config: { cashbackRate: 0.05 } as const,
    },
  ]).onConflictDoNothing().execute();

  // Seed creatives
  await db.insert(schema.creatives).values([
    {
      typeId: creativesTypeBannerId,
      url: 'https://example.com/banner1.jpg',
      title: 'Welcome Banner',
      description: 'Welcome to the app',
      carouselName: 'home',
      displayOrder: 1,
      targetAudience: { roles: ['Retailer'] } as const,
      metadata: {} as const,
      isActive: true,
      startDate: new Date('2025-01-01T00:00:00.000Z').toISOString(),
      endDate: new Date('2025-12-31T23:59:59.999Z').toISOString(),
    },
  ]).onConflictDoNothing().execute();

  // Seed tickets (example)
  await db.insert(schema.tickets).values([
    {
      typeId: ticketTypeSupportId,
      statusId: ticketStatusOpenId,
      subject: 'Login Issue',
      description: 'Cannot login to app',
      imageUrl: 'https://example.com/issue1.jpg',
      videoUrl: null,
      priority: 'High',
      assigneeId: adminUserId,
      createdBy: johnUserId,
      resolutionNotes: null,
      resolvedAt: null,
      attachments: [] as const,
      metadata: {} as const,
    },
  ]).onConflictDoNothing().execute();

  // Seed referrals
  await db.insert(schema.referrals).values([
    {
      referrerId: johnUserId,
      referredId: janeUserId,
      status: 'approved',
      bonusAwarded: 50,
    },
  ]).onConflictDoNothing().execute();

  // Seed app_configs
  await db.insert(schema.appConfigs).values([
    {
      key: 'app_version',
      value: { version: '1.0.0', build: 1 } as const,
      description: 'Current app version',
      updatedBy: adminUserId,
    },
    {
      key: 'points_multiplier',
      value: { multiplier: 1.0 } as const,
      description: 'Points multiplier config',
      updatedBy: adminUserId,
    },
  ]).onConflictDoNothing().execute();

  // Minimal transactions (for retailer)
  await db.insert(schema.retailerTransactions).values([
    {
      userId: johnUserId,
      earningType: earningTypeSaleId,
      points: 10.00,
      category: 'Electronics',
      subcategory: 'Wires',
      sku: 'WIRE001',
      batchNumber: 'BATCH001',
      serialNumber: 'SN001',
      qrCode: 'QR001',
      remarks: 'Sale transaction',
      latitude: 19.0760,
      longitude: 72.8777,
      metadata: { quantity: 1 } as const,
      schemeId: welcomeSchemeId,
    },
  ]as any).onConflictDoNothing().execute();

  // Ledger entry for retailer
  await db.insert(schema.retailerLedger).values([
    {
      userId: johnUserId,
      earningType: earningTypeSaleId,
      redemptionType: redemptionChannelUpiId, // Using channel id as proxy for type
      amount: 10.00,
      type: 'credit',
      remarks: 'Points earned',
      openingBalance: 90.00,
      closingBalance: 100.00,
    },
  ]as any).onConflictDoNothing().execute();

  // QR codes
  await db.insert(schema.qrCodes).values([
    {
      sku: 'WIRE001',
      batchNumber: 'BATCH001',
      typeId: qrTypeProductId,
      code: 'QR_CODE_001',
      securityCode: 'SEC001',
      manufacturingDate: new Date('2025-10-01T00:00:00.000Z').toISOString(),
      monoSubMonoId: 'MONO001',
      parentQrId: null,
      isScanned: true,
      scannedBy: johnUserId,
      monthlyVolume: 100,
      locationAccess: { allowed: ['Mumbai'] } as const,
    },
  ]).onConflictDoNothing().execute();

  // Redemptions
  await db.insert(schema.redemptions).values([
    {
      userId: johnUserId,
      redemptionId: 'RED001',
      channelId: redemptionChannelUpiId,
      pointsRedeemed: 50,
      amount: 500,
      status: redemptionStatusPendingId,
      schemeId: welcomeSchemeId,
      metadata: { upiId: 'john@upi' } as const,
      approvedBy: null,
    },
  ]).onConflictDoNothing().execute();

  console.log('Database seeded successfully!');
}

seed()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });