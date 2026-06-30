const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runE2E() {
  console.log("🛠️ E2E Test Başlatılıyor: Rezervasyon -> Onay -> Check-in");

  try {
    // 1. Etkinlik Oluştur
    const event = await prisma.event.create({
      data: {
        name: "E2E Test Etkinliği",
        date: new Date(),
        price: 150,
        isSeated: false,
        capacity: 100
      }
    });
    console.log("✅ Etkinlik oluşturuldu: " + event.id);

    // 2. Müşteri Rezervasyonu
    const reservation = await prisma.reservation.create({
      data: {
        eventId: event.id,
        customer: "Test Kullanıcısı",
        email: "test@example.com"
      }
    });
    console.log("✅ Rezervasyon yapıldı. Status: " + reservation.status);

    // 3. Admin Onayı
    const approved = await prisma.reservation.update({
      where: { id: reservation.id },
      data: { status: "Onaylı" }
    });
    console.log("✅ Bilet Onaylandı! Bilet Kodu: " + approved.ticketCode);

    // 4. Kapıda Check-in
    const checkin = await prisma.reservation.update({
      where: { ticketCode: approved.ticketCode },
      data: { isUsed: true, usedAt: new Date() }
    });
    console.log("✅ Kapı Check-in yapıldı. isUsed: " + checkin.isUsed);

    console.log("🎉 E2E Senaryosu Başarıyla Tamamlandı!");
  } catch (error) {
    console.error("❌ E2E Test Hatası:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runE2E();
