// import { Router } from "express";
// import adminPanelController from "../controllers/adminPanel.controller";
// import { authenticate } from "../middlewares/auth";
// // import { authorize } from "../middlewares/accessLevel";

// const router = Router();

// // Admin panel routes - require admin authentication
// router.use(authenticate);
// // router.use(authorize(["Admin", "Super_Admin"]));

// // Dashboard
// router.get("/dashboard/summary", adminPanelController.getDashboardSummary);

// // Reports
// router.get("/reports", adminPanelController.getRedemptionReports);
// router.get("/export/redemptions", adminPanelController.exportRedemptions);

// export default router;