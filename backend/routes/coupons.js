const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { requireAuth } = require('../middlewares/auth');
const z = require('zod');

// Admin yetki kontrolü middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
  }
  next();
};

const couponSchema = z.object({
  code: z.string().min(3),
  discountType: z.enum(['PERCENTAGE', 'FIXED']),
  discountValue: z.number().positive(),
  maxUses: z.number().int().positive().nullable().optional(),
  validUntil: z.string().nullable().optional(),
});

// GET /api/coupons (List for Admin)
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// POST /api/coupons (Create Coupon)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const data = couponSchema.parse(req.body);
    const existing = await prisma.coupon.findUnique({ where: { code: data.code } });
    
    if (existing) {
      return res.status(400).json({ error: "Bu kupon kodu zaten mevcut." });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: data.code,
        discountType: data.discountType,
        discountValue: data.discountValue,
        maxUses: data.maxUses,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
      }
    });

    res.json({ success: true, coupon });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Eksik veya hatalı veri", details: error.errors });
    }
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// DELETE /api/coupons/:id (Deactivate Coupon)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const coupon = await prisma.coupon.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });
    res.json({ success: true, message: "Kupon pasife alındı.", coupon });
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// POST /api/coupons/validate (Public)
router.post('/validate', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "Kupon kodu gerekli." });

    const coupon = await prisma.coupon.findUnique({ where: { code } });
    if (!coupon) return res.status(404).json({ error: "Geçersiz kupon kodu." });

    if (!coupon.isActive) {
      return res.status(400).json({ error: "Bu kupon artık aktif değil." });
    }

    if (coupon.validUntil && new Date(coupon.validUntil) < new Date()) {
      return res.status(400).json({ error: "Bu kuponun süresi dolmuş." });
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return res.status(400).json({ error: "Bu kuponun kullanım limiti dolmuş." });
    }

    res.json({
      success: true,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue
    });
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

module.exports = router;
