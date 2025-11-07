import db from '../config/db';
import * as schema from '../schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const validators: Record<string, z.ZodTypeAny> = {
  onboardingTypes: z.object({ name: z.string(), description: z.string().optional(), isActive: z.boolean().optional() }),
  approvalStatuses: z.object({ name: z.string(), description: z.string().optional(), isActive: z.boolean().optional() }),
  languages: z.object({ name: z.string(), code: z.string().optional(), description: z.string().optional(), isActive: z.boolean().optional() }),
  appConfigs: z.object({ key: z.string(), value: z.any(), description: z.string().optional(), updatedBy: z.number().optional() }),
  skuLevelMaster: z.object({ clientId: z.number(), levelNo: z.number(), levelName: z.string(), parentLevelId: z.number().optional() }),
  skuEntity: z.object({ clientId: z.number(), levelId: z.number(), name: z.string(), code: z.string().optional(), parentEntityId: z.number().optional(), isActive: z.boolean().optional() }),
  skuVariant: z.object({ skuEntityId: z.number(), variantName: z.string(), packSize: z.string().optional(), mrp: z.string().optional(), isActive: z.boolean().optional() }),
  userTypeLevelMaster: z.object({ levelNo: z.number(), levelName: z.string(), parentLevelId: z.number().optional() }),
  userTypeEntity: z.object({ levelId: z.number(), typeName: z.string(), parentTypeId: z.number().optional(), isActive: z.boolean().optional() }),
  skuPointConfig: z.object({ clientId: z.number(), skuVariantId: z.number(), userTypeId: z.number(), pointsPerUnit: z.string(), validFrom: z.string().optional(), validTo: z.string().optional(), remarks: z.string().optional() }),
};

export const listMasters = async (table: string) => {
  switch (table) {
    case 'onboardingTypes':
      return db.select().from(schema.onboardingTypes).execute();
    case 'approvalStatuses':
      return db.select().from(schema.approvalStatuses).execute();
    case 'languages':
      return db.select().from(schema.languages).execute();
    case 'appConfigs':
      return db.select().from(schema.appConfigs).execute();
    case 'skuLevelMaster':
      return db.select().from(schema.skuLevelMaster).execute();
    case 'skuEntity':
      return db.select().from(schema.skuEntity).execute();
    case 'skuVariant':
      return db.select().from(schema.skuVariant).execute();
    case 'userTypeLevelMaster':
      return db.select().from(schema.userTypeLevelMaster).execute();
    case 'userTypeEntity':
      return db.select().from(schema.userTypeEntity).execute();
    case 'skuPointConfig':
      return db.select().from(schema.skuPointConfig).execute();
    default:
      throw new Error('Unknown master');
  }
};

export const getMaster = async (table: string, id: number) => {
  switch (table) {
    case 'onboardingTypes':
      return db.select().from(schema.onboardingTypes).where(eq(schema.onboardingTypes.id, id)).limit(1);
    case 'approvalStatuses':
      return db.select().from(schema.approvalStatuses).where(eq(schema.approvalStatuses.id, id)).limit(1);
    case 'languages':
      return db.select().from(schema.languages).where(eq(schema.languages.id, id)).limit(1);
    case 'appConfigs':
      return db.select().from(schema.appConfigs).where(eq(schema.appConfigs.id, id)).limit(1);
    case 'skuLevelMaster':
      return db.select().from(schema.skuLevelMaster).where(eq(schema.skuLevelMaster.id, id)).limit(1);
    case 'skuEntity':
      return db.select().from(schema.skuEntity).where(eq(schema.skuEntity.id, id)).limit(1);
    case 'skuVariant':
      return db.select().from(schema.skuVariant).where(eq(schema.skuVariant.id, id)).limit(1);
    case 'userTypeLevelMaster':
      return db.select().from(schema.userTypeLevelMaster).where(eq(schema.userTypeLevelMaster.id, id)).limit(1);
    case 'userTypeEntity':
      return db.select().from(schema.userTypeEntity).where(eq(schema.userTypeEntity.id, id)).limit(1);
    case 'skuPointConfig':
      return db.select().from(schema.skuPointConfig).where(eq(schema.skuPointConfig.id, id)).limit(1);
    default:
      throw new Error('Unknown master');
  }
};

export const createMaster = async (table: string, payload: any) => {
  const v = validators[table];
  if (v) v.parse(payload);
  switch (table) {
    case 'onboardingTypes':
      return db.insert(schema.onboardingTypes).values(payload).returning();
    case 'approvalStatuses':
      return db.insert(schema.approvalStatuses).values(payload).returning();
    case 'languages':
      return db.insert(schema.languages).values(payload).returning();
    case 'appConfigs':
      return db.insert(schema.appConfigs).values(payload).returning();
    case 'skuLevelMaster':
      return db.insert(schema.skuLevelMaster).values(payload).returning();
    case 'skuEntity':
      return db.insert(schema.skuEntity).values(payload).returning();
    case 'skuVariant':
      return db.insert(schema.skuVariant).values(payload).returning();
    case 'userTypeLevelMaster':
      return db.insert(schema.userTypeLevelMaster).values(payload).returning();
    case 'userTypeEntity':
      return db.insert(schema.userTypeEntity).values(payload).returning();
    case 'skuPointConfig':
      return db.insert(schema.skuPointConfig).values(payload).returning();
    default:
      throw new Error('Unknown master');
  }
};

