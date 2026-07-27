/**
 * Approval Service
 * Etkinlik kapasitesi hesaplama ve onay kararı verme işlemlerini yönetir.
 */

/**
 * Etkinliğin onay durumunu hesaplar.
 * @param {Object} event - Etkinlik bilgileri (capacity, isSeated vb.)
 * @param {Object} hallLayout - Etkinliğe bağlı salonun düzeni (JSON parse edilmiş hali)
 * @returns {Object} { effectiveCapacity, approvalStatus }
 */
function evaluateApprovalRequirement(event, hallLayout) {
  let effectiveCapacity = 0;

  // 1. Kapasiteyi Hesapla
  if (event.isSeated && hallLayout && hallLayout.elements) {
    // Salon planından koltuk sayısını çıkar
    effectiveCapacity = hallLayout.elements.filter(
      (el) => el.type === 'seat' || el.type === 'chair'
    ).length;
  } else {
    // Genel giriş
    effectiveCapacity = event.capacity || 0;
  }

  // 2. Onay durumunu belirle
  const limit = parseInt(process.env.APPROVAL_CAPACITY_LIMIT || '50', 10);
  
  let approvalStatus = 'NOT_REQUIRED';
  if (effectiveCapacity > limit) {
    approvalStatus = 'PENDING_APPROVAL';
  }

  return { effectiveCapacity, approvalStatus };
}

module.exports = {
  evaluateApprovalRequirement
};
