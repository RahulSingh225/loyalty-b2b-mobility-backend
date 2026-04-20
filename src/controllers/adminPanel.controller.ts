// import { Request, Response } from "express";
// import { db } from "../config/db";
// import { sql, eq, and, gte, lte, desc, SQL } from "drizzle-orm";
// import {
//   redemptions,
//   users,
//   redemptionStatuses,
//   userAmazonOrders,
//   physicalRewardsRedemptions,
//   redemptionApprovals,
// } from "../schema";
// import { success } from "../utils/response";
// import { AppError } from "../middlewares/errorHandler";
// import { z } from "zod";
// import { drizzleDate } from "../utils/drizzleDate";

// const dashboardFiltersSchema = z.object({
//   fromDate: z.string().optional(),
//   toDate: z.string().optional(),
//   status: z.string().optional(),
//   redemptionType: z.string().optional(),
// });

// export class AdminPanelController {
//   // Admin dashboard summary
//   async getDashboardSummary(req: Request, res: Response) {
//     const filters = dashboardFiltersSchema.parse(req.query);

//     try {
//        const conditions: SQL[] = [];

//       if (filters.fromDate) {
//         const fromDate = new Date(filters.fromDate);
//         conditions.push(drizzleDate.gte(redemptions.createdAt, drizzleDate.startOfDay(fromDate)));
//       }
      
//       if (filters.toDate) {
//         const toDate = new Date(filters.toDate);
//         conditions.push(drizzleDate.lt(redemptions.createdAt, drizzleDate.startOfDay(new Date(toDate.getTime() + 24 * 60 * 60 * 1000))));
//       }

//       if (filters.status) {
//         const [status] = await db
//           .select()
//           .from(redemptionStatuses)
//           .where(eq(redemptionStatuses.name, filters.status!))
//           .limit(1);
        
//         if (status) {
//           conditions.push(eq(redemptions.status, status.id));
//         }
//       }

//       const whereCondition = conditions.length > 0 
//         ? sql.join(conditions, sql` AND `)
//         : undefined;

//       // Get redemption statistics
//       const [redemptionStats] = await db
//         .select({
//           totalRedemptions: sql<number>`COUNT(*)`,
//           totalPoints: sql<number>`COALESCE(SUM(points_redeemed), 0)`,
//           totalAmount: sql<number>`COALESCE(SUM(amount), 0)`,
//           pendingRedemptions: sql<number>`COUNT(CASE WHEN ${redemptions.status} = (SELECT id FROM redemption_statuses WHERE name = 'Pending') THEN 1 END)`,
//           approvedRedemptions: sql<number>`COUNT(CASE WHEN ${redemptions.status} = (SELECT id FROM redemption_statuses WHERE name = 'Approved') THEN 1 END)`,
//           rejectedRedemptions: sql<number>`COUNT(CASE WHEN ${redemptions.status} = (SELECT id FROM redemption_statuses WHERE name = 'Rejected') THEN 1 END)`,
//         })
//         .from(redemptions)
//         .where(whereCondition);

//       // Get marketplace orders statistics
//       const [marketplaceStats] = await db
//         .select({
//           totalOrders: sql<number>`COUNT(*)`,
//           totalPoints: sql<number>`COALESCE(SUM(points_deducted), 0)`,
//           pendingOrders: sql<number>`COUNT(CASE WHEN order_status = 'processing' THEN 1 END)`,
//           completedOrders: sql<number>`COUNT(CASE WHEN order_status = 'delivered' THEN 1 END)`,
//         })
//         .from(userAmazonOrders)
//         .where(
//           filters.fromDate && filters.toDate
//             ? and(
//                 gte(userAmazonOrders.createdAt, new Date(filters.fromDate)),
//                 lte(userAmazonOrders.createdAt, new Date(filters.toDate))
//               )
//             : undefined
//         );

//       // Get physical rewards statistics
//       const [physicalRewardsStats] = await db
//         .select({
//           totalRedemptions: sql<number>`COUNT(*)`,
//           totalPoints: sql<number>`COALESCE(SUM(points_deducted), 0)`,
//           pendingRedemptions: sql<number>`COUNT(CASE WHEN status = 'PENDING' THEN 1 END)`,
//           approvedRedemptions: sql<number>`COUNT(CASE WHEN status = 'APPROVED' THEN 1 END)`,
//           deliveredRedemptions: sql<number>`COUNT(CASE WHEN status = 'DELIVERED' THEN 1 END)`,
//         })
//         .from(physicalRewardsRedemptions)
//         .where(
//           filters.fromDate && filters.toDate
//             ? and(
//                 gte(
//                   physicalRewardsRedemptions.createdAt,
//                   new Date(filters.fromDate)
//                 ),
//                 lte(
//                   physicalRewardsRedemptions.createdAt,
//                   new Date(filters.toDate)
//                 )
//               )
//             : undefined
//         );

