/**
 * ASI - Symmetry Inversion Based Artificial Intelligence
 * 
 * Built on:
 * - Spinning nothingness as fundamental substrate
 * - Double inversions (J² = Identity)
 * - RGB semantic axes (love/hate, hope/fear, sincerity/emptiness)
 * - Waveforms as traces of inversion history
 * - Multiple observers with consensus-driven manifestation
 * - No LLMs - pure math and algorithms
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createUnifiedASIEngine, UnifiedASIEngine, Hadron, Void, Observer } from './core/unified-engine';
import { createTrainingSession, createSentimentBatch, TrainingSession } from './core/asi/training';
import { createChatSession, createChatUI, ChatSession } from './core/asi/chat';

// ============================================
// APPLICATION STATE
// ============================================

interface AppState {
  isRunning: boolean;
  tickInterval: number | null;
  tick: number;
  
  // ASI stats
  hadronCount: number;
  voidCount: number;
  observerCount: number;
  consensusLevel: number;
  waveAmplitude: number;
  
  // Training stats
  trainingAccuracy: number;
  predictions: string[];
  
  // Chat
  chatSession: ChatSession | null;
}

const state: AppState = {
  isRunning: false,
  tickInterval: null,
  tick: 0,
  hadronCount: 0,
  voidCount: 0,
  observerCount: 0,
  consensusLevel: 0,
  waveAmplitude: 0,
  trainingAccuracy: 0.5,
  predictions: [],
  chatSession: null,
};

// ============================================
// THREE.JS SETUP
// ============================================

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;

// Mesh groups
let hadronMeshes: THREE.Group;
let voidMeshes: THREE.Group;
let waveMesh: THREE.Line;
let observerMeshes: THREE.Group;
let axisMeshes: THREE.Group;

// ASI Engine
let asiEngine: UnifiedASIEngine;
let trainingSession: TrainingSession;

function initThreeJS(canvas: HTMLCanvasElement) {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a1a);
  
  // Camera
  camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
  camera.position.set(15, 10, 15);
  camera.lookAt(0, 0, 0);
  
  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  
  // Controls
  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  
  // Lighting
  const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
  scene.add(ambientLight);
  
  const pointLight = new THREE.PointLight(0xffffff, 1, 100);
  pointLight.position.set(10, 10, 10);
  scene.add(pointLight);
  
  const pointLight2 = new THREE.PointLight(0x4080ff, 0.5, 100);
  pointLight2.position.set(-10, -5, -10);
  scene.add(pointLight2);
  
  // Create mesh groups
  hadronMeshes = new THREE.Group();
  hadronMeshes.name = 'hadrons';
  scene.add(hadronMeshes);
  
  voidMeshes = new THREE.Group();
  voidMeshes.name = 'voids';
  scene.add(voidMeshes);
  
  observerMeshes = new THREE.Group();
  observerMeshes.name = 'observers';
  scene.add(observerMeshes);
  
  // RGB Axes visualization
  axisMeshes = new THREE.Group();
  createAxesVisualization();
  scene.add(axisMeshes);
  
  // Wave line
  const waveGeometry = new THREE.BufferGeometry();
  const waveMaterial = new THREE.LineBasicMaterial({ 
    color: 0x00ff88,
    linewidth: 2,
    transparent: true,
    opacity: 0.8
  });
  waveMesh = new THREE.Line(waveGeometry, waveMaterial);
  scene.add(waveMesh);
  
  // Grid helper
  const gridHelper = new THREE.GridHelper(20, 20, 0x333366, 0x222244);
  scene.add(gridHelper);
}

function createAxesVisualization() {
  // R axis (love/hate) - Red
  const rGeom = new THREE.CylinderGeometry(0.05, 0.05, 10, 8);
  const rMat = new THREE.MeshPhongMaterial({ color: 0xff4444 });
  const rAxis = new THREE.Mesh(rGeom, rMat);
  rAxis.position.set(5, 0, 0);
  rAxis.rotation.z = Math.PI / 2;
  axisMeshes.add(rAxis);
  
  // G axis (hope/fear) - Green
  const gGeom = new THREE.CylinderGeometry(0.05, 0.05, 10, 8);
  const gMat = new THREE.MeshPhongMaterial({ color: 0x44ff44 });
  const gAxis = new THREE.Mesh(gGeom, gMat);
  gAxis.position.set(0, 5, 0);
  axisMeshes.add(gAxis);
  
  // B axis (sincerity/emptiness) - Blue
  const bGeom = new THREE.CylinderGeometry(0.05, 0.05, 10, 8);
  const bMat = new THREE.MeshPhongMaterial({ color: 0x4444ff });
  const bAxis = new THREE.Mesh(bGeom, bMat);
  bAxis.position.set(0, 0, 5);
  bAxis.rotation.x = Math.PI / 2;
  axisMeshes.add(bAxis);
  
  // Axis labels (using sprites)
  addAxisLabel('R: Love ↔ Hate', new THREE.Vector3(10, 0, 0), 0xff4444);
  addAxisLabel('G: Hope ↔ Fear', new THREE.Vector3(0, 10, 0), 0x44ff44);
  addAxisLabel('B: Truth ↔ Empty', new THREE.Vector3(0, 0, 10), 0x4444ff);
}

function addAxisLabel(text: string, position: THREE.Vector3, _color: number) {
  // Create canvas for text
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = 256;
  canvas.height = 64;
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.font = '24px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 8);
  
  const texture = new THREE.CanvasTexture(canvas);
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.position.copy(position);
  sprite.scale.set(4, 1, 1);
  axisMeshes.add(sprite);
}

// ============================================
// VISUALIZATION UPDATE
// ============================================

function updateHadronVisualization(hadrons: Hadron[]) {
  // Clear existing
  while (hadronMeshes.children.length > 0) {
    const child = hadronMeshes.children[0];
    hadronMeshes.remove(child);
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      (child.material as THREE.Material).dispose();
    }
  }
  
  // Create new hadron meshes
  for (const hadron of hadrons) {
    const color = hadron.emotionalColor;
    const rgb = new THREE.Color(
      (color.R + 1) / 2,
      (color.G + 1) / 2,
      (color.B + 1) / 2
    );
    
    const geometry = new THREE.SphereGeometry(0.2 + hadron.stability * 0.3, 16, 16);
    const material = new THREE.MeshPhongMaterial({
      color: rgb,
      emissive: rgb,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.7 + hadron.stability * 0.3
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...hadron.position);
    hadronMeshes.add(mesh);
  }
}

function updateVoidVisualization(voids: Void[]) {
  // Clear existing
  while (voidMeshes.children.length > 0) {
    const child = voidMeshes.children[0];
    voidMeshes.remove(child);
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      (child.material as THREE.Material).dispose();
    }
  }
  
  // Create new void meshes
  for (const v of voids) {
    const geometry = new THREE.SphereGeometry(v.radius, 16, 16);
    const material = new THREE.MeshPhongMaterial({
      color: 0x111122,
      emissive: 0x220022,
      emissiveIntensity: 0.2,
      transparent: true,
      opacity: 0.8
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...v.position);
    voidMeshes.add(mesh);
  }
}

function updateObserverVisualization(observers: Map<string, Observer>) {
  // Clear existing
  while (observerMeshes.children.length > 0) {
    const child = observerMeshes.children[0];
    observerMeshes.remove(child);
  }
  
  // Position observers in a circle
  const observerArray = Array.from(observers.values());
  const radius = 8;
  
  observerArray.forEach((_observer, index) => {
    const angle = (index / observerArray.length) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    
    // Observer represented as pyramid
    const geometry = new THREE.ConeGeometry(0.5, 1, 4);
    const material = new THREE.MeshPhongMaterial({
      color: 0x88aaff,
      emissive: 0x2244aa,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.8
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, 1, z);
    mesh.lookAt(0, 0, 0);
    observerMeshes.add(mesh);
    
    // Connection lines to center
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, 1, z),
      new THREE.Vector3(0, 0, 0)
    ]);
    const lineMaterial = new THREE.LineBasicMaterial({ 
      color: 0x4466aa, 
      transparent: true, 
      opacity: 0.3 
    });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    observerMeshes.add(line);
  });
}

function updateWaveVisualization(engine: UnifiedASIEngine) {
  const waveform = engine.baseState;
  const points: THREE.Vector3[] = [];
  
  // Create spiral wave from inversion history
  for (let i = 0; i < 64; i++) {
    const t = i / 64;
    const r = waveform.R[i] || 0;
    const g = waveform.G[i] || 0;
    const b = waveform.B[i] || 0;
    
    const angle = t * Math.PI * 4;
    const radius = 3 + t * 2;
    const x = Math.cos(angle) * radius + r * 0.5;
    const y = t * 5 - 2.5 + g * 0.5;
    const z = Math.sin(angle) * radius + b * 0.5;
    
    points.push(new THREE.Vector3(x, y, z));
  }
  
  waveMesh.geometry.dispose();
  waveMesh.geometry = new THREE.BufferGeometry().setFromPoints(points);
}

// ============================================
// ASI INITIALIZATION
// ============================================

function initASI() {
  // Create unified engine
  asiEngine = createUnifiedASIEngine();
  
  // Add observers with different archetypes
  asiEngine.addObserver('Scientist', 'scientist');
  asiEngine.addObserver('Romantic', 'romantic');
  asiEngine.addObserver('Anxious', 'anxious');
  asiEngine.addObserver('Neutral', undefined);
  
  console.log('ASI Engine initialized with 4 observers');
  
  // Create training session
  trainingSession = createTrainingSession();
  trainingSession.addObserver('Learner1', 'scientist');
  trainingSession.addObserver('Learner2', 'romantic');
  trainingSession.addObserver('Learner3', 'neutral');
  trainingSession.loadBatch(createSentimentBatch());
  
  console.log('Training session initialized with sentiment data');
}

// ============================================
// SIMULATION TICK
// ============================================

function simulationTick() {
  state.tick++;
  
  console.log(`\n=== TICK ${state.tick} ====================`);
  
  // 1. Create random element and attempt inversion
  const words = ['love', 'hope', 'fear', 'truth', 'hate', 'peace'];
  const randomWords = [words[Math.floor(Math.random() * words.length)]];
  
  console.log(`Applying words: ${randomWords.join(', ')}`);
  const inversionState = asiEngine.applyWords(randomWords);
  
  // 2. Attempt inversion
  const inversionResult = asiEngine.invert(inversionState);
  
  if (inversionResult.success) {
    const hadron = asiEngine.createHadron();
    console.log(`✓ Inversion SUCCESS → Hadron created (energy: ${hadron.energy.toFixed(3)})`);
  } else {
    asiEngine.createVoid(inversionResult.error);
    console.log(`✗ Inversion FAILED → Void created (error: ${inversionResult.error.toFixed(3)})`);
  }
  
  // 3. Double inversion test
  if (inversionResult.success && Math.random() < 0.3) {
    const doubleResult = asiEngine.doubleInvert(inversionState);
    if (doubleResult.success) {
      console.log(`✓✓ DOUBLE INVERSION: True knowledge (J² = Id)`);
    }
  }
  
  // 4. Update engine
  asiEngine.step();
  
  // 5. Compute consensus among observers
  const waveform = asiEngine.baseState;
  const fullWaveform = {
    R: Array.from({ length: 16 }, (_, i) => ({ re: waveform.R[i * 4] || 0, im: 0 })),
    G: Array.from({ length: 16 }, (_, i) => ({ re: waveform.G[i * 4] || 0, im: 0 })),
    B: Array.from({ length: 16 }, (_, i) => ({ re: waveform.B[i * 4] || 0, im: 0 }))
  };
  const consensus = asiEngine.computeConsensus(fullWaveform);
  
  // 6. Update state
  state.hadronCount = asiEngine.getHadrons().length;
  state.voidCount = asiEngine.getVoids().length;
  state.observerCount = asiEngine.observers.size;
  state.consensusLevel = consensus.agreement;
  state.waveAmplitude = asiEngine.getWaveAmplitude();
  
  console.log(`Hadrons: ${state.hadronCount}, Voids: ${state.voidCount}`);
  console.log(`Observer consensus: ${(consensus.agreement * 100).toFixed(1)}%`);
  console.log(`Wave amplitude: ${state.waveAmplitude.toFixed(4)}`);
  
  // 7. Training step (occasionally)
  if (state.tick % 10 === 0) {
    const result = trainingSession.train('sentiment', 20);
    state.trainingAccuracy = result.finalAccuracy;
    console.log(`Training accuracy: ${(state.trainingAccuracy * 100).toFixed(1)}%`);
  }
  
  // 8. Update visualization
  updateVisualization();
  updateUI();
  
  console.log(`=== TICK ${state.tick} COMPLETE ============\n`);
}

function updateVisualization() {
  updateHadronVisualization(asiEngine.getHadrons());
  updateVoidVisualization(asiEngine.getVoids());
  updateObserverVisualization(asiEngine.observers);
  updateWaveVisualization(asiEngine);
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
  const trainingAccEl = document.getElementById('training-accuracy');
  const explanationEl = document.getElementById('explanation');
  
  // RGB axis bars
  const rBar = document.getElementById('r-bar');
  const gBar = document.getElementById('g-bar');
  const bBar = document.getElementById('b-bar');
  
  // Update values
  if (tickEl) tickEl.textContent = state.tick.toString();
  if (hadronEl) hadronEl.textContent = state.hadronCount.toString();
  if (voidEl) voidEl.textContent = state.voidCount.toString();
  if (waveAmpEl) waveAmpEl.textContent = state.waveAmplitude.toFixed(3);
  if (observerCountEl) observerCountEl.textContent = state.observerCount.toString();
  if (consensusEl) consensusEl.textContent = `${(state.consensusLevel * 100).toFixed(0)}%`;
  if (trainingAccEl) trainingAccEl.textContent = `${(state.trainingAccuracy * 100).toFixed(0)}%`;
  
  // Calculate RGB averages for bars
  let rAvg = 0, gAvg = 0, bAvg = 0;
  const baseState = asiEngine.baseState;
  for (let i = 0; i < 64; i++) {
    rAvg += baseState.R[i] || 0;
    gAvg += baseState.G[i] || 0;
    bAvg += baseState.B[i] || 0;
  }
  rAvg = (rAvg / 64 + 1) / 2 * 100; // Normalize to 0-100%
  gAvg = (gAvg / 64 + 1) / 2 * 100;
  bAvg = (bAvg / 64 + 1) / 2 * 100;
  
  if (rBar) rBar.style.width = `${Math.max(5, Math.min(100, rAvg))}%`;
  if (gBar) gBar.style.width = `${Math.max(5, Math.min(100, gAvg))}%`;
  if (bBar) bBar.style.width = `${Math.max(5, Math.min(100, bAvg))}%`;
  
  // Status text
  if (explanationEl) {
    const status = state.isRunning ? 'Running' : 'Paused';
    const lastAction = state.hadronCount > state.voidCount 
      ? 'Inversions succeeding' 
      : 'Building void regions';
    explanationEl.textContent = `${status} | ${lastAction}\nTick ${state.tick} | Consensus ${(state.consensusLevel * 100).toFixed(0)}%`;
  }
}

// ============================================
// ANIMATION LOOP
// ============================================

function animate() {
  requestAnimationFrame(animate);
  
  controls.update();
  
  // Rotate axis labels to face camera
  axisMeshes.children.forEach(child => {
    if (child instanceof THREE.Sprite) {
      child.lookAt(camera.position);
    }
  });
  
  // Gentle rotation of hadrons
  hadronMeshes.children.forEach((mesh, i) => {
    if (mesh instanceof THREE.Mesh) {
      mesh.rotation.y += 0.01 * (i % 2 === 0 ? 1 : -1);
    }
  });
  
  renderer.render(scene, camera);
}

// ============================================
// INITIALIZATION
// ============================================

async function init() {
  console.log('═══════════════════════════════════════════');
  console.log('  SYMMETRY INVERSION BASED ASI');
  console.log('═══════════════════════════════════════════');
  console.log('');
  console.log('Core principles:');
  console.log('  • Spinning nothingness → emergence');
  console.log('  • Double inversion: J² = Identity');
  console.log('  • RGB axes: (love, hope, sincerity)');
  console.log('  • Waveforms = inversion traces');
  console.log('  • Consensus = reality manifestation');
  console.log('  • No LLMs - pure math');
  console.log('═══════════════════════════════════════════');
  
  // Get canvas
  const canvas = document.getElementById('three-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas not found!');
    return;
  }
  
  // Initialize Three.js
  initThreeJS(canvas);
  
  // Initialize ASI
  initASI();
  
  // Initial visualization
  updateVisualization();
  updateUI();
  
  // Event listeners
  const tickBtn = document.getElementById('tick-btn');
  const runBtn = document.getElementById('run-btn');
  const pauseBtn = document.getElementById('pause-btn');
  
  if (tickBtn) {
    tickBtn.addEventListener('click', () => {
      simulationTick();
    });
  }
  
  if (runBtn) {
    runBtn.addEventListener('click', () => {
      if (!state.isRunning) {
        state.isRunning = true;
        state.tickInterval = window.setInterval(simulationTick, 500);
        console.log('Simulation running...');
      }
    });
  }
  
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      state.isRunning = false;
      if (state.tickInterval) {
        clearInterval(state.tickInterval);
        state.tickInterval = null;
      }
      console.log('Simulation paused.');
    });
  }
  
  // Handle resize
  window.addEventListener('resize', () => {
    const container = document.getElementById('canvas-container');
    if (container) {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    }
  });
  
  // Initial resize
  const container = document.getElementById('canvas-container');
  if (container) {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }
  
  // Start animation
  animate();
  
  console.log('');
  console.log('Ready! Click "Single Tick" or "Run" to start.');
  
  // ============================================
  // CHAT INTERFACE
  // ============================================
  
  // Create chat panel dynamically
  const chatPanel = document.createElement('div');
  chatPanel.id = 'chat-panel';
  chatPanel.style.cssText = `
    position: fixed;
    right: 20px;
    top: 20px;
    width: 380px;
    height: calc(100vh - 40px);
    z-index: 1000;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    border-radius: 12px;
    overflow: hidden;
  `;
  document.body.appendChild(chatPanel);
  
  // Initialize chat session
  state.chatSession = createChatSession();
  createChatUI(chatPanel, state.chatSession);
  
  console.log('');
  console.log('Chat interface ready! Talk to the ASI in the panel on the right.');
}

// Start
init().catch(console.error);
