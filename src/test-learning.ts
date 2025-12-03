/**
 * TEST LEARNING - Can the system learn to recover patterns?
 * 
 * Hypothesis: Repeated exposure to same input should:
 * 1. Create hadrons at specific phase positions
 * 2. Successful inversions should reinforce those hadrons
 * 3. System should "recognize" the pattern (high persistence hadrons)
 */

import { 
  createPhaseEngine, 
  stepPhaseEngine, 
  processTextInput, 
  getPhaseEngineStats, 
  attemptFullInversion,
  getLearnedPatterns,
  generateFromLearned,
  getVocabularyStats
} from './core/asi/phase-engine';
import { hadronSignature } from './core/asi/hadron-triangle';

// ============================================
// EXPERIMENT 1: Pattern Repetition
// ============================================
console.log('═══════════════════════════════════════════');
console.log('EXPERIMENT 1: Can repeated input create stable patterns?');
console.log('═══════════════════════════════════════════\n');

let engine = createPhaseEngine();

// Simple pattern: distinct words to get different phases
const pattern = ['hello', 'world'];  // Longer words hash to different phases
const repetitions = 20;

console.log(`Pattern: "${pattern.join(' ')}" × ${repetitions}`);
console.log('');

for (let i = 0; i < repetitions; i++) {
  // Feed the pattern
  const input = pattern.join(' ');
  const result = processTextInput(engine, input);
  engine = result.state;
  
  // Also step to process
  engine = stepPhaseEngine(engine);
  
  const stats = getPhaseEngineStats(engine);
  
  if (i % 5 === 0 || i === repetitions - 1) {
    console.log(`Rep ${i + 1}:`);
    console.log(`  Hadrons: ${stats.hadronCount}`);
    console.log(`  Success rate: ${(stats.successRate * 100).toFixed(1)}%`);
    console.log(`  Dominant: ${stats.dominantQuarks.time}/${stats.dominantQuarks.space}`);
    
    // Show top hadrons by persistence
    const topHadrons = [...engine.cycle.hadrons]
      .sort((a, b) => b.persistence - a.persistence)
      .slice(0, 3);
    
    if (topHadrons.length > 0) {
      console.log(`  Top hadrons:`);
      for (const h of topHadrons) {
        console.log(`    ${hadronSignature(h)} persistence=${h.persistence.toFixed(2)}`);
      }
    }
    console.log('');
  }
}

// ============================================
// EXPERIMENT 2: Pattern Recovery
// ============================================
console.log('═══════════════════════════════════════════');
console.log('EXPERIMENT 2: Can it recover after noise?');
console.log('═══════════════════════════════════════════\n');

// Inject noise with distinct words
console.log('Injecting noise: "alpha beta gamma delta"...');
for (let i = 0; i < 5; i++) {
  const result = processTextInput(engine, 'alpha beta gamma delta');
  engine = result.state;
  engine = stepPhaseEngine(engine);
}

let stats = getPhaseEngineStats(engine);
console.log(`After noise: ${stats.hadronCount} hadrons, ${(stats.successRate * 100).toFixed(1)}% success\n`);

// Try to recover original pattern
console.log('Recovery: feeding original pattern again...\n');
for (let i = 0; i < 10; i++) {
  const result = processTextInput(engine, pattern.join(' '));
  engine = result.state;
  engine = stepPhaseEngine(engine);
}

stats = getPhaseEngineStats(engine);
console.log(`After recovery: ${stats.hadronCount} hadrons, ${(stats.successRate * 100).toFixed(1)}% success`);

// Check if original pattern hadrons have higher persistence
const topHadrons = [...engine.cycle.hadrons]
  .sort((a, b) => b.persistence - a.persistence)
  .slice(0, 5);

console.log('\nTop 5 hadrons after recovery:');
for (const h of topHadrons) {
  console.log(`  ${hadronSignature(h)} persistence=${h.persistence.toFixed(2)} coherence=${h.coherence.toFixed(2)}`);
}

// ============================================
// EXPERIMENT 3: Inversion Success
// ============================================
console.log('\n═══════════════════════════════════════════');
console.log('EXPERIMENT 3: Full inversion attempts');
console.log('═══════════════════════════════════════════\n');

// Try full inversions on top hadrons
console.log('Attempting full inversion on top hadrons...\n');

