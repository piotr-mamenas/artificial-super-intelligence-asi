/**
 * ASI - Ontological Simulation Main Entry Point
 * 
 * Implements the inversion-closure ontology with:
 * - KCBS pentagram observation geometry
 * - Wave focus/dispersion control
 * - Nested realities from black holes
 * - Three.js visualization
 */

import { createSceneContext, startRenderLoop, handleResize, createCameraControls } from './viz/three-scene';
import { createPentagramView, animatePentagramRotation } from './viz/pentagram-view';
import { createReality, connectSimulatedWorld, tickReality } from './world/reality';
import { createRealityManager } from './world/reality-manager';
import { createKCBSPentagram, KCBSPentagramRotation } from './core/math/kcbs-graph';
import { createPolicy } from './agent/policy';
import { createGoalSystem, createExplorationGoal } from './reasoning/goals';
import { createInversionGuard } from './learning/inversion-guard';
import { createHadronizer, frameToTraceEntry } from './learning/hadronizer';
import { createBlackHoleDetector } from './nested/black-hole-detector';
import { createTraceStore } from './interpretability/trace';
import { DEFAULT_TICK_INTERVAL_MS, WAVE_DIMENSION } from './config/constants';

// Application state
interface AppState {
  isRunning: boolean;
  tickInterval: number | null;
  logicalTime: number;
  focusValue: number;
  dispersionValue: number;
  kcbsRotation: number;
  selectedContext: number;
}

const state: AppState = {
  isRunning: false,
  tickInterval: null,
  logicalTime: 0,
  focusValue: 50,
  dispersionValue: 50,
  kcbsRotation: 0,
  selectedContext: 0
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
  
  // Create KCBS pentagram
  const pentagram = createKCBSPentagram(0);
  const pentagramView = createPentagramView(sceneCtx, 3);
  
  // Create reality manager
  const realityManager = createRealityManager('Root Reality');
  const rootReality = realityManager.getRootReality();
  
  // Connect simulated world
  const simulatedWorld = connectSimulatedWorld(rootReality);
  
  // Create agent systems
  const policy = createPolicy(pentagram);
  const goalSystem = createGoalSystem();
  const explorationGoal = createExplorationGoal(WAVE_DIMENSION);
  goalSystem.addGoal(explorationGoal.name, explorationGoal.goalWave, explorationGoal.priority);
  
  // Create learning systems
  const inversionGuard = createInversionGuard();
  const hadronizer = createHadronizer();
  const blackHoleDetector = createBlackHoleDetector();
  const traceStore = createTraceStore();
  
  // Pentagram animation
  const pentagramAnimation = animatePentagramRotation(pentagramView, pentagram, 0.0005);
  
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
    
    // Generate observations from simulated world
    await simulatedWorld.generateObservations();
    
    // Run reality tick (unconscious loop)
    await tickReality(rootReality);
    
    // Get current frame
    const frame = rootReality.currentFrame;
    
    // Conscious loop: policy decision
    const goals = goalSystem.getActiveGoals();
    const progress = goalSystem.evaluateProgress(frame.closureState);
    const decision = policy.decide(frame);
    
    // Execute decision
    const measurementResult = policy.execute(decision, frame);
    
    // Inversion check
    const inversionResult = await inversionGuard.check(frame);
    
    // Black hole detection
    const blackHole = await blackHoleDetector.tryUpdate(frame, inversionResult);
    if (blackHole) {
      rootReality.blackHoles.push(blackHole);
      
      // Check if should spawn nested reality
      const readyRegions = blackHoleDetector.getReadyRegions();
      for (const region of readyRegions) {
        const nested = realityManager.spawnNestedReality(rootReality.id, region);
        if (nested) {
          console.log(`Spawned nested reality: ${nested.name}`);
        }
      }
    }
    
    // Hadronization
    const traceEntry = frameToTraceEntry(frame);
    const hadrons = await hadronizer.updateFromTraces([traceEntry]);
    rootReality.hadrons = hadronizer.getStableHadrons();
    
    // Update KCBS pentagram rotation based on decision
    state.kcbsRotation = decision.rotation.angle * (180 / Math.PI);
    state.selectedContext = decision.context.edgeIndex;
    pentagramView.highlightContext(decision.context);
    
    // Update UI
    updateUI({
      logicalTime: state.logicalTime,
      realityCount: realityManager.realities.size,
      inversionError: inversionResult.reconstructionError,
      hadronCount: rootReality.hadrons.length,
      blackholeCount: rootReality.blackHoles.length,
      explanation: decision.reasoning.join('\n'),
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
  
  if (kcbsRotationSlider) {
    kcbsRotationSlider.addEventListener('input', () => {
      const angle = parseInt(kcbsRotationSlider.value) * Math.PI / 180;
      const rotation: KCBSPentagramRotation = {
        angle,
        pentagram,
        rotatedDirections: pentagram.observables.map(obs => {
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          const dir = obs.direction;
          return new Float32Array([
            dir[0] * cos - dir[1] * sin,
            dir[0] * sin + dir[1] * cos,
            dir[2]
          ]);
        })
      };
      pentagramView.updateRotation(rotation);
    });
  }
  
  if (kcbsContextSelect) {
    kcbsContextSelect.addEventListener('change', () => {
      const idx = parseInt(kcbsContextSelect.value);
      pentagramView.highlightContext(pentagram.contexts[idx]);
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
  
  // Start render loop
  startRenderLoop(sceneCtx, (delta) => {
    pentagramAnimation.update(delta);
    cameraControls.update();
  });
  
  console.log('ASI Ontological Simulation initialized');
  console.log('Click "Single Tick" to step through simulation or "Run Simulation" to start continuous simulation');
}

// Start application
init().catch(console.error);
