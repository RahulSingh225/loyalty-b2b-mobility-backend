import { db } from '../config/db';
import * as schema from '../schema';
import { eq } from 'drizzle-orm';
import { randomBytes, scryptSync } from 'crypto';

const scryptHash = (password: string) => {
  const salt = randomBytes(16).toString('hex');
  const key = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${key}`;
};

export const masterAdminExists = async () => {
  // find admin role id
  const adminRole = await db.select().from(schema.userTypeEntity).where(eq(schema.userTypeEntity.typeName, 'Admin')).limit(1);
  const adminRoleId = adminRole[0]?.id;
  if (!adminRoleId) return false;
  const users = await db.select().from(schema.users).where(eq(schema.users.roleId, Number(adminRoleId))).limit(1);
  return users.length > 0;
};

export const createMasterAdmin = async (payload: { name: string; email: string; phone: string; password: string; clientId?: number }) => {
  const exists = await masterAdminExists();
  if (exists) throw new Error('Master admin already exists');

  // ensure an admin role exists
  let adminRole = await db.select().from(schema.userTypeEntity).where(eq(schema.userTypeEntity.typeName, 'Admin')).limit(1);
  let adminRoleId = adminRole[0]?.id;

  if (!adminRoleId) {
    // ensure there's at least one level
    let level = await db.select().from(schema.userTypeLevelMaster).limit(1);
    let levelId = level[0]?.id;
    if (!levelId) {
      const inserted = await db.insert(schema.userTypeLevelMaster).values({ levelNo: 1, levelName: 'Role Level' }).returning();
      levelId = inserted[0]?.id;
    }
    const insertedRole = await db.insert(schema.userTypeEntity).values({ levelId: levelId, typeName: 'Admin', isActive: true }).returning();
    adminRoleId = insertedRole[0]?.id;
  }

  // pick defaults for required fk columns
  const onboarding = await db.select().from(schema.onboardingTypes).limit(1);
  const onboardingTypeId = onboarding[0]?.id || 1;
  const approval = await db.select().from(schema.approvalStatuses).where(eq(schema.approvalStatuses.name, 'Approved')).limit(1);
  const approvalStatusId = approval[0]?.id || 1;
  const language = await db.select().from(schema.languages).limit(1);
  const languageId = language[0]?.id || 1;

  const hashed = scryptHash(payload.password);

  const insert = {
    roleId: Number(adminRoleId),
    name: payload.name,
    phone: payload.phone,
    email: payload.email,
    password: hashed,
    onboardingTypeId,
    approvalStatusId,
    languageId,
    isSuspended: false,
    fcmToken: null,
  } as any;

  const res = await db.insert(schema.users).values(insert).returning();
  return res;
};

export default { masterAdminExists, createMasterAdmin };
