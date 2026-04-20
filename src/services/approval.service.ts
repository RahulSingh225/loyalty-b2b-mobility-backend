// import { eq, and, desc, sql, inArray, or } from "drizzle-orm";
// import { db } from "../config/db";
// import {
//   redemptionApprovals,
//   redemptionThresholds,
//   approvalRoles,
//   userApprovalRoles,
//   approvalAuditLogs,
//   redemptions,
//   redemptionStatuses,
//   redemptionChannels,
//   users,
//   userAmazonOrders,
//   physicalRewardsRedemptions,
//   physicalRewardsCatalogue,
//   amazonMarketplaceProducts,
// } from "../schema";
// import { AppError } from "../middlewares/errorHandler";

// // Type Definitions
// export interface RedemptionCheckResult {
//   requiresApproval: boolean;
//   approvalLevel?: string;
//   flaggedReasons?: string[];
//   thresholdExceeded?: boolean;
//   userDailyLimit?: number;
//   userMonthlyLimit?: number;
// }

// export interface ApprovalQueueItem {
//   id: number;
//   redemptionId: number;
//   userId: number;
//   userName: string;
//   userPhone: string;
//   redemptionType: string;
//   requestedPoints: number;
//   approvalStatus: string;
//   approvalLevel: string;
//   flaggedReasons?: string[];
//   metadata: any;
//   createdAt: Date;
//   userType?: string;
//   redemptionDetails?: any;
// }

// export type ApprovalActionType = 'APPROVE' | 'REJECT' | 'ESCALATE';

// export interface BaseApprovalAction {
//   action: ApprovalActionType;
//   notes?: string;
// }

// export interface ApproveAction extends BaseApprovalAction {
//   action: 'APPROVE';
// }

// export interface RejectAction extends BaseApprovalAction {
//   action: 'REJECT';
//   rejectionReason: string;
// }

// export interface EscalateAction extends BaseApprovalAction {
//   action: 'ESCALATE';
//   escalationLevel: 'ADMIN' | 'SUPER_ADMIN';
// }

// export type ApprovalAction = ApproveAction | RejectAction | EscalateAction;

// export interface ApprovalFilters {
//   approvalLevel?: string;
//   redemptionType?: string;
//   page?: number;
//   limit?: number;
//   search?: string;
//   status?: string;
//   fromDate?: string;
//   toDate?: string;
// }

// // Type guard for metadata
// interface RedemptionMetadata {
//   redemptionType?: string;
//   orderId?: string;
//   redemptionRequestId?: string;
//   [key: string]: any;
// }

// function isRedemptionMetadata(obj: any): obj is RedemptionMetadata {
//   return obj && typeof obj === 'object';
// }

// export class ApprovalService {
//   // Check if redemption requires approval
//   async checkRedemptionApproval(
//     userId: number,
//     points: number,
//     redemptionType: string,
//     userType?: string
//   ): Promise<RedemptionCheckResult> {
//     const result: RedemptionCheckResult = {
//       requiresApproval: false,
//       flaggedReasons: [],
//     };

//     try {
//       // Get user details
//       const [user] = await db
//         .select()
//         .from(users)
//         .where(eq(users.id, userId))
//         .limit(1);

//       if (!user) {
//         throw new AppError("User not found", 404);
//       }

//       // Check single transaction threshold
//       const singleThreshold = await db
//         .select()
//         .from(redemptionThresholds)
//         .where(
//           and(
//             eq(redemptionThresholds.thresholdType, 'SINGLE_TRANSACTION'),
//             or(
//               eq(redemptionThresholds.userType, 'ALL'),
//               eq(redemptionThresholds.userType, userType || 'ALL')
//             ),
//             eq(redemptionThresholds.isActive, true)
//           )
//         )
//         .limit(1);

//       if (singleThreshold.length > 0) {
//         const threshold = singleThreshold[0];
//         if (points > threshold.thresholdValue) {
//           result.requiresApproval = threshold.requiresApproval;
//           result.approvalLevel = threshold.approvalLevel;
//           result.thresholdExceeded = true;
//           result.flaggedReasons = result.flaggedReasons || [];
//           result.flaggedReasons.push(
//             `Transaction exceeds single transaction limit of ${threshold.thresholdValue} points`
//           );
//         }
//       }

//       // Check daily limit
//       const today = new Date();
//       today.setHours(0, 0, 0, 0);

//       const dailyRedemptions = await db
//         .select({ total: sql<number>`COALESCE(SUM(points_redeemed), 0)` })
//         .from(redemptions)
//         .where(
//           and(
//             eq(redemptions.userId, userId),
//             sql`${redemptions.createdAt} >= ${today.toISOString()}::timestamp`,
//             inArray(
//               redemptions.status,
//               db.select({ id: redemptionStatuses.id })
//                 .from(redemptionStatuses)
//                 .where(inArray(redemptionStatuses.name, ['APPROVED', 'COMPLETED']))
//             )
//           )
//         );

//       const dailyTotal = Number(dailyRedemptions[0]?.total || 0);

//       const dailyThreshold = await db
//         .select()
//         .from(redemptionThresholds)
//         .where(
//           and(
//             eq(redemptionThresholds.thresholdType, 'DAILY_LIMIT'),
//             or(
//               eq(redemptionThresholds.userType, 'ALL'),
//               eq(redemptionThresholds.userType, userType || 'ALL')
//             ),
//             eq(redemptionThresholds.isActive, true)
//           )
//         )
//         .limit(1);

