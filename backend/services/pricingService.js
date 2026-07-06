function calculateFinalPrice(basePrice, coupon, loyaltyPointsUsed = 0) {
  let finalPrice = basePrice;
  let discountAmount = 0;

  if (coupon) {
    if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = (basePrice * coupon.discountValue) / 100;
    } else {
      discountAmount = coupon.discountValue;
    }
    finalPrice = Math.max(0, basePrice - discountAmount);
  }

  // Sadakat puanı vs ileride buraya eklenebilir
  if (loyaltyPointsUsed > 0) {
    const pointDiscount = loyaltyPointsUsed; // 1 point = 1 TL varsayımı
    finalPrice = Math.max(0, finalPrice - pointDiscount);
    discountAmount += Math.min(finalPrice + pointDiscount, pointDiscount); // ne kadarı gerçekten indirdi
  }

  return {
    finalPrice,
    discountAmount
  };
}

module.exports = {
  calculateFinalPrice
};
