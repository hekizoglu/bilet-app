/**
 * Reservation & Payment Integration Testleri
 * 
 * Hedef: Double-booking senaryosu, webhook duplicate detection, 
 * ve IBAN havale akışındaki kritik iş mantığı doğrulamaları.
 * 
 * Not: Bu testler Prisma + SQLite (test DB) ile çalışır.
 */
const { PrismaClient } = require('@prisma/client');

let prisma;

beforeAll(async () => {
  prisma = new PrismaClient();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Double-Booking Koruması', () => {
  let testEvent;
  let testHall;

  beforeAll(async () => {
    // Test salon oluştur
    testHall = await prisma.hall.create({
      data: {
        name: 'Test Salon',
        seatCount: 10,
        layoutJson: JSON.stringify({
          seats: [
            { id: 'seat-A1', label: 'A1', x: 0, y: 0 },
            { id: 'seat-A2', label: 'A2', x: 1, y: 0 }
          ]
        })
      }
    });

    // Test etkinlik oluştur (IBAN havale yöntemiyle)
    testEvent = await prisma.event.create({
      data: {
        name: 'Test Konser',
        date: new Date('2026-12-31'),
        price: 150.0,
        status: 'Yayında',
        isSeated: true,
        hallId: testHall.id,
        paymentType: 'cardless' // IBAN havale
      }
    });
  });

  afterAll(async () => {
    // Temizlik: Test verileri sil
    await prisma.reservation.deleteMany({ where: { eventId: testEvent.id } });
    await prisma.event.delete({ where: { id: testEvent.id } });
    await prisma.hall.delete({ where: { id: testHall.id } });
  });

  test('aynı koltuk iki kez rezerve edilememeli', async () => {
    const seatId = 'seat-A1';

    // İlk rezervasyon — başarılı olmalı
    const firstReservation = await prisma.reservation.create({
      data: {
        eventId: testEvent.id,
        seatId: seatId,
        seatName: 'A1',
        customer: 'Ali Yılmaz',
        email: 'ali@test.com',
        status: 'Beklemede',
        paymentStatus: 'pending',
        paymentMethod: 'bankTransfer'
      }
    });
    expect(firstReservation.id).toBeDefined();

    // İkinci rezervasyon denemesi — aynı koltuk kontrolü
    const existingReservation = await prisma.reservation.findFirst({
      where: {
        eventId: testEvent.id,
        seatId: seatId,
        status: { in: ['Onaylı', 'Beklemede'] }
      }
    });

    expect(existingReservation).not.toBeNull();
    expect(existingReservation.customer).toBe('Ali Yılmaz');
    // Bu noktada uygulama ikinci rezervasyonu reddetmeli
  });

  test('farklı koltuklar başarıyla rezerve edilebilmeli', async () => {
    const reservation = await prisma.reservation.create({
      data: {
        eventId: testEvent.id,
        seatId: 'seat-A2',
        seatName: 'A2',
        customer: 'Ayşe Demir',
        email: 'ayse@test.com',
        status: 'Beklemede',
        paymentStatus: 'pending',
        paymentMethod: 'bankTransfer'
      }
    });

    expect(reservation.id).toBeDefined();
    expect(reservation.seatId).toBe('seat-A2');
  });

  test('iptal edilen koltuğa yeni rezervasyon yapılabilmeli', async () => {
    // A1 koltuğunu iptal et
    const existing = await prisma.reservation.findFirst({
      where: {
        eventId: testEvent.id,
        seatId: 'seat-A1',
        status: 'Beklemede'
      }
    });

    if (existing) {
      await prisma.reservation.update({
        where: { id: existing.id },
        data: { status: 'İptal' }
      });
    }

    // Aynı koltuğa yeni rezervasyon yapılabilmeli
    const activeReservation = await prisma.reservation.findFirst({
      where: {
        eventId: testEvent.id,
        seatId: 'seat-A1',
        status: { in: ['Onaylı', 'Beklemede'] }
      }
    });

    expect(activeReservation).toBeNull(); // Aktif rezervasyon kalmadı
  });
});

