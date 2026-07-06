const { calculateFinalPrice } = require('../services/pricingService');

describe('Pricing Service - Fiyat ve Kupon Hesaplamaları', () => {
  it('İndirimsiz standart fiyatı doğru hesaplamalı', () => {
    const basePrice = 100;
    const result = calculateFinalPrice(basePrice, null, 0);
    expect(result.finalPrice).toBe(100);
    expect(result.discountAmount).toBe(0);
  });

  it('Yüzde bazlı kupon indirimini doğru hesaplamalı', () => {
    const basePrice = 200;
    const coupon = { discountType: 'PERCENTAGE', discountValue: 20 }; // %20 indirim
    const result = calculateFinalPrice(basePrice, coupon, 0);
    
    expect(result.finalPrice).toBe(160);
    expect(result.discountAmount).toBe(40);
  });

  it('Sabit tutar bazlı kupon indirimini doğru hesaplamalı', () => {
    const basePrice = 150;
    const coupon = { discountType: 'FIXED', discountValue: 50 }; // 50 TL indirim
    const result = calculateFinalPrice(basePrice, coupon, 0);
    
    expect(result.finalPrice).toBe(100);
    expect(result.discountAmount).toBe(50);
  });

  it('Kupon indirimi toplam tutardan fazla olamaz', () => {
    const basePrice = 40;
    const coupon = { discountType: 'FIXED', discountValue: 50 }; // 50 TL indirim
    const result = calculateFinalPrice(basePrice, coupon, 0);
    
    expect(result.finalPrice).toBe(0); // Fiyat eksiye düşemez
    expect(result.discountAmount).toBe(40);
  });
});