//       if (dailyThreshold.length > 0) {
//         const threshold = dailyThreshold[0];
//         if (dailyTotal + points > threshold.thresholdValue) {
//           result.requiresApproval = threshold.requiresApproval || result.requiresApproval;
//           result.approvalLevel = threshold.approvalLevel || result.approvalLevel;
//           result.userDailyLimit = threshold.thresholdValue;
//           result.flaggedReasons = result.flaggedReasons || [];
//           result.flaggedReasons.push(
//             `Daily redemption limit will be exceeded (${dailyTotal + points} > ${threshold.thresholdValue})`
//           );
//         }
//       }

//       // Check for flagged redemption types
//       if (redemptionType === 'PHYSICAL_REWARD') {
//         result.requiresApproval = true;
//         result.approvalLevel = 'FINANCE';
//         result.flaggedReasons = result.flaggedReasons || [];
//         result.flaggedReasons.push('Physical rewards require manual approval');
//       }

//       // Check for new users (first redemption)
//       const userRedemptions = await db
//         .select({ count: sql<number>`COUNT(*)` })
//         .from(redemptions)
//         .where(
//           and(
//             eq(redemptions.userId, userId),
//             inArray(
//               redemptions.status,
//               db.select({ id: redemptionStatuses.id })
//                 .from(redemptionStatuses)
//                 .where(inArray(redemptionStatuses.name, ['APPROVED', 'COMPLETED']))
//             )
//           )
//         );

//       if (Number(userRedemptions[0]?.count || 0) === 0 && points > 1000) {
//         result.requiresApproval = true;
//         result.approvalLevel = 'FINANCE';
//         result.flaggedReasons = result.flaggedReasons || [];
//         result.flaggedReasons.push('First time redemption above 1000 points');
//       }

//       return result;
//     } catch (error) {
//       console.error("Error checking redemption approval:", error);
//       // Default to requiring approval if check fails
//       return {
//         requiresApproval: true,
//         approvalLevel: 'FINANCE',
//         flaggedReasons: ['System check failed - manual review required'],
//       };
//     }
//   }

//   // Create approval request
//   async createApprovalRequest(
//     redemptionId: number,
//     userId: number,
//     points: number,
//     redemptionType: string,
//     flaggedReasons?: string[],
//     metadata?: any
//   ) {
//     return db.transaction(async (tx) => {
//       // Get approval level based on redemption type and points
//       let approvalLevel = 'FINANCE';
      
//       if (redemptionType === 'MARKETPLACE' && points > 50000) {
//         approvalLevel = 'ADMIN';
//       } else if (redemptionType === 'PHYSICAL_REWARD') {
//         approvalLevel = 'FINANCE';
//       } else if (points > 100000) {
//         approvalLevel = 'ADMIN';
//       }

//       const [approval] = await tx
//         .insert(redemptionApprovals)
//         .values({
//           redemptionId,
//           userId,
//           requestedPoints: points,
//           redemptionType,
//           approvalStatus: 'PENDING',
//           approvalLevel,
//           flaggedReasons: flaggedReasons || [],
//           metadata: metadata || {},
//           createdAt: new Date(),
//           updatedAt: new Date(),
//         })
//         .returning();

//       // Create audit log
//       await tx.insert(approvalAuditLogs).values({
//         redemptionId,
//         approvalId: approval.id,
//         action: 'CREATED',
//         previousStatus: null,
//         newStatus: 'PENDING',
//         notes: `Approval request created for ${points} points`,
//         metadata: { redemptionType, flaggedReasons },
//         createdAt: new Date(),
//       });

//       return approval;
//     });
//   }

//   // Get pending approvals for approver
//   async getPendingApprovals(
//     approverId: number,
//     filters?: ApprovalFilters
//   ) {
//     const page = filters?.page || 1;
//     const limit = filters?.limit || 20;
//     const offset = (page - 1) * limit;

//     // Get approver's roles
//     const approverRoles = await db
//       .select({
//         role: approvalRoles,
//       })
//       .from(userApprovalRoles)
//       .leftJoin(
//         approvalRoles,
//         eq(userApprovalRoles.roleId, approvalRoles.id)
//       )
//       .where(
//         and(
//           eq(userApprovalRoles.userId, approverId),
//           eq(userApprovalRoles.isActive, true),
//           eq(approvalRoles.isActive, true)
//         )
//       );

//     if (approverRoles.length === 0) {
//       throw new AppError("No approval permissions found", 403);
//     }

//     const allowedLevels = approverRoles.map(r => r.role.approvalLevel);
//     const isSuperAdmin = approverRoles.some(r => r.role.approvalLevel === 'ALL');

//     const conditions = [
//       eq(redemptionApprovals.approvalStatus, 'PENDING'),
//     ];

//     if (!isSuperAdmin) {
//       conditions.push(
//         inArray(redemptionApprovals.approvalLevel, allowedLevels)
//       );
//     }

//     if (filters?.approvalLevel) {
//       conditions.push(eq(redemptionApprovals.approvalLevel, filters.approvalLevel));
//     }

//     if (filters?.redemptionType) {
//       conditions.push(eq(redemptionApprovals.redemptionType, filters.redemptionType));
//     }

