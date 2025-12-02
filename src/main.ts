/**
 * ASI - Ontological Simulation Main Entry Point
 * 
 * The FRACTAL PENTAGRAM is the generative core that drives all observations.
 * Nested pentagrams (pentagram within pentagram) at golden ratio scales
 * are what produces reality - the visualization follows from this structure.
 * 
 * Key insight: The pentagram hierarchy IS reality, not just a representation of it.
 */

import { createSceneContext, startRenderLoop, handleResize, createCameraControls } from './viz/three-scene';
import { createFractalPentagramView, createObservationParticles } from './viz/fractal-pentagram-view';
import { createReality, connectSimulatedWorld, tickReality } from './world/reality';
import { createRealityManager } from './world/reality-manager';
import { 
  createFractalPentagram, 
  injectObservation, 
  collapseAtDepth,
  calculatePentagramEnergy,
  PHI 
} from './core/math/fractal-pentagram';
import { createPolicy } from './agent/policy';
import { createGoalSystem, createExplorationGoal } from './reasoning/goals';
import { createInversionGuard } from './learning/inversion-guard';
import { createHadronizer, frameToTraceEntry } from './learning/hadronizer';
import { createBlackHoleDetector } from './nested/black-hole-detector';
import { createKCBSPentagram } from './core/math/kcbs-graph';
import { DEFAULT_TICK_INTERVAL_MS, WAVE_DIMENSION } from './config/constants';

// Application state
interface AppState {
  isRunning: boolean;
  tickInterval: number | null;
  logicalTime: number;
  focusValue: number;
  dispersionValue: number;
  focusDepth: number;      // Which pentagram layer to focus on
  focusEdge: number;       // Which edge (context) within that layer
  pentagramEnergy: number; // Total energy in the fractal structure
}

