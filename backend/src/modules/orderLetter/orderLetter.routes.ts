import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Tüm sipariş mektuplarını getir
router.get('/', async (req, res) => {
  try {
    const { academicYear } = req.query;
    const letters = await prisma.orderLetter.findMany({
      where: academicYear ? { academicYear: String(academicYear) } : undefined,
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: letters });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Yeni sipariş mektubu ekle
router.post('/', async (req, res) => {
  try {
    const { subject, supplierName, supplierAddress, date, deliveryDate, academicYear, items, notes, extraData } = req.body;
    const letter = await prisma.orderLetter.create({
      data: {
        subject,
        supplierName,
        supplierAddress,
        date,
        deliveryDate,
        academicYear,
        items: JSON.stringify(items || []),
        notes,
        extraData
      }
    });
    res.json({ success: true, data: letter });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Sipariş mektubu güncelle
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, supplierName, supplierAddress, date, deliveryDate, academicYear, items, notes, extraData } = req.body;
    const letter = await prisma.orderLetter.update({
      where: { id },
      data: {
        subject,
        supplierName,
        supplierAddress,
        date,
        deliveryDate,
        academicYear,
        items: typeof items === 'string' ? items : JSON.stringify(items || []),
        notes,
        extraData
      }
    });
    res.json({ success: true, data: letter });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Sipariş mektubu sil
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.orderLetter.delete({ where: { id } });
    res.json({ success: true, message: 'Silindi' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