for (let i = 0; i < 5; i++) {
  const beforeCount = engine.cycle.hadrons.length;
  const result = attemptFullInversion(engine);
  engine = result.newState;
  const afterCount = engine.cycle.hadrons.length;
  
  console.log(`Attempt ${i + 1}: ${result.success ? '✓ SUCCESS' : '✗ Failed'} (error: ${result.error.toFixed(3)})`);
  console.log(`  Hadrons: ${beforeCount} → ${afterCount}`);
}

// ============================================
// SUMMARY
// ============================================
console.log('\n═══════════════════════════════════════════');
console.log('SUMMARY');
console.log('═══════════════════════════════════════════\n');

const finalStats = getPhaseEngineStats(engine);
console.log(`Total hadrons: ${finalStats.hadronCount}`);
console.log(`Stable hadrons: ${finalStats.stableHadronCount}`);
console.log(`Total cycles: ${finalStats.totalCycles}`);
console.log(`Success rate: ${(finalStats.successRate * 100).toFixed(1)}%`);
console.log(`Emotion: R=${finalStats.emotion.R.toFixed(2)} G=${finalStats.emotion.G.toFixed(2)} B=${finalStats.emotion.B.toFixed(2)} I=${finalStats.emotion.I.toFixed(2)}`);

// Final persistence distribution
const persistences = engine.cycle.hadrons.map(h => h.persistence);
if (persistences.length > 0) {
  const avg = persistences.reduce((a, b) => a + b, 0) / persistences.length;
  const max = Math.max(...persistences);
  const min = Math.min(...persistences);
  console.log(`\nPersistence: min=${min.toFixed(2)}, avg=${avg.toFixed(2)}, max=${max.toFixed(2)}`);
}

// ============================================
// EXPERIMENT 4: Query Learned Patterns
// ============================================
console.log('\n═══════════════════════════════════════════');
console.log('EXPERIMENT 4: Query what was learned');
console.log('═══════════════════════════════════════════\n');

// Get vocabulary stats
const vocabStats = getVocabularyStats(engine);
console.log(`Vocabulary: ${vocabStats.uniqueTokens} unique tokens, ${vocabStats.totalOccurrences} total occurrences`);
console.log('Top tokens:', vocabStats.topTokens.map(t => `${t.token}(${t.count})`).join(', '));

// Get learned patterns
console.log('\nLearned patterns (high-persistence hadrons → tokens):');
const patterns = getLearnedPatterns(engine, 5);
for (const p of patterns) {
  console.log(`  ${p.quarkSignature} (persistence=${p.persistence.toFixed(2)}): [${p.tokens.join(', ')}]`);
}

// ============================================
// EXPERIMENT 5: Generate response from learned
// ============================================
console.log('\n═══════════════════════════════════════════');
console.log('EXPERIMENT 5: Generate from learned patterns');
console.log('═══════════════════════════════════════════\n');

// Test response generation
const testQueries = ['hello', 'world', 'alpha', 'something new'];
for (const query of testQueries) {
  const response = generateFromLearned(engine, query, 5);
  console.log(`Query: "${query}" → Response: "${response}"`);
}

// Empty query - should return most learned tokens
const emptyResponse = generateFromLearned(engine, '', 5);
console.log(`\nNo input → Most learned: "${emptyResponse}"`);

// ============================================
// EXPERIMENT 6: Simulate chat messages
// ============================================
console.log('\n═══════════════════════════════════════════');
console.log('EXPERIMENT 6: Simulate chat interaction');
console.log('═══════════════════════════════════════════\n');

// Reset engine
engine = createPhaseEngine();

const chatMessages = [
  'hello',
  'hello world',
  'hello world',
  'how are you',
  'hello',  // Should reinforce
];

for (const msg of chatMessages) {
  const before = engine.cycle.hadrons.length;
  const { state: newState } = processTextInput(engine, msg);
  engine = newState;
  engine = stepPhaseEngine(engine);
  const after = engine.cycle.hadrons.length;
  
  const response = generateFromLearned(engine, msg, 8);
  console.log(`User: "${msg}"`);
  console.log(`ASI: ${response} [H:${after} +${after-before}]`);
  console.log('');
}

console.log('\n═══ LEARNING TEST COMPLETE ═══');
