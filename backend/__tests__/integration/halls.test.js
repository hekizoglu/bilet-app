const request = require('supertest');
const { app } = require('../../index');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

describe('Halls API Endpoints', () => {
  let adminToken;
  let customerToken;
  let testHallId;

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
  });

  afterAll(async () => {
    if (testHallId) {
      await prisma.hall.delete({ where: { id: testHallId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  test('POST /api/halls - ADMIN rolü ile salon oluşturabilmeli', async () => {
    const res = await request(app)
      .post('/api/halls')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Gala Salonu',
        seatCount: 120,
        layoutJson: JSON.stringify({ elements: [] }),
        address: 'İstanbul, Türkiye'
      });

    if (res.status !== 201) console.log(res.body);
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Gala Salonu');
    testHallId = res.body.id;
  });

  test('POST /api/halls - CUSTOMER rolü ile kendi salonunu oluşturabilmeli (201)', async () => {
    const res = await request(app)
      .post('/api/halls')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        name: 'Müşteri Salonu',
        seatCount: 50,
        layoutJson: JSON.stringify({ elements: [] })
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Müşteri Salonu');
  });

  test('GET /api/halls - Salonları listeleyebilmeli', async () => {
    const res = await request(app)
      .get('/api/halls')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('GET /api/halls/:id - Salon detayını getirebilmeli', async () => {
    const res = await request(app)
      .get(`/api/halls/${testHallId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Gala Salonu');
  });

  test('POST /api/halls/:id/clone - Salonu kopyalayabilmeli', async () => {
    const res = await request(app)
      .post(`/api/halls/${testHallId}/clone`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(201);
    expect(res.body.name).toContain('Kopya');

    // Kopya salonu temizle
    await prisma.hall.delete({ where: { id: res.body.id } });
  });
});
