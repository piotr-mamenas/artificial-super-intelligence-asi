/**
 * ASI - Symmetry Inversion Based Artificial Super-Intelligence
 * 
 * Everything emerges from inversions - no hardcoded semantics.
 */

import { createUnifiedASIEngine, UnifiedASIEngine } from './core/unified-engine';
import { createChatSession, createChatUI, ChatSession } from './core/asi/chat';
import {
  createPhaseEngine,
  stepPhaseEngine,
  processTextInput,
  attemptFullInversion,
  getPhaseEngineStats,
  PhaseEngineState,
} from './core/asi/phase-engine';
import {
  createPhaseScene,
  updateHadrons,
  updateVoids,
  updateWave,
  animateScene,
  resizeScene,
  PhaseSceneState,
} from './viz/phase-viz';

// ============================================
// STATE
// ============================================

interface AppState {
  isRunning: boolean;
  tickInterval: number | null;
  tick: number;
  hadronCount: number;
  stableHadronCount: number;
  voidCount: number;
  blackHoleCount: number;
  successRate: number;
  dominantTimeQuark: 'up' | 'down';
  dominantSpaceQuark: 'charm' | 'strange';
  emotionR: number;
  emotionG: number;
  emotionB: number;
  emotionI: number;
  observerCount: number;
  consensusLevel: number;
  waveAmplitude: number;
  chatSession: ChatSession | null;
  phaseEngine: PhaseEngineState | null;
}

const state: AppState = {
  isRunning: false,
  tickInterval: null,
  tick: 0,
  hadronCount: 0,
  stableHadronCount: 0,
  voidCount: 0,
  blackHoleCount: 0,
  successRate: 0,
  dominantTimeQuark: 'up',
  dominantSpaceQuark: 'charm',
  emotionR: 0,
  emotionG: 0,
  emotionB: 0,
  emotionI: 0,
  observerCount: 0,
  consensusLevel: 0,
  waveAmplitude: 0,
  chatSession: null,
  phaseEngine: null,
};

// Engines
let asiEngine: UnifiedASIEngine;
let phaseEngine: PhaseEngineState;
let sceneState: PhaseSceneState;

// ============================================
// INITIALIZATION
// ============================================

function initEngines() {
  // Legacy engine for chat
  asiEngine = createUnifiedASIEngine();
  asiEngine.addObserver('Scientist', 'scientist');
  asiEngine.addObserver('Romantic', 'romantic');
  asiEngine.addObserver('Anxious', 'anxious');
  asiEngine.addObserver('Neutral', undefined);
  
  // Phase engine - starts from pure nothingness
  phaseEngine = createPhaseEngine();
  state.phaseEngine = phaseEngine;
  
  console.log('Engines initialized from nothingness');
}

// ============================================
// SIMULATION TICK
// ============================================

