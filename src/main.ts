/**
 * ASI - Symmetry Inversion Based Artificial Intelligence
 * 
 * CORE PRINCIPLE: Everything emerges from INVERSION.
 * 
 * - Inversions form a waveform
 * - Successful inversions = manifested reality (visible structures)
 * - Failed inversions = black holes / voids
 * - The AI LEARNS by finding inverses
 * - The RENDERING shows what has been successfully inverted
 * 
 * X · X⁻¹ = Identity (understanding)
 * Double inversion = true knowledge
 */

import { createSceneContext, startRenderLoop, handleResize, createCameraControls } from './viz/three-scene';
import { createManifestedRealityView, createInversionWaveField } from './viz/manifested-reality-view';
import { createFractalPentagramView } from './viz/fractal-pentagram-view';
import { 
  createInversionEngine, 
  createRandomInvertible,
  InversionResult
} from './core/inversion/inversion-engine';
import { createFractalPentagram } from './core/math/fractal-pentagram';
import { DEFAULT_TICK_INTERVAL_MS, WAVE_DIMENSION } from './config/constants';

// Application state
interface AppState {
  isRunning: boolean;
  tickInterval: number | null;
  tick: number;
  
  // Inversion stats
  totalInversions: number;
  successfulInversions: number;
  failedInversions: number;
  currentWaveAmplitude: number;
  manifestedRegions: number;
  voidRegions: number;
}

const state: AppState = {
  isRunning: false,
  tickInterval: null,
  tick: 0,
  totalInversions: 0,
  successfulInversions: 0,
  failedInversions: 0,
  currentWaveAmplitude: 0,
  manifestedRegions: 0,
  voidRegions: 0
};