//     const [approvals, total] = await Promise.all([
//       db
//         .select({
//           approval: redemptionApprovals,
//           user: users,
//           redemption: redemptions,
//         })
//         .from(redemptionApprovals)
//         .leftJoin(users, eq(redemptionApprovals.userId, users.id))
//         .leftJoin(redemptions, eq(redemptionApprovals.redemptionId, redemptions.id))
//         .where(and(...conditions))
//         .orderBy(desc(redemptionApprovals.createdAt))
//         .limit(limit)
//         .offset(offset),
//       db
//         .select({ count: sql<number>`COUNT(*)` })
//         .from(redemptionApprovals)
//         .where(and(...conditions)),
//     ]);

//     const totalCount = Number(total[0]?.count || 0);
//     const totalPages = Math.ceil(totalCount / limit);

//     // Enrich with additional details based on redemption type
//     const enrichedApprovals = await Promise.all(
//       approvals.map(async (item) => {
//         let redemptionDetails = null;

//         if (item.redemption) {
//           // Type-safe access to metadata
//           const rawMetadata = item.redemption.metadata;
          
//           if (isRedemptionMetadata(rawMetadata)) {
//             const metadata = rawMetadata;
            
//             if (metadata.redemptionType === 'MARKETPLACE' && metadata.orderId) {
//               // Get marketplace order details
//               const [order] = await db
//                 .select()
//                 .from(userAmazonOrders)
//                 .where(eq(userAmazonOrders.orderId, metadata.orderId))
//                 .limit(1);
              
//               if (order) {
//                 redemptionDetails = {
//                   type: 'MARKETPLACE' as const,
//                   orderId: order.orderId,
//                   items: (order.orderData as any)?.items || [],
//                   shippingAddress: (order.orderData as any)?.shippingAddress,
//                 };
//               }
//             } else if (metadata.redemptionType === 'PHYSICAL_REWARD' && metadata.redemptionRequestId) {
//               // Get physical reward details
//               const [redemption] = await db
//                 .select()
//                 .from(physicalRewardsRedemptions)
//                 .where(eq(physicalRewardsRedemptions.redemptionRequestId, metadata.redemptionRequestId))
//                 .limit(1);
              
//               if (redemption) {
//                 const [reward] = await db
//                   .select()
//                   .from(physicalRewardsCatalogue)
//                   .where(eq(physicalRewardsCatalogue.id, redemption.rewardId))
//                   .limit(1);
                
//                 redemptionDetails = {
//                   type: 'PHYSICAL_REWARD' as const,
//                   rewardId: redemption.rewardId,
//                   rewardName: reward?.name,
//                   quantity: redemption.quantity,
//                   shippingAddress: redemption.shippingAddress,
//                 };
//               }
//             } else if (metadata.redemptionType === 'UPI' || metadata.redemptionType === 'BANK_TRANSFER') {
//               // Get channel details
//               const [channel] = await db
//                 .select()
//                 .from(redemptionChannels)
//                 .where(eq(redemptionChannels.id, item.redemption.channelId))
//                 .limit(1);
              
//               redemptionDetails = {
//                 type: metadata.redemptionType,
//                 channel: channel?.name,
//                 amount: item.redemption.amount,
//               };
//             }
//           }
//         }

//         return {
//           id: item.approval.id,
//           redemptionId: item.approval.redemptionId,
//           userId: item.approval.userId,
//           userName: item.user?.name || 'Unknown',
//           userPhone: item.user?.phone || 'Unknown',
//           redemptionType: item.approval.redemptionType,
//           requestedPoints: item.approval.requestedPoints,
//           approvalStatus: item.approval.approvalStatus,
//           approvalLevel: item.approval.approvalLevel,
//           flaggedReasons: item.approval.flaggedReasons,
//           metadata: item.approval.metadata,
//           createdAt: item.approval.createdAt,
//           redemptionDetails,
//         };
//       })
//     );

//     return {
//       success: true,
//       data: {
//         approvals: enrichedApprovals,
//         pagination: {
//           total: totalCount,
//           page,
//           limit,
//           totalPages,
//         },
//         approverInfo: {
//           roles: approverRoles.map(r => r.role.roleName),
//           levels: allowedLevels,
//           isSuperAdmin,
//         },
//       },
//     };
//   }

//   // Process approval action - Main entry point
//   async processApproval(
//     approvalId: number,
//     approverId: number,
//     action: ApprovalAction
//   ) {
//     // Type-safe handling based on action type
//     switch (action.action) {
//       case 'APPROVE':
//         return this.handleApprove(approvalId, approverId, action);
//       case 'REJECT':
//         return this.handleReject(approvalId, approverId, action);
//       case 'ESCALATE':
//         return this.handleEscalate(approvalId, approverId, action);
//       default:
//         throw new AppError("Invalid action type", 400);
//     }
//   }

//   // Handle approve action
//   private async handleApprove(approvalId: number, approverId: number, action: ApproveAction) {
//     return db.transaction(async (tx) => {
//       // Get approval details
//       const [approval] = await tx
//         .select()
//         .from(redemptionApprovals)
//         .where(eq(redemptionApprovals.id, approvalId))
//         .limit(1);

//       if (!approval) {
//         throw new AppError("Approval request not found", 404);
//       }

