const request = require('supertest');
const { app } = require('../../index');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

describe('Events API Endpoints', () => {
  let adminToken;
  let customerToken;
  let testEventId;
  let testHall;

  beforeAll(async () => {
    process.env.JWT_SECRET = JWT_SECRET;

    adminToken = jwt.sign(
      { email: 'admin@test.com', role: 'ADMIN' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    customerToken = jwt.sign(
      { email: 'customer@test.com', role: 'CUSTOMER' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

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