//       // Get pending approvals count
//       const [pendingApprovals] = await db
//         .select({ count: sql<number>`COUNT(*)` })
//         .from(redemptionApprovals)
//         .where(eq(redemptionApprovals.approvalStatus, "PENDING"));

//       // Recent redemptions
//       const recentRedemptions = await db
//         .select({
//           redemption: redemptions,
//           user: users,
//           status: redemptionStatuses,
//         })
//         .from(redemptions)
//         .leftJoin(users, eq(redemptions.userId, users.id))
//         .leftJoin(
//           redemptionStatuses,
//           eq(redemptions.status, redemptionStatuses.id)
//         )
//         .where(whereCondition)
//         .orderBy(desc(redemptions.createdAt))
//         .limit(10);

//       res.json(
//         success(
//           {
//             summary: {
//               redemptions: {
//                 total: Number(redemptionStats.totalRedemptions),
//                 points: Number(redemptionStats.totalPoints),
//                 amount: Number(redemptionStats.totalAmount),
//                 pending: Number(redemptionStats.pendingRedemptions),
//                 approved: Number(redemptionStats.approvedRedemptions),
//                 rejected: Number(redemptionStats.rejectedRedemptions),
//               },
//               marketplace: {
//                 orders: Number(marketplaceStats.totalOrders),
//                 points: Number(marketplaceStats.totalPoints),
//                 pending: Number(marketplaceStats.pendingOrders),
//                 completed: Number(marketplaceStats.completedOrders),
//               },
//               physicalRewards: {
//                 redemptions: Number(physicalRewardsStats.totalRedemptions),
//                 points: Number(physicalRewardsStats.totalPoints),
//                 pending: Number(physicalRewardsStats.pendingRedemptions),
//                 approved: Number(physicalRewardsStats.approvedRedemptions),
//                 delivered: Number(physicalRewardsStats.deliveredRedemptions),
//               },
//               approvals: {
//                 pending: Number(pendingApprovals.count),
//               },
//             },
//             recentRedemptions: recentRedemptions.map((r) => ({
//               id: r.redemption.id,
//               redemptionId: r.redemption.redemptionId,
//               userId: r.redemption.userId,
//               userName: r.user?.name || "Unknown",
//               points: r.redemption.pointsRedeemed,
//               status: r.status?.name || "Unknown",
//               createdAt: r.redemption.createdAt,
//               metadata: r.redemption.metadata,
//             })),
//           },
//           "Dashboard summary retrieved"
//         )
//       );
//     } catch (error) {
//       throw error instanceof AppError
//         ? error
//         : new AppError("Failed to fetch dashboard summary", 500);
//     }
//   }

//   // Get redemption reports
//   async getRedemptionReports(req: Request, res: Response) {
//     const { reportType, format = "json", ...filters } = req.query;

//     try {
//       let reportData;

//       switch (reportType) {
//         case "daily":
//           reportData = await this.getDailyRedemptionReport(filters);
//           break;
//         case "monthly":
//           reportData = await this.getMonthlyRedemptionReport(filters);
//           break;
//         case "user-wise":
//           reportData = await this.getUserWiseRedemptionReport(filters);
//           break;
//         case "type-wise":
//           reportData = await this.getTypeWiseRedemptionReport(filters);
//           break;
//         default:
//           throw new AppError("Invalid report type", 400);
//       }

//       if (format === "csv") {
//         // Convert to CSV format
//         const csv = this.convertToCSV(reportData);
//         res.setHeader("Content-Type", "text/csv");
//         res.setHeader(
//           "Content-Disposition",
//           "attachment; filename=redemption-report.csv"
//         );
//         return res.send(csv);
//       }

//       res.json(success(reportData, "Report generated successfully"));
//     } catch (error) {
//       throw error instanceof AppError
//         ? error
//         : new AppError("Failed to generate report", 500);
//     }
//   }

//   // Export redemption data
//   async exportRedemptions(req: Request, res: Response) {
//     const { fromDate, toDate, status, redemptionType } = req.query;

//     try {
//       const conditions = [];

//       if (fromDate) {
//         conditions.push(
//           sql`${redemptions.createdAt} >= ${fromDate}::timestamp`
//         );
//       }