//       if (approval.approvalStatus !== 'PENDING') {
//         throw new AppError(`Approval is already ${approval.approvalStatus}`, 400);
//       }

//       // Check if approver has permission
//       const canApprove = await this.checkApproverPermission(approverId, approval.approvalLevel);
//       if (!canApprove) {
//         throw new AppError("You don't have permission to approve this request", 403);
//       }

//       // Update redemption status
//       const [approvedStatus] = await tx
//         .select()
//         .from(redemptionStatuses)
//         .where(eq(redemptionStatuses.name, 'Approved'))
//         .limit(1);

//       if (!approvedStatus) {
//         throw new AppError("Approved status not found", 500);
//       }

//       await tx
//         .update(redemptions)
//         .set({
//           status: approvedStatus.id,
//           approvedBy: approverId,
//           updatedAt: new Date(),
//         })
//         .where(eq(redemptions.id, approval.redemptionId));

//       // Update approval
//       const [updatedApproval] = await tx
//         .update(redemptionApprovals)
//         .set({
//           approvalStatus: 'APPROVED',
//           approvedBy: approverId,
//           approvedAt: new Date(),
//           updatedAt: new Date(),
//         })
//         .where(eq(redemptionApprovals.id, approvalId))
//         .returning();

//       // Create audit log
//       await tx.insert(approvalAuditLogs).values({
//         redemptionId: approval.redemptionId,
//         approvalId: approval.id,
//         action: 'APPROVED',
//         performedBy: approverId,
//         previousStatus: approval.approvalStatus,
//         newStatus: 'APPROVED',
//         notes: action.notes || `Approved by user ${approverId}`,
//         metadata: {},
//         createdAt: new Date(),
//       });

//       // Process the redemption based on type
//       await this.processApprovedRedemption(approval.redemptionId, approval.redemptionType);

//       // Send notification to user
//       await this.sendApprovalNotification(
//         approval.userId,
//         'APPROVED',
//         `Your redemption of ${approval.requestedPoints} points has been approved.`
//       );

//       return {
//         success: true,
//         data: updatedApproval,
//         message: "Redemption approved successfully",
//       };
//     });
//   }

//   // Handle reject action
//   private async handleReject(approvalId: number, approverId: number, action: RejectAction) {
//     return db.transaction(async (tx) => {
//       // Get approval details
//       const [approval] = await tx
//         .select()
//         .from(redemptionApprovals)
//         .where(eq(redemptionApprovals.id, approvalId))
//         .limit(1);

//       if (!approval) {
//         throw new AppError("Approval request not found", 404);
//       }

//       if (approval.approvalStatus !== 'PENDING') {
//         throw new AppError(`Approval is already ${approval.approvalStatus}`, 400);
//       }

//       // Check if approver has permission
//       const canApprove = await this.checkApproverPermission(approverId, approval.approvalLevel);
//       if (!canApprove) {
//         throw new AppError("You don't have permission to reject this request", 403);
//       }

//       if (!action.rejectionReason) {
//         throw new AppError("Rejection reason is required", 400);
//       }

//       // Update redemption status to rejected
//       const [rejectedStatus] = await tx
//         .select()
//         .from(redemptionStatuses)
//         .where(eq(redemptionStatuses.name, 'Rejected'))
//         .limit(1);

//       if (!rejectedStatus) {
//         throw new AppError("Rejected status not found", 500);
//       }

//       await tx
//         .update(redemptions)
//         .set({
//           status: rejectedStatus.id,
//           updatedAt: new Date(),
//           metadata: {
//             ...sql`${redemptions.metadata}`,
//             rejectionReason: action.rejectionReason,
//           },
//         })
//         .where(eq(redemptions.id, approval.redemptionId));

//       // Update approval
//       const [updatedApproval] = await tx
//         .update(redemptionApprovals)
//         .set({
//           approvalStatus: 'REJECTED',
//           rejectionReason: action.rejectionReason,
//           updatedAt: new Date(),
//         })
//         .where(eq(redemptionApprovals.id, approvalId))
//         .returning();

//       // Create audit log
//       await tx.insert(approvalAuditLogs).values({
//         redemptionId: approval.redemptionId,
//         approvalId: approval.id,
//         action: 'REJECTED',
//         performedBy: approverId,
//         previousStatus: approval.approvalStatus,
//         newStatus: 'REJECTED',
//         notes: action.notes || `Rejected by user ${approverId}`,
//         metadata: {
//           rejectionReason: action.rejectionReason,
//         },
//         createdAt: new Date(),
//       });

//       // Revert points if they were deducted
//       await this.revertRedemptionPoints(approval.redemptionId, approval.userId);

//       // Send notification to user
//       await this.sendApprovalNotification(
//         approval.userId,
//         'REJECTED',
//         `Your redemption of ${approval.requestedPoints} points has been rejected. Reason: ${action.rejectionReason}`
//       );

//       return {
//         success: true,
//         data: updatedApproval,
//         message: "Redemption rejected successfully",
//       };
//     });
//   }

//   // Handle escalate action
//   private async handleEscalate(approvalId: number, approverId: number, action: EscalateAction) {
//     return db.transaction(async (tx) => {
//       // Get approval details
//       const [approval] = await tx
//         .select()
//         .from(redemptionApprovals)
//         .where(eq(redemptionApprovals.id, approvalId))
//         .limit(1);

//       if (!approval) {
//         throw new AppError("Approval request not found", 404);
//       }

