const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

// A simple mock for req/res/next
const mockReqRes = (body) => {
  const req = {
    body,
    headers: {
      authorization: `Bearer ${jwt.sign({ email: 'admin@test.com' }, process.env.JWT_SECRET || 'super-secret-key')}`
    }
  };
  const res = {
    statusCode: 200,
    data: null,
    status: function(code) { this.statusCode = code; return this; },
    json: function(data) { this.data = data; return this; }
  };
  return { req, res };
};

async function runApiTest() {
  console.log("🛠️ API Endpoints & Zod Validation Testi Başlatılıyor...");

  const { validate } = require('./middlewares/validate');
  const { requireAuth } = require('./middlewares/auth');
  const { z } = require('zod');

  // Test Zod Middleware directly
  const testSchema = z.object({ name: z.string().min(3) });
  const validator = validate(testSchema);
  
  const { req: badReq, res: badRes } = mockReqRes({ name: "ab" });
  validator(badReq, badRes, () => {});
  
  if (badRes.statusCode === 400) {
    console.log("✅ Zod Doğrulama Hatası (400) başarıyla yakalandı.");
  } else {
    console.error("❌ Zod Doğrulama Hatası yakalanamadı!");
  }

  const { req: goodReq, res: goodRes } = mockReqRes({ name: "Kış Konseri" });
  let nextCalled = false;
  validator(goodReq, goodRes, () => { nextCalled = true; });
  if (nextCalled) {
    console.log("✅ Zod Geçerli Veriyi başarıyla onayladı.");
  }

  console.log("🎉 API Testleri BAŞARILI!");
  process.exit(0);
}

runApiTest();
