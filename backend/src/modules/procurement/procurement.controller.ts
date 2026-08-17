import { Request, Response } from 'express';
import prisma from '../shared/utils/prisma';
import { v4 as uuidv4 } from 'uuid';

export const procurementController = {
  // Liste Getir
  getAll: async (req: Request, res: Response) => {
    try {
      const list = await prisma.$queryRaw`
        SELECT 
          p.*,
          (SELECT COUNT(*) FROM "ProcurementItem" WHERE "procurementId" = p."id") as itemCount,
          (SELECT COUNT(DISTINCT "supplierId") FROM "ProcurementOffer" WHERE "procurementId" = p."id") as supplierCount
        FROM "Procurement" p
        ORDER BY p."createdAt" DESC
      `;
      res.json({ success: true, data: list });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Tekil Detay Getir (Item'lar ve Offer'lar dahil)
  getById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const procurement: any = await prisma.$queryRaw`SELECT * FROM "Procurement" WHERE "id" = ${id} LIMIT 1`;
      if (!procurement || procurement.length === 0) {
        return res.status(404).json({ success: false, message: 'Bulunamadı' });
      }

      const items: any = await prisma.$queryRaw`SELECT * FROM "ProcurementItem" WHERE "procurementId" = ${id}`;
      
      const offers: any = await prisma.$queryRaw`
        SELECT o.*, s."name" as supplierName, s."taxNumber"
        FROM "ProcurementOffer" o
        LEFT JOIN "Supplier" s ON s."id" = o."supplierId"
        WHERE o."procurementId" = ${id}
      `;

      // commissionMembers string ise parse et
      let parsedCommission = [];
      try {
        if (procurement[0].commissionMembers) {
          parsedCommission = JSON.parse(procurement[0].commissionMembers);
        }
      } catch (e) {
        // parse error
      }

      res.json({ 
        success: true, 
        data: {
          ...procurement[0],
          commissionMembers: parsedCommission,
          items,
          offers
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Yeni Doğrudan Temin
  create: async (req: Request, res: Response) => {
    try {
      const { title, date, academicYear, procedureType, status, commissionMembers, items, offers } = req.body;
      const procurementId = uuidv4();

      let estimatedCost = 0;
      if (items && Array.isArray(items)) {
         estimatedCost = items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.estimatedUnitPrice || 0)), 0);
      }

      const commString = commissionMembers ? JSON.stringify(commissionMembers) : null;
      const type = procedureType || '22/d';
      const stat = status || 'ONAY_BEKLIYOR';

      await prisma.$executeRaw`
        INSERT INTO "Procurement" ("id", "title", "date", "procedureType", "status", "academicYear", "estimatedCost", "commissionMembers")
        VALUES (${procurementId}, ${title}, ${date}, ${type}, ${stat}, ${academicYear}, ${estimatedCost}, ${commString})
      `;

      // Kalemler ve Teklifler Ekleme
      const itemMap = new Map<string, string>(); // Temp ID'den Gerçek ID'ye
      
      if (items && items.length > 0) {
        for (const item of items) {
          const realItemId = uuidv4();
          itemMap.set(item.id || item.tempId, realItemId);
          await prisma.$executeRaw`
            INSERT INTO "ProcurementItem" ("id", "procurementId", "name", "quantity", "unit", "estimatedUnitPrice")
            VALUES (${realItemId}, ${procurementId}, ${item.name}, ${Number(item.quantity)}, ${item.unit || 'Adet'}, ${Number(item.estimatedUnitPrice || 0)})
          `;
        }
      }

      if (offers && offers.length > 0) {
        for (const offer of offers) {
          const mappedItemId = itemMap.get(offer.itemId || offer.tempItemId) || offer.itemId;
          if (mappedItemId) {
            const offerId = uuidv4();
            await prisma.$executeRaw`
              INSERT INTO "ProcurementOffer" ("id", "procurementId", "itemId", "supplierId", "offeredPrice", "isWinner")
              VALUES (${offerId}, ${procurementId}, ${mappedItemId}, ${offer.supplierId}, ${Number(offer.offeredPrice)}, ${offer.isWinner ? 1 : 0})
            `;
          }
        }
      }

      res.json({ success: true, message: 'Doğrudan Temin başarıyla oluşturuldu.', data: { id: procurementId } });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Güncelleme
  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { title, date, procedureType, status, academicYear, commissionMembers, items, offers } = req.body;

      let estimatedCost = 0;
      if (items && Array.isArray(items)) {
         estimatedCost = items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.estimatedUnitPrice || 0)), 0);
      }

      const commString = commissionMembers ? JSON.stringify(commissionMembers) : null;
      const type = procedureType || '22/d';
      const stat = status || 'ONAY_BEKLIYOR';

      await prisma.$executeRaw`
        UPDATE "Procurement"
        SET "title" = ${title}, "date" = ${date}, "procedureType" = ${type}, 
            "status" = ${stat}, "academicYear" = ${academicYear}, "estimatedCost" = ${estimatedCost}, 
            "commissionMembers" = ${commString}
        WHERE "id" = ${id}
      `;

      // Eskileri Sil (Cascade silinebilirdi ama executeRaw kullanıyoruz diye manuel siliyoruz)
      await prisma.$executeRaw`DELETE FROM "ProcurementOffer" WHERE "procurementId" = ${id}`;
      await prisma.$executeRaw`DELETE FROM "ProcurementItem" WHERE "procurementId" = ${id}`;

      // Kalemler ve Teklifleri Yeniden Ekle
      const itemMap = new Map<string, string>(); 
      
      if (items && items.length > 0) {
        for (const item of items) {
          const realItemId = uuidv4();
          itemMap.set(item.id || item.tempId, realItemId);
          await prisma.$executeRaw`
            INSERT INTO "ProcurementItem" ("id", "procurementId", "name", "quantity", "unit", "estimatedUnitPrice")
            VALUES (${realItemId}, ${id}, ${item.name}, ${Number(item.quantity)}, ${item.unit || 'Adet'}, ${Number(item.estimatedUnitPrice || 0)})
          `;
        }
      }

      if (offers && offers.length > 0) {
        for (const offer of offers) {
          const mappedItemId = itemMap.get(offer.itemId || offer.tempItemId) || offer.itemId;
          if (mappedItemId) {
            const offerId = uuidv4();
            await prisma.$executeRaw`
              INSERT INTO "ProcurementOffer" ("id", "procurementId", "itemId", "supplierId", "offeredPrice", "isWinner")
              VALUES (${offerId}, ${id}, ${mappedItemId}, ${offer.supplierId}, ${Number(offer.offeredPrice)}, ${offer.isWinner ? 1 : 0})
            `;
          }
        }
      }

      res.json({ success: true, message: 'Doğrudan Temin başarıyla güncellendi.' });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Silme
  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await prisma.$executeRaw`DELETE FROM "ProcurementOffer" WHERE "procurementId" = ${id}`;
      await prisma.$executeRaw`DELETE FROM "ProcurementItem" WHERE "procurementId" = ${id}`;
      await prisma.$executeRaw`DELETE FROM "Procurement" WHERE "id" = ${id}`;
      res.json({ success: true, message: 'Silindi' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};
