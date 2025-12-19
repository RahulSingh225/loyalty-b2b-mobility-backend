import { counterSales, electricians, redemptions, retailers, tickets } from "../schema";
import { BaseService } from "./baseService";

export const retailerService = new BaseService(retailers as any);
export const counterSalesService = new BaseService(counterSales as any);
export const electricianService = new BaseService(electricians as any);
export const redemptionService = new BaseService(redemptions as any);
export const ticketService = new BaseService(tickets as any);