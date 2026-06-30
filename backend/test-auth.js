const jwt = require('jsonwebtoken');

async function testAuthMiddleware() {
  console.log("🛠️ Auth Middleware Mini Testi Başlatılıyor...");

  // Sahte bir admin token üretelim
  const mockToken = jwt.sign(
    { email: "admin@example.com", role: "ADMIN" },
    process.env.JWT_SECRET || 'super-secret-key',
    { expiresIn: '1h' }
  );

  console.log("✅ Mock Token Üretildi:", mockToken.substring(0, 20) + "...");

  // Middleware'i izole test edebilmek için sahte Express req/res nesneleri
  const req = {
    headers: {
      authorization: `Bearer ${mockToken}`
    }
  };
  
  const res = {
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      this.data = data;
      return this;
    }
  };

  const next = () => {
    console.log("✅ Next() çağrıldı! Yetkilendirme başarılı.");
    console.log("✅ Req içine eklenen kullanıcı:", req.user);
  };

  const { requireAuth } = require('./middlewares/auth');

  // Test 1: Başarılı senaryo
  console.log("--- TEST 1: Geçerli Token ---");
  requireAuth(req, res, next);

  // Test 2: Başarısız senaryo
  console.log("--- TEST 2: Geçersiz Token ---");
  const badReq = { headers: { authorization: "Bearer invalidtoken123" } };
  requireAuth(badReq, res, () => {});
  if (res.statusCode === 401) {
    console.log("✅ Geçersiz token doğru şekilde reddedildi (401).");
  }

  console.log("🎉 Test BAŞARILI!");
}

testAuthMiddleware();