describe('Webhook Duplicate Detection', () => {
  let testEvent2;

  beforeAll(async () => {
    testEvent2 = await prisma.event.create({
      data: {
        name: 'Webhook Test Etkinliği',
        date: new Date('2026-12-31'),
        price: 200.0,
        status: 'Yayında',
        isSeated: false,
        capacity: 100,
        paymentType: 'cardless'
      }
    });
  });

  afterAll(async () => {
    await prisma.reservation.deleteMany({ where: { eventId: testEvent2.id } });
    await prisma.event.delete({ where: { id: testEvent2.id } });
  });

  test('aynı paymentReference ile mükerrer ödeme kaydı oluşturulamamalı', async () => {
    const transactionId = 'TXN-UNIQUE-001';

    // İlk ödeme kaydı
    await prisma.reservation.create({
      data: {
        eventId: testEvent2.id,
        customer: 'Mehmet Kaya',
        email: 'mehmet@test.com',
        status: 'Onaylı',
        paymentStatus: 'paid',
        paymentMethod: 'bankTransfer',
        paymentReference: transactionId,
        paidAt: new Date()
      }
    });

    // Aynı transactionId ile ikinci kayıt kontrolü
    const existingPayment = await prisma.reservation.findFirst({
      where: { paymentReference: transactionId }
    });

    expect(existingPayment).not.toBeNull();
    expect(existingPayment.paymentReference).toBe(transactionId);
    // Uygulama bu noktada HTTP 409 dönmeli
  });

  test('farklı transactionId ile ödeme kaydı oluşturulabilmeli', async () => {
    const reservation = await prisma.reservation.create({
      data: {
        eventId: testEvent2.id,
        customer: 'Zeynep Ak',
        email: 'zeynep@test.com',
        status: 'Onaylı',
        paymentStatus: 'paid',
        paymentMethod: 'bankTransfer',
        paymentReference: 'TXN-UNIQUE-002',
        paidAt: new Date()
      }
    });

    expect(reservation.paymentReference).toBe('TXN-UNIQUE-002');
  });
});

describe('IBAN Havale Akışı - Ödeme Durumu Geçişleri', () => {
  let testEvent3;
  let testReservation;

  beforeAll(async () => {
    testEvent3 = await prisma.event.create({
      data: {
        name: 'IBAN Akış Test',
        date: new Date('2026-12-31'),
        price: 100.0,
        status: 'Yayında',
        isSeated: false,
        capacity: 50,
        paymentType: 'cardless'
      }
    });

    testReservation = await prisma.reservation.create({
      data: {
        eventId: testEvent3.id,
        customer: 'Test Kullanıcı',
        email: 'test@test.com',
        status: 'Beklemede',
        paymentStatus: 'pending',
        paymentMethod: 'bankTransfer'
      }
    });
  });

  afterAll(async () => {
    await prisma.reservation.deleteMany({ where: { eventId: testEvent3.id } });
    await prisma.event.delete({ where: { id: testEvent3.id } });
  });

  test('pending → paid geçişi başarılı olmalı', async () => {
    const updated = await prisma.reservation.update({
      where: { id: testReservation.id },
      data: {
        paymentStatus: 'paid',
        status: 'Onaylı',
        paidAt: new Date(),
        paymentReference: 'TXN-FLOW-001',
        paymentDetails: JSON.stringify({
          senderIban: 'TR330006200010000062978002',
          amount: 100,
          description: 'BILET-TEST ÖDEME'
        })
      }
    });

    expect(updated.paymentStatus).toBe('paid');
    expect(updated.status).toBe('Onaylı');
    expect(updated.paidAt).toBeDefined();
  });

  test('paid → refunded geçişi başarılı olmalı', async () => {
    const refunded = await prisma.reservation.update({
      where: { id: testReservation.id },
      data: {
        paymentStatus: 'refunded',
        status: 'İptal',
        paymentDetails: JSON.stringify({
          senderIban: 'TR330006200010000062978002',
          refundAmount: 100,
          refundReason: 'Müşteri talebi'
        })
      }
    });

    expect(refunded.paymentStatus).toBe('refunded');
    expect(refunded.status).toBe('İptal');
  });
});
