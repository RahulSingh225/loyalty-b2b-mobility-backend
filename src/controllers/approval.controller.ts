// import { Request, Response } from "express";
// import approvalService from "../services/approval.service";
// import { success } from "../utils/response";
// import { AppError } from "../middlewares/errorHandler";
// import { z } from "zod";

// // Validation schemas
// const approvalFiltersSchema = z.object({
//   approvalLevel: z.enum(['FINANCE', 'ADMIN', 'SUPER_ADMIN']).optional(),
//   redemptionType: z.enum(['UPI', 'BANK', 'VOUCHER', 'PHYSICAL_REWARD', 'MARKETPLACE']).optional(),
//   page: z.coerce.number().int().positive().default(1),
//   limit: z.coerce.number().int().positive().max(100).default(20),
// });

// // Create separate schemas for each action type
// const approveActionSchema = z.object({
//   action: z.literal('APPROVE'),
//   notes: z.string().optional(),
// });

// const rejectActionSchema = z.object({
//   action: z.literal('REJECT'),
//   notes: z.string().optional(),
//   rejectionReason: z.string().min(1, "Rejection reason is required"),
// });

// const escalateActionSchema = z.object({
//   action: z.literal('ESCALATE'),
//   notes: z.string().optional(),
//   escalationLevel: z.enum(['ADMIN', 'SUPER_ADMIN']),
// });
// // Union schema for all actions
// const approvalActionSchema = z.discriminatedUnion('action', [
//   approveActionSchema,
//   rejectActionSchema,
//   escalateActionSchema,
// ]);

// const bulkActionSchema = z.object({
//   approvalIds: z.array(z.number().int().positive()).min(1),
//   action: z.enum(['APPROVE', 'REJECT']),
//   reason: z.string().optional(),
// });



// export class ApprovalController {
//   // Get pending approvals for admin panel
//   async getPendingApprovals(req: Request, res: Response) {
//     const user = (req as any).user;
//     const filters = approvalFiltersSchema.parse(req.query);
    
//     try {
//       const result = await approvalService.getPendingApprovals(user.id, filters);
//       res.json(success(result.data, "Pending approvals retrieved"));
//     } catch (error) {
//       throw error instanceof AppError ? error : new AppError("Failed to fetch pending approvals", 500);
//     }
//   }

//   // Process single approval
//   async processApproval(req: Request, res: Response) {
//     const user = (req as any).user;
//     const { approvalId } = req.params;
    
//     try {
//       // Parse with discriminated union
//       const validatedAction = approvalActionSchema.parse(req.body);
      
//       // Convert to the service's expected format
//       const action = {
//         action: validatedAction.action,
//         notes: validatedAction.notes,
//         ...(validatedAction.action === 'REJECT' && { 
//           rejectionReason: validatedAction.rejectionReason 
//         }),
//         ...(validatedAction.action === 'ESCALATE' && { 
//           escalationLevel: validatedAction.escalationLevel 
//         }),
//       };
      
//       const result = await approvalService.processApproval(
//         Number(approvalId),
//         user.id,
//         action
//       );
      
//       res.json(success(result.data, result.message));
//     } catch (error) {
//       if (error instanceof z.ZodError) {
//         throw new AppError(`Validation error: ${error.errors.map(e => `${e.path}: ${e.message}`).join(', ')}`, 400);
//       }
//       throw error instanceof AppError ? error : new AppError("Failed to process approval", 500);
//     }
//   }

//   // Bulk process approvals
//   async bulkProcessApprovals(req: Request, res: Response) {
//     const user = (req as any).user;
//     const data = bulkActionSchema.parse(req.body);
    
//     try {
//       const result = await approvalService.bulkProcessApprovals(
//         user.id,
//         data.approvalIds,
//         data.action,
//         data.reason
//       );
//       res.json(success(result.data, result.message));
//     } catch (error) {
//       throw error instanceof AppError ? error : new AppError("Failed to bulk process approvals", 500);
//     }
//   }

//   // Get approval statistics
//   async getApprovalStats(req: Request, res: Response) {
//     const user = (req as any).user;
    
//     try {
//       const result = await approvalService.getApprovalStats(user.id);
//       res.json(success(result.data, "Approval statistics retrieved"));
//     } catch (error) {
//       throw error instanceof AppError ? error : new AppError("Failed to fetch approval statistics", 500);
//     }
//   }

//   // Get approval details
//   async getApprovalDetails(req: Request, res: Response) {
//     const { approvalId } = req.params;
    
//     try {
//       const result = await approvalService.getApprovalDetails(Number(approvalId));
//       res.json(success(result.data, "Approval details retrieved"));
//     } catch (error) {
//       throw error instanceof AppError ? error : new AppError("Failed to fetch approval details", 500);
//     }
//   }

//   // Search approvals
//   async searchApprovals(req: Request, res: Response) {
//     const { query, status, fromDate, toDate } = req.query;
    
//     try {
//       const result = await approvalService.searchApprovals({
//         query: query as string,
//         status: status as string,
//         fromDate: fromDate as string,
//         toDate: toDate as string,
//       });
//       res.json(success(result.data, "Search results"));
//     } catch (error) {
//       throw error instanceof AppError ? error : new AppError("Failed to search approvals", 500);
//     }
//   }

//   // Get approval audit logs
//   async getApprovalAuditLogs(req: Request, res: Response) {
//     const { approvalId } = req.params;
//     const page = parseInt(req.query.page as string || "1", 10);
//     const limit = parseInt(req.query.limit as string || "20", 10);
    
//     try {
//       const result = await approvalService.getApprovalAuditLogs(
//         Number(approvalId),
//         page,
//         limit
//       );
//       res.json(success(result.data, "Audit logs retrieved"));
//     } catch (error) {
//       throw error instanceof AppError ? error : new AppError("Failed to fetch audit logs", 500);
//     }
//   }
// }

// export default new ApprovalController();