//       if (approval.approvalStatus !== 'PENDING') {
//         throw new AppError(`Approval is already ${approval.approvalStatus}`, 400);
//       }

//       // Check if approver has permission
//       const canApprove = await this.checkApproverPermission(approverId, approval.approvalLevel);
//       if (!canApprove) {
//         throw new AppError("You don't have permission to escalate this request", 403);
//       }

//       if (!action.escalationLevel) {
//         throw new AppError("Escalation level is required", 400);
//       }

//       // Update approval level
//       const [updatedApproval] = await tx
//         .update(redemptionApprovals)
//         .set({
//           approvalLevel: action.escalationLevel,
//           escalationNotes: action.notes,
//           updatedAt: new Date(),
//         })
//         .where(eq(redemptionApprovals.id, approvalId))
//         .returning();

//       // Create audit log
//       await tx.insert(approvalAuditLogs).values({
//         redemptionId: approval.redemptionId,
//         approvalId: approval.id,
//         action: 'ESCALATED',
//         performedBy: approverId,
//         previousStatus: approval.approvalStatus,
//         newStatus: 'ESCALATED',
//         notes: action.notes || `Escalated to ${action.escalationLevel} by user ${approverId}`,
//         metadata: {
//           escalationLevel: action.escalationLevel,
//         },
//         createdAt: new Date(),
//       });

//       // Send notification to higher level approvers
//       await this.notifyEscalatedApprovers(action.escalationLevel, approval);

//       return {
//         success: true,
//         data: updatedApproval,
//         message: `Redemption escalated to ${action.escalationLevel}`,
//       };
//     });
//   }

//   // Bulk approve/reject
//   async bulkProcessApprovals(
//     approverId: number,
//     approvalIds: number[],
//     action: 'APPROVE' | 'REJECT',
//     reason?: string
//   ) {
//     const results = {
//       processed: 0,
//       succeeded: 0,
//       failed: 0,
//       errors: [] as Array<{ id: number; error: string }>,
//     };

//     for (const approvalId of approvalIds) {
//       try {
//         if (action === 'APPROVE') {
//           await this.handleApprove(approvalId, approverId, {
//             action: 'APPROVE',
//             notes: `Bulk approved with reason: ${reason || 'No reason provided'}`,
//           });
//         } else {
//           await this.handleReject(approvalId, approverId, {
//             action: 'REJECT',
//             rejectionReason: reason || 'No reason provided',
//             notes: `Bulk rejected`,
//           });
//         }
//         results.succeeded++;
//       } catch (error) {
//         results.failed++;
//         results.errors.push({
//           id: approvalId,
//           error: error instanceof Error ? error.message : 'Unknown error',
//         });
//       }
//       results.processed++;
//     }

//     return {
//       success: true,
//       data: results,
//       message: `Bulk processing completed. Success: ${results.succeeded}, Failed: ${results.failed}`,
//     };
//   }

//   // Get approval statistics
//   async getApprovalStats(approverId?: number) {
//     const now = new Date();
//     const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
//     const startOfWeek = new Date(now);
//     startOfWeek.setDate(now.getDate() - now.getDay());
//     startOfWeek.setHours(0, 0, 0, 0);
//     const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

//     const conditions: any[] = [];
//     if (approverId) {
//       conditions.push(eq(approvalAuditLogs.performedBy, approverId));
//     }

//     // Helper function for date comparisons
//     const dateCondition = (date: Date) => {
//       return sql`${approvalAuditLogs.createdAt} >= ${date.toISOString()}::timestamp`;
//     };

//     const [daily, weekly, monthly, pending] = await Promise.all([
//       // Daily stats
//       db
//         .select({
//           approved: sql<number>`COUNT(CASE WHEN action = 'APPROVED' THEN 1 END)`,
//           rejected: sql<number>`COUNT(CASE WHEN action = 'REJECTED' THEN 1 END)`,
//           total: sql<number>`COUNT(*)`,
//         })
//         .from(approvalAuditLogs)
//         .where(
//           conditions.length > 0
//             ? and(...conditions, dateCondition(startOfDay))
//             : dateCondition(startOfDay)
//         ),

//       // Weekly stats
//       db
//         .select({
//           approved: sql<number>`COUNT(CASE WHEN action = 'APPROVED' THEN 1 END)`,
//           rejected: sql<number>`COUNT(CASE WHEN action = 'REJECTED' THEN 1 END)`,
//           total: sql<number>`COUNT(*)`,
//         })
//         .from(approvalAuditLogs)
//         .where(
//           conditions.length > 0
//             ? and(...conditions, dateCondition(startOfWeek))
//             : dateCondition(startOfWeek)
//         ),

//       // Monthly stats
//       db
//         .select({
//           approved: sql<number>`COUNT(CASE WHEN action = 'APPROVED' THEN 1 END)`,
//           rejected: sql<number>`COUNT(CASE WHEN action = 'REJECTED' THEN 1 END)`,
//           total: sql<number>`COUNT(*)`,
//         })
//         .from(approvalAuditLogs)
//         .where(
//           conditions.length > 0
//             ? and(...conditions, dateCondition(startOfMonth))
//             : dateCondition(startOfMonth)
//         ),

