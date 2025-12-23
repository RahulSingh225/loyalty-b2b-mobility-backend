import { Request, Response } from 'express';
import { TdsService } from '../services/tdsService';
import { success, error as errorResponse } from '../utils/response';

const tdsService = new TdsService();

export const TdsController = {
  /**
   * Get TDS summary for authenticated user
   */
  async getUserTdsSummary(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const summary = await tdsService.getUserTdsSummary(userId);
      return res.json(success(summary, 'TDS summary retrieved'));
    } catch (err) {
      return res.status(500).json(errorResponse('Failed to retrieve TDS summary', err));
    }
  },

  /**
   * Get detailed TDS history for user
   */
  async getUserTdsHistory(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;

      const history = await tdsService.getUserTdsHistory(userId, {
        page,
        pageSize,
      });

      return res.json(success(history, 'TDS history retrieved'));
    } catch (err) {
      return res.status(500).json(errorResponse('Failed to retrieve TDS history', err));
    }
  },

  /**
   * [ADMIN] Get TDS records by financial year
   */
  async getTdsRecordsByFy(req: Request, res: Response) {
    try {
      const { financialYear } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 50;

      const records = await tdsService.getTdsRecordsByFy(financialYear, {
        page,
        pageSize,
      });

      return res.json(success(records, `TDS records for FY ${financialYear}`));
    } catch (err) {
      return res.status(500).json(errorResponse('Failed to retrieve TDS records', err));
    }
  },

  /**
   * [ADMIN] Get TDS records by status
   */
  async getTdsRecordsByStatus(req: Request, res: Response) {
    try {
      const { status } = req.params;
      const validStatuses = ['active', 'settled', 'reverted'];

      if (!validStatuses.includes(status)) {
        return res.status(400).json(
          errorResponse(`Invalid status. Must be one of: ${validStatuses.join(', ')}`)
        );
      }

      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 50;

      const records = await tdsService.getTdsRecordsByStatus(
        status as any,
        { page, pageSize }
      );

      return res.json(success(records, `TDS records with status: ${status}`));
    } catch (err) {
      return res.status(500).json(errorResponse('Failed to retrieve TDS records', err));
    }
  },

  /**
   * [ADMIN] Get global TDS statistics
   */
  async getGlobalTdsStats(req: Request, res: Response) {
    try {
      const stats = await tdsService.getGlobalTdsStats();
      return res.json(success(stats, 'Global TDS statistics retrieved'));
    } catch (err) {
      return res.status(500).json(errorResponse('Failed to retrieve TDS statistics', err));
    }
  },

  /**
   * [ADMIN] Audit specific user's TDS records
   */
  async auditUserTds(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const audit = await tdsService.auditUserTds(parseInt(userId));
      return res.json(success(audit, `TDS audit trail for user ${userId}`));
    } catch (err) {
      return res.status(500).json(errorResponse('Failed to retrieve TDS audit', err));
    }
  },

  /**
   * [ADMIN] Trigger FY reset (April 1st)
   * Request body: { previousFy: "2023-2024", newFy: "2024-2025" }
   */
  async triggerFyReset(req: Request, res: Response) {
    try {
      const { previousFy, newFy } = req.body;

      if (!previousFy || !newFy) {
        return res.status(400).json(
          errorResponse('Missing required fields: previousFy, newFy')
        );
      }

      const result = await tdsService.performFyReset(previousFy, newFy);

      return res.json(success(result, `FY reset completed: ${previousFy} → ${newFy}`));
    } catch (err) {
      return res.status(500).json(errorResponse('Failed to perform FY reset', err));
    }
  },
};
