import { Request, Response } from 'express';
import { dashboardService } from './dashboard.service';

export const dashboardController = {
  async getSummary(_req: Request, res: Response) {
    const data = await dashboardService.getSummary();
    res.json({ success: true, data });
  },
};