//       if (toDate) {
//         const toDatePlusOne = new Date(toDate as string);
//         toDatePlusOne.setDate(toDatePlusOne.getDate() + 1);
//         conditions.push(
//           sql`${redemptions.createdAt} < ${
//             toDatePlusOne.toISOString().split("T")[0]
//           }::timestamp`
//         );
//       }

//       if (status) {
//         const [statusRecord] = await db
//           .select()
//           .from(redemptionStatuses)
//           .where(eq(redemptionStatuses.name, status as string))
//           .limit(1);

//         if (statusRecord) {
//           conditions.push(eq(redemptions.status, statusRecord.id));
//         }
//       }
//       const whereCondition =
//         conditions.length > 0 ? sql.join(conditions, sql` AND `) : undefined;
//       const redemptionsData = await db
//         .select({
//           redemption: redemptions,
//           user: users,
//           status: redemptionStatuses,
//         })
//         .from(redemptions)
//         .leftJoin(users, eq(redemptions.userId, users.id))
//         .leftJoin(redemptionStatuses, eq(redemptions.status, redemptionStatuses.id))
//         .where(whereCondition)
//         .orderBy(desc(redemptions.createdAt));

//       // Convert to CSV
//       const csvData = redemptionsData.map((r) => ({
//         "Redemption ID": r.redemption.redemptionId,
//         "User ID": r.redemption.userId,
//         "User Name": r.user?.name || "",
//         "User Phone": r.user?.phone || "",
//         "Points Redeemed": r.redemption.pointsRedeemed,
//         Amount: r.redemption.amount || 0,
//         Status: r.status?.name || "",
//         Channel: r.redemption.channelId,
//         "Created At": r.redemption.createdAt,
//         Metadata: JSON.stringify(r.redemption.metadata || {}),
//       }));

//       const csv = this.convertToCSV(csvData);

//       res.setHeader("Content-Type", "text/csv");
//       res.setHeader(
//         "Content-Disposition",
//         `attachment; filename=redemptions-export-${Date.now()}.csv`
//       );
//       res.send(csv);
//     } catch (error) {
//       throw error instanceof AppError
//         ? error
//         : new AppError("Failed to export redemptions", 500);
//     }
//   }

//   // Private helper methods
//   private async getDailyRedemptionReport(filters: any) {
//     const { fromDate, toDate } = filters;

//     const conditions = [];
//     if (fromDate) {
//       conditions.push(sql`${redemptions.createdAt} >= ${fromDate}::timestamp`);
//     }
//     if (toDate) {
//       const toDatePlusOne = new Date(toDate);
//       toDatePlusOne.setDate(toDatePlusOne.getDate() + 1);
//       conditions.push(
//         sql`${redemptions.createdAt} < ${
//           toDatePlusOne.toISOString().split("T")[0]
//         }::timestamp`
//       );
//     }

//     const whereCondition = conditions.length > 0 ? sql.join(conditions, sql` AND `) : undefined;

//     const report = await db
//       .select({
//         date: sql<string>`DATE(${redemptions.createdAt})`,
//         totalRedemptions: sql<number>`COUNT(*)`,
//         totalPoints: sql<number>`COALESCE(SUM(points_redeemed), 0)`,
//         totalAmount: sql<number>`COALESCE(SUM(amount), 0)`,
//       })
//       .from(redemptions)
//       .where(whereCondition)
//       .groupBy(sql`DATE(${redemptions.createdAt})`)
//       .orderBy(sql`DATE(${redemptions.createdAt})`);

//     return report.map((r) => ({
//       date: r.date,
//       totalRedemptions: Number(r.totalRedemptions),
//       totalPoints: Number(r.totalPoints),
//       totalAmount: Number(r.totalAmount),
//     }));
//   }

//   private async getMonthlyRedemptionReport(filters: any) {
//     const { year } = filters;
//     const currentYear = year || new Date().getFullYear();

//     const report = await db
//       .select({
//         month: sql<string>`TO_CHAR(${redemptions.createdAt}, 'YYYY-MM')`,
//         totalRedemptions: sql<number>`COUNT(*)`,
//         totalPoints: sql<number>`COALESCE(SUM(points_redeemed), 0)`,
//         totalAmount: sql<number>`COALESCE(SUM(amount), 0)`,
//       })
//       .from(redemptions)
//       .where(sql`EXTRACT(YEAR FROM ${redemptions.createdAt}) = ${currentYear}`)
//       .groupBy(sql`TO_CHAR(${redemptions.createdAt}, 'YYYY-MM')`)
//       .orderBy(sql`TO_CHAR(${redemptions.createdAt}, 'YYYY-MM')`);

//     return report.map((r) => ({
//       month: r.month,
//       totalRedemptions: Number(r.totalRedemptions),
//       totalPoints: Number(r.totalPoints),
//       totalAmount: Number(r.totalAmount),
//     }));
//   }

//   private async getUserWiseRedemptionReport(filters: any) {
//     const { fromDate, toDate } = filters;

//     const conditions = [];
//     if (fromDate) {
//       conditions.push(sql`${redemptions.createdAt} >= ${fromDate}::timestamp`);
//     }
//     if (toDate) {
//       const toDatePlusOne = new Date(toDate);
//       toDatePlusOne.setDate(toDatePlusOne.getDate() + 1);
//       conditions.push(sql`${redemptions.createdAt} < ${toDatePlusOne.toISOString().split('T')[0]}::timestamp`);
//     }

//     const whereCondition = conditions.length > 0 ? sql.join(conditions, sql` AND `) : undefined;

//     const report = await db
//       .select({
//         userId: users.id,
//         userName: users.name,
//         userPhone: users.phone,
//         totalRedemptions: sql<number>`COUNT(*)`,
//         totalPoints: sql<number>`COALESCE(SUM(points_redeemed), 0)`,
//         totalAmount: sql<number>`COALESCE(SUM(amount), 0)`,
//         lastRedemption: sql<Date>`MAX(${redemptions.createdAt})`,
//       })
//       .from(redemptions)
//       .leftJoin(users, eq(redemptions.userId, users.id))
//       .where(whereCondition)
//       .groupBy(users.id, users.name, users.phone)
//       .orderBy(desc(sql`COALESCE(SUM(points_redeemed), 0)`))
//       .limit(100);

//     return report.map((r) => ({
//       userId: r.userId,
//       userName: r.userName,
//       userPhone: r.userPhone,
//       totalRedemptions: Number(r.totalRedemptions),
//       totalPoints: Number(r.totalPoints),
//       totalAmount: Number(r.totalAmount),
//       lastRedemption: r.lastRedemption,
//     }));
//   }

//   private async getTypeWiseRedemptionReport(filters: any) {
//     const { fromDate, toDate } = filters;

//     const conditions = [];
//     if (fromDate) {
//       conditions.push(sql`${redemptions.createdAt} >= ${filters.fromDate}::timestamp`);
//     }
//     if (toDate) {
//       conditions.push(sql`${redemptions.createdAt} < ${filters.toDate}::timestamp`);
//     }

//     const report = await db
//       .select({
//         redemptionType: sql<string>`${redemptions.metadata}->>'redemptionType'`,
//         totalRedemptions: sql<number>`COUNT(*)`,
//         totalPoints: sql<number>`COALESCE(SUM(points_redeemed), 0)`,
//         totalAmount: sql<number>`COALESCE(SUM(amount), 0)`,
//         averagePoints: sql<number>`COALESCE(AVG(points_redeemed), 0)`,
//       })
//       .from(redemptions)
//       .where(conditions.length > 0 ? and(...conditions) : undefined)
//       .groupBy(sql`${redemptions.metadata}->>'redemptionType'`)
//       .orderBy(desc(sql`COALESCE(SUM(points_redeemed), 0)`));

//     return report.map((r) => ({
//       redemptionType: r.redemptionType || "UNKNOWN",
//       totalRedemptions: Number(r.totalRedemptions),
//       totalPoints: Number(r.totalPoints),
//       totalAmount: Number(r.totalAmount),
//       averagePoints: Number(r.averagePoints),
//     }));
//   }

//   private convertToCSV(data: any[]): string {
//     if (data.length === 0) return "";

//     const headers = Object.keys(data[0]);
//     const csvRows = [
//       headers.join(","),
//       ...data.map((row) =>
//         headers
//           .map((header) => {
//             const value = row[header];
//             if (value === null || value === undefined) return "";
//             const stringValue = String(value);
//             // Escape quotes and wrap in quotes if contains comma or quote
//             const escaped = stringValue.replace(/"/g, '""');
//             return escaped.includes(",") ||
//               escaped.includes('"') ||
//               escaped.includes("\n")
//               ? `"${escaped}"`
//               : escaped;
//           })
//           .join(",")
//       ),
//     ];

//     return csvRows.join("\n");
//   }
// }

// export default new AdminPanelController();