//       // Pending approvals count
//       db
//         .select({ count: sql<number>`COUNT(*)` })
//         .from(redemptionApprovals)
//         .where(eq(redemptionApprovals.approvalStatus, 'PENDING')),
//     ]);

//     // Get top approvers
//     const topApprovers = await db
//       .select({
//         userId: approvalAuditLogs.performedBy,
//         userName: users.name,
//         count: sql<number>`COUNT(*)`,
//       })
//       .from(approvalAuditLogs)
//       .leftJoin(users, eq(approvalAuditLogs.performedBy, users.id))
//       .where(
//         and(
//           eq(approvalAuditLogs.action, 'APPROVED'),
//           dateCondition(startOfMonth)
//         )
//       )
//       .groupBy(approvalAuditLogs.performedBy, users.name)
//       .orderBy(desc(sql`COUNT(*)`))
//       .limit(5);

//     return {
//       success: true,
//       data: {
//         daily: {
//           approved: Number(daily[0]?.approved || 0),
//           rejected: Number(daily[0]?.rejected || 0),
//           total: Number(daily[0]?.total || 0),
//         },
//         weekly: {
//           approved: Number(weekly[0]?.approved || 0),
//           rejected: Number(weekly[0]?.rejected || 0),
//           total: Number(weekly[0]?.total || 0),
//         },
//         monthly: {
//           approved: Number(monthly[0]?.approved || 0),
//           rejected: Number(monthly[0]?.rejected || 0),
//           total: Number(monthly[0]?.total || 0),
//         },
//         pending: Number(pending[0]?.count || 0),
//         topApprovers: topApprovers.map(a => ({
//           userId: a.userId,
//           name: a.userName || 'Unknown',
//           count: Number(a.count),
//         })),
//       },
//     };
//   }

//   // Search approvals
//   async searchApprovals(filters: {
//     query?: string;
//     status?: string;
//     fromDate?: string;
//     toDate?: string;
//     page?: number;
//     limit?: number;
//   }) {
//     const page = filters.page || 1;
//     const limit = filters.limit || 20;
//     const offset = (page - 1) * limit;

//     const conditions = [];

//     if (filters.query) {
//       conditions.push(
//         or(
//           sql`${users.name} ILIKE ${`%${filters.query}%`}`,
//           sql`${users.phone} ILIKE ${`%${filters.query}%`}`,
//           sql`${redemptionApprovals.redemptionType} ILIKE ${`%${filters.query}%`}`
//         )
//       );
//     }

//     if (filters.status) {
//       conditions.push(eq(redemptionApprovals.approvalStatus, filters.status));
//     }

//     if (filters.fromDate) {
//       conditions.push(sql`${redemptionApprovals.createdAt} >= ${filters.fromDate}::timestamp`);
//     }

//     if (filters.toDate) {
//       const toDatePlusOne = new Date(filters.toDate);
//       toDatePlusOne.setDate(toDatePlusOne.getDate() + 1);
//       conditions.push(sql`${redemptionApprovals.createdAt} < ${toDatePlusOne.toISOString().split('T')[0]}::timestamp`);
//     }

//     const [approvals, total] = await Promise.all([
//       db
//         .select({
//           approval: redemptionApprovals,
//           user: users,
//         })
//         .from(redemptionApprovals)
//         .leftJoin(users, eq(redemptionApprovals.userId, users.id))
//         .where(conditions.length > 0 ? and(...conditions) : undefined)
//         .orderBy(desc(redemptionApprovals.createdAt))
//         .limit(limit)
//         .offset(offset),
//       db
//         .select({ count: sql<number>`COUNT(*)` })
//         .from(redemptionApprovals)
//         .leftJoin(users, eq(redemptionApprovals.userId, users.id))
//         .where(conditions.length > 0 ? and(...conditions) : undefined),
//     ]);

//     const totalCount = Number(total[0]?.count || 0);
//     const totalPages = Math.ceil(totalCount / limit);

//     return {
//       success: true,
//       data: {
//         approvals: approvals.map(item => ({
//           id: item.approval.id,
//           redemptionId: item.approval.redemptionId,
//           userId: item.approval.userId,
//           userName: item.user?.name || 'Unknown',
//           userPhone: item.user?.phone || 'Unknown',
//           redemptionType: item.approval.redemptionType,
//           requestedPoints: item.approval.requestedPoints,
//           approvalStatus: item.approval.approvalStatus,
//           approvalLevel: item.approval.approvalLevel,
//           createdAt: item.approval.createdAt,
//         })),
//         pagination: {
//           total: totalCount,
//           page,
//           limit,
//           totalPages,
//         },
//       },
//     };
//   }

//   // Get approval details
//   async getApprovalDetails(approvalId: number) {
//     const [approval] = await db
//       .select({
//         approval: redemptionApprovals,
//         user: users,
//         redemption: redemptions,
//         approver: users,
//       })
//       .from(redemptionApprovals)
//       .leftJoin(users, eq(redemptionApprovals.userId, users.id))
//       .leftJoin(redemptions, eq(redemptionApprovals.redemptionId, redemptions.id))
//       .leftJoin(
//         db.select().from(users).as("approver"),
//         eq(redemptionApprovals.approvedBy, sql`approver.id`)
//       )
//       .where(eq(redemptionApprovals.id, approvalId))
//       .limit(1);

//     if (!approval) {
//       throw new AppError("Approval not found", 404);
//     }

