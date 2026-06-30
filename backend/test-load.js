// test-load.js
// 1000 eşzamanlı rezervasyon simülasyonu
const http = require('http');

const NUM_REQUESTS = 1000;
let successCount = 0;
let failCount = 0;
let rateLimitCount = 0;

console.log(`🛠️ Yük Testi Başlatılıyor: ${NUM_REQUESTS} eşzamanlı istek (Rate Limiter aktif)`);

const makeRequest = () => {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      eventId: "e320f326-dummy-uuid",
      customer: "Stres Test",
      email: "stres@example.com"
    });

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/reservations',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 201) successCount++;
        else if (res.statusCode === 429) rateLimitCount++; // Too Many Requests
        else failCount++;
        resolve();
      });
    });

    req.on('error', (e) => {
      failCount++;
      resolve();
    });

    req.write(postData);
    req.end();
  });
};

async function run() {
  const promises = [];
  for (let i = 0; i < NUM_REQUESTS; i++) {
    promises.push(makeRequest());
  }

  await Promise.all(promises);

  console.log('--- TEST SONUÇLARI ---');
  console.log(`Başarılı (201): ${successCount}`);
  console.log(`Rate-Limit Engeli (429): ${rateLimitCount}`);
  console.log(`Hatalı (Diğer): ${failCount}`);
  
  if (rateLimitCount > 0) {
    console.log("✅ DDoS Koruması Başarılı! Fazla istekler engellendi.");
  } else {
    console.log("❌ Rate Limiter devreye girmedi.");
  }
}

run();
