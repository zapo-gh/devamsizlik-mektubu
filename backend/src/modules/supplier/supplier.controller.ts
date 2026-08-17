import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../shared/utils/prisma';

export const supplierController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const suppliers = await prisma.$queryRaw`SELECT * FROM "Supplier" ORDER BY "name" ASC`;
      res.json({ success: true, data: suppliers });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const supplier: any = await prisma.$queryRaw`SELECT * FROM "Supplier" WHERE "id" = ${id}`;
      if (!supplier || supplier.length === 0) {
        return res.status(404).json({ success: false, message: 'Firma bulunamadı' });
      }
      res.json({ success: true, data: supplier[0] });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const { name, taxNumber, taxOffice, address, phone, email, iban, contactPerson, isActive } = req.body;
      const id = uuidv4();
      const status = isActive !== undefined ? isActive : true;
      
      await prisma.$executeRaw`
        INSERT INTO "Supplier" ("id", "name", "taxNumber", "taxOffice", "address", "phone", "email", "iban", "contactPerson", "isActive")
        VALUES (${id}, ${name}, ${taxNumber}, ${taxOffice}, ${address}, ${phone}, ${email}, ${iban}, ${contactPerson}, ${status})
      `;
      
      res.json({ success: true, message: 'Firma başarıyla eklendi', data: { id } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, taxNumber, taxOffice, address, phone, email, iban, contactPerson, isActive } = req.body;
      const status = isActive !== undefined ? isActive : true;

      await prisma.$executeRaw`
        UPDATE "Supplier" 
        SET "name" = ${name}, "taxNumber" = ${taxNumber}, "taxOffice" = ${taxOffice}, 
            "address" = ${address}, "phone" = ${phone}, "email" = ${email}, 
            "iban" = ${iban}, "contactPerson" = ${contactPerson}, "isActive" = ${status}
        WHERE "id" = ${id}
      `;
      
      res.json({ success: true, message: 'Firma başarıyla güncellendi' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await prisma.$executeRaw`DELETE FROM "Supplier" WHERE "id" = ${id}`;
      res.json({ success: true, message: 'Firma silindi' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};
