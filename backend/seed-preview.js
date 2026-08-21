/**
 * Önizleme (preview) verisi — yalnızca geliştirme amaçlı.
 * Çalıştırma: DATABASE_URL="file:./prisma/preview.db" node seed-preview.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const hallLayout = JSON.stringify({
  canvas: { width: 1000, height: 620, backgroundImage: '' },
  elements: [
    { id: 'stage-1', type: 'stage', label: 'Sahne', x: 320, y: 30, width: 360, height: 70 },
    { id: 't1', type: 'round_table', label: 'Masa 1', x: 200, y: 210, radius: 45, seatCount: 6, numberingType: 'table_and_seats' },
    { id: 't2', type: 'round_table', label: 'Masa 2', x: 460, y: 210, radius: 45, seatCount: 6, numberingType: 'table_and_seats' },
    { id: 't3', type: 'round_table', label: 'Masa 3', x: 720, y: 210, radius: 45, seatCount: 6, numberingType: 'table_and_seats' },
    { id: 'r1', type: 'rect_table', label: 'Bar Masası 1', x: 150, y: 430, width: 140, height: 60, seatCount: 6, numberingType: 'table_and_seats' },
    { id: 'r2', type: 'rect_table', label: 'Bar Masası 2', x: 640, y: 430, width: 140, height: 60, seatCount: 6, numberingType: 'table_and_seats' },
    { id: 'c1', type: 'chair', label: '1', x: 420, y: 420, width: 30, height: 30 },
    { id: 'c2', type: 'chair', label: '2', x: 470, y: 420, width: 30, height: 30 },
    { id: 'c3', type: 'chair', label: '3', x: 520, y: 420, width: 30, height: 30 },
    { id: 'c4', type: 'chair', label: '4', x: 570, y: 420, width: 30, height: 30 },
  ],
});

function daysFromNow(days, hour = 20, min = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, min, 0, 0);
  return d;
}

async function makeReservations(event, count) {
  for (let i = 0; i < count; i++) {
    await prisma.reservation.create({
      data: {
        eventId: event.id,
        customer: `Demo Katılımcı ${i + 1}`,
        email: `demo${i + 1}@example.com`,
        phone: '0555 000 00 00',
        status: 'Onaylı',
        paymentStatus: 'paid',
        paidAt: new Date(),
        paymentReference: `PAYMENT-PREVIEW-${i}`,
        ticketCode: `PREVIEW-${i}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      },
    });
  }
}

async function main() {
  // Temiz başlangıç (tekrar çalıştırılabilir)
  await prisma.reservation.deleteMany({ where: { email: { contains: 'demo' } } });
  await prisma.event.deleteMany({ where: { name: { contains: 'Preview' } } });
  await prisma.hall.deleteMany({ where: { name: 'Preview Grand Sahne' } });

  // 1) Salon
  const hall = await prisma.hall.create({
    data: {
      name: 'Preview Grand Sahne',
      description: 'Önizleme için örnek salon (3 masa + 2 bar masası + 4 koltuk)',
      seatCount: 28,
      calculatedSeatCount: 28,
      layoutJson: hallLayout,
      address: 'Kültür Park, İzmir',
      isGlobal: true,
    },
  });

  // 2) Etkinlikler
  const events = [
    {
      name: 'Preview Yaz Konseri: Anadolu Rüzgarı',
      description: 'Akustik gitar, bağlama ve keman eşliğinde unutulmaz bir yaz akşamı. Açık hava sahnesinde.',
      date: daysFromNow(2, 21, 0),
      price: 350,
      isSeated: true,
      hallId: hall.id,
      paymentType: 'cardless',
      capacity: null,
      sold: 18,
    },
    {
      name: 'Preview Stand-Up Gecesi: Kahkaha Garantili',
      description: 'Türkiye\'nin en komik stand-up sanatçıları tek sahnede. 18+ etkinlik.',
      date: daysFromNow(8, 20, 30),
      price: 200,
      isSeated: false,
      capacity: 120,
      paymentType: 'creditcard',
      sold: 60,
    },
    {
      name: 'Preview Ücretsiz Yoga & Meditasyon Şenliği',
      description: 'Şehir merkezinde açık hava yoga seansı. Matınızı getirin, güne enerjiyle başlayın!',
      date: daysFromNow(16, 9, 0),
      price: 0,
      isSeated: false,
      capacity: 50,
      paymentType: 'free',
      sold: 15,
    },
    {
      name: 'Preview Düğün Fuarı 2026',
      description: '50+ davetiye, salon, fotoğrafçı ve organizasyon firması tek çatı altında. Çiftlere özel indirimler!',
      date: daysFromNow(30, 10, 0),
      price: 100,
      isSeated: false,
      capacity: 500,
      paymentType: 'cardless',
      sold: 480,
    },
    {
      name: 'Preview Bağış Gecesi: Sessiz Açık Artırma',
      description: 'Sanatçıların bağışladığı eserler sessiz açık artırmada. Gelir, deprem bölgesindeki okullara gidecek.',
      date: daysFromNow(50, 19, 30),
      price: 500,
      isSeated: true,
      hallId: hall.id,
      paymentType: 'creditcard',
      capacity: null,
      sold: 26,
    },
    {
      name: 'Preview Yılbaşı Gala Gecesi',
      description: 'Canlı orkestra, kokteyl ve 2027\'ye birlikte giriş. Zarif kıyafet zorunludur.',
      date: daysFromNow(132, 21, 30),
      price: 750,
      isSeated: false,
      capacity: 200,
      paymentType: 'cardless',
      sold: 0,
    },
  ];

  for (const ev of events) {
    const created = await prisma.event.create({
      data: {
        name: ev.name,
        description: ev.description,
        date: ev.date,
        price: ev.price,
        status: 'Aktif',
        visibility: 'PUBLIC',
        isPubliclyListed: true,
        isSeated: ev.isSeated,
        capacity: ev.capacity,
        hallId: ev.hallId || null,
        paymentType: ev.paymentType,
        effectiveCapacity: ev.isSeated ? 28 : ev.capacity,
        approvalStatus: 'NOT_REQUIRED',
        organizerId: null,
      },
    });
    if (ev.sold > 0) {
      await makeReservations(created, ev.sold);
    }
    console.log(`✔ ${created.name} — ${ev.sold} satış`);
  }

  console.log('Önizleme verisi hazır: 1 salon + 6 etkinlik');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
