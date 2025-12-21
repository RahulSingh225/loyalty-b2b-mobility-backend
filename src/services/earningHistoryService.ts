import { BaseService } from './baseService';
import { counterSalesLedger, counterSalesTransactions, electricianLedger, electricianTransactions, retailerLedger, retailerTransactions } from '../schema';
import { desc } from 'drizzle-orm';
import { PaginationOptions } from './baseService';

class EarningHistoryService {
  async getCounterSalesEarningHistory(userId: number, opts: PaginationOptions = {}) {
    const service = new BaseService(counterSalesTransactions as any);
    const { page = 1, pageSize = 20 } = opts;
    const result = await service.findManyPaginated(
      { userId },
      { page, pageSize, orderBy: desc(counterSalesTransactions.createdAt) }
    );
    return result;
  }

  async getElectricianEarningHistory(userId: number, opts: PaginationOptions = {}) {
    const service = new BaseService(electricianTransactions as any);
    const { page = 1, pageSize = 20 } = opts;
    const result = await service.findManyPaginated(
      { userId },
      { page, pageSize, orderBy: desc(electricianTransactions.createdAt) }
    );
    return result;
  }

  async getRetailerEarningHistory(userId: number, opts: PaginationOptions = {}) {
    const service = new BaseService(retailerTransactions as any);
    const { page = 1, pageSize = 20 } = opts;
    const result = await service.findManyPaginated(
      { userId },
      { page, pageSize, orderBy: desc(retailerTransactions.createdAt) }
    );
    return result;
  }

  async getEarningDetail(transactionId: number, userType: 'counter_sales' | 'electrician' | 'retailer' = 'counter_sales') {
    let table;
    if (userType === 'electrician') {
      table = electricianTransactions;
    } else if (userType === 'retailer') {
      table = retailerTransactions;
    } else {
      table = counterSalesTransactions;
    }
    const service = new BaseService(table as any);
    const [record] = await service.findOne({ id: transactionId });
    return record;
  }
  async getPassbook(userId: number) {
    // For simplicity, let's assume passbook is a summary of total earnings
    const counterSalesService = new BaseService(counterSalesLedger as any);
    const electricianService = new BaseService(electricianLedger as any);
    const retailerService = new BaseService(retailerLedger as any);

   
}

export const earningHistoryService = new EarningHistoryService();
