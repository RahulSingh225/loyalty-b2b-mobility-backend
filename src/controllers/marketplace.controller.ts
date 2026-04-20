import { Request, Response } from "express";
import marketplaceService, {
  OrderPayload,
} from "../services/marketplace.service";
import { success } from "../utils/response";
import { AppError } from "../middlewares/errorHandler";
import { z } from "zod";

// Validation schemas
const productListingSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  category: z.string().optional(),
  subCategory: z.string().optional(),
  search: z.string().optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
});

const wishlistCartSchema = z.object({
  asinSku: z.string().min(1, "ASIN/SKU is required"),
});

const cartUpdateSchema = wishlistCartSchema.extend({
  quantity: z.number().int().positive().default(1),
});

const orderItemSchema = z.object({
  asinSku: z.string().min(1),
  quantity: z.number().int().positive(),
  productId: z.number().int().positive().optional(),
  productName: z.string().min(1),
  pointsPerItem: z.number().int().positive(),
  totalPoints: z.number().int().positive(),
});

const shippingAddressSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(10),
  city: z.string().min(1),
  state: z.string().min(1),
  street: z.string().min(1),
  zipCode: z.string().min(1),
  addressType: z.enum(["Aadhaar", "Working","HOME"]).optional(),
});

const placeOrderSchema = z.object({
  userId: z.number().int().positive(),
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
  shippingAddress: shippingAddressSchema,
});



const ticketSchema = z.object({
  orderId: z.string().min(1),
  productId: z.number().int().positive().optional(),
  asinSku: z.string().optional(),
  reason: z.string().min(1, "Reason is required"),
  requestType: z.enum(["RETURN", "REPLACEMENT", "ISSUE"]),
});

const statusUpdateSchema = z.object({
  status: z.string().min(1, "Status is required"),
  notes: z.string().optional(),
  carrier: z.string().optional(),
  trackingNumber: z.string().optional(),
  estimatedDelivery: z.string().optional(),
});

const adminOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.string().optional(),
  userId: z.coerce.number().int().positive().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});



export class MarketplaceController {
  // Product Listing
  async getProducts(req: Request, res: Response) {
    const validated = productListingSchema.parse(req.query);

    try {
      const result = await marketplaceService.getProducts(validated);
      res.json(success(result));
    } catch (error) {
      throw error instanceof AppError
        ? error
        : new AppError("Failed to fetch products", 500);
    }
  }

  async getProductByAsin(req: Request, res: Response) {
    const { asinSku } = req.params;

    try {
      const product = await marketplaceService.getProductByAsin(asinSku);
      if (!product) {
        throw new AppError("Product not found", 404);
      }
      res.json(success(product));
    } catch (error) {
      throw error instanceof AppError
        ? error
        : new AppError("Failed to fetch product", 500);
    }
  }

  async getCategories(req: Request, res: Response) {
    try {
      // Get all categories with subcategories
      const { categories } = await marketplaceService.getProducts({ limit: 1 });
      res.json(success({ categories }));
    } catch (error) {
      throw error instanceof AppError
        ? error
        : new AppError("Failed to fetch categories", 500);
    }
  }

  // Wishlist Management
  async addToWishlist(req: Request, res: Response) {
    const user = (req as any).user;
    const validated = wishlistCartSchema.parse(req.body);

    try {
      const result = await marketplaceService.addToWishlist(
        user.id,
        validated.asinSku
      );
      res.status(201).json(success(result, "Added to wishlist"));
    } catch (error) {
      throw error instanceof AppError
        ? error
        : new AppError("Failed to add to wishlist", 500);
    }
  }

  async removeFromWishlist(req: Request, res: Response) {
    const user = (req as any).user;
    const validated = wishlistCartSchema.parse(req.body);

    try {
      const result = await marketplaceService.removeFromWishlist(
        user.id,
        validated.asinSku
      );
      res.json(success(result, "Removed from wishlist"));
    } catch (error) {
      throw error instanceof AppError
        ? error
        : new AppError("Failed to remove from wishlist", 500);
    }
  }

  async getWishlist(req: Request, res: Response) {
    const user = (req as any).user;

    try {
      const result = await marketplaceService.getWishlist(user.id);
      res.json(success(result));
    } catch (error) {
      throw error instanceof AppError
        ? error
        : new AppError("Failed to fetch wishlist", 500);
    }
  }

  // Cart Management
  async addToCart(req: Request, res: Response) {
    const user = (req as any).user;
    const validated = cartUpdateSchema.parse(req.body);

    try {
      const result = await marketplaceService.addToCart(
        user.id,
        validated.asinSku,
        validated.quantity
      );
      res.status(201).json(success(result, "Added to cart"));
    } catch (error) {
      throw error instanceof AppError
        ? error
        : new AppError("Failed to add to cart", 500);
    }
  }

  async updateCartItem(req: Request, res: Response) {
    const user = (req as any).user;
    const validated = cartUpdateSchema.parse(req.body);

    try {
      const result = await marketplaceService.updateCartItem(
        user.id,
        validated.asinSku,
        validated.quantity
      );
      res.json(success(result, "Cart updated"));
    } catch (error) {
      throw error instanceof AppError
        ? error
        : new AppError("Failed to update cart", 500);
    }
  }

