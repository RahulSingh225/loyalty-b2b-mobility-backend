import { Router } from "express";
import marketplaceController from "../controllers/marketplace.controller";
import { authenticate } from "../middlewares/auth";
// import { authorize } from "../middlewares/accessLevel";

const router = Router();

// Public routes
router.get("/products", marketplaceController.getProducts);
router.get("/products/:asinSku", marketplaceController.getProductByAsin);
router.get("/categories", marketplaceController.getCategories);


// Protected user routes
router.use(authenticate);

// Wishlist
router.post("/wishlist/add", marketplaceController.addToWishlist);
router.delete("/wishlist/remove", marketplaceController.removeFromWishlist);
router.get("/wishlist", marketplaceController.getWishlist);

// Cart
router.post("/cart/add", marketplaceController.addToCart);
router.put("/cart/update", marketplaceController.updateCartItem);
router.delete("/cart/remove", marketplaceController.removeFromCart);
router.get("/cart", marketplaceController.getCart);
router.delete("/cart/clear", marketplaceController.clearCart);

// Orders
router.post("/orders/place", marketplaceController.placeOrder);
router.get("/orders", marketplaceController.getOrders);
router.get("/orders/:orderId", marketplaceController.getOrderDetails);
router.get("/orders/:orderId/track", marketplaceController.trackOrder);



// Support Tickets
router.post("/tickets", marketplaceController.createTicket);
router.get("/tickets", marketplaceController.getTickets);

// Admin routes
// router.use(authorize(["Admin"]));

// Admin: Order management
router.get("/admin/orders", marketplaceController.getAdminOrders);
router.put("/admin/orders/:orderId/status", marketplaceController.updateOrderStatus);



// Admin: Ticket management
router.put(
  "/admin/tickets/:ticketId/status",
  marketplaceController.updateTicketStatus
);

export default router;