export const updateMaster = async (table: string, id: number, payload: any) => {
  const v = validators[table];
  if (v) v.parse(payload);
  switch (table) {
    case 'onboardingTypes':
      return db.update(schema.onboardingTypes).set(payload).where(eq(schema.onboardingTypes.id, id)).returning();
    case 'approvalStatuses':
      return db.update(schema.approvalStatuses).set(payload).where(eq(schema.approvalStatuses.id, id)).returning();
    case 'languages':
      return db.update(schema.languages).set(payload).where(eq(schema.languages.id, id)).returning();
    case 'appConfigs':
      return db.update(schema.appConfigs).set(payload).where(eq(schema.appConfigs.id, id)).returning();
    case 'skuLevelMaster':
      return db.update(schema.skuLevelMaster).set(payload).where(eq(schema.skuLevelMaster.id, id)).returning();
    case 'skuEntity':
      return db.update(schema.skuEntity).set(payload).where(eq(schema.skuEntity.id, id)).returning();
    case 'skuVariant':
      return db.update(schema.skuVariant).set(payload).where(eq(schema.skuVariant.id, id)).returning();
    case 'userTypeLevelMaster':
      return db.update(schema.userTypeLevelMaster).set(payload).where(eq(schema.userTypeLevelMaster.id, id)).returning();
    case 'userTypeEntity':
      return db.update(schema.userTypeEntity).set(payload).where(eq(schema.userTypeEntity.id, id)).returning();
    case 'skuPointConfig':
      return db.update(schema.skuPointConfig).set(payload).where(eq(schema.skuPointConfig.id, id)).returning();
    default:
      throw new Error('Unknown master');
  }
};

// Safe delete: ensure not referenced by other tables (simple checks)
export const deleteMaster = async (table: string, id: number) => {
  switch (table) {
    case 'onboardingTypes': {
      const refs = await db.select().from(schema.users).where(eq(schema.users.onboardingTypeId, id)).limit(1);
      if (refs.length) throw new Error('Cannot delete: referenced by users');
      return db.delete(schema.onboardingTypes).where(eq(schema.onboardingTypes.id, id)).returning();
    }
    case 'approvalStatuses': {
      const refs = await db.select().from(schema.users).where(eq(schema.users.approvalStatusId, id)).limit(1);
      if (refs.length) throw new Error('Cannot delete: referenced by users');
      return db.delete(schema.approvalStatuses).where(eq(schema.approvalStatuses.id, id)).returning();
    }
    case 'languages': {
      const refs = await db.select().from(schema.users).where(eq(schema.users.languageId, id)).limit(1);
      if (refs.length) throw new Error('Cannot delete: referenced by users');
      return db.delete(schema.languages).where(eq(schema.languages.id, id)).returning();
    }
    case 'appConfigs':
      return db.delete(schema.appConfigs).where(eq(schema.appConfigs.id, id)).returning();
    case 'skuLevelMaster': {
      const refs = await db.select().from(schema.skuEntity).where(eq(schema.skuEntity.levelId, id)).limit(1);
      if (refs.length) throw new Error('Cannot delete: referenced by skuEntity');
      return db.delete(schema.skuLevelMaster).where(eq(schema.skuLevelMaster.id, id)).returning();
    }
    case 'skuEntity': {
      const refs = await db.select().from(schema.skuVariant).where(eq(schema.skuVariant.skuEntityId, id)).limit(1);
      if (refs.length) throw new Error('Cannot delete: referenced by skuVariant');
      return db.delete(schema.skuEntity).where(eq(schema.skuEntity.id, id)).returning();
    }
    case 'skuVariant': {
      const refs = await db.select().from(schema.skuPointConfig).where(eq(schema.skuPointConfig.skuVariantId, id)).limit(1);
      if (refs.length) throw new Error('Cannot delete: referenced by skuPointConfig');
      return db.delete(schema.skuVariant).where(eq(schema.skuVariant.id, id)).returning();
    }
    case 'userTypeLevelMaster': {
      const refs = await db.select().from(schema.userTypeEntity).where(eq(schema.userTypeEntity.levelId, id)).limit(1);
      if (refs.length) throw new Error('Cannot delete: referenced by userTypeEntity');
      return db.delete(schema.userTypeLevelMaster).where(eq(schema.userTypeLevelMaster.id, id)).returning();
    }
    case 'userTypeEntity': {
      const refs = await db.select().from(schema.skuPointConfig).where(eq(schema.skuPointConfig.userTypeId, id)).limit(1);
      if (refs.length) throw new Error('Cannot delete: referenced by skuPointConfig');
      return db.delete(schema.userTypeEntity).where(eq(schema.userTypeEntity.id, id)).returning();
    }
    case 'skuPointConfig':
      return db.delete(schema.skuPointConfig).where(eq(schema.skuPointConfig.id, id)).returning();
    default:
      throw new Error('Unknown master');
  }
};