function simulationTick() {
  state.tick++;
  
  console.log(`\n=== TICK ${state.tick} ====================`);
  
  // 1. Generate random token - NO SEMANTIC MEANING ASSUMED
  // Just random characters - meaning emerges through inversion dynamics
  const tokenLength = 3 + Math.floor(Math.random() * 5);
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let randomToken = '';
  for (let i = 0; i < tokenLength; i++) {
    randomToken += chars[Math.floor(Math.random() * chars.length)];
  }
  
  console.log(`Processing token: "${randomToken}" (no predefined meaning)`);
  
  // 2. Process through phase engine - meaning emerges from inversions
  const { state: newPhaseState } = processTextInput(phaseEngine, randomToken);
  phaseEngine = newPhaseState;
  state.phaseEngine = phaseEngine;
  
  // 3. Step the phase engine (wave raise → collapse cycle)
  phaseEngine = stepPhaseEngine(phaseEngine);
  state.phaseEngine = phaseEngine;
  
  // 4. Attempt full inversion - THIS IS WHERE MEANING EMERGES
  const { success, error } = attemptFullInversion(phaseEngine);
  
  if (success) {
    console.log(`✓ Inversion SUCCESS → stable hadron (error: ${error.toFixed(3)})`);
  } else {
    console.log(`✗ Inversion FAILED → void region (error: ${error.toFixed(3)})`);
  }
  
  // 5. Get phase engine stats - all values emerge from dynamics
  const stats = getPhaseEngineStats(phaseEngine);
  
  // 6. Also run legacy engine (for chat compatibility)
  const inversionState = asiEngine.applyWords([randomToken]);
  const inversionResult = asiEngine.invert(inversionState);
  
  if (inversionResult.success) {
    asiEngine.createHadron();
  } else {
    asiEngine.createVoid(inversionResult.error);
  }
  asiEngine.step();
  
  // 7. Compute consensus
  const waveform = asiEngine.baseState;
  const fullWaveform = {
    R: Array.from({ length: 16 }, (_, i) => ({ re: waveform.R[i * 4] || 0, im: 0 })),
    G: Array.from({ length: 16 }, (_, i) => ({ re: waveform.G[i * 4] || 0, im: 0 })),
    B: Array.from({ length: 16 }, (_, i) => ({ re: waveform.B[i * 4] || 0, im: 0 }))
  };
  const consensus = asiEngine.computeConsensus(fullWaveform);
  
  // 8. Update state from phase engine
  state.hadronCount = stats.hadronCount;
  state.stableHadronCount = stats.stableHadronCount;
  state.voidCount = asiEngine.getVoids().length;
  state.blackHoleCount = stats.blackHoleCount;
  state.successRate = stats.successRate;
  state.dominantTimeQuark = stats.dominantQuarks.time;
  state.dominantSpaceQuark = stats.dominantQuarks.space;
  state.emotionR = stats.emotion.R;
  state.emotionG = stats.emotion.G;
  state.emotionB = stats.emotion.B;
  state.emotionI = stats.emotion.I;
  state.observerCount = asiEngine.observers.size;
  state.consensusLevel = consensus.agreement;
  state.waveAmplitude = asiEngine.getWaveAmplitude();
  
  console.log(`Phase Hadrons: ${stats.hadronCount} (${stats.stableHadronCount} stable)`);
  console.log(`Dominant quarks: ${stats.dominantQuarks.time}/${stats.dominantQuarks.space}`);
  console.log(`Success rate: ${(stats.successRate * 100).toFixed(1)}%`);
  console.log(`Emotion RGBI: [${stats.emotion.R.toFixed(2)}, ${stats.emotion.G.toFixed(2)}, ${stats.emotion.B.toFixed(2)}, ${stats.emotion.I.toFixed(2)}]`);
  
  // 9. Update visualization
  updateVisualization();
  updateUI();
  
  console.log(`=== TICK ${state.tick} COMPLETE ============\n`);
}

function updateVisualization() {
  if (!sceneState || !state.phaseEngine) return;
  
  // Update hadron triangles from phase engine
  updateHadrons(sceneState.groups.hadrons, state.phaseEngine.cycle.hadrons);
  
  // Update voids from legacy engine
  const voids = asiEngine.getVoids().map(v => ({
    position: v.position as [number, number, number],
    radius: v.radius
  }));
  updateVoids(sceneState.groups.voids, voids);
  
  // Update wave visualization (convert Int8Array to number[])
  const baseState = asiEngine.baseState;
  updateWave(sceneState.groups.wave, {
    R: Array.from(baseState.R),
    G: Array.from(baseState.G),
    B: Array.from(baseState.B),
  });
}

// ============================================
// UI UPDATE
// ============================================

