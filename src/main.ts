/**
 * ASI - Artificial Super Intelligence
 * Main entry point with QFT-Structured Reasoning demonstration
 */

import {
  // World & Engine
  createWorldState, addProposition, addGate, runReasoning,
  WorldState, worldSummary, getProbYes,
  
  // Propositions
  propYes, propNo, propUncertain,
  
  // Hadrons
  proton, neutron,
  
  // Gates
  ifThenGate, soGate,
  
  // Metrics
  computeWorldMetrics, computeSpatialMetrics,
} from './reasoning';

// ============================================================
// Demo: Simple Reasoning Scenario
// ============================================================

function createDemoWorld(): WorldState {
  let world = createWorldState(1e-6, 50);
  
  // Create propositions as baryons (protons at different positions)
  // "It is raining" - initially YES (certain)
  world = addProposition(world, propYes('rain', proton(0)));
  
  // "I have an umbrella" - initially NO
  world = addProposition(world, propNo('umbrella', proton(1)));
  
  // "I will get wet" - uncertain
  world = addProposition(world, propUncertain('wet', proton(2)));
  
  // "The ground is slippery" - uncertain
  world = addProposition(world, propUncertain('slippery', neutron(0)));
  
  // Add reasoning gates
  // IF rain THEN wet (if it's raining, I'll get wet)
  world = addGate(world, ifThenGate('rain', 'wet', [1, 0, 0], Math.PI * 0.8));
  
  // IF umbrella THEN NOT wet (having umbrella prevents getting wet)
  world = addGate(world, ifThenGate('umbrella', 'wet', [1, 0, 0], -Math.PI * 0.6));
  
  // IF rain THEN slippery (rain makes ground slippery)
  world = addGate(world, ifThenGate('rain', 'slippery', [1, 0, 0], Math.PI * 0.7));
  
  // Record observations
  world = addGate(world, soGate('wet'));
  world = addGate(world, soGate('slippery'));
  
  return world;
}

// ============================================================
// UI State
// ============================================================

interface UIState {
  world: WorldState;
  running: boolean;
  intervalId: number | null;
}

const state: UIState = {
  world: createDemoWorld(),
  running: false,
  intervalId: null,
};

// ============================================================
// UI Update Functions
// ============================================================

function updateUI(): void {
  const world = state.world;
  
  // Update logical time
  const timeEl = document.getElementById('logical-time');
  if (timeEl) timeEl.textContent = world.logicalTime.toString();
  
  // Update proposition probabilities (mapped to RGB bars)
  updatePropBar('rain', 'r-bar');
  updatePropBar('umbrella', 'g-bar');
  updatePropBar('wet', 'b-bar');
  
  // Update hadron count
  const hadronEl = document.getElementById('hadron-count');
  if (hadronEl) {
    const total = world.props.size;
    const stable = Array.from(world.props.values()).filter(p => {
      const py = getProbYes(world, p.id) ?? 0.5;
      return py > 0.9 || py < 0.1;
    }).length;
    hadronEl.textContent = `${total} (${stable})`;
  }
  
  // Update metrics
  const metrics = computeWorldMetrics(world);
  const spatial = computeSpatialMetrics(world);
  
  // Wave amplitude (average belief strength)
  const waveEl = document.getElementById('wave-amplitude');
  if (waveEl) {
    let totalStrength = 0;
    for (const m of metrics.values()) {
      totalStrength += m.beliefStrength;
    }
    const avgStrength = metrics.size > 0 ? totalStrength / metrics.size : 0;
    waveEl.textContent = avgStrength.toFixed(3);
  }
  
  // Consensus level (coherence)
  const consensusEl = document.getElementById('consensus-level');
  if (consensusEl) {
    consensusEl.textContent = `${(spatial.coherence * 100).toFixed(0)}%`;
  }
  
  // Observer count
  const observerEl = document.getElementById('observer-count');
  if (observerEl) {
    observerEl.textContent = world.props.size.toString();
  }
  
  // Training accuracy (placeholder - based on stable props)
  const accuracyEl = document.getElementById('training-accuracy');
  if (accuracyEl) {
    const stableRatio = world.props.size > 0 
      ? Array.from(world.props.values()).filter(p => {
          const py = getProbYes(world, p.id) ?? 0.5;
          return py > 0.8 || py < 0.2;
        }).length / world.props.size
      : 0;
    accuracyEl.textContent = `${(stableRatio * 100).toFixed(0)}%`;
  }
  
  // Update explanation
  updateExplanation();
}

function updatePropBar(propId: string, barId: string): void {
  const bar = document.getElementById(barId);
  if (!bar) return;
  
  const py = getProbYes(state.world, propId);
  if (py !== undefined) {
    bar.style.width = `${py * 100}%`;
  }
}

function updateExplanation(): void {
  const el = document.getElementById('explanation');
  if (!el) return;
  
  const world = state.world;
  const lines: string[] = [];
  
  for (const [id, _prop] of world.props) {
    const py = getProbYes(world, id) ?? 0.5;
    let status: string;
    if (py > 0.9) status = 'TRUE';
    else if (py > 0.6) status = 'likely';
    else if (py > 0.4) status = 'uncertain';
    else if (py > 0.1) status = 'unlikely';
    else status = 'FALSE';
    
    lines.push(`${id}: ${(py * 100).toFixed(1)}% (${status})`);
  }
  
  el.textContent = lines.join('\n');
}

// ============================================================
// Control Functions
// ============================================================

function tick(): void {
  state.world = runReasoning(state.world, 1);
  updateUI();
  console.log(worldSummary(state.world));
}

function startRunning(): void {
  if (state.running) return;
  state.running = true;
  state.intervalId = window.setInterval(tick, 500);
}

function stopRunning(): void {
  if (!state.running) return;
  state.running = false;
  if (state.intervalId !== null) {
    window.clearInterval(state.intervalId);
    state.intervalId = null;
  }
}

function reset(): void {
  stopRunning();
  state.world = createDemoWorld();
  updateUI();
}

// ============================================================
// Initialization
// ============================================================

function init(): void {
  // Set up button handlers
  const tickBtn = document.getElementById('tick-btn');
  const runBtn = document.getElementById('run-btn');
  const pauseBtn = document.getElementById('pause-btn');
  
  if (tickBtn) tickBtn.addEventListener('click', tick);
  if (runBtn) runBtn.addEventListener('click', startRunning);
  if (pauseBtn) {
    pauseBtn.addEventListener('click', stopRunning);
    pauseBtn.addEventListener('dblclick', reset); // Double-click to reset
  }
  
  // Initial UI update
  updateUI();
  
  // Log initial state
  console.log('=== QFT-Structured Reasoning Engine ===');
  console.log('Propositions encoded as spin states of baryons');
  console.log('Gates: IF_THEN, NOT, ROT, PHASE, SO, BUT, UNLESS');
  console.log('');
  console.log(worldSummary(state.world));
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Export for debugging
(window as unknown as { asiState: UIState }).asiState = state;
