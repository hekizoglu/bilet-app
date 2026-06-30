const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runTest() {
  console.log("🛠️ Test başlatılıyor...");

  try {
    // 1. Yeni bir ayar ekle (veya varsa güncelle)
    const setting = await prisma.setting.upsert({
      where: { key: "APP_NAME" },
      update: { value: "Bilet Uygulaması v2" },
      create: { key: "APP_NAME", value: "Bilet Uygulaması v2" }
    });
    console.log("✅ Ayar kaydedildi:", setting);

    // 2. Koltuksuz (Genel Giriş) bir etkinlik oluştur
    const newEvent = await prisma.event.create({
      data: {
        name: "Yaz Konseri (Test)",
        date: new Date(),
        price: 150.50,
        status: "Aktif",
        isSeated: false,
        capacity: 500
      }
    });
    console.log("✅ Etkinlik başarıyla oluşturuldu:", newEvent.name);

    // 3. Veritabanından etkinlikleri çek
    const allEvents = await prisma.event.findMany();
    console.log(`✅ Veritabanında toplam ${allEvents.length} etkinlik bulundu.`);

    console.log("🎉 Test BAŞARILI!");
  } catch (error) {
    console.error("❌ Test BAŞARISIZ:", error);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
