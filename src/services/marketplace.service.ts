import { eq, and, desc, sql, ilike, inArray } from "drizzle-orm";
import { db } from "../config/db";
import {
  amazonMarketplaceProducts,
  userAmazonWishlist,
  userAmazonCart,
  userAmazonOrders,
  amazonOrderItems,
  amazonTickets,
  users,
  redemptions,
} from "../schema/index";
import { AppError } from "../middlewares/errorHandler";
import { randomBytes } from "crypto";
import { RedemptionProcedure } from "../procedures/redemption";

export interface AmazonProduct {
  id: number;
  asinSku: string;
  name: string;
  modelNo?: string;
  description?: string;
  mrp: number;
  discountedPrice: number;
  cspPrice: number;
  inventoryCount: number;
  points: number;
  diff?: number;
  url?: string;
  category?: string;
  categoryImage?: string;
  subCategory?: string;
  subCategoryImage?: string;
  productImage?: string;
  commentsVendor?: string;
  isActive: boolean;
}

export interface Category {
  name: string;
  image?: string;
  subCategories?: SubCategory[];
}

export interface SubCategory {
  name: string;
  image?: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductListingResponse {
  success: boolean;
  products: AmazonProduct[];
  categories?: Category[];
  pagination: Pagination;
}

export interface OrderItemRequest {
  productId: number;
  asinSku: string;
  productName: string;
  quantity: number;
  pointsPerItem: number;
  totalPoints: number;
}

export interface OrderItem extends OrderItemRequest {
  productId: number;
  asinSku: string;
  productName: string;
  quantity: number;
  pointsPerItem: number;
  totalPoints: number;
  status: string;
  statusHistory: StatusUpdate[];
}

export interface StatusUpdate {
  status: string;
  date: string;
  notes?: string;
}

export interface ShippingAddress {
  name: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  addressType: "Aadhaar" | "Working";
}

export interface OrderPayload {
  userId: number;
  items: OrderItemRequest[];
  shippingAddress: ShippingAddress;
}

export interface OrderResponse {
  success: boolean;
  orderId?: string;
  message: string;
  data?: any;
}

export interface CartItem {
  cartId: number;
  userId: number;
  asinSku: string;
  quantity: number;
  product?: AmazonProduct;
}

export interface WishlistItem {
  wishlistId: number;
  userId: number;
  asinSku: string;
  addedAt: Date;
  product?: AmazonProduct;
}



class MarketplaceService {
  // Helper to convert product from DB schema to interface
  private convertProduct(product: any): AmazonProduct {
    return {
      id: product.amazonMarketplaceProductId,
      asinSku: product.amazonAsinSku,
      name: product.amazonProductName,
      modelNo: product.amazonModelNo,
      description: product.amazonProductDescription,
      mrp: Number(product.amazonMrp || 0),
      discountedPrice: Number(product.amazonDiscountedPrice || 0),
      cspPrice: Number(product.amazonCspOnAmazon || 0),
      inventoryCount: product.amazonInventoryCount || 0,
      points: product.amazonPoints || 0,
      diff: product.amazonDiff ? Number(product.amazonDiff) : undefined,
      url: product.amazonUrl,
      category: product.amazonCategory,
      categoryImage: product.amazonCategoryImagePath,
      subCategory: product.amazonSubCategory,
      subCategoryImage: product.amazonSubCategoryImagePath,
      productImage: product.amazonProductImagePath,
      commentsVendor: product.amazonCommentsVendor,
      isActive: product.isAmzProductActive,
    };
  }

  // Product Management
  async getProducts(params: {
    page?: number;
    limit?: number;
    category?: string;
    subCategory?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
  }): Promise<ProductListingResponse> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    const conditions = [eq(amazonMarketplaceProducts.isAmzProductActive, true)];

    if (params.category) {
      conditions.push(eq(amazonMarketplaceProducts.amazonCategory, params.category));
    }

    if (params.subCategory) {
      conditions.push(
        eq(amazonMarketplaceProducts.amazonSubCategory, params.subCategory)
      );
    }

    if (params.search) {
      conditions.push(
        ilike(amazonMarketplaceProducts.amazonProductName, `%${params.search}%`)
      );
    }

