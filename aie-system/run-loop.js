#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔄 AIE LOOP SCHEDULER - Otomatik Döngü Yöneticisi
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bu script, analiz + çözüm döngüsünü belirli aralıklarla otomatik olarak çalıştırır.
 * 
 * Kullanım:
 *   node aie-system/run-loop.js --mode=continuous --interval=300000
 *   node aie-system/run-loop.js --mode=once
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOOP_DIR = path.join(__dirname, 'loop');
const LOG_FILE = path.join(__dirname, 'logs', 'loop-schedule.log');
const BASE_DIR = __dirname;

// Komut satırı argümanları
const args = process.argv.slice(2);
const mode = args.find(a => a.startsWith('--mode='))?.split('=')[1] || 'continuous';
const interval = parseInt(args.find(a => a.startsWith('--interval='))?.split('=')[1] || 300000); // 5 dakika

// Log dosyası
function ensureLogDir() {
  const logDir = path.dirname(LOG_FILE);
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
}

function log(message, level = 'INFO') {
  ensureLogDir();
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

function runEngine() {
  try {
    log('🔍 Analiz Döngüsü başlatıldı...', 'START');
    execSync(`node "${path.join(LOOP_DIR, 'engine.js')}"`, { 
      cwd: BASE_DIR,
      stdio: 'inherit'
    });
    log('✅ Analiz Döngüsü tamamlandı', 'SUCCESS');
  } catch (error) {
    log(`❌ Analiz Döngüsü hatası: ${error.message}`, 'ERROR');
  }
}

function runSolutionEngine() {
  try {
    log('🔧 Çözüm Döngüsü başlatıldı...', 'START');
    execSync(`node "${path.join(LOOP_DIR, 'solution-engine.js')}"`, { 
      cwd: BASE_DIR,
      stdio: 'inherit'
    });
    log('✅ Çözüm Döngüsü tamamlandı', 'SUCCESS');
  } catch (error) {
    log(`❌ Çözüm Döngüsü hatası: ${error.message}`, 'ERROR');
  }
}

function runFullCycle() {
  log('═'.repeat(80), 'CYCLE');
  log(`🔄 TAM DÖNGÜ BAŞLADI (${new Date().toLocaleTimeString('tr-TR')})`, 'CYCLE');
  log('═'.repeat(80), 'CYCLE');
  
  runEngine();
  log('⏸️  2 saniye bekleniyor...', 'INFO');
  setTimeout(() => {
    runSolutionEngine();
    log('═'.repeat(80), 'CYCLE');
    log(`✨ TAM DÖNGÜ TAMAMLANDI`, 'CYCLE');
    log('═'.repeat(80), 'CYCLE');
  }, 2000);
}

// Ana Başlangıç
console.log('\n');
console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║         🤖 AIE LOOP SCHEDULER - Otomatik Döngü              ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('');
console.log(`📋 Mod: ${mode}`);
console.log(`⏱️  Aralık: ${interval / 1000} saniye (${interval / 60000} dakika)`);
console.log(`📂 Çalışma Dizini: ${BASE_DIR}`);
console.log('');

if (mode === 'once') {
  log('Tek çalıştırma modu', 'INFO');
  runFullCycle();
} else if (mode === 'continuous') {
  log('Sürekli çalıştırma modu başladı', 'INFO');
  console.log(`🔄 İlk döngü 2 saniye içinde başlayacak, sonra her ${interval / 60000} dakika çalışacak...`);
  console.log('');
  
  // İlk çalıştırma
  runFullCycle();
  
  // Periyodik çalıştırma
  setInterval(() => {
    runFullCycle();
  }, interval);
} else {
  log(`Bilinmeyen mod: ${mode}`, 'ERROR');
  process.exit(1);
}