//     // Get audit logs
//     const auditLogs = await db
//       .select()
//       .from(approvalAuditLogs)
//       .where(eq(approvalAuditLogs.approvalId, approvalId))
//       .orderBy(desc(approvalAuditLogs.createdAt));

//     // Get redemption details based on type
//     let redemptionDetails = null;
//     if (approval.redemption) {
//       const rawMetadata = approval.redemption.metadata;
      
//       if (isRedemptionMetadata(rawMetadata)) {
//         const metadata = rawMetadata;
        
//         if (metadata.redemptionType === 'MARKETPLACE' && metadata.orderId) {
//           const [order] = await db
//             .select()
//             .from(userAmazonOrders)
//             .where(eq(userAmazonOrders.orderId, metadata.orderId))
//             .limit(1);
          
//           if (order) {
//             redemptionDetails = {
//               type: 'MARKETPLACE',
//               orderId: order.orderId,
//               orderData: order.orderData,
//               status: order.status,
//             };
//           }
//         } else if (metadata.redemptionType === 'PHYSICAL_REWARD' && metadata.redemptionRequestId) {
//           const [redemption] = await db
//             .select()
//             .from(physicalRewardsRedemptions)
//             .where(eq(physicalRewardsRedemptions.redemptionRequestId, metadata.redemptionRequestId))
//             .limit(1);
          
//           if (redemption) {
//             const [reward] = await db
//               .select()
//               .from(physicalRewardsCatalogue)
//               .where(eq(physicalRewardsCatalogue.id, redemption.rewardId))
//               .limit(1);
            
//             redemptionDetails = {
//               type: 'PHYSICAL_REWARD',
//               reward: reward,
//               redemption: redemption,
//             };
//           }
//         }
//       }
//     }

//     return {
//       success: true,
//       data: {
//         approval: approval.approval,
//         user: approval.user,
//         redemption: approval.redemption,
//         approver: approval.approver,
//         redemptionDetails,
//         auditLogs,
//       },
//     };
//   }

//   // Get approval audit logs
//   async getApprovalAuditLogs(approvalId: number, page: number = 1, limit: number = 20) {
//     const offset = (page - 1) * limit;

//     const [logs, total] = await Promise.all([
//       db
//         .select({
//           audit: approvalAuditLogs,
//           performer: users,
//         })
//         .from(approvalAuditLogs)
//         .leftJoin(users, eq(approvalAuditLogs.performedBy, users.id))
//         .where(eq(approvalAuditLogs.approvalId, approvalId))
//         .orderBy(desc(approvalAuditLogs.createdAt))
//         .limit(limit)
//         .offset(offset),
//       db
//         .select({ count: sql<number>`COUNT(*)` })
//         .from(approvalAuditLogs)
//         .where(eq(approvalAuditLogs.approvalId, approvalId)),
//     ]);

//     const totalCount = Number(total[0]?.count || 0);
//     const totalPages = Math.ceil(totalCount / limit);

//     return {
//       success: true,
//       data: {
//         logs: logs.map(log => ({
//           ...log.audit,
//           performerName: log.performer?.name || 'System',
//         })),
//         pagination: {
//           total: totalCount,
//           page,
//           limit,
//           totalPages,
//         },
//       },
//     };
//   }

//   // Private helper methods
//   private async checkApproverPermission(approverId: number, approvalLevel: string): Promise<boolean> {
//     const approverRoles = await db
//       .select({
//         role: approvalRoles,
//       })
//       .from(userApprovalRoles)
//       .leftJoin(
//         approvalRoles,
//         eq(userApprovalRoles.roleId, approvalRoles.id)
//       )
//       .where(
//         and(
//           eq(userApprovalRoles.userId, approverId),
//           eq(userApprovalRoles.isActive, true),
//           eq(approvalRoles.isActive, true)
//         )
//       );

//     if (approverRoles.length === 0) {
//       return false;
//     }

//     const allowedLevels = approverRoles.map(r => r.role.approvalLevel);
    
//     // Check if super admin or has required level
//     return allowedLevels.includes('ALL') || allowedLevels.includes(approvalLevel);
//   }

//   private async processApprovedRedemption(redemptionId: number, redemptionType: string) {
//     console.log(`Processing approved redemption ${redemptionId} of type ${redemptionType}`);
    
//     // Get redemption details
//     const [redemption] = await db
//       .select()
//       .from(redemptions)
//       .where(eq(redemptions.id, redemptionId))
//       .limit(1);

//     if (!redemption) {
//       console.error(`Redemption ${redemptionId} not found`);
//       return;
//     }

//     const rawMetadata = redemption.metadata;
    
//     if (isRedemptionMetadata(rawMetadata)) {
//       const metadata = rawMetadata;
      
//       // Process based on redemption type
//       switch (redemptionType) {
//         case 'MARKETPLACE':
//           if (metadata.orderId) {
//             // Update marketplace order status
//             await db
//               .update(userAmazonOrders)
//               .set({
//                 status: 'processing',
//                 updatedAt: new Date(),
//               })
//               .where(eq(userAmazonOrders.orderId, metadata.orderId));
//             console.log(`Marketplace order ${metadata.orderId} marked as processing`);
//           }
//           break;

