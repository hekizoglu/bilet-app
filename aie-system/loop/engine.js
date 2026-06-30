const fs = require('fs');
const path = require('path');
const { calculateScore, classify, generateId } = require('./scorer');
const { generateIdeas, getCurrentPhase } = require('./analyzer');

const BASE_DIR = path.join(__dirname, '..');
const FIKIRLER_DIR = path.join(BASE_DIR, 'fikirler');
const OUTPUTS_DIR = path.join(BASE_DIR, 'outputs');

function ensureDirs() {
  [FIKIRLER_DIR, OUTPUTS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
}

function getDifficultyPenalty(difficulty) {
  const penalties = { easy: 0, medium: 3, hard: 7, very_hard: 12 };
  return penalties[difficulty] || 3;
}

function formatIdea(idea, score, classification, id) {
  const date = new Date().toISOString();
  const badge = classification === 'high' ? '🔴 YÜKSEK' : classification === 'medium' ? '🟡 ORTA' : '🟢 DÜŞÜK';
  
  return `
## ${id} | ${badge} | Puan: ${score}

**Tarih:** ${date}
**Faz:** ${getCurrentPhase()}
**Tür:** ${idea.type === 'kod' ? '💻 Kod' : '📱 Ürün'}
**Kaynak:** ${idea.source}
**Zorluk:** ${idea.difficulty}

### Başlık
${idea.title}

### Açıklama
${idea.description}

### Puanlama Detayı
| Kriter | Puan |
|--------|------|
| Etki | ${idea.impact}/10 |
| Güvenlik | ${idea.security}/10 |
| Kullanıcı Dostu | ${idea.usability}/10 |
| Demografik | ${idea.demographic}/10 |
| Basitlik | ${idea.simplicity}/10 |

**Formül:** (${idea.impact}×2.5) + (${idea.security}×2.0) + (${idea.usability}×1.5) + (${idea.demographic}×1.0) + (${idea.simplicity}×1.5) − ${getDifficultyPenalty(idea.difficulty)} = **${score}**

---
`;
}

function writeToFile(filePath, content, append = true) {
  if (append && fs.existsSync(filePath)) {
    fs.appendFileSync(filePath, content);
  } else {
    fs.writeFileSync(filePath, content);
  }
}

function updateBacklog(highScoreIdeas) {
  const backlogPath = path.join(FIKIRLER_DIR, 'backlog.md');
  const header = `# 📋 Backlog - Yüksek Öncelikli Fikirler\n\nSon Güncelleme: ${new Date().toISOString()}\n\n`;
  
  const content = highScoreIdeas.map(i => 
    `- [ ] **${i.id}** | ${i.idea.title} | Puan: ${i.score} | Zorluk: ${i.idea.difficulty}`
  ).join('\n');

  writeToFile(backlogPath, header + content + '\n\n', false);
}

function rotatePhase() {
  const phases = ['stabilization', 'security', 'performance', 'ux'];
  const phaseFile = path.join(__dirname, 'phases.json');
  
  let current = { current: phases[0], index: 0 };
  if (fs.existsSync(phaseFile)) {
    current = JSON.parse(fs.readFileSync(phaseFile, 'utf8'));
  }
  
  const nextIndex = (current.index + 1) % phases.length;
  const nextPhase = {
    current: phases[nextIndex],
    index: nextIndex,
    lastRotation: new Date().toISOString()
  };
  
  fs.writeFileSync(phaseFile, JSON.stringify(nextPhase, null, 2));
  console.log(`🔄 Faz değişimi: ${phases[current.index]} → ${phases[nextIndex]}`);
}

function addCriticalIdeasToRoadmap(highScoreIdeas) {
  const roadmapPath = path.join(BASE_DIR, '..', 'ROADMAP.md');
  const rulesPath = path.join(BASE_DIR, 'config', 'roadmap_rules.json');
  
  if (!fs.existsSync(rulesPath)) return;
  
  const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
  if (!rules.autoAddToRoadmap.enabled) return;
  
  // 25 puan ve üzeri fikirleri filtrele
  const criticalIdeas = highScoreIdeas.filter(idea => idea.score >= 25);
  
  if (criticalIdeas.length === 0) return;
  
  console.log(`  🔴 ${criticalIdeas.length} adet KEŞFİ fikir Roadmap'a ekleniyor...`);
  
  // Roadmap'ın sonuna eklemek için döngü tanımlı bölümünü bul
  let roadmapContent = fs.readFileSync(roadmapPath, 'utf8');
  
  const loopSection = `
## 🔄 Döngü Tarafından Otomatik Eklenen İşler

### Döngü #${getCurrentLoopCount()} - Zaman Damgası: ${new Date().toISOString()}

`;

  let ideasContent = criticalIdeas.map((idea, idx) => {
    const diffType = idea.idea.type === 'kod' ? '💻' : '📱';
    return `#### ${idx + 1}. ${diffType} ${idea.idea.title}
- **ID:** ${idea.id}
- **Puan:** ${idea.score}/40
- **Zorluk:** ${idea.idea.difficulty}
- **Açıklama:** ${idea.idea.description}
`;
  }).join('\n');

  // Mevcut döngü bölümünü güncelle veya ekle
  const markerStart = '## 🔄 Döngü Tarafından Otomatik Eklenen İşler';
  if (roadmapContent.includes(markerStart)) {
    // Varsa sona ekle
    roadmapContent += loopSection + ideasContent + '\n';
  } else {
    // Yoksa, "Döngü Tarafından Seçilen" bölümünden sonra ekle
    const insertPoint = roadmapContent.lastIndexOf('---');
    if (insertPoint > 0) {
      roadmapContent = roadmapContent.slice(0, insertPoint) + '\n' + loopSection + ideasContent + '\n' + roadmapContent.slice(insertPoint);
    } else {
      roadmapContent += '\n' + loopSection + ideasContent;
    }
  }
  
  fs.writeFileSync(roadmapPath, roadmapContent);
}

function getCurrentLoopCount() {
  const phaseFile = path.join(__dirname, 'phases.json');
  if (!fs.existsSync(phaseFile)) return 1;
  
  const data = JSON.parse(fs.readFileSync(phaseFile, 'utf8'));
  return data.loopCount || 1;
}

function incrementLoopCount() {
  const phaseFile = path.join(__dirname, 'phases.json');
  let data = { current: 'stabilization', index: 0, loopCount: 1, lastRotation: new Date().toISOString() };
  
  if (fs.existsSync(phaseFile)) {
    data = JSON.parse(fs.readFileSync(phaseFile, 'utf8'));
  }
  
  data.loopCount = (data.loopCount || 0) + 1;
  fs.writeFileSync(phaseFile, JSON.stringify(data, null, 2));
}

function runLoop() {
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  🚀 AIE Döngü Motoru Başlatıldı');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  📍 Mevcut Faz: ${getCurrentPhase()}`);
  console.log(`  🕐 Zaman: ${new Date().toLocaleString('tr-TR')}`);
  console.log('');
  
  ensureDirs();

  const ideas = generateIdeas();
  console.log(`  💡 ${ideas.length} adet fikir üretildi.`);

  const kodIdeas = ideas.filter(i => i.type === 'kod');
  const urunIdeas = ideas.filter(i => i.type === 'urun');
  console.log(`     └─ 💻 Kod iyileştirme: ${kodIdeas.length}`);
  console.log(`     └─ 📱 Ürün iyileştirme: ${urunIdeas.length}`);
  console.log('');

  // Dosya başlıkları
  const kodHeader = `# 💻 Kod İyileştirme Fikirleri\n\nSon Güncelleme: ${new Date().toISOString()}\n`;
  const urunHeader = `# 📱 Ürün İyileştirme Fikirleri\n\nSon Güncelleme: ${new Date().toISOString()}\n`;
  const yuksekHeader = `# 🔴 Yüksek Puanlı Fikirler (≥28 puan)\n\nSon Güncelleme: ${new Date().toISOString()}\n`;
  const ortaHeader = `# 🟡 Orta Seviye Fikirler (15-27 puan)\n\nSon Güncelleme: ${new Date().toISOString()}\n`;
  const dusukHeader = `# 🟢 Düşük Öncelik Fikirler (<15 puan)\n\nSon Güncelleme: ${new Date().toISOString()}\n`;

  // Dosya yolları
  const kodPath = path.join(FIKIRLER_DIR, 'kod_iyilestirme.md');
  const urunPath = path.join(FIKIRLER_DIR, 'urun_iyilestirme.md');
  const yuksekPath = path.join(OUTPUTS_DIR, 'yuksek_puanlilar.md');
  const ortaPath = path.join(OUTPUTS_DIR, 'orta_seviye.md');
  const dusukPath = path.join(OUTPUTS_DIR, 'dusuk_oncelik.md');

  // Dosyaları sıfırla (her döngüde temiz başlasın)
  writeToFile(kodPath, kodHeader, false);
  writeToFile(urunPath, urunHeader, false);
  writeToFile(yuksekPath, yuksekHeader, false);
  writeToFile(ortaPath, ortaHeader, false);
  writeToFile(dusukPath, dusukHeader, false);

  const highScoreIdeas = [];
  let highCount = 0, medCount = 0, lowCount = 0;

  // Tüm fikirleri işle
  const allIdeas = [...kodIdeas, ...urunIdeas];

  allIdeas.forEach(idea => {
    const score = calculateScore(idea);
    const classification = classify(score);
    const id = generateId();
    const formatted = formatIdea(idea, score, classification, id);

    // Tür dosyasına yaz
    if (idea.type === 'kod') {
      writeToFile(kodPath, formatted);
    } else {
      writeToFile(urunPath, formatted);
    }

    // Sınıflandırma dosyasına yaz
    if (classification === 'high') {
      writeToFile(yuksekPath, formatted);
      highScoreIdeas.push({ id, score, idea });
      highCount++;
    } else if (classification === 'medium') {
      writeToFile(ortaPath, formatted);
      medCount++;
    } else {
      writeToFile(dusukPath, formatted);
      lowCount++;
    }
  });

  // Sonuç özeti
  console.log('  📊 Puanlama Sonuçları:');
  console.log(`     └─ 🔴 Yüksek (≥28): ${highCount} fikir`);
  console.log(`     └─ 🟡 Orta (15-27): ${medCount} fikir`);
  console.log(`     └─ 🟢 Düşük (<15): ${lowCount} fikir`);
  console.log('');

  // Backlog güncelle
  if (highScoreIdeas.length > 0) {
    updateBacklog(highScoreIdeas);
    console.log(`  📋 ${highScoreIdeas.length} adet yüksek puanlı fikir backlog'a eklendi.`);
    
    // 25 puan ve üzeri olanları Roadmap'a ekle
    addCriticalIdeasToRoadmap(highScoreIdeas);
  }

  // Faz rotasyonu
  rotatePhase();
  incrementLoopCount();

  console.log('');
  console.log('  📁 Güncellenen Dosyalar:');
  console.log(`     └─ fikirler/kod_iyilestirme.md`);
  console.log(`     └─ fikirler/urun_iyilestirme.md`);
  console.log(`     └─ fikirler/backlog.md`);
  console.log(`     └─ outputs/yuksek_puanlilar.md`);
  console.log(`     └─ outputs/orta_seviye.md`);
  console.log(`     └─ outputs/dusuk_oncelik.md`);
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  ✅ Döngü tamamlandı.');
  console.log('═══════════════════════════════════════════════════');
  console.log('');
}

// Çalıştır
runLoop();
