import { Router } from "express";
import marketplaceUploadController from "../controllers/marketplaceUpload.controller";
import { authenticate } from "../middlewares/auth";
// import { authorize } from "../middlewares/accessLevel";
import multer from "multer";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Admin only routes
router.use(authenticate);
// router.use(authorize(["Admin"]));

router.post(
  "/upload/products",
  upload.single("file"),
  marketplaceUploadController.uploadProducts
);

export default router;