const request = require('supertest');
const { app } = require('../../index');
const { PrismaClient } = require('@prisma/client');
const { generateToken } = require('../../services/authService');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

describe('Events API Endpoints', () => {
  let adminToken;
  let customerToken;
  let testEventId;
  let testHall;

  beforeAll(async () => {
    process.env.JWT_SECRET = JWT_SECRET;

    // Create test users in DB
    await prisma.user.upsert({
      where: { email: 'admin@test.com' },
      update: { id: 'admin-1', role: 'ADMIN' },
      create: { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN', name: 'Admin Test' }
    });
    await prisma.user.upsert({
      where: { email: 'customer@test.com' },
      update: { id: 'customer-1', role: 'CUSTOMER' },
      create: { id: 'customer-1', email: 'customer@test.com', role: 'CUSTOMER', name: 'Customer Test' }
    });

    adminToken = generateToken({ id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' });
    customerToken = generateToken({ id: 'customer-1', email: 'customer@test.com', role: 'CUSTOMER' });

    // Create a hall for the seated events
    testHall = await prisma.hall.create({
      data: {
        name: 'Event Test Hall',
        seatCount: 50,
        layoutJson: JSON.stringify({ elements: [] })
      }
    });
  });

  afterAll(async () => {
    if (testEventId) {
      await prisma.event.delete({ where: { id: testEventId } }).catch(() => {});
    }
    if (testHall) {
      await prisma.hall.delete({ where: { id: testHall.id } }).catch(() => {});
    }
    await prisma.user.deleteMany({ where: { email: { in: ['admin@test.com', 'customer@test.com'] } } }).catch(() => {});
    await prisma.$disconnect();
  });

  test('POST /api/events - ADMIN veya ORGANIZER rolüyle etkinlik oluşturabilmeli', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);

    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Rock Konseri 2026',
        date: futureDate.toISOString(),
        price: 250,
        status: 'Taslak',
        isSeated: true,
        hallId: testHall.id,
        paymentType: 'creditcard',
        visibility: 'PUBLIC'
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Rock Konseri 2026');
    testEventId = res.body.id;
  });

  test('GET /api/events - Admin tüm etkinlikleri listeleyebilmeli', async () => {
    const res = await request(app)
      .get('/api/events')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/events/public - Herkes halka açık aktif etkinlikleri listeleyebilmeli', async () => {
    const res = await request(app)
      .get('/api/events/public');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