//         case 'PHYSICAL_REWARD':
//           if (metadata.redemptionRequestId) {
//             // Update physical redemption status
//             await db
//               .update(physicalRewardsRedemptions)
//               .set({
//                 status: 'APPROVED',
//                 approvedAt: new Date(),
//                 updatedAt: new Date(),
//               })
//               .where(eq(physicalRewardsRedemptions.redemptionRequestId, metadata.redemptionRequestId));
//             console.log(`Physical reward redemption ${metadata.redemptionRequestId} approved`);
//           }
//           break;

//         case 'UPI':
//         case 'BANK_TRANSFER':
//           // Initiate payment processing
//           console.log(`Initiating ${redemptionType} payment for redemption ${redemptionId}`);
//           // Here you would integrate with payment gateway
//           break;

//         default:
//           console.log(`Standard redemption ${redemptionId} processed`);
//       }
//     }
//   }

//   private async revertRedemptionPoints(redemptionId: number, userId: number) {
//     console.log(`Reverting points for redemption ${redemptionId}, user ${userId}`);
    
//     // Get redemption details
//     const [redemption] = await db
//       .select()
//       .from(redemptions)
//       .where(eq(redemptions.id, redemptionId))
//       .limit(1);

//     if (!redemption) {
//       console.error(`Redemption ${redemptionId} not found`);
//       return;
//     }

//     const points = redemption.pointsRedeemed;
//     const rawMetadata = redemption.metadata;
    
//     if (isRedemptionMetadata(rawMetadata)) {
//       const metadata = rawMetadata;
      
//       // Revert marketplace order if applicable
//       if (metadata.redemptionType === 'MARKETPLACE' && metadata.orderId) {
//         // Get order details
//         const [order] = await db
//           .select()
//           .from(userAmazonOrders)
//           .where(eq(userAmazonOrders.orderId, metadata.orderId))
//           .limit(1);

//         if (order) {
//           // Update order status
//           await db
//             .update(userAmazonOrders)
//             .set({
//               status: 'cancelled',
//               updatedAt: new Date(),
//             })
//             .where(eq(userAmazonOrders.orderId, metadata.orderId));

//           // Restore inventory for each item
//           const orderData = order.orderData as any;
//           const items = orderData?.items || [];
          
//           for (const item of items) {
//             const [product] = await db
//               .select()
//               .from(amazonMarketplaceProducts)
//               .where(eq(amazonMarketplaceProducts.asinSku, item.asinSku))
//               .limit(1);

//             if (product) {
//               await db
//                 .update(amazonMarketplaceProducts)
//                 .set({
//                   inventoryCount: (product.inventoryCount || 0) + item.quantity,
//                   updatedAt: new Date(),
//                 })
//                 .where(eq(amazonMarketplaceProducts.id, product.id));
//             }
//           }
//         }
//       }

//       // Revert physical reward if applicable
//       if (metadata.redemptionType === 'PHYSICAL_REWARD' && metadata.redemptionRequestId) {
//         // Get redemption details
//         const [physicalRedemption] = await db
//           .select()
//           .from(physicalRewardsRedemptions)
//           .where(eq(physicalRewardsRedemptions.redemptionRequestId, metadata.redemptionRequestId))
//           .limit(1);

//         if (physicalRedemption) {
//           // Restore inventory
//           const [reward] = await db
//             .select()
//             .from(physicalRewardsCatalogue)
//             .where(eq(physicalRewardsCatalogue.id, physicalRedemption.rewardId))
//             .limit(1);

//           if (reward) {
//             await db
//               .update(physicalRewardsCatalogue)
//               .set({
//                 inventoryCount: (reward.inventoryCount || 0) + physicalRedemption.quantity,
//                 updatedAt: new Date(),
//               })
//               .where(eq(physicalRewardsCatalogue.id, physicalRedemption.rewardId));
//           }
//         }
//       }
//     }

//     console.log(`Successfully reverted ${points} points for redemption ${redemptionId}`);
//   }

//   private async sendApprovalNotification(
//     userId: number,
//     status: string,
//     message: string
//   ) {
//     console.log(`Sending ${status} notification to user ${userId}: ${message}`);
    
//     // In a real implementation, you would:
//     // 1. Get user's notification preferences
//     // 2. Send email/SMS/push notification
//     // 3. Create in-app notification
    
//     // For now, we'll just log it
//     const [user] = await db
//       .select()
//       .from(users)
//       .where(eq(users.id, userId))
//       .limit(1);

//     if (user) {
//       console.log(`Notification sent to ${user.name} (${user.phone}): ${message}`);
//     }
//   }

//   private async notifyEscalatedApprovers(level: string, approval: any) {
//     console.log(`Notifying ${level} approvers about escalated approval ${approval.id}`);
    
//     // Get all approvers for the escalated level
//     const approvers = await db
//       .select({
//         user: users,
//       })
//       .from(userApprovalRoles)
//       .leftJoin(approvalRoles, eq(userApprovalRoles.roleId, approvalRoles.id))
//       .leftJoin(users, eq(userApprovalRoles.userId, users.id))
//       .where(
//         and(
//           eq(approvalRoles.approvalLevel, level),
//           eq(userApprovalRoles.isActive, true),
//           eq(approvalRoles.isActive, true)
//         )
//       );

//     for (const approver of approvers) {
//       console.log(`Notifying approver ${approver.user?.name} about escalated approval`);
//       // In a real implementation, send notification to each approver
//     }
//   }
// }

// export default new ApprovalService();