    if (params.minPrice !== undefined) {
      conditions.push(
        sql`${amazonMarketplaceProducts.amazonDiscountedPrice} >= ${params.minPrice}`
      );
    }

    if (params.maxPrice !== undefined) {
      conditions.push(
        sql`${amazonMarketplaceProducts.amazonDiscountedPrice} <= ${params.maxPrice}`
      );
    }

    const [products, total] = await Promise.all([
      db
        .select()
        .from(amazonMarketplaceProducts)
        .where(and(...conditions))
        .orderBy(desc(amazonMarketplaceProducts.amazonMarketplaceProductId))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(amazonMarketplaceProducts)
        .where(and(...conditions)),
    ]);

    const totalCount = Number(total[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    // Get categories
    let categories: Category[] = [];
    if (!params.category) {
      const categoryResult = await db
        .select({
          name: amazonMarketplaceProducts.amazonCategory,
          image: amazonMarketplaceProducts.amazonCategoryImagePath,
        })
        .from(amazonMarketplaceProducts)
        .where(eq(amazonMarketplaceProducts.isAmzProductActive, true))
        .groupBy(
          amazonMarketplaceProducts.amazonCategory,
          amazonMarketplaceProducts.amazonCategoryImagePath
        );

      categories = await Promise.all(
        categoryResult.map(async (cat) => {
          const subCategories = await db
            .select({
              name: amazonMarketplaceProducts.amazonSubCategory,
              image: amazonMarketplaceProducts.amazonSubCategoryImagePath,
            })
            .from(amazonMarketplaceProducts)
            .where(
              and(
                eq(amazonMarketplaceProducts.amazonCategory, cat.name),
                eq(amazonMarketplaceProducts.isAmzProductActive, true)
              )
            )
            .groupBy(
              amazonMarketplaceProducts.amazonSubCategory,
              amazonMarketplaceProducts.amazonSubCategoryImagePath
            );

          return {
            ...cat,
            subCategories: subCategories as SubCategory[],
          };
        })
      );
    }

    return {
      success: true,
      products: products.map((p) => this.convertProduct(p)),
      categories: categories.length > 0 ? categories : undefined,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages,
      },
    };
  }

  /*
  async getProductById(productId: number): Promise<AmazonProduct | null> {
    const [product] = await db
      .select()
      .from(amazonMarketplaceProducts)
      .where(
        and(
          eq(amazonMarketplaceProducts.amazonMarketplaceProductId, productId),
          eq(amazonMarketplaceProducts.isAmzProductActive, true)
        )
      )
      .limit(1);

    if (!product) return null;
    return this.convertProduct(product);
  }
  */

  async getProductByAsin(asinSku: string): Promise<AmazonProduct | null> {
    const [product] = await db
      .select()
      .from(amazonMarketplaceProducts)
      .where(
        and(
          eq(amazonMarketplaceProducts.amazonAsinSku, asinSku),
          eq(amazonMarketplaceProducts.isAmzProductActive, true)
        )
      )
      .limit(1);

    if (!product) return null;
    return this.convertProduct(product);
  }

