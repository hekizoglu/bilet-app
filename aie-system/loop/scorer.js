const fs = require('fs');
const path = require('path');

const RULES_PATH = path.join(__dirname, '../config/rules.json');
const rules = JSON.parse(fs.readFileSync(RULES_PATH, 'utf8'));

function calculateScore(item) {
  const w = rules.scoring.weights;
  const d = rules.scoring.difficulty_penalty;

  const difficultyPenalty = d[item.difficulty] || d.medium;

  const score = 
    (item.impact * w.impact) +
    (item.security * w.security) +
    (item.usability * w.usability) +
    (item.demographic * w.demographic) +
    (item.simplicity * w.simplicity) -
    difficultyPenalty;

  return Math.round(score * 10) / 10;
}

function classify(score) {
  if (score >= rules.scoring.thresholds.high) return 'high';
  if (score >= rules.scoring.thresholds.medium) return 'medium';
  return 'low';
}

function generateId() {
  return 'IDEA-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
}

module.exports = { calculateScore, classify, generateId };
