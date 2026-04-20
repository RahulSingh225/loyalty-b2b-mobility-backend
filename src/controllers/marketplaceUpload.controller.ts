import { Request, Response } from "express";
import csv from "csv-parser";
import { Readable } from "stream";
import { db } from "../config/db";
import { amazonMarketplaceProducts } from "../schema/index";
import { eq } from "drizzle-orm";
import { success } from "../utils/response";
import { AppError } from "../middlewares/errorHandler";
import multer from "multer";

interface AmazonProductRow {
  Category?: string;
  "Category Image Path"?: string;
  "Sub Category"?: string;
  "Sub Category Image Path"?: string;
  "ASIN(SKU)"?: string;
  "Product Image Path"?: string;
  "Product Name"?: string;
  "Model No."?: string;
  "Product Description"?: string;
  MRP?: number | string;
  "Inventory Count"?: number | string;
  "CSP ON AMAZON"?: number | string;
  "Discounted Price (incl GST & delivery)"?: number | string;
  Points?: number | string;
  Diff?: number | string;
  "Amazon URL"?: string;
  "Comments / Vendor for GM Products"?: string;
}
// Extend Express Request type
export interface MulterRequest extends Request {
  file?: Express.Multer.File;
  user?: {
    id: number;
    email: string;
    name: string;
  };
}
export class MarketplaceUploadController {
  async uploadProducts(req: Request, res: Response) {
    const file = req.file; // No casting needed now

    if (!file) {
      throw new AppError("No file uploaded", 400);
    }

    // Check file type
    if (!file.mimetype.includes("csv") && !file.originalname.endsWith(".csv")) {
      throw new AppError("Only CSV files are allowed", 400);
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new AppError("File size should be less than 10MB", 400);
    }

    const user = (req as any).user;
    const results: AmazonProductRow[] = [];
    const errors: Array<{ row: number; error: string }> = [];
    let processedRows = 0;

    try {
      // Parse CSV
      await new Promise((resolve, reject) => {
        const stream = Readable.from(file.buffer);

        stream
          .pipe(csv())
          .on("data", (data: AmazonProductRow) => {
            results.push(data);
          })
          .on("end", () => {
            resolve(results);
          })
          .on("error", (error) => {
            reject(new AppError(`CSV parsing error: ${error.message}`, 400));
          });
      });

      // Process each row
      for (let i = 0; i < results.length; i++) {
        const row = results[i];

        try {
          await this.processProductRow(row, user.id);
          processedRows++;
        } catch (error) {
          errors.push({
            row: i + 1,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      res.json(
        success(
          {
            processedRows,
            totalRows: results.length,
            errors: errors.length > 0 ? errors : undefined,
          },
          "Products uploaded successfully"
        )
      );
    } catch (error) {
      throw error instanceof AppError
        ? error
        : new AppError("Failed to upload products", 500);
    }
  }

  private async processProductRow(row: AmazonProductRow, uploadedBy: number) {
    // Validate required fields
    if (!row["ASIN(SKU)"] || !row["Product Name"]) {
      throw new Error("Missing required fields: ASIN/SKU or Product Name");
    }

    const cleanNumber = (value: any): number | null => {
      if (!value) return null;
      if (typeof value === "string") {
        // Remove commas and convert to number
        const num = parseFloat(value.replace(/,/g, ""));
        return isNaN(num) ? null : num;
      }
      return Number(value);
    };

    // Check if product already exists
    const existing = await db
      .select()
      .from(amazonMarketplaceProducts)
      .where(eq(amazonMarketplaceProducts.amazonAsinSku, row["ASIN(SKU)"]!))
      .limit(1);

    const productData = {
      amazonAsinSku: row["ASIN(SKU)"]!,
      amazonProductName: row["Product Name"]!,
      amazonModelNo: row["Model No."],
      amazonProductDescription: row["Product Description"],
      amazonMrp: cleanNumber(row.MRP)?.toString(),
      amazonDiscountedPrice: cleanNumber(
        row["Discounted Price (incl GST & delivery)"]
      )?.toString(),
      amazonCspOnAmazon: cleanNumber(row["CSP ON AMAZON"])?.toString(),
      amazonInventoryCount: cleanNumber(row["Inventory Count"]) || 0,
      amazonPoints: cleanNumber(row.Points) || 0,
      diff: cleanNumber(row.Diff)?.toString(),
      url: row["Amazon URL"],
      category: row.Category,
      categoryImage: row["Category Image Path"],
      subCategory: row["Sub Category"],
      subCategoryImage: row["Sub Category Image Path"],
      productImage: row["Product Image Path"],
      commentsVendor: row["Comments / Vendor for GM Products"],
      uploadedBy,
      uploadedAt: new Date().toISOString(),
    };

    if (existing.length > 0) {
      // Update existing product
      await db
        .update(amazonMarketplaceProducts)
        .set(productData)
        .where(eq(amazonMarketplaceProducts.amazonAsinSku, row["ASIN(SKU)"]!));
    } else {
      // Insert new product
      await db.insert(amazonMarketplaceProducts).values(productData);
    }
  }
}

export default new MarketplaceUploadController();
