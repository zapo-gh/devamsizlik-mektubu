import { Request, Response, NextFunction } from 'express';
import { generateTebligPdf, TebligData } from './tebligPdf.generator';

class TebligController {
  async generatePdf(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body as TebligData;
      if (!data.adiSoyadi || !data.adiSoyadi.trim()) {
        return res.status(400).json({ success: false, message: 'Adı Soyadı zorunludur.' });
      }

      const pdfBuffer = await generateTebligPdf(data);
      const safeName = data.adiSoyadi.replace(/[^\w\s]/g, '_').trim().replace(/\s+/g, '-');
      const fileName = `teblig-tebellug-${safeName}.pdf`;

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Content-Length': String(pdfBuffer.length),
      });
      res.send(pdfBuffer);
    } catch (err) {
      next(err);
    }
  }
}

export const tebligController = new TebligController();