  // Wishlist Management
  async addToWishlist(userId: number, asinSku: string): Promise<WishlistItem> {
    const product = await this.getProductByAsin(asinSku);
    if (!product) {
      throw new AppError("Product not found", 404);
    }

    const existing = await db
      .select()
      .from(userAmazonWishlist)
      .where(
        and(
          eq(userAmazonWishlist.userId, userId),
          eq(userAmazonWishlist.amazonAsinSku, asinSku)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return {
        wishlistId: existing[0].wishlistId,
        userId: existing[0].userId,
        asinSku: existing[0].amazonAsinSku,
        addedAt: new Date(existing[0].addedAt),
        product,
      };
    }

    const [wishlistItem] = await db
      .insert(userAmazonWishlist)
      .values({
        userId,
        amazonAsinSku: asinSku,
      })
      .returning();

    return {
      wishlistId: wishlistItem.wishlistId,
      userId: wishlistItem.userId,
      asinSku: wishlistItem.amazonAsinSku,
      addedAt: new Date(wishlistItem.addedAt),
      product,
    };
  }

  async removeFromWishlist(userId: number, asinSku: string): Promise<boolean> {
    const result = await db
      .delete(userAmazonWishlist)
      .where(
        and(
          eq(userAmazonWishlist.userId, userId),
          eq(userAmazonWishlist.amazonAsinSku, asinSku)
        )
      )
      .returning();

    return result.length > 0;
  }

  async getWishlist(userId: number): Promise<WishlistItem[]> {
    const items = await db
      .select({
        wishlist: userAmazonWishlist,
        product: amazonMarketplaceProducts,
      })
      .from(userAmazonWishlist)
      .leftJoin(
        amazonMarketplaceProducts,
        eq(userAmazonWishlist.amazonAsinSku, amazonMarketplaceProducts.amazonAsinSku)
      )
      .where(eq(userAmazonWishlist.userId, userId))
      .orderBy(desc(userAmazonWishlist.addedAt));

    return items.map((item) => ({
      wishlistId: item.wishlist.wishlistId,
      userId: item.wishlist.userId,
      asinSku: item.wishlist.amazonAsinSku,
      addedAt: new Date(item.wishlist.addedAt),
      product: item.product ? this.convertProduct(item.product) : undefined,
    }));
  }

  // Cart Management
  async addToCart(
    userId: number,
    asinSku: string,
    quantity: number = 1
  ): Promise<CartItem> {
    const product = await this.getProductByAsin(asinSku);
    if (!product) {
      throw new AppError("Product not found", 404);
    }

    // if (product.inventoryCount < quantity) {
    //   throw new AppError("Insufficient inventory", 400);
    // }

    const existing = await db
      .select()
      .from(userAmazonCart)
      .where(
        and(
          eq(userAmazonCart.userId, userId),
          eq(userAmazonCart.amazonAsinSku, asinSku)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(userAmazonCart)
        .set({
          quantity,
        })
        .where(eq(userAmazonCart.cartId, existing[0].cartId))
        .returning();

      return {
        cartId: updated.cartId,
        userId: updated.userId,
        asinSku: updated.amazonAsinSku,
        quantity: updated.quantity,
        product,
      };
    }

    const [cartItem] = await db
      .insert(userAmazonCart)
      .values({
        userId,
        amazonAsinSku: asinSku,
        quantity,
      })
      .returning();

    return {
      cartId: cartItem.cartId,
      userId: cartItem.userId,
      asinSku: cartItem.amazonAsinSku,
      quantity: cartItem.quantity,
      product,
    };
  }

  async updateCartItem(
    userId: number,
    asinSku: string,
    quantity: number
  ): Promise<CartItem> {
    const product = await this.getProductByAsin(asinSku);
    if (!product) {
      throw new AppError("Product not found", 404);
    }

    // if (product.inventoryCount < quantity) {
    //   throw new AppError("Insufficient inventory", 400);
    // }

    const [updated] = await db
      .update(userAmazonCart)
      .set({
        quantity,
      })
      .where(
        and(
          eq(userAmazonCart.userId, userId),
          eq(userAmazonCart.amazonAsinSku, asinSku)
        )
      )
      .returning();

    if (!updated) {
      throw new AppError("Cart item not found", 404);
    }

    return {
      cartId: updated.cartId,
      userId: updated.userId,
      asinSku: updated.amazonAsinSku,
      quantity: updated.quantity,
      product,
    };
  }

  async removeFromCart(userId: number, asinSku: string): Promise<boolean> {
    const result = await db
      .delete(userAmazonCart)
      .where(
        and(
          eq(userAmazonCart.userId, userId),
          eq(userAmazonCart.amazonAsinSku, asinSku)
        )
      )
      .returning();

    return result.length > 0;
  }

  async getCart(userId: number): Promise<{
    items: CartItem[];
    totalPoints: number;
  }> {
    const items = await db
      .select({
        cart: userAmazonCart,
        product: amazonMarketplaceProducts,
      })
      .from(userAmazonCart)
      .leftJoin(
        amazonMarketplaceProducts,
        eq(userAmazonCart.amazonAsinSku, amazonMarketplaceProducts.amazonAsinSku)
      )
      .where(eq(userAmazonCart.userId, userId));

    const cartItems = items.map((item) => ({
      cartId: item.cart.cartId,
      userId: item.cart.userId,
      asinSku: item.cart.amazonAsinSku,
      quantity: item.cart.quantity,
      product: item.product ? this.convertProduct(item.product) : undefined,
    }));

    const totalPoints = cartItems.reduce((total, item) => {
      const points = item.product?.points || 0;
      return total + points * item.quantity;
    }, 0);

    return {
      items: cartItems,
      totalPoints,
    };
  }

  async clearCart(userId: number): Promise<number> {
    const result = await db
      .delete(userAmazonCart)
      .where(eq(userAmazonCart.userId, userId))
      .returning();

    return result.length;
  }

  // Order Management
  async placeOrder(orderPayload: OrderPayload): Promise<OrderResponse> {
    return db.transaction(async (tx) => {
      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.id, orderPayload.userId))
        .limit(1);

      if (!user) {
        throw new AppError("User not found", 404);
      }

      let totalPoints = 0;
      for (const item of orderPayload.items) {
        const product = await this.getProductByAsin(item.asinSku);
        if (!product) {
          throw new AppError(`Product ${item.asinSku} not found`, 404);
        }

        // if (product.inventoryCount < item.quantity) {
        //   throw new AppError(`Insufficient inventory for ${product.name}`, 400);
        // }

        if (product.points * item.quantity !== item.totalPoints) {
          throw new AppError(
            `Points calculation mismatch for ${product.name}`,
            400
          );
        }

        totalPoints += item.totalPoints;
      }

      const orderId = `AMZ-ORD-${Date.now()}-${randomBytes(4)
        .toString("hex")
        .toUpperCase()}`;
      const redemptionId = `RED-${Date.now()}-${randomBytes(4)
        .toString("hex")
        .toUpperCase()}`;

      const orderData = {
        ...orderPayload,
        orderTotalPoints: totalPoints,
        orderDate: new Date().toISOString(),
      };

      const [order] = await tx
        .insert(userAmazonOrders)
        .values({
          orderId,
          userId: orderPayload.userId,
          redemptionId,
          orderData,
          pointsDeducted: totalPoints,
          orderStatus: "processing",
          shippingDetails: orderPayload.shippingAddress,
        })
        .returning();

      const orderItems = [];
      for (const item of orderPayload.items) {
        const product = await this.getProductByAsin(item.asinSku);
        if (!product) continue;

        const [orderItem] = await tx
          .insert(amazonOrderItems)
          .values({
            orderId: order.userAmzOrderId,
            productId: product.id,
            asinSku: item.asinSku,
            productName: item.productName,
            quantity: item.quantity,
            pointsPerItem: item.pointsPerItem,
            totalPoints: item.totalPoints,
            status: "processing",
            statusHistory: [
              {
                status: "processing",
                date: new Date().toISOString(),
                notes: "Order placed",
              },
            ],
          })
          .returning();

        // Integrate with existing redemption system
        const procedure = new RedemptionProcedure({
          channelId: 4, // Amazon Market Place
          pointsRedeemed: item.totalPoints,
          redemptionType: 'MARKETPLACE',
          channelReferenceId: orderItem.orderItemId,
          metadata: {
            parentOrderId: orderId,
            asinSku: item.asinSku,
            productName: item.productName,
            quantity: item.quantity,
          }
        });

        // Set context manually since we don't have req/res here directly,
        // but it's okay for internal calls if context is passed down.
        // Assuming we want to maintain the correlation with the current user.
        procedure.setContext(orderPayload.userId, "internal", "system");
        await procedure.execute();

        orderItems.push(orderItem);

        await tx
          .update(amazonMarketplaceProducts)
          .set({
            amazonInventoryCount: product.inventoryCount - item.quantity,
          })
          .where(eq(amazonMarketplaceProducts.amazonMarketplaceProductId, product.id));
      }

      await tx
        .delete(userAmazonCart)
        .where(eq(userAmazonCart.userId, orderPayload.userId));

      return {
        success: true,
        orderId,
        message: "Order placed successfully",
        data: {
          order,
          items: orderItems,
          orderTotalPoints: totalPoints,
          orderDate: new Date(),
        },
      };
    });
  }

