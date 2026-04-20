import { Request, Response, NextFunction } from "express";
import { cacheMaster } from "../utils/masterCache";
import * as schema from "../schema";
import { AppError } from "./errorHandler";
import db from "../config/db";

declare global {
  namespace Express {
    interface Request {
      accessLevel?: number;
      accessType?: string;
    }
  }
}
export type UserRole =
  | "Admin"
  | "Retailer"
  | "Electrician"
  | "Counter_Staff"
  | "Finance_Approver"
  | "Super_Admin";

export const accessLevelMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;
    if (!user?.userType) return next(); // public route

    const levels = await cacheMaster("userTypes", async () =>
      db.select().from(schema.userTypeEntity).execute()
    );

    const entry = levels.find((l) => l.typeName === user.userType);
    if (!entry) {
      throw new AppError(`Invalid accessType: ${user.userType}`, 403);
    }

    req.accessLevel = entry.levelId;
    req.accessType = entry.accessType;

    next();
  } catch (err) {
    next(err);
  }
};

export const authorize = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user) {
      throw new AppError("Authentication required", 401);
    }

    // Get user's role from the database
    const userRole = user.roleId; // This should be the role ID
    // You need to map roleId to role name using your userTypeEntity table

    // Simple implementation - adjust based on your schema
    const userRoleMap: Record<number, UserRole> = {
      1: "Admin",
      2: "Retailer",
      3: "Electrician",
      4: "Counter_Staff",
      5: "Finance_Approver",
      6: "Super_Admin",
    };

    const roleName = userRoleMap[userRole];

    if (!roleName || !allowedRoles.includes(roleName)) {
      throw new AppError("Insufficient permissions", 403);
    }

    next();
  };
};