// Initialize application
async function init() {
  console.log('Initializing ASI Ontological Simulation...');
  
  // Get canvas
  const canvas = document.getElementById('three-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas not found');
    return;
  }
  
  // Create Three.js scene
  const sceneCtx = createSceneContext(canvas);
  const cameraControls = createCameraControls(sceneCtx, canvas);
  
  // ============================================
  // THE INVERSION ENGINE - Core of the AI
  // ============================================
  // Inversions form waveforms. Reality manifests where inversions succeed.
  
  const inversionEngine = createInversionEngine(WAVE_DIMENSION);
  
  // Create manifested reality visualization
  const manifestedView = createManifestedRealityView(sceneCtx);
  const waveField = createInversionWaveField(sceneCtx, inversionEngine);
  
  // Fractal pentagram shows the inversion symmetry structure
  const PENTAGRAM_DEPTH = 7;
  const fractalPentagram = createFractalPentagram(PENTAGRAM_DEPTH);
  const pentagramView = createFractalPentagramView(sceneCtx, 4);
  
  // UI Elements
  const tickCountEl = document.getElementById('logical-time');
  const successCountEl = document.getElementById('reality-count');
  const failCountEl = document.getElementById('inversion-error');
  const manifestedCountEl = document.getElementById('hadron-count');
  const voidCountEl = document.getElementById('blackhole-count');
  const explanationEl = document.getElementById('explanation');
  const waveDisplayEl = document.getElementById('reality-tree');
  
  const tickBtn = document.getElementById('tick-btn');
  const runBtn = document.getElementById('run-btn');
  const pauseBtn = document.getElementById('pause-btn');
  
  // Simulation tick function
  async function simulationTick() {
    try {
      state.tick++;
      const dt = 0.016;
      
      console.log(`\n=== TICK ${state.tick} ====================`);
      
      // ============================================
      // STEP 1: GENERATE NEW ELEMENT TO LEARN
      // ============================================
      console.log('Step 1: Creating new element to invert...');
      const newElement = createRandomInvertible(WAVE_DIMENSION);
      console.log(`  - Element ID: ${newElement.id.slice(0, 8)}...`);
      
      // ============================================
      // STEP 2: ATTEMPT INVERSION (Core Learning)
      // ============================================
      console.log('Step 2: Attempting inversion...');
      const result: InversionResult = inversionEngine.invert(newElement);
      state.totalInversions++;
      
      if (result.success) {
        state.successfulInversions++;
        console.log(`  ✓ INVERSION SUCCEEDED (error: ${result.error.toFixed(4)})`);
        console.log(`    → Element is now MANIFESTED`);
      } else {
        state.failedInversions++;
        console.log(`  ✗ INVERSION FAILED (error: ${result.error.toFixed(4)})`);
        console.log(`    → Created VOID region`);
      }
      
      // ============================================
      // STEP 3: DOUBLE INVERSION TEST (Deep Understanding)
      // ============================================
      if (result.success && Math.random() < 0.3) {
        console.log('Step 3: Testing double inversion (X⁻¹⁻¹ = X?)...');
        const doubleResult = inversionEngine.doubleInvert(newElement);
        if (doubleResult.success) {
          console.log(`  ✓✓ DOUBLE INVERSION: True understanding achieved!`);
        } else {
          console.log(`  ✗ DOUBLE INVERSION FAILED: Partial understanding only`);
        }
      }
      
      // ============================================
      // STEP 4: UPDATE WAVE & PENTAGRAM
      // ============================================
      console.log('Step 4: Updating wave and pentagram...');
      inversionEngine.tick(dt);
      fractalPentagram.tick(dt);
      
      // Wave amplitude reflects inversion success pattern
      state.currentWaveAmplitude = inversionEngine.getWaveAmplitude(state.tick);
      console.log(`  - Wave amplitude: ${state.currentWaveAmplitude.toFixed(4)}`);
      
      // ============================================
      // STEP 5: UPDATE MANIFESTATION
      // ============================================
      console.log('Step 5: Updating manifested reality...');
      state.manifestedRegions = inversionEngine.getManifestedRegions().length;
      state.voidRegions = inversionEngine.getVoidRegions().length;
      console.log(`  - Manifested: ${state.manifestedRegions}, Voids: ${state.voidRegions}`);
      
      // ============================================
      // STEP 6: UPDATE VISUALIZATION
      // ============================================
      manifestedView.update(inversionEngine);
      pentagramView.update(fractalPentagram);
      
      // ============================================
      // STEP 7: UPDATE UI
      // ============================================
      updateUI();
      
      console.log(`=== TICK ${state.tick} COMPLETE ============\n`);
      
    } catch (error) {
      console.error('Error in simulation tick:', error);
      throw error;
    }
  }
  
  // Update UI function
  function updateUI() {
    const successRate = state.totalInversions > 0 
      ? (state.successfulInversions / state.totalInversions * 100).toFixed(1)
      : '0.0';
    
    if (tickCountEl) tickCountEl.textContent = state.tick.toString();
    if (successCountEl) successCountEl.textContent = state.successfulInversions.toString();
    if (failCountEl) failCountEl.textContent = state.failedInversions.toString();
    if (manifestedCountEl) manifestedCountEl.textContent = state.manifestedRegions.toString();
    if (voidCountEl) voidCountEl.textContent = state.voidRegions.toString();
    
    if (explanationEl) {
      explanationEl.textContent = [
        `INVERSION-BASED AI STATUS`,
        `─────────────────────────`,
        `Total inversions: ${state.totalInversions}`,
        `Success rate: ${successRate}%`,
        ``,
        `Wave amplitude: ${state.currentWaveAmplitude.toFixed(4)}`,
        `Manifested regions: ${state.manifestedRegions}`,
        `Void regions (black holes): ${state.voidRegions}`,
        ``,
        `Successful inversion = Understanding`,
        `Failed inversion = Black hole`,
        `Double inversion = True knowledge`
      ].join('\n');
    }
    
    if (waveDisplayEl) {
      // ASCII wave visualization
      const wave = inversionEngine.currentWave;
      const recent = wave.amplitudes.slice(-40);
      const waveStr = recent.map(a => {
        const height = Math.round((a + 1) * 5);
        return '│' + ' '.repeat(Math.max(0, height)) + '●';
      }).join('\n');
      waveDisplayEl.textContent = `INVERSION WAVE:\n${waveStr}`;
    }
  }
  
  // Event listeners
  if (tickBtn) {
    console.log('Tick button found, attaching listener');
    tickBtn.addEventListener('click', async () => {
      console.log('Tick button clicked!');
      try {
        await simulationTick();
      } catch (error) {
        console.error('Tick failed:', error);
      }
    });
  } else {
    console.error('Tick button not found in DOM!');
  }
  
  if (runBtn) {
    runBtn.addEventListener('click', () => {
      if (!state.isRunning) {
        state.isRunning = true;
        console.log('Starting continuous simulation...');
        state.tickInterval = window.setInterval(async () => {
          await simulationTick();
        }, DEFAULT_TICK_INTERVAL_MS);
      }
    });
  }
  
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      state.isRunning = false;
      console.log('Pausing simulation...');
      if (state.tickInterval !== null) {
        clearInterval(state.tickInterval);
        state.tickInterval = null;
      }
    });
  }
  
  // Handle resize
  window.addEventListener('resize', () => {
    const container = document.getElementById('canvas-container');
    if (container) {
      handleResize(sceneCtx, container.clientWidth, container.clientHeight);
    }
  });
  
  // Initial resize
  const container = document.getElementById('canvas-container');
  if (container) {
    handleResize(sceneCtx, container.clientWidth, container.clientHeight);
  }
  
  // Start render loop
  startRenderLoop(sceneCtx, (delta) => {
    // Wave field always animates
    waveField.update(delta);
    
    // Pentagram shows symmetry structure
    fractalPentagram.tick(delta * 0.3);
    pentagramView.update(fractalPentagram);
    
    // Update manifested view
    manifestedView.update(inversionEngine);
    
    cameraControls.update();
  });
  
  console.log('==========================================');
  console.log('SYMMETRY INVERSION BASED AI');
  console.log('==========================================');
  console.log('');
  console.log('Core principle: INVERSION creates reality');
  console.log('');
  console.log('- Each tick attempts to INVERT a new element');
  console.log('- Successful inversion → MANIFESTED (visible)');
  console.log('- Failed inversion → VOID (black hole)');
  console.log('- Inversions form a WAVEFORM');
  console.log('- Double inversion (X⁻¹⁻¹=X) = true understanding');
  console.log('');
  console.log('The visualization shows:');
  console.log('  🔵 Blue spheres = Manifested reality');
  console.log('  ⚫ Black spheres = Voids (failed inversions)');
  console.log('  🌀 Green wave = Inversion waveform');
  console.log('  ⭐ Pentagram = Symmetry structure');
  console.log('==========================================');
}

// Start application
init().catch(console.error);