  async removeFromCart(req: Request, res: Response) {
    const user = (req as any).user;
    const validated = wishlistCartSchema.parse(req.body);

    try {
      const result = await marketplaceService.removeFromCart(
        user.id,
        validated.asinSku
      );
      res.json(success(result, "Removed from cart"));
    } catch (error) {
      throw error instanceof AppError
        ? error
        : new AppError("Failed to remove from cart", 500);
    }
  }

  async getCart(req: Request, res: Response) {
    const user = (req as any).user;

    try {
      const result = await marketplaceService.getCart(user.id);
      res.json(success(result));
    } catch (error) {
      throw error instanceof AppError
        ? error
        : new AppError("Failed to fetch cart", 500);
    }
  }

  async clearCart(req: Request, res: Response) {
    const user = (req as any).user;

    try {
      const result = await marketplaceService.clearCart(user.id);
      res.json(success({ itemsCleared: result }, "Cart cleared"));
    } catch (error) {
      throw error instanceof AppError
        ? error
        : new AppError("Failed to clear cart", 500);
    }
  }

  // Order Management
async placeOrder(req: Request, res: Response) {
  const validated = placeOrderSchema.parse(req.body) as OrderPayload;
  console.log('validated: placeOrder', validated);
  
  try {
    const result = await marketplaceService.placeOrder(validated);
    res.status(201).json(success(result.data, result.message));
  } catch (error) {
    throw error instanceof AppError
      ? error
      : new AppError("Failed to place order", 500);
  }
}

  async getOrders(req: Request, res: Response) {
    const user = (req as any).user;
    const { page, limit } = req.query;

    try {
      const result = await marketplaceService.getOrders(user.id, {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      res.json(success(result));
    } catch (error) {
      throw error instanceof AppError
        ? error
        : new AppError("Failed to fetch orders", 500);
    }
  }

  async getOrderDetails(req: Request, res: Response) {
    const user = (req as any).user;
    const { orderId } = req.params;

    try {
      const result = await marketplaceService.getOrderDetails(orderId, user.id);
      res.json(success(result.data));
    } catch (error) {
      throw error instanceof AppError
        ? error
        : new AppError("Failed to fetch order details", 500);
    }
  }

  // Track Order
  async trackOrder(req: Request, res: Response) {
    const user = (req as any).user;
    const { orderId } = req.params;

    try {
      const result = await marketplaceService.getOrderTracking(orderId, user.id);
      res.json(success(result.data, "Order tracking details"));
    } catch (error) {
      throw error instanceof AppError
        ? error
        : new AppError("Failed to fetch tracking details", 500);
    }
  }

  // Admin: Update order status
  async updateOrderStatus(req: Request, res: Response) {
    const { orderId } = req.params;
    const validated = statusUpdateSchema.parse(req.body);
    const user = (req as any).user;

    try {
      const result = await marketplaceService.updateOrderStatus(
        orderId,
        validated.status,
        validated.notes,
        {
          carrier: validated.carrier,
          trackingNumber: validated.trackingNumber,
          estimatedDelivery: validated.estimatedDelivery,
        }
      );
      res.json(success(result.data, "Order status updated"));
    } catch (error) {
      throw error instanceof AppError
        ? error
        : new AppError("Failed to update order status", 500);
    }
  }

  // Admin: Get all orders (paginated)
  async getAdminOrders(req: Request, res: Response) {
    const validated = adminOrdersQuerySchema.parse(req.query);

    try {
      const result = await marketplaceService.getAdminOrders(validated);
      res.json(success(result));
    } catch (error) {
      throw error instanceof AppError
        ? error
        : new AppError("Failed to fetch admin orders", 500);
    }
  }



  // Support Tickets
  async createTicket(req: Request, res: Response) {
    const user = (req as any).user;
    const validated = ticketSchema.parse(req.body);

    try {
    const result = await marketplaceService.createTicket(
      validated.orderId,    // orderId: string
      user.id,              // userId: number
      validated.reason,     // reason: string
      validated.requestType,// requestType: string
      validated.productId,  // productId?: number - optional
      validated.asinSku     // asinSku?: string - optional
    );
      res.status(201).json(success(result.data, "Ticket created"));
    } catch (error) {
      throw error instanceof AppError
        ? error
        : new AppError("Failed to create ticket", 500);
    }
  }

  async getTickets(req: Request, res: Response) {
    const user = (req as any).user;

    try {
      const result = await marketplaceService.getTickets(user.id);
      res.json(success(result));
    } catch (error) {
      throw error instanceof AppError
        ? error
        : new AppError("Failed to fetch tickets", 500);
    }
  }

  // Admin: Update ticket status
  async updateTicketStatus(req: Request, res: Response) {
    const { ticketId } = req.params;
    const { status, resolutionNotes } = req.body;
    const user = (req as any).user;

    try {
      const result = await marketplaceService.updateTicketStatus(
        Number(ticketId),
        status,
        resolutionNotes,
        user.id
      );
      res.json(success(result.data, "Ticket status updated"));
    } catch (error) {
      throw error instanceof AppError
        ? error
        : new AppError("Failed to update ticket status", 500);
    }
  }
}

export default new MarketplaceController();