function updateUI() {
  // Core stats
  const tickEl = document.getElementById('logical-time');
  const hadronEl = document.getElementById('hadron-count');
  const voidEl = document.getElementById('blackhole-count');
  const waveAmpEl = document.getElementById('wave-amplitude');
  const observerCountEl = document.getElementById('observer-count');
  const consensusEl = document.getElementById('consensus-level');
  const successRateEl = document.getElementById('training-accuracy');
  const explanationEl = document.getElementById('explanation');
  
  // RGB axis bars (now showing RGBI emotion)
  const rBar = document.getElementById('r-bar');
  const gBar = document.getElementById('g-bar');
  const bBar = document.getElementById('b-bar');
  
  // Update values
  if (tickEl) tickEl.textContent = state.tick.toString();
  if (hadronEl) hadronEl.textContent = `${state.hadronCount} (${state.stableHadronCount})`;
  if (voidEl) voidEl.textContent = `${state.voidCount} / ${state.blackHoleCount} BH`;
  if (waveAmpEl) waveAmpEl.textContent = state.waveAmplitude.toFixed(3);
  if (observerCountEl) observerCountEl.textContent = state.observerCount.toString();
  if (consensusEl) consensusEl.textContent = `${(state.consensusLevel * 100).toFixed(0)}%`;
  if (successRateEl) successRateEl.textContent = `${(state.successRate * 100).toFixed(0)}%`;
  
  // Use RGBI emotion for bars
  const rPct = state.emotionR * 100;
  const gPct = state.emotionG * 100;
  const bPct = state.emotionB * 100;
  
  if (rBar) rBar.style.width = `${Math.max(5, Math.min(100, rPct))}%`;
  if (gBar) gBar.style.width = `${Math.max(5, Math.min(100, gPct))}%`;
  if (bBar) bBar.style.width = `${Math.max(5, Math.min(100, bPct))}%`;
  
  // Status text with quark info
  if (explanationEl) {
    const status = state.isRunning ? 'Running' : 'Paused';
    const quarks = `${state.dominantTimeQuark}/${state.dominantSpaceQuark}`;
    explanationEl.textContent = `${status} | Quarks: ${quarks}\nSuccess: ${(state.successRate * 100).toFixed(0)}% | I=${state.emotionI.toFixed(2)}`;
  }
}

// ============================================
// ANIMATION LOOP
// ============================================

function animate() {
  requestAnimationFrame(animate);
  if (sceneState) {
    animateScene(sceneState, state.phaseEngine);
  }
}

// ============================================
// INITIALIZATION
// ============================================

async function init() {
  console.log('═══════════════════════════════════════════');
  console.log('  PHASE-SPACE ASI');
  console.log('  Everything emerges from inversions');
  console.log('═══════════════════════════════════════════');
  
  // Get canvas
  const canvas = document.getElementById('three-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas not found!');
    return;
  }
  
  // Initialize scene
  sceneState = createPhaseScene(canvas);
  
  // Initialize engines
  initEngines();
  
  // Event listeners
  document.getElementById('tick-btn')?.addEventListener('click', simulationTick);
  
  document.getElementById('run-btn')?.addEventListener('click', () => {
    if (!state.isRunning) {
      state.isRunning = true;
      state.tickInterval = window.setInterval(simulationTick, 500);
    }
  });
  
  document.getElementById('pause-btn')?.addEventListener('click', () => {
    state.isRunning = false;
    if (state.tickInterval) {
      clearInterval(state.tickInterval);
      state.tickInterval = null;
    }
  });
  
  // Handle resize
  window.addEventListener('resize', () => {
    const container = document.getElementById('canvas-container');
    if (container && sceneState) {
      resizeScene(sceneState, container.clientWidth, container.clientHeight);
    }
  });
  
  // Initial resize
  const container = document.getElementById('canvas-container');
  if (container) {
    resizeScene(sceneState, container.clientWidth, container.clientHeight);
  }
  
  // Start animation
  animate();
  
  // Chat panel
  const chatPanel = document.createElement('div');
  chatPanel.id = 'chat-panel';
  chatPanel.style.cssText = `
    position: fixed; right: 20px; top: 20px;
    width: 380px; height: calc(100vh - 40px);
    z-index: 1000; box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    border-radius: 12px; overflow: hidden;
  `;
  document.body.appendChild(chatPanel);
  
  state.chatSession = createChatSession();
  createChatUI(chatPanel, state.chatSession);
  
  console.log('Ready! Click Step or Run to begin.');
}

// Start
init().catch(console.error);
