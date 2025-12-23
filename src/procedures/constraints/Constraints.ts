import { AppError } from '../../middlewares/errorHandler';
import { Procedure } from '../base';
import { UserType } from '../../types';

export interface ConstraintContext {
  tx: any;
  userId: number;
  userType: UserType;
  roleId: number;
  qr: any;                // qrCodes row
  points: number;         // mutable gross points (before TDS)
  netPoints: number;      // mutable after TDS
  primaryScan: boolean;   // true if this user is the one initiating the scan
}

export interface ScanConstraint {
  appliesTo: UserType[];
  execute(ctx: ConstraintContext): Promise<void>;
}