  async getOrders(userId: number, params?: { page?: number; limit?: number }) {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const offset = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      db
        .select()
        .from(userAmazonOrders)
        .where(eq(userAmazonOrders.userId, userId))
        .orderBy(desc(userAmazonOrders.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(userAmazonOrders)
        .where(eq(userAmazonOrders.userId, userId)),
    ]);

    const totalCount = Number(total[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await db
          .select()
          .from(amazonOrderItems)
          .where(eq(amazonOrderItems.orderId, order.userAmzOrderId));

        return {
          ...order,
          items,
        };
      })
    );

    return {
      success: true,
      data: ordersWithItems,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages,
      },
    };
  }

  /*
  async getOrdersWithDateFilter(
    userId: number,
    filters: {
      fromDate?: string;
      toDate?: string;
      orderStatus?: string;
      page?: number;
      limit?: number;
    }
  ) {
    // ... method implementation
  }
  */

  async getOrderDetails(orderId: string, userId: number) {
    const [order] = await db
      .select()
      .from(userAmazonOrders)
      .where(
        and(
          eq(userAmazonOrders.orderId, orderId),
          eq(userAmazonOrders.userId, userId)
        )
      )
      .limit(1);

    if (!order) {
      throw new AppError("Order not found", 404);
    }

    const items = await db
      .select()
      .from(amazonOrderItems)
      .where(eq(amazonOrderItems.orderId, order.userAmzOrderId));

    return {
      success: true,
      data: {
        ...order,
        items,
      },
    };
  }

  // Track Order - returns focused tracking information
  async getOrderTracking(orderId: string, userId: number) {
    const [order] = await db
      .select()
      .from(userAmazonOrders)
      .where(
        and(
          eq(userAmazonOrders.orderId, orderId),
          eq(userAmazonOrders.userId, userId)
        )
      )
      .limit(1);

    if (!order) {
      throw new AppError("Order not found", 404);
    }

    const items = await db
      .select()
      .from(amazonOrderItems)
      .where(eq(amazonOrderItems.orderId, order.userAmzOrderId));

    // Build the status timeline from item-level statusHistory
    const statusTimeline: Array<{ status: string; date: string; notes?: string }> = [];
    if (items.length > 0 && items[0].statusHistory) {
      const history = items[0].statusHistory as Array<{ status: string; date: string; notes?: string }>;
      statusTimeline.push(...history);
    }

    const trackingDetails = (order.trackingDetails as any) || {};

    // Define all possible steps and mark completion
    const allSteps = ["processing", "confirmed", "shipped", "delivered"];
    const currentStatus = order.orderStatus || "processing";
    const currentStepIndex = allSteps.indexOf(currentStatus);
    const isCancelled = currentStatus === "cancelled";

    const steps = allSteps.map((step, index) => ({
      step,
      label: step.charAt(0).toUpperCase() + step.slice(1),
      completed: isCancelled ? false : index <= currentStepIndex,
      current: step === currentStatus,
      date: statusTimeline.find((t) => t.status === step)?.date || null,
    }));

    return {
      success: true,
      data: {
        orderId: order.orderId,
        currentStatus: order.orderStatus,
        isCancelled,
        steps,
        tracking: {
          carrier: trackingDetails.carrier || null,
          trackingNumber: trackingDetails.trackingNumber || null,
          estimatedDelivery: order.estimatedDelivery || null,
          deliveredAt: order.deliveredAt || null,
          lastUpdate: trackingDetails.latestUpdate || null,
        },
        items: items.map((item) => ({
          orderItemId: item.orderItemId,
          productName: item.productName,
          asinSku: item.asinSku,
          quantity: item.quantity,
          status: item.status,
          statusHistory: item.statusHistory || [],
        })),
        shippingAddress: order.shippingDetails || null,
        orderDate: order.createdAt,
        pointsDeducted: order.pointsDeducted,
      },
    };
  }

  // Valid status transitions map
  private readonly ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
    processing: ["confirmed", "cancelled"],
    confirmed: ["shipped", "cancelled"],
    shipped: ["delivered", "cancelled"],
    delivered: [], // Terminal state — no further transitions
    cancelled: [], // Terminal state
  };

  async updateOrderStatus(
    orderId: string,
    orderStatus: string,
    notes?: string,
    trackingInfo?: {
      carrier?: string;
      trackingNumber?: string;
      estimatedDelivery?: string;
    }
  ) {
    const [order] = await db
      .select()
      .from(userAmazonOrders)
      .where(eq(userAmazonOrders.orderId, orderId))
      .limit(1);

    if (!order) {
      throw new AppError("Order not found", 404);
    }

    const currentStatus = order.orderStatus || "processing";
    const allowedTransitions = this.ORDER_STATUS_TRANSITIONS[currentStatus] || [];

    if (!allowedTransitions.includes(orderStatus)) {
      throw new AppError(
        `Invalid status transition: ${currentStatus} → ${orderStatus}. Allowed: ${allowedTransitions.join(", ") || "none (terminal state)"}`,
        400
      );
    }

    // Build update payload
    const updatePayload: any = { orderStatus, updatedAt: new Date().toISOString() };

    if (orderStatus === "delivered") {
      updatePayload.deliveredAt = new Date().toISOString();
    }

    // Merge tracking info into existing tracking_details jsonb
    if (trackingInfo && (trackingInfo.carrier || trackingInfo.trackingNumber || trackingInfo.estimatedDelivery)) {
      const existingTracking = (order.trackingDetails as any) || {};
      updatePayload.trackingDetails = {
        ...existingTracking,
        ...(trackingInfo.carrier && { carrier: trackingInfo.carrier }),
        ...(trackingInfo.trackingNumber && { trackingNumber: trackingInfo.trackingNumber }),
        latestUpdate: new Date().toISOString(),
      };
      if (trackingInfo.estimatedDelivery) {
        updatePayload.estimatedDelivery = trackingInfo.estimatedDelivery;
      }
    }

    const [updated] = await db
      .update(userAmazonOrders)
      .set(updatePayload)
      .where(eq(userAmazonOrders.orderId, orderId))
      .returning();

    const historyEntry = {
      status: orderStatus,
      date: new Date().toISOString(),
      notes: notes || `Status updated to ${orderStatus}`,
      ...(trackingInfo?.carrier && { carrier: trackingInfo.carrier }),
      ...(trackingInfo?.trackingNumber && { trackingNumber: trackingInfo.trackingNumber }),
    };

    await db
      .update(amazonOrderItems)
      .set({
        status: orderStatus,
        statusHistory: sql`COALESCE(status_history, '[]'::jsonb) || jsonb_build_array(${JSON.stringify(historyEntry)}::jsonb)`,
      })
      .where(eq(amazonOrderItems.orderId, order.userAmzOrderId));

    // Sync status with unified redemptions table
    const statusMap: Record<string, number> = {
      'processing': 1, // Pending
      'confirmed': 6,  // Processing
      'shipped': 6,    // Still Processing
      'delivered': 5,  // Completed
      'cancelled': 3,  // Rejected
    };

    const targetStatusId = statusMap[orderStatus.toLowerCase()];
    if (targetStatusId) {
      // Find item IDs to update respective redemptions
      const items = await db
        .select({ id: amazonOrderItems.orderItemId })
        .from(amazonOrderItems)
        .where(eq(amazonOrderItems.orderId, order.userAmzOrderId));

      for (const item of items) {
        await db.update(redemptions)
          .set({ status: targetStatusId, updatedAt: new Date().toISOString() })
          .where(and(
            eq(redemptions.channelReferenceId, item.id),
            eq(redemptions.channelId, 4)
          ));
      }
    }

    return {
      success: true,
      data: updated,
    };
  }

  // Admin: List all orders (paginated, with filters)
  async getAdminOrders(params: {
    page?: number;
    limit?: number;
    status?: string;
    userId?: number;
    fromDate?: string;
    toDate?: string;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];

    if (params.status) {
      conditions.push(eq(userAmazonOrders.orderStatus, params.status));
    }
    if (params.userId) {
      conditions.push(eq(userAmazonOrders.userId, params.userId));
    }
    if (params.fromDate) {
      conditions.push(sql`${userAmazonOrders.createdAt} >= ${params.fromDate}::timestamp`);
    }
    if (params.toDate) {
      const toDatePlusOne = new Date(params.toDate);
      toDatePlusOne.setDate(toDatePlusOne.getDate() + 1);
      conditions.push(sql`${userAmazonOrders.createdAt} < ${toDatePlusOne.toISOString().split("T")[0]}::timestamp`);
    }

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    const [orders, total] = await Promise.all([
      db
        .select({
          order: userAmazonOrders,
          userName: users.name,
          userPhone: users.phone,
        })
        .from(userAmazonOrders)
        .leftJoin(users, eq(userAmazonOrders.userId, users.id))
        .where(whereCondition)
        .orderBy(desc(userAmazonOrders.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(userAmazonOrders)
        .leftJoin(users, eq(userAmazonOrders.userId, users.id))
        .where(whereCondition),
    ]);

    const totalCount = Number(total[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    const ordersWithItems = await Promise.all(
      orders.map(async (o) => {
        const items = await db
          .select()
          .from(amazonOrderItems)
          .where(eq(amazonOrderItems.orderId, o.order.userAmzOrderId));
        return {
          ...o.order,
          userName: o.userName,
          userPhone: o.userPhone,
          items,
        };
      })
    );

    return {
      success: true,
      data: ordersWithItems,
      pagination: { total: totalCount, page, limit, totalPages },
    };
  }



  /*
  private async revertCancelledOrder(order: any) {
    const { schema } = await import('../schema').then(m => ({ schema: m }));
    const { eq: eqOp } = await import('drizzle-orm');

    // 1. Restore inventory for each item
    const items = await db
      .select()
      .from(amazonOrderItems)
      .where(eq(amazonOrderItems.orderId, order.userAmzOrderId));

    for (const item of items) {
      const [product] = await db
        .select()
        .from(amazonMarketplaceProducts)
        .where(eq(amazonMarketplaceProducts.amazonMarketplaceProductId, item.productId))
        .limit(1);

      if (product) {
        await db
          .update(amazonMarketplaceProducts)
          .set({
            amazonInventoryCount: (product.amazonInventoryCount || 0) + item.quantity,
          })
          .where(eq(amazonMarketplaceProducts.amazonMarketplaceProductId, item.productId));
      }
    }
  }
  */



  // Support Tickets
  async createTicket(
    orderId: string,
    userId: number,
    reason: string,
    requestType: string,
    productId?: number,
    asinSku?: string
  ) {
    const [order] = await db
      .select()
      .from(userAmazonOrders)
      .where(
        and(
          eq(userAmazonOrders.orderId, orderId),
          eq(userAmazonOrders.userId, userId)
        )
      )
      .limit(1);

    if (!reason) {
      throw new AppError("Reason is required", 400);
    }
    if (!requestType) {
      throw new AppError("Request type is required", 400);
    }
    if (!order) {
      throw new AppError("Order not found", 404);
    }

    const ticketNumber = `TKT-${Date.now()}-${randomBytes(4)
      .toString("hex")
      .toUpperCase()}`;

    const [ticket] = await db
      .insert(amazonTickets)
      .values({
        ticketNumber,
        orderId: order.userAmzOrderId,
        userId,
        productId,
        asinSku,
        reason,
        requestType,
        status: "PENDING",
      })
      .returning();

    return {
      success: true,
      data: ticket,
    };
  }

  async getTickets(userId: number) {
    const tickets = await db
      .select()
      .from(amazonTickets)
      .where(eq(amazonTickets.userId, userId))
      .orderBy(desc(amazonTickets.createdAt));

    return {
      success: true,
      data: tickets,
    };
  }

  async updateTicketStatus(
    ticketId: number,
    status: string,
    resolutionNotes?: string,
    resolvedBy?: number
  ) {
    const updateData: any = {
      status,
    };

    if (resolutionNotes) {
      updateData.resolutionNotes = resolutionNotes;
    }

    if (resolvedBy) {
      updateData.resolvedBy = resolvedBy;
    }

    if (status === "RESOLVED" || status === "CLOSED") {
      updateData.resolvedAt = new Date().toISOString();
    }

    const [updated] = await db
      .update(amazonTickets)
      .set(updateData)
      .where(eq(amazonTickets.ticketId, ticketId))
      .returning();

    return {
      success: true,
      data: updated,
    };
  }
}

export default new MarketplaceService();