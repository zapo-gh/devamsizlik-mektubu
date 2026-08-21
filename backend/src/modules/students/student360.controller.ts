import { Request, Response, NextFunction } from 'express';
import { student360Service } from './student360.service';

export class Student360Controller {
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await student360Service.getById(req.params.id) });
    } catch (error) {
      next(error);
    }
  }
}

export const student360Controller = new Student360Controller();
