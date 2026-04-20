import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { cacheMaster } from '../utils/masterCache';
import db from '../config/db';
import * as schema from '../schema';

/**
 * Middleware to authorize users based on their role/user type
 * @param allowedRoles - Array of allowed user type names (e.g., ['Counter Staff', 'Retailer'])
 * @returns Express middleware function
 */
export const authorizeRoles = (allowedRoles: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = (req as any).user;

            if (!user) {
                throw new AppError('User not authenticated', 401);
            }

            // Get user types from cache
            // const userTypes = await cacheMaster(
            //     'userTypes',
            //     async () => db.select().from(schema.userTypeEntity).execute()
            // );
            const userTypes = await db.select().from(schema.userTypeEntity).execute();
            console.log(userTypes)
            // Find the user's role details
            const userRole = userTypes.find((type) => type.id === user.roleId);
            console.log(userRole, user.roleId);
            if (!userRole) {
                throw new AppError('Invalid user role', 403);
            }

            // Check if user's role is in the allowed roles
            if (!allowedRoles.includes(userRole.typeName)) {
                throw new AppError(
                    `Access denied. Only ${allowedRoles.join(', ')} can access this resource.`,
                    403
                );
            }

            // Attach role information to request for use in controllers
            (req as any).userRole = userRole.typeName;

            next();
        } catch (err) {
            next(err);
        }
    };
};