const state: AppState = {
  isRunning: false,
  tickInterval: null,
  logicalTime: 0,
  focusValue: 50,
  dispersionValue: 50,
  focusDepth: 0,
  focusEdge: 0,
  pentagramEnergy: 0
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
  // THE FRACTAL PENTAGRAM IS THE GENERATIVE CORE
  // ============================================
  // This is not just visualization - this IS the reality generator.
  // Each nested layer corresponds to a scale of observation.
  // The golden ratio (φ) relationships drive all emergent phenomena.
  
  const PENTAGRAM_DEPTH = 7; // 7 nested layers
  const fractalPentagram = createFractalPentagram(PENTAGRAM_DEPTH);
  
  // Create visualization of the fractal pentagram
  const pentagramView = createFractalPentagramView(sceneCtx, 4);
  const observationParticles = createObservationParticles(sceneCtx, fractalPentagram, 4);
  
  // Create KCBS pentagram for policy (maps to outer layer)
  const kcbsPentagram = createKCBSPentagram(0);
  
  // Create reality manager
  const realityManager = createRealityManager('Root Reality');
  const rootReality = realityManager.getRootReality();
  
  // Connect simulated world
  const simulatedWorld = connectSimulatedWorld(rootReality);
  
  // Create agent systems
  const policy = createPolicy(kcbsPentagram);
  const goalSystem = createGoalSystem();
  const explorationGoal = createExplorationGoal(WAVE_DIMENSION);
  goalSystem.addGoal(explorationGoal.name, explorationGoal.goalWave, explorationGoal.priority);
  
  // Create learning systems
  const inversionGuard = createInversionGuard();
  const hadronizer = createHadronizer();
  const blackHoleDetector = createBlackHoleDetector();
  
  // UI Elements
  const logicalTimeEl = document.getElementById('logical-time');
  const realityCountEl = document.getElementById('reality-count');
  const inversionErrorEl = document.getElementById('inversion-error');
  const hadronCountEl = document.getElementById('hadron-count');
  const blackholeCountEl = document.getElementById('blackhole-count');
  const explanationEl = document.getElementById('explanation');
  const realityTreeEl = document.getElementById('reality-tree');
  
  const focusSlider = document.getElementById('focus-slider') as HTMLInputElement;
  const dispersionSlider = document.getElementById('dispersion-slider') as HTMLInputElement;
  const kcbsRotationSlider = document.getElementById('kcbs-rotation') as HTMLInputElement;
  const kcbsContextSelect = document.getElementById('kcbs-context') as HTMLSelectElement;
  
  const tickBtn = document.getElementById('tick-btn');
  const runBtn = document.getElementById('run-btn');
  const pauseBtn = document.getElementById('pause-btn');
  
  // Simulation tick function
  async function simulationTick() {
    state.logicalTime++;
    
    // ============================================
    // STEP 1: FRACTAL PENTAGRAM GENERATES OBSERVATIONS
    // ============================================
    // The pentagram hierarchy IS the source of observations.
    // Time evolution rotates layers at golden-ratio related speeds.
    
    const dt = 0.016; // ~60fps timestep
    fractalPentagram.tick(dt);
    
    // Get observation from the focused depth layer
    const pentagramObservation = fractalPentagram.getObservation(state.focusDepth);
    
    // Inject this observation into the world (pentagram drives reality)
    injectObservation(fractalPentagram, rootReality.currentFrame.closureState);
    
    // Calculate total energy in the pentagram structure
    state.pentagramEnergy = calculatePentagramEnergy(fractalPentagram);
    
    // ============================================
    // STEP 2: WORLD RESPONDS TO PENTAGRAM STATE
    // ============================================
    await simulatedWorld.generateObservations();
    await tickReality(rootReality);
    
    const frame = rootReality.currentFrame;
    
    // ============================================
    // STEP 3: AGENT DECIDES BASED ON PENTAGRAM
    // ============================================
    const decision = policy.decide(frame);
    const measurementResult = policy.execute(decision, frame);
    
    // Agent's focus selection affects pentagram
    state.focusEdge = decision.context.edgeIndex;
    fractalPentagram.setContextFocus(state.focusDepth, state.focusEdge);
    
    // ============================================
    // STEP 4: COLLAPSE AT FOCUSED DEPTH
    // ============================================
    // Measurement collapses the pentagram at the focused layer
    // and propagates outward (this is how observation becomes fact)
    if (Math.random() < 0.1) { // Occasional collapse events
      const collapse = collapseAtDepth(fractalPentagram, state.focusDepth);
      console.log(`Collapse at depth ${state.focusDepth}: outcome ${collapse.outcome}`);
    }
    
    // ============================================
    // STEP 5: INVERSION CHECK & BLACK HOLES
    // ============================================
    const inversionResult = await inversionGuard.check(frame);
    
    const blackHole = await blackHoleDetector.tryUpdate(frame, inversionResult);
    if (blackHole) {
      rootReality.blackHoles.push(blackHole);
      
      // Black holes correspond to inner pentagram layers becoming
      // disconnected from outer layers (information loss)
      const readyRegions = blackHoleDetector.getReadyRegions();
      for (const region of readyRegions) {
        const nested = realityManager.spawnNestedReality(rootReality.id, region);
        if (nested) {
          console.log(`Spawned nested reality: ${nested.name}`);
          // Nested reality gets its own pentagram hierarchy
        }
      }
    }
    
    // ============================================
    // STEP 6: HADRONIZATION (STABLE PATTERNS)
    // ============================================
    const traceEntry = frameToTraceEntry(frame);
    await hadronizer.updateFromTraces([traceEntry]);
    rootReality.hadrons = hadronizer.getStableHadrons();
    
    // ============================================
    // STEP 7: UPDATE VISUALIZATION & UI
    // ============================================
    pentagramView.update(fractalPentagram);
    pentagramView.setFocusDepth(state.focusDepth);
    pentagramView.setFocusEdge(state.focusEdge);
    
    updateUI({
      logicalTime: state.logicalTime,
      realityCount: realityManager.realities.size,
      inversionError: inversionResult.reconstructionError,
      hadronCount: rootReality.hadrons.length,
      blackholeCount: rootReality.blackHoles.length,
      pentagramEnergy: state.pentagramEnergy,
      focusDepth: state.focusDepth,
      explanation: [
        `Pentagram Energy: ${state.pentagramEnergy.toFixed(3)}`,
        `Focus: Layer ${state.focusDepth}, Edge ${state.focusEdge}`,
        `Golden Ratio Scale: ${Math.pow(PHI, -state.focusDepth).toFixed(4)}`,
        ...decision.reasoning
      ].join('\n'),
      realityTree: formatRealityTree(realityManager.getHierarchy())
    });
    
    // Learn from result
    const reward = inversionResult.isInvertible ? 0.1 : -0.1;
    policy.learn(measurementResult, reward);
    goalSystem.updateFromClosure(frame.id, reward);
  }
  
  // Update UI function
  function updateUI(data: {
    logicalTime: number;
    realityCount: number;
    inversionError: number;
    hadronCount: number;
    blackholeCount: number;
    pentagramEnergy: number;
    focusDepth: number;
    explanation: string;
    realityTree: string;
  }) {
    if (logicalTimeEl) logicalTimeEl.textContent = data.logicalTime.toString();
    if (realityCountEl) realityCountEl.textContent = data.realityCount.toString();
    if (inversionErrorEl) inversionErrorEl.textContent = data.inversionError.toFixed(4);
    if (hadronCountEl) hadronCountEl.textContent = data.hadronCount.toString();
    if (blackholeCountEl) blackholeCountEl.textContent = data.blackholeCount.toString();
    if (explanationEl) explanationEl.textContent = data.explanation;
    if (realityTreeEl) realityTreeEl.textContent = data.realityTree;
    
    // Update depth slider if it exists
    const depthDisplay = document.getElementById('focus-depth-display');
    if (depthDisplay) depthDisplay.textContent = data.focusDepth.toString();
  }
  
  // Format reality tree for display
  function formatRealityTree(tree: any, indent: string = ''): string {
    let result = `${indent}${tree.name} (depth: ${tree.depth})\n`;
    for (const child of tree.children || []) {
      result += formatRealityTree(child, indent + '  ');
    }
    return result;
  }
  
  // Event listeners
  if (focusSlider) {
    focusSlider.addEventListener('input', () => {
      state.focusValue = parseInt(focusSlider.value);
    });
  }
  
  if (dispersionSlider) {
    dispersionSlider.addEventListener('input', () => {
      state.dispersionValue = parseInt(dispersionSlider.value);
    });
  }
  
  // Depth slider controls which pentagram layer to focus on
  if (kcbsRotationSlider) {
    kcbsRotationSlider.addEventListener('input', () => {
      // Repurpose rotation slider as depth selector (0-6 for 7 layers)
      const depth = Math.floor(parseInt(kcbsRotationSlider.value) / 60); // 0-6
      state.focusDepth = Math.min(depth, PENTAGRAM_DEPTH - 1);
      pentagramView.setFocusDepth(state.focusDepth);
      fractalPentagram.setContextFocus(state.focusDepth, state.focusEdge);
    });
  }
  
  // Context selector controls which edge to focus on
  if (kcbsContextSelect) {
    kcbsContextSelect.addEventListener('change', () => {
      const idx = parseInt(kcbsContextSelect.value);
      state.focusEdge = idx;
      pentagramView.setFocusEdge(idx);
      fractalPentagram.setContextFocus(state.focusDepth, state.focusEdge);
    });
  }
  
  if (tickBtn) {
    tickBtn.addEventListener('click', async () => {
      await simulationTick();
    });
  }
  
  if (runBtn) {
    runBtn.addEventListener('click', () => {
      if (!state.isRunning) {
        state.isRunning = true;
        rootReality.start();
        state.tickInterval = window.setInterval(async () => {
          await simulationTick();
        }, DEFAULT_TICK_INTERVAL_MS);
      }
    });
  }
  
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      state.isRunning = false;
      rootReality.stop();
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
  
  // Start render loop - pentagram rotates continuously as the generative core
  startRenderLoop(sceneCtx, (delta) => {
    // The fractal pentagram continuously evolves even when simulation is paused
    // This represents the underlying reality structure always in motion
    fractalPentagram.tick(delta * 0.5); // Slower background evolution
    pentagramView.update(fractalPentagram);
    observationParticles.update(delta);
    cameraControls.update();
  });
  
  console.log('ASI Ontological Simulation initialized');
  console.log('==========================================');
  console.log('The FRACTAL PENTAGRAM is the generative core.');
  console.log('Nested pentagrams at golden ratio scales PRODUCE observations.');
  console.log('- Outer layers: macroscopic observations');
  console.log('- Inner layers: microscopic/quantum observations');
  console.log('- φ (phi) ratio: 1.618... connects all scales');
  console.log('==========================================');
}

// Start application
init().catch(console.error);
