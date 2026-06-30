const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.join(__dirname, '../data/logs');
const BEHAVIOR_FILE = path.join(__dirname, '../data/user/behavior.json');

function readLogs() {
  const readSafe = (file) => {
    const fullPath = path.join(LOGS_DIR, file);
    if (!fs.existsSync(fullPath)) return [];
    return fs.readFileSync(fullPath, 'utf8').split('\n').filter(Boolean);
  };

  return {
    errors: readSafe('errors.log'),
    performance: readSafe('performance.log'),
    security: readSafe('security.log'),
    logic: readSafe('logic.log')
  };
}

function analyzeLogic(logs) {
  const issues = logs.filter(line => line.includes('LOGIC_ERROR') || line.includes('VALIDATION'));
  if (issues.length === 0) return [];
  
  const rulesBroken = {};
  issues.forEach(line => {
    const match = line.match(/Rule:\s*(.*)/);
    if (match) {
      // Split by ' - ' to remove specific variable data like ' - EventDate: 2026'
      const rule = match[1].split(' - ')[0].trim();
      rulesBroken[rule] = (rulesBroken[rule] || 0) + 1;
    }
  });

  return Object.entries(rulesBroken).map(([rule, count]) => ({
    type: 'kod',
    title: `İş Mantığı İhlali: ${rule}`,
    description: `Sistemde ${count} kez "${rule}" iş mantığı ihlali tespit edildi. Frontend ve Backend validasyonlarının senkronize edilmesi önerilir.`,
    impact: 7,
    security: 4,
    usability: 8,
    demographic: 5,
    simplicity: 6,
    difficulty: 'medium',
    source: 'logic_log'
  }));
}

function analyzeErrors(logs) {
  const patterns = {};
  logs.forEach(line => {
    const match = line.match(/\[(\w+)\]/);
    if (match) {
      const module = match[1];
      patterns[module] = (patterns[module] || 0) + 1;
    }
  });
  
  return Object.entries(patterns)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([module, count]) => ({
      type: 'kod',
      title: `${module} modülünde hata yoğunluğu`,
      description: `${count} adet hata tespit edildi. Refactoring ve hata yakalama mekanizması önerilir.`,
      impact: Math.min(count / 5, 10),
      security: 5,
      usability: 4,
      demographic: 5,
      simplicity: 6,
      difficulty: count > 20 ? 'hard' : 'medium',
      source: 'error_log',
      module
    }));
}

function analyzePerformance(logs) {
  const slowEndpoints = logs
    .filter(line => line.includes('slow') || line.includes('ms'))
    .map(line => {
      const match = line.match(/endpoint:\s*(\S+)/);
      return match ? match[1] : null;
    })
    .filter(Boolean);

  const unique = [...new Set(slowEndpoints)];
  
  return unique.map(ep => ({
    type: 'kod',
    title: `${ep} endpoint optimizasyonu`,
    description: `Yavaş çalışan endpoint için caching veya sorgu optimizasyonu.`,
    impact: 8,
    security: 3,
    usability: 7,
    demographic: 6,
    simplicity: 5,
    difficulty: 'medium',
    source: 'performance_log',
    endpoint: ep
  }));
}

function analyzeSecurity(logs) {
  const issues = logs.filter(line => line.includes('WARNING') || line.includes('ALERT'));
  if (issues.length === 0) return [];

  return [{
    type: 'kod',
    title: 'Güvenlik katmanı güçlendirme',
    description: `${issues.length} güvenlik uyarısı tespit edildi. Rate limiting ve validation katmanı eklenmeli.`,
    impact: 9,
    security: 10,
    usability: 4,
    demographic: 5,
    simplicity: 4,
    difficulty: 'medium',
    source: 'security_log'
  }];
}

function analyzeUserBehavior() {
  if (!fs.existsSync(BEHAVIOR_FILE)) return [];
  
  const data = JSON.parse(fs.readFileSync(BEHAVIOR_FILE, 'utf8'));
  const ideas = [];

  if (data.dropOffPoints?.payment > 0.15) {
    ideas.push({
      type: 'urun',
      title: 'Ödeme akışı sadeleştirme',
      description: `Kullanıcıların %${Math.round(data.dropOffPoints.payment * 100)}'i ödeme adımında çıkıyor.`,
      impact: 9,
      security: 6,
      usability: 10,
      demographic: 7,
      simplicity: 5,
      difficulty: 'medium',
      source: 'behavior_analytics'
    });
  }

  if (data.dropOffPoints?.search > 0.25) {
    ideas.push({
      type: 'urun',
      title: 'Arama ve filtreleme UX iyileştirme',
      description: 'Arama sonuçlarında yüksek çıkış oranı. Filtreleme ve sonuç gösterimi revize edilmeli.',
      impact: 8,
      security: 2,
      usability: 9,
      demographic: 8,
      simplicity: 6,
      difficulty: 'easy',
      source: 'behavior_analytics'
    });
  }

  return ideas;
}

function generateIdeas() {
  const logs = readLogs();
  const ideas = [
    ...analyzeErrors(logs.errors),
    ...analyzePerformance(logs.performance),
    ...analyzeSecurity(logs.security),
    ...analyzeLogic(logs.logic),
    ...analyzeUserBehavior()
  ];

  // Faz bazlı ek öneriler
  ideas.push(...generatePhaseSpecificIdeas());

  return ideas;
}

function generatePhaseSpecificIdeas() {
  const phase = getCurrentPhase();
  const extras = [];

  if (phase === 'stabilization') {
    extras.push({
      type: 'kod',
      title: 'Hata yakalama ve retry mekanizması',
      description: 'Kritik endpointler için circuit breaker pattern uygulanmalı.',
      impact: 9,
      security: 7,
      usability: 6,
      demographic: 5,
      simplicity: 5,
      difficulty: 'hard',
      source: 'phase_rule'
    });
  }

  if (phase === 'security') {
    extras.push({
      type: 'kod',
      title: 'Input validation katmanı',
      description: 'Tüm kullanıcı girişleri için merkezi validasyon katmanı.',
      impact: 8,
      security: 10,
      usability: 5,
      demographic: 6,
      simplicity: 7,
      difficulty: 'medium',
      source: 'phase_rule'
    });
  }

  if (phase === 'performance') {
    extras.push({
      type: 'kod',
      title: 'Veritabanı sorgu optimizasyonu',
      description: 'Prisma sorgularında N+1 problemi kontrolü ve index analizi.',
      impact: 8,
      security: 3,
      usability: 6,
      demographic: 5,
      simplicity: 5,
      difficulty: 'medium',
      source: 'phase_rule'
    });
  }

  if (phase === 'ux') {
    extras.push({
      type: 'urun',
      title: 'Mobil responsive kontrolü',
      description: 'Rezervasyon akışının mobil cihazlarda test edilmesi ve iyileştirilmesi.',
      impact: 7,
      security: 2,
      usability: 9,
      demographic: 8,
      simplicity: 6,
      difficulty: 'easy',
      source: 'phase_rule'
    });
  }

  return extras;
}

function getCurrentPhase() {
  const phaseFile = path.join(__dirname, 'phases.json');
  if (!fs.existsSync(phaseFile)) return 'stabilization';
  const data = JSON.parse(fs.readFileSync(phaseFile, 'utf8'));
  return data.current || 'stabilization';
}

module.exports = { generateIdeas, getCurrentPhase };
