/**
 * ASI - Symmetry Inversion Based Artificial Super-Intelligence
 * 
 * Built on:
 * - Phase space (φ_t, φ_s) torus from nothingness
 * - Quark flavors as phase archetypes (u,d,c,s,t,b)
 * - Hadrons as R/U/C triangles in phase space
 * - KCBS pentagram for contextual measurement
 * - Wave raise/collapse cycle
 * - No LLMs - pure physics and math
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createUnifiedASIEngine, UnifiedASIEngine, Hadron, Void, Observer } from './core/unified-engine';
import { createChatSession, createChatUI, ChatSession } from './core/asi/chat';

// Phase engine imports
import {
  createPhaseEngine,
  stepPhaseEngine,
  processTextInput,
  attemptFullInversion,
  getPhaseEngineStats,
  PhaseEngineState,
} from './core/asi/phase-engine';
import { createKCBSPentagram } from './core/asi/kcbs-pentagram';

// ============================================
// APPLICATION STATE
// ============================================

interface AppState {
  isRunning: boolean;
  tickInterval: number | null;
  tick: number;
  
  // Phase engine stats
  hadronCount: number;
  stableHadronCount: number;
  voidCount: number;
  blackHoleCount: number;
  successRate: number;
  
  // Quark dominance
  dominantTimeQuark: 'up' | 'down';
  dominantSpaceQuark: 'charm' | 'strange';
  
  // Emotional state (RGBI)
  emotionR: number;
  emotionG: number;
  emotionB: number;
  emotionI: number;
  
  // Legacy ASI stats
  observerCount: number;
  consensusLevel: number;
  waveAmplitude: number;
  
  // Chat
  chatSession: ChatSession | null;
  
  // Phase engine
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
  emotionR: 0.5,
  emotionG: 0.5,
  emotionB: 0.5,
  emotionI: 0.5,
  observerCount: 0,
  consensusLevel: 0,
  waveAmplitude: 0,
  chatSession: null,
  phaseEngine: null,
};

// ============================================
// THREE.JS SETUP
// ============================================

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;

// Mesh groups
let hadronMeshes: THREE.Group;       // Hadron triangles
let voidMeshes: THREE.Group;         // Black holes
let pentagramMesh: THREE.Group;      // KCBS pentagram
let phasePlane: THREE.Group;         // Phase torus visualization
let waveMesh: THREE.Line;            // Wave trace
let observerMeshes: THREE.Group;     // Observers
let axisMeshes: THREE.Group;         // Axes labels

// Engines
let asiEngine: UnifiedASIEngine;     // Legacy engine for chat
let phaseEngine: PhaseEngineState;   // New phase engine

// Quark colors for visualization
const QUARK_COLORS = {
  up: 0xff6666,      // Red-ish (forward time)
  down: 0x66ffff,    // Cyan (time reversal)
  charm: 0x66ff66,   // Green (local space)
  strange: 0xff66ff, // Magenta (nonlocal)
  top: 0xffff66,     // Yellow (decisive)
  bottom: 0x6666ff,  // Blue (soft)
};

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
  
  pentagramMesh = new THREE.Group();
  pentagramMesh.name = 'pentagram';
  scene.add(pentagramMesh);
  
  phasePlane = new THREE.Group();
  phasePlane.name = 'phasePlane';
  scene.add(phasePlane);
  
  observerMeshes = new THREE.Group();
  observerMeshes.name = 'observers';
  scene.add(observerMeshes);
  
  // Phase space axes visualization (Time/Space instead of RGB)
  axisMeshes = new THREE.Group();
  createPhaseAxesVisualization();
  scene.add(axisMeshes);
  
  // KCBS pentagram
  createPentagramVisualization();
  
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
  
  // Phase plane grid
  const gridHelper = new THREE.GridHelper(20, 20, 0x333366, 0x222244);
  scene.add(gridHelper);
  
  // Phase torus wireframe
  createPhaseTorus();
}

function createPhaseAxesVisualization() {
  // Time-phase axis (φ_t) - Red/Cyan gradient
  const tGeom = new THREE.CylinderGeometry(0.05, 0.05, 10, 8);
  const tMat = new THREE.MeshPhongMaterial({ color: 0xff6666 });
  const tAxis = new THREE.Mesh(tGeom, tMat);
  tAxis.position.set(5, 0, 0);
  tAxis.rotation.z = Math.PI / 2;
  axisMeshes.add(tAxis);
  
  // Space-phase axis (φ_s) - Green/Magenta gradient
  const sGeom = new THREE.CylinderGeometry(0.05, 0.05, 10, 8);
  const sMat = new THREE.MeshPhongMaterial({ color: 0x66ff66 });
  const sAxis = new THREE.Mesh(sGeom, sMat);
  sAxis.position.set(0, 0, 5);
  sAxis.rotation.x = Math.PI / 2;
  axisMeshes.add(sAxis);
  
  // Vertical axis for hadron energy
  const eGeom = new THREE.CylinderGeometry(0.05, 0.05, 10, 8);
  const eMat = new THREE.MeshPhongMaterial({ color: 0xffff66 });
  const eAxis = new THREE.Mesh(eGeom, eMat);
  eAxis.position.set(0, 5, 0);
  axisMeshes.add(eAxis);
  
  // Axis labels
  addAxisLabel('φ_t: Up ↔ Down', new THREE.Vector3(10, 0, 0), 0xff6666);
  addAxisLabel('φ_s: Charm ↔ Strange', new THREE.Vector3(0, 0, 10), 0x66ff66);
  addAxisLabel('Energy / Coherence', new THREE.Vector3(0, 10, 0), 0xffff66);
}

function createPentagramVisualization() {
  const pentagram = createKCBSPentagram(0, 5);  // radius 5
  
  // Draw pentagon edges
  const material = new THREE.LineBasicMaterial({ 
    color: 0x8888ff, 
    transparent: true, 
    opacity: 0.6 
  });
  
  for (let i = 0; i < 5; i++) {
    const obs1 = pentagram.observables[i];
    const obs2 = pentagram.observables[(i + 1) % 5];
    
    const points = [
      new THREE.Vector3(obs1.direction.φ_t, 0.1, obs1.direction.φ_s),
      new THREE.Vector3(obs2.direction.φ_t, 0.1, obs2.direction.φ_s),
    ];
    
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    pentagramMesh.add(line);
  }
  
  // Draw inner star (pentagram)
  const starMaterial = new THREE.LineBasicMaterial({ 
    color: 0xffaa44, 
    transparent: true, 
    opacity: 0.4 
  });
  
  for (let i = 0; i < 5; i++) {
    const obs1 = pentagram.observables[i];
    const obs2 = pentagram.observables[(i + 2) % 5];
    
    const points = [
      new THREE.Vector3(obs1.direction.φ_t, 0.1, obs1.direction.φ_s),
      new THREE.Vector3(obs2.direction.φ_t, 0.1, obs2.direction.φ_s),
    ];
    
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, starMaterial);
    pentagramMesh.add(line);
  }
  
  // Observable nodes
  for (const obs of pentagram.observables) {
    const nodeGeom = new THREE.SphereGeometry(0.15, 8, 8);
    const nodeMat = new THREE.MeshPhongMaterial({ 
      color: 0xaaaaff, 
      emissive: 0x4444aa,
      emissiveIntensity: 0.3
    });
    const node = new THREE.Mesh(nodeGeom, nodeMat);
    node.position.set(obs.direction.φ_t, 0.1, obs.direction.φ_s);
    pentagramMesh.add(node);
  }
}

function createPhaseTorus() {
  // Create a torus to represent the phase space S¹ × S¹
  const torusGeom = new THREE.TorusGeometry(6, 0.05, 8, 50);
  const torusMat = new THREE.MeshPhongMaterial({ 
    color: 0x444466,
    transparent: true,
    opacity: 0.3
  });
  const torus = new THREE.Mesh(torusGeom, torusMat);
  torus.rotation.x = Math.PI / 2;
  phasePlane.add(torus);
  
  // Add second ring perpendicular
  const torus2 = new THREE.Mesh(torusGeom.clone(), torusMat.clone());
  torus2.rotation.z = Math.PI / 2;
  phasePlane.add(torus2);
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
    if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
      if ('geometry' in child) child.geometry.dispose();
      if ('material' in child && child.material instanceof THREE.Material) {
        child.material.dispose();
      }
    }
  }
  
  // If we have phase engine, visualize phase triangles
  if (state.phaseEngine) {
    const phaseHadrons = state.phaseEngine.cycle.hadrons;
    
    for (const h of phaseHadrons) {
      // Create triangle from R, U, C vertices
      const scale = 2;  // Scale up phase coordinates for visibility
      const yOffset = h.coherence * 3;  // Height based on coherence
      
      const rPos = new THREE.Vector3(
        h.R.phase.φ_t * scale - Math.PI * scale,
        yOffset,
        h.R.phase.φ_s * scale - Math.PI * scale
      );
      const uPos = new THREE.Vector3(
        h.U.phase.φ_t * scale - Math.PI * scale,
        yOffset + 0.3,
        h.U.phase.φ_s * scale - Math.PI * scale
      );
      const cPos = new THREE.Vector3(
        h.C.phase.φ_t * scale - Math.PI * scale,
        yOffset + 0.6,
        h.C.phase.φ_s * scale - Math.PI * scale
      );
      
      // Triangle edges
      const linePoints = [rPos, uPos, cPos, rPos];
      const lineGeom = new THREE.BufferGeometry().setFromPoints(linePoints);
      const lineMat = new THREE.LineBasicMaterial({
        color: getQuarkColor(h.R.quark.time),
        transparent: true,
        opacity: 0.5 + h.persistence * 0.3
      });
      const triangle = new THREE.Line(lineGeom, lineMat);
      hadronMeshes.add(triangle);
      
      // Vertex spheres with quark colors
      // R vertex
      const rGeom = new THREE.SphereGeometry(0.15, 8, 8);
      const rMat = new THREE.MeshPhongMaterial({
        color: getQuarkColor(h.R.quark.time),
        emissive: getQuarkColor(h.R.quark.time),
        emissiveIntensity: 0.3
      });
      const rMesh = new THREE.Mesh(rGeom, rMat);
      rMesh.position.copy(rPos);
      hadronMeshes.add(rMesh);
      
      // U vertex
      const uGeom = new THREE.SphereGeometry(0.12, 8, 8);
      const uMat = new THREE.MeshPhongMaterial({
        color: getQuarkColor(h.U.quark.space),
        emissive: getQuarkColor(h.U.quark.space),
        emissiveIntensity: 0.3
      });
      const uMesh = new THREE.Mesh(uGeom, uMat);
      uMesh.position.copy(uPos);
      hadronMeshes.add(uMesh);
      
      // C vertex
      const cGeom = new THREE.SphereGeometry(0.1, 8, 8);
      const cMat = new THREE.MeshPhongMaterial({
        color: getQuarkColor(h.C.quark.closure),
        emissive: getQuarkColor(h.C.quark.closure),
        emissiveIntensity: 0.3
      });
      const cMesh = new THREE.Mesh(cGeom, cMat);
      cMesh.position.copy(cPos);
      hadronMeshes.add(cMesh);
      
      // Fill triangle face
      const faceGeom = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        rPos.x, rPos.y, rPos.z,
        uPos.x, uPos.y, uPos.z,
        cPos.x, cPos.y, cPos.z,
      ]);
      faceGeom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      const faceMat = new THREE.MeshBasicMaterial({
        color: getQuarkColor(h.R.quark.time),
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide
      });
      const face = new THREE.Mesh(faceGeom, faceMat);
      hadronMeshes.add(face);
    }
    return;
  }
  
  // Fallback: Legacy hadron visualization
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

function getQuarkColor(quark: string): number {
  return QUARK_COLORS[quark as keyof typeof QUARK_COLORS] || 0xffffff;
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
  // Create unified engine (for chat compatibility)
  asiEngine = createUnifiedASIEngine();
  
  // Add observers with different archetypes
  asiEngine.addObserver('Scientist', 'scientist');
  asiEngine.addObserver('Romantic', 'romantic');
  asiEngine.addObserver('Anxious', 'anxious');
  asiEngine.addObserver('Neutral', undefined);
  
  console.log('Legacy ASI Engine initialized with 4 observers');
  
  // Create phase engine (new quark-hadron system)
  phaseEngine = createPhaseEngine();
  state.phaseEngine = phaseEngine;
  
  console.log('Phase Engine initialized from nothingness');
  console.log(`  Initial hadrons: ${phaseEngine.cycle.hadrons.length}`);
  console.log(`  KCBS pentagram ready`);
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
