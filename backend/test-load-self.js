// test-load-self.js — Sunucuyu process içinde başlatıp yük testi yapar (CI/CD uyumlu)
require('dotenv').config();
const http = require('http');

// Sunucu başlatma: express app'i dinamik import et
process.env.PORT = '5099'; // Çakışmayı önlemek için ayrı port

const NUM_REQUESTS = 200; // 200 eşzamanlı istek (tek process içinde)
let successCount = 0;
let failCount = 0;
let rateLimitCount = 0;
let authDeniedCount = 0;

let responseTimes = [];

// Sunucunun hazır olmasını bekle
function waitForServer(port, retries = 20) {
  return new Promise((resolve, reject) => {
    const tryConnect = (attempt) => {
      const req = http.request({ hostname: 'localhost', port, path: '/health', method: 'GET' }, (res) => {
        resolve();
      });
      req.on('error', () => {
        if (attempt >= retries) return reject(new Error('Sunucu başlatılamadı'));
        setTimeout(() => tryConnect(attempt + 1), 300);
      });
      req.end();
    };
    tryConnect(1);
  });
}

async function run() {
  console.log('🚀 Sunucu başlatılıyor (port 5099)...');
  // Sunucuyu ayrı bir child process olarak başlat
  const { spawn } = require('child_process');
  const server = spawn('node', ['index.js'], {
    cwd: __dirname,
    env: { ...process.env, PORT: '5099' },
    stdio: 'ignore'
  });

  try {
    await waitForServer(5099);
    console.log('✅ Sunucu hazır. Yük testi başlıyor...\n');

    const makeRequest = (i) => {
      return new Promise((resolve) => {
        const isIbanTest = i % 2 === 0;
        
        let postData, path;
        
        if (isIbanTest) {
          // IBAN Validation Flow
          postData = JSON.stringify({
            iban: 'TR330006200010000006297802' // Dummy IBAN formatı
          });
          path = '/api/payments/validate-iban';
        } else {
          // Reservation Flow
          postData = JSON.stringify({
            eventId: 'dummy-event-id-for-load-test',
            customer: `Test Kullanici ${i}`,
            email: `test${i}@example.com`
          });
          path = '/api/reservations';
        }

        const startTime = Date.now();

        const req = http.request({
          hostname: 'localhost',
          port: 5099,
          path: path,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          }
        }, (res) => {
          res.resume();
          res.on('end', () => {
            const endTime = Date.now();
            responseTimes.push(endTime - startTime);

            if (res.statusCode >= 200 && res.statusCode < 300) successCount++;
            else if (res.statusCode === 429) rateLimitCount++;
            else if (res.statusCode === 401 || res.statusCode === 403) authDeniedCount++;
            else failCount++;
            resolve();
          });
        });

        req.on('error', () => { failCount++; resolve(); });
        req.write(postData);
        req.end();
      });
    };

    const promises = Array.from({ length: NUM_REQUESTS }, (_, i) => makeRequest(i));
    await Promise.all(promises);

    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    const minResponseTime = Math.min(...responseTimes);

    console.log('─── YÜK TESTİ SONUÇLARI ────────────────────────');
    console.log(`📊 Toplam İstek       : ${NUM_REQUESTS}`);
    console.log(`✅ Başarılı (2xx)     : ${successCount}`);
    console.log(`🔐 Auth Reddedildi    : ${authDeniedCount} (401/403)`);
    console.log(`🚫 Rate-Limit (429)   : ${rateLimitCount}`);
    console.log(`❌ Diğer Hatalar      : ${failCount}`);
    console.log('─── PERFORMANS METRİKLERİ ──────────────────────');
    console.log(`⏱️  Ortalama Yanıt Süresi: ${avgResponseTime.toFixed(2)} ms`);
    console.log(`⏱️  Min Yanıt Süresi     : ${minResponseTime} ms`);
    console.log(`⏱️  Max Yanıt Süresi     : ${maxResponseTime} ms`);
    console.log('─────────────────────────────────────────────────');

    if (rateLimitCount > 0) {
      console.log('✅ DDoS / Rate Limiter koruması AKTIF!');
    }
    
    if (avgResponseTime < 200) {
       console.log('✅ Performans hedefleri ( < 200ms) karşılandı!');
    } else {
       console.log('⚠️ Ortalama yanıt süresi 200ms üzerinde. Optimizasyon gerekebilir.');
    }

    console.log('\n🎉 Yük testi tamamlandı!');
  } finally {
    server.kill();
  }
}

run().catch(err => {
  console.error('Test hatası:', err.message);
  process.exit(1);
});
