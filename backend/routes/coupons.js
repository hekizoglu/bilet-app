const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { requireAuth } = require('../middlewares/auth');
const z = require('zod');
const { createRateLimiter } = require('../utils/rateLimiter');

const couponLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 5, // Aynı IP'den 15 dakikada en fazla 5 kupon denemesi (Brute-force koruması)
  message: { error: "Çok fazla kupon denemesi yaptınız, lütfen 15 dakika bekleyin." }
});

const requireAdminOrOrganizer = (req, res, next) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'ORGANIZER') {
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
}).refine(data => {
  if (data.discountType === 'PERCENTAGE' && data.discountValue > 100) return false;
  return true;
}, { message: "Yüzdelik indirim 100'den büyük olamaz." });

// GET /api/coupons (List for Admin/Organizer)
router.get('/', requireAuth, requireAdminOrOrganizer, async (req, res) => {
  try {
    const whereClause = req.user.role === 'ADMIN' ? {} : { organizerId: req.user.id };
    const coupons = await prisma.coupon.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// POST /api/coupons (Create Coupon)
router.post('/', requireAuth, requireAdminOrOrganizer, async (req, res) => {
  try {
    const data = couponSchema.parse(req.body);
    const codeUpper = data.code.trim().toUpperCase();
    
    const existing = await prisma.coupon.findUnique({ where: { code: codeUpper } });
    
    if (existing) {
      return res.status(400).json({ error: "Bu kupon kodu zaten mevcut." });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: codeUpper,
        discountType: data.discountType,
        discountValue: data.discountValue,
        maxUses: data.maxUses,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        organizerId: req.user.role === 'ADMIN' ? null : req.user.id
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
router.delete('/:id', requireAuth, requireAdminOrOrganizer, async (req, res) => {
  try {
    const existing = await prisma.coupon.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Kupon bulunamadı." });

    if (req.user.role === 'ORGANIZER' && existing.organizerId !== req.user.id) {
      return res.status(403).json({ error: "Bu işlem için yetkiniz yok." });
    }

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
router.post('/validate', couponLimiter, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "Kupon kodu gerekli." });

    const codeUpper = code.trim().toUpperCase();

    const coupon = await prisma.coupon.findUnique({ where: { code: codeUpper } });
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
