import { userService } from '../services/userService';
import userSchemas from '../validators/userSchemas';
import { Procedure } from './base';
import { db } from '../config/db';
import * as schema from '../schema';
import { eq } from 'drizzle-orm';

export class RegistrationProcedure extends Procedure<any, any> {
  async execute(): Promise<any> {
    // Validate basic user fields
    const validated = userSchemas.insertUserSchema.parse(this.input);

    // log intent
    await this.logEvent('USER_REGISTRATION', undefined, { userEmail: validated.email });

    // Accept either userTypeId or userTypeName in input
    const userTypeId = (this.input as any).userTypeId as number | undefined;
    const userTypeName = (this.input as any).userTypeName as string | undefined;

    return this.withTransaction(async (tx) => {
      // determine role
      let roleRow: any[] = [];
      if (userTypeId) {
        roleRow = await tx.select().from(schema.userTypeEntity).where(eq(schema.userTypeEntity.id, userTypeId)).limit(1);
      } else if (userTypeName) {
        roleRow = await tx.select().from(schema.userTypeEntity).where(eq(schema.userTypeEntity.typeName, userTypeName)).limit(1);
      } else {
        throw new Error('userTypeId or userTypeName is required');
      }

      const role = roleRow[0];
      if (!role) throw new Error('User type not found');

      const roleName = String(role.typeName || '').toLowerCase();

      // default fk values
      const onboardingDefault = await tx.select().from(schema.onboardingTypes).limit(1);
      const onboardingTypeId = (this.input as any).onboardingTypeId || onboardingDefault[0]?.id || 1;
      const approvalDefault = await tx.select().from(schema.approvalStatuses).where(eq(schema.approvalStatuses.name, 'Pending')).limit(1);
      const approvalStatusId = (this.input as any).approvalStatusId || approvalDefault[0]?.id || 1;
      const languageDefault = await tx.select().from(schema.languages).limit(1);
      const languageId = (this.input as any).languageId || languageDefault[0]?.id || 1;

      // assemble user payload
      const userPayload: any = {
        roleId: Number(role.id),
        name: validated.name,
        phone: validated.phone,
        email: validated.email || null,
        onboardingTypeId,
        approvalStatusId,
        languageId,
      };

      // insert into users
      const [newUser] = await userService.create(userPayload, tx);
      const userId = newUser.id;

      // create role-specific record
      let createdEntity: any = null;

      if (roleName.includes('retail')) {
        // require fields for retailer
        const { aadhaar, uniqueId } = this.input as any;
        if (!aadhaar) throw new Error('AADHAAR is required for retailer registration');
        const retailerPayload: any = {
          userId,
          uniqueId: uniqueId || `RET-${Date.now()}`,
          name: validated.name,
          phone: validated.phone,
          email: validated.email || null,
          aadhaar,
          onboardingTypeId,
        };
        const res = await tx.insert(schema.retailers).values(retailerPayload).returning();
        createdEntity = res[0];
      } else if (roleName.includes('electric')) {
        const { aadhaar, uniqueId } = this.input as any;
        if (!aadhaar) throw new Error('AADHAAR is required for electrician registration');
        const electricianPayload: any = {
          userId,
          uniqueId: uniqueId || `ELEC-${Date.now()}`,
          name: validated.name,
          phone: validated.phone,
          email: validated.email || null,
          aadhaar,
          onboardingTypeId,
        };
        const res = await tx.insert(schema.electricians).values(electricianPayload).returning();
        createdEntity = res[0];
      } else if (roleName.includes('counter')) {
        const { aadhaar, uniqueId } = this.input as any;
        if (!aadhaar) throw new Error('AADHAAR is required for counter sales registration');
        const counterPayload: any = {
          userId,
          uniqueId: uniqueId || `CS-${Date.now()}`,
          name: validated.name,
          phone: validated.phone,
          email: validated.email || null,
          aadhaar,
          onboardingTypeId,
        };
        const res = await tx.insert(schema.counterSales).values(counterPayload).returning();
        createdEntity = res[0];
      } else {
        // generic user type; nothing more to do
      }

      await this.logEvent('USER_REGISTERED', userId, { role: role.typeName });

      return { user: newUser, entity: createdEntity };
    });
  }
}

// Registration related procedures will go here