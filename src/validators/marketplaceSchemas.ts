import { z } from 'zod';

export const productListingSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  category: z.string().optional(),
  subCategory: z.string().optional(),
  search: z.string().optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
});

export const wishlistCartSchema = z.object({
  asinSku: z.string().min(1, "ASIN/SKU is required"),
});

export const cartUpdateSchema = wishlistCartSchema.extend({
  quantity: z.number().int().positive().default(1),
});

const orderItemSchema = z.object({
  productId: z.number().int().positive(),
  asinSku: z.string().min(1),
  productName: z.string().min(1),
  quantity: z.number().int().positive(),
  pointsPerItem: z.number().int().positive(),
  totalPoints: z.number().int().positive(),
});

export const shippingAddressSchema = z.object({
  name: z.string().min(1, "Name is required"),
  street: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "Zip code is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  addressType: z.enum(["Aadhaar", "Working", "HOME"]),
});

export const placeOrderSchema = z.object({
  userId: z.number().int().positive(),
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
  shippingAddress: shippingAddressSchema,
});

export const physicalRedemptionSchema = z.object({
  userId: z.number().int().positive(),
  rewardId: z.number().int().positive(),
  quantity: z.number().int().positive().default(1),
  shippingAddress: shippingAddressSchema,
});

export const ticketSchema = z.object({
  orderId: z.string().min(1),
  productId: z.number().int().positive().optional(),
  asinSku: z.string().optional(),
  reason: z.string().min(1, "Reason is required"),
  requestType: z.enum(["RETURN", "REPLACEMENT", "ISSUE"]),
});

export const statusUpdateSchema = z.object({
  status: z.string().min(1, "Status is required"),
  notes: z.string().optional(),
});