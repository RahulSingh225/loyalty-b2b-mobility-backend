// import { Router } from "express";
// import approvalController from "../controllers/approval.controller";
// import { authenticate } from "../middlewares/auth";
// // import { authorize } from "../middlewares/accessLevel";

// const router = Router();

// // All approval routes require authentication and admin/approver role
// router.use(authenticate);
// // router.use(authorize(["Admin", "Finance_Approver", "Super_Admin"]));

// // Approval dashboard routes
// router.get("/pending", approvalController.getPendingApprovals);
// router.get("/stats", approvalController.getApprovalStats);
// router.get("/search", approvalController.searchApprovals);

// // Single approval actions
// router.get("/:approvalId", approvalController.getApprovalDetails);
// router.put("/:approvalId/process", approvalController.processApproval);
// router.get("/:approvalId/audit-logs", approvalController.getApprovalAuditLogs);

// // Bulk actions
// router.post("/bulk-process", approvalController.bulkProcessApprovals);

// export default router;