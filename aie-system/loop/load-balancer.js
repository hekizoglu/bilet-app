/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ⚖️ LOAD BALANCER ENGINE (Oran Kontrol ve Yön Belirleme)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * AMAÇ: Analiz döngüsü vs Çözüm döngüsü arasında denge sağla
 * 
 * İŞLEV:
 * 1. Kaç tane çözülmemiş görev var? ([ ] sayısı)
 * 2. Kaç tane analiz döngüsü çalıştı?
 * 3. Kaç tane çözüm döngüsü çalıştı?
 * 4. Oran: Analiz / Çözüm nedir?
 * 5. Karar: Şimdi analiz mi, çözüm mü yapmalı?
 * 
 * ÖRN:
 * Eğer 50 tane çözülmemiş görev varsa → Çözüm döngüsü başlat
 * Eğer 200+ fikir üretildiyse → Analiz dur, çözüm odağı yap
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════════
// KONFIGÜRASYON
// ═══════════════════════════════════════════════════════════════════════════════

const BALANCE_CONFIG = {
  // Oran kuralları
  ratios: {
    // Eğer çözülmemiş görev sayısı şu kadarsa...
    CRITICAL: {
      threshold: 100,           // ≥100 görev
      action: 'STOP_ANALYSIS',  // Analiz döngüsünü durdur
      priority: 'SOLVE_FIRST'   // Önce çöz
    },
    
    HIGH: {
      threshold: 50,            // 50-99 görev
      action: 'SLOW_ANALYSIS',  // Analiz yavaşlat
      priority: 'SOLVE_PRIORITY'
    },
    
    BALANCED: {
      threshold: 20,            // 20-49 görev
      action: 'NORMAL',         // Normal devam
      priority: 'BALANCED'
    },
    
    LOW: {
      threshold: 5,             // <20 görev
      action: 'SPEED_ANALYSIS', // Analiz hızlandır
      priority: 'GENERATE_MORE'
    }
  },

  // Analiz döngüsü gecikme (ms)
  analysisDelay: {
    NORMAL:        20000,  // 20 sn
    SLOW_ANALYSIS: 60000,  // 60 sn (yavaşla)
    SPEED_ANALYSIS: 5000   // 5 sn (hızlandır)
  },

  // Çözüm döngüsü max retry
  maxSolutionRetries: 3,

  // Log dosyası
  balanceLog: path.join(__dirname, '../logs/balance-log.json')
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN LOAD BALANCER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class LoadBalancer {
  /**
   * İki döngü arasında denge sağlayan sistem
   */
  constructor() {
    this.state = {
      analysisLoops: 0,      // Kaç tane analiz döngüsü çalıştı
      solutionLoops: 0,      // Kaç tane çözüm döngüsü çalıştı
      unsolvedTasks: 0,      // Kaç tane [ ] görev var
      totalIdeas: 0,         // Toplam üretilen fikir
      currentRatio: 'BALANCED',
      lastAction: null,
      timestamp: new Date()
    };
    
    this.ensureLog();
    this.loadState();
  }

  /**
   * Log dosyasını oluştur/yükle
   */
  ensureLog() {
    const dir = path.dirname(BALANCE_CONFIG.balanceLog);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Önceki durumu yükle
   */
  loadState() {
    if (fs.existsSync(BALANCE_CONFIG.balanceLog)) {
      try {
        const content = fs.readFileSync(BALANCE_CONFIG.balanceLog, 'utf8');
        this.state = JSON.parse(content);
      } catch (e) {
        console.log('Balance log okunamadı, fresh başlıyor...');
      }
    }
  }

  /**
   * Durumu kaydet
   */
  saveState() {
    fs.writeFileSync(
      BALANCE_CONFIG.balanceLog,
      JSON.stringify(this.state, null, 2)
    );
  }

  /**
   * Çözülmemiş görevleri say ([ ] karakterini ara)
   */
  countUnsolvedTasks(roadmapPath) {
    try {
      const content = fs.readFileSync(roadmapPath, 'utf8');
      const unsolvedMatches = content.match(/- \[ \]/g) || [];
      return unsolvedMatches.length;
    } catch (e) {
      return 0;
    }
  }

  /**
   * ANA FONKSİYON: Hangi döngü yapılmalı? Karar ver
   */
  decide(roadmapPath) {
    // Güncel durumu oku
    this.state.unsolvedTasks = this.countUnsolvedTasks(roadmapPath);
    this.state.timestamp = new Date();

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║              ⚖️  LOAD BALANCER - KARAR MERKEZI                ║');
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log(`║ Analiz Döngüsü: ${String(this.state.analysisLoops).padEnd(40)}║`);
    console.log(`║ Çözüm Döngüsü: ${String(this.state.solutionLoops).padEnd(41)}║`);
    console.log(`║ Çözülmemiş Görev: ${String(this.state.unsolvedTasks).padEnd(37)}║`);
    console.log(`║ Toplam Fikir: ${String(this.state.totalIdeas).padEnd(42)}║`);
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // Oran belirle
    const decision = this.calculateRatio();

    console.log(`\n📊 KARAR: ${decision.status}`);
    console.log(`   Oran: ${decision.ratio}`);
    console.log(`   Aksiyon: ${decision.action}`);
    console.log(`   Sonraki: ${decision.nextAction}`);

    return decision;
  }

  /**
   * Oran hesapla ve karar ver
   */
  calculateRatio() {
    const unsolved = this.state.unsolvedTasks;

    let ratio, action, status, nextAction;

    if (unsolved >= BALANCE_CONFIG.ratios.CRITICAL.threshold) {
      // 🔴 KRİTİK: Çok fazla birikmiş görev
      ratio = 'CRITICAL';
      action = BALANCE_CONFIG.ratios.CRITICAL.action;
      status = `🔴 KRİTİK - ${unsolved} görev birikmiş!`;
      nextAction = 'SOLVE_IMMEDIATELY';

    } else if (unsolved >= BALANCE_CONFIG.ratios.HIGH.threshold) {
      // 🟡 YÜKSEK: Birkaç görev birikmiş
      ratio = 'HIGH';
      action = BALANCE_CONFIG.ratios.HIGH.action;
      status = `🟡 YÜKSEK - ${unsolved} görev bekliyor`;
      nextAction = 'PRIORITIZE_SOLVING';

    } else if (unsolved >= BALANCE_CONFIG.ratios.BALANCED.threshold) {
      // 🟢 DENGELI: Normal tempo
      ratio = 'BALANCED';
      action = BALANCE_CONFIG.ratios.BALANCED.action;
      status = `🟢 DENGELI - ${unsolved} görev, normal tempo`;
      nextAction = 'CONTINUE_BALANCED';

    } else {
      // 🔵 DÜŞÜK: Az görev, daha fazla analiz yap
      ratio = 'LOW';
      action = BALANCE_CONFIG.ratios.LOW.action;
      status = `🔵 DÜŞÜK - ${unsolved} görev, analiz hızlandır`;
      nextAction = 'GENERATE_MORE_IDEAS';
    }

    this.state.currentRatio = ratio;
    this.state.lastAction = action;
    this.saveState();

    return {
      ratio,
      action,
      status,
      nextAction,
      unsolvedCount: unsolved
    };
  }

  /**
   * Analiz döngüsünü BAŞLAT
   */
  startAnalysisLoop(decision) {
    if (decision.action === 'STOP_ANALYSIS') {
      console.log('❌ Analiz döngüsü durduruldu - Çözüm odağı gerekli!');
      return false;
    }

    console.log('✅ Analiz döngüsü başlıyor...');
    this.state.analysisLoops++;
    return true;
  }

  /**
   * Çözüm döngüsünü BAŞLAT
   */
  startSolutionLoop(decision) {
    if (decision.action === 'STOP_ANALYSIS' || decision.action === 'SLOW_ANALYSIS') {
      console.log('✅ Çözüm döngüsü ÖNCELİKLİ olarak başlıyor...');
      this.state.solutionLoops++;
      return true;
    }

    if (decision.unsolvedCount > BALANCE_CONFIG.ratios.BALANCED.threshold) {
      console.log('✅ Çözüm döngüsü başlıyor...');
      this.state.solutionLoops++;
      return true;
    }

    console.log('⏸️  Çözüm döngüsü henüz gerekmedi (görevler az)');
    return false;
  }

  /**
   * Sonraki adımı öner
   */
  recommendNextStep(decision) {
    const recommendations = {
      SOLVE_IMMEDIATELY: {
        emoji: '🚨',
        text: 'ÖN SEÇ: Çözüm döngüsünü ŞİMDİ başlat!',
        command: 'node solution-engine.js'
      },
      PRIORITIZE_SOLVING: {
        emoji: '⚠️',
        text: 'ÖN SEÇ: Çözüm döngüsünü başlat',
        command: 'node solution-engine.js'
      },
      CONTINUE_BALANCED: {
        emoji: '✅',
        text: 'Her iki döngüyü paralel çalıştır',
        command: 'parallel'
      },
      GENERATE_MORE_IDEAS: {
        emoji: '💡',
        text: 'Analiz döngüsünü hızlandır',
        command: 'node engine.js --fast'
      }
    };

    const rec = recommendations[decision.nextAction] || {};
    console.log(`\n${rec.emoji} ${rec.text}`);
    console.log(`   Komut: ${rec.command}\n`);

    return rec;
  }

  /**
   * Görselleştirilmiş rapor
   */
  generateReport() {
    const ratio = this.state.currentRatio;
    let bar = '';
    let color = '';

    if (ratio === 'CRITICAL') {
      bar = '█████████████████████ 100%';
      color = '🔴';
    } else if (ratio === 'HIGH') {
      bar = '██████████████ 75%';
      color = '🟡';
    } else if (ratio === 'BALANCED') {
      bar = '██████████ 50%';
      color = '🟢';
    } else {
      bar = '████ 25%';
      color = '🔵';
    }

    const report = `
╔════════════════════════════════════════════════════════════════╗
║                    📊 SISTEM DURUMU RAPORU                   ║
╠════════════════════════════════════════════════════════════════╣
║                                                                 ║
║ Çözülmemiş Görev Yüzdesi: ${color}                            ║
║ ${bar}                    ║
║                                                                 ║
║ Analiz Döngüsü Sayısı:    ${String(this.state.analysisLoops).padEnd(35)}║
║ Çözüm Döngüsü Sayısı:     ${String(this.state.solutionLoops).padEnd(35)}║
║ Toplam Üretilen Fikir:    ${String(this.state.totalIdeas).padEnd(35)}║
║                                                                 ║
║ Çözülmemiş Görev:         ${String(this.state.unsolvedTasks).padEnd(35)}║
║ Mevcut Oran:              ${String(this.state.currentRatio).padEnd(35)}║
║                                                                 ║
║ Son Aksiyon:              ${String(this.state.lastAction || 'NONE').padEnd(34)}║
║                                                                 ║
║ Tarih/Saat:               ${new Date().toLocaleString('tr-TR').padEnd(28)}║
║                                                                 ║
╚════════════════════════════════════════════════════════════════╝
    `;

    return report;
  }

  /**
   * Health Check - Sistem sağlıklı mı?
   */
  healthCheck() {
    const unsolved = this.state.unsolvedTasks;
    const analysis = this.state.analysisLoops;
    const solution = this.state.solutionLoops;

    const health = {
      analysisWorking: analysis > 0,
      solutionWorking: solution > 0,
      backlogManageable: unsolved < 200,
      goodRatio: analysis > 0 && solution > 0 ? analysis / solution < 5 : true,
      status: 'HEALTHY'
    };

    // Durum belirle
    if (unsolved >= 200 && solution === 0) {
      health.status = '🔴 CRITICAL - Çözüm döngüsü başlamamış!';
    } else if (unsolved >= 100 && analysis > solution * 3) {
      health.status = '🟡 WARNING - Analiz çok hızlı, çözüm yetiştiremiyor!';
    } else if (solution > analysis) {
      health.status = '🟢 GOOD - Dengeli ilerleme';
    } else if (unsolved === 0) {
      health.status = '⭐ EXCELLENT - Tüm görevler çözüldü!';
    }

    return health;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const roadmapPath = path.join(__dirname, '../../docs/Roadmap.md');
  
  const balancer = new LoadBalancer();
  const decision = balancer.decide(roadmapPath);
  const recommendation = balancer.recommendNextStep(decision);
  const report = balancer.generateReport();
  const health = balancer.healthCheck();

  console.log(report);
  console.log(`\n🏥 SISTEM SAĞLIĞI: ${health.status}`);
  console.log(`   • Analiz Çalışıyor: ${health.analysisWorking ? '✅' : '❌'}`);
  console.log(`   • Çözüm Çalışıyor: ${health.solutionWorking ? '✅' : '❌'}`);
  console.log(`   • Backlog Kontrol: ${health.backlogManageable ? '✅' : '⚠️'}`);
  console.log(`   • Oran İyi: ${health.goodRatio ? '✅' : '⚠️'}\n`);
}

// Çalıştır
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { LoadBalancer, BALANCE_CONFIG };
