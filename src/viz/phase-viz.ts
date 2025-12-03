/**
 * PHASE VISUALIZATION - Three.js rendering for quark-hadron system
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PhaseEngineState } from '../core/asi/phase-engine';
import { HadronTriangle } from '../core/asi/hadron-triangle';
import { createKCBSPentagram } from '../core/asi/kcbs-pentagram';

// ============================================
// QUARK COLORS (visual only - not semantic)
// ============================================

const QUARK_COLORS: Record<string, number> = {
  up: 0xff6666,
  down: 0x66ffff,
  charm: 0x66ff66,
  strange: 0xff66ff,
  top: 0xffff66,
  bottom: 0x6666ff,
};

function getQuarkColor(quark: string): number {
  return QUARK_COLORS[quark] || 0xffffff;
}

// ============================================
// SCENE STATE
// ============================================

export interface PhaseSceneState {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  groups: {
    hadrons: THREE.Group;
    voids: THREE.Group;
    pentagram: THREE.Group;
    torus: THREE.Group;
    axes: THREE.Group;
    wave: THREE.Line;
  };
}

// ============================================
// SCENE CREATION
// ============================================

export function createPhaseScene(canvas: HTMLCanvasElement): PhaseSceneState {
  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a1a);
  
  // Camera
  const camera = new THREE.PerspectiveCamera(
    75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000
  );
  camera.position.set(15, 10, 15);
  camera.lookAt(0, 0, 0);
  
  // Renderer
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  
  // Controls
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  
  // Lighting
  scene.add(new THREE.AmbientLight(0x404040, 0.5));
  const light1 = new THREE.PointLight(0xffffff, 1, 100);
  light1.position.set(10, 10, 10);
  scene.add(light1);
  const light2 = new THREE.PointLight(0x4080ff, 0.5, 100);
  light2.position.set(-10, -5, -10);
  scene.add(light2);
  
  // Grid
  scene.add(new THREE.GridHelper(20, 20, 0x333366, 0x222244));
  
  // Create groups
  const hadrons = new THREE.Group();
  const voids = new THREE.Group();
  const pentagram = new THREE.Group();
  const torus = new THREE.Group();
  const axes = new THREE.Group();
  
  scene.add(hadrons, voids, pentagram, torus, axes);
  
  // Wave line
  const wave = new THREE.Line(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.8 })
  );
  scene.add(wave);
  
  // Build static elements
  buildAxes(axes);
  buildPentagram(pentagram);
  buildTorus(torus);
  
  return {
    scene, camera, renderer, controls,
    groups: { hadrons, voids, pentagram, torus, axes, wave }
  };
}

// ============================================
// STATIC ELEMENTS
// ============================================

function buildAxes(group: THREE.Group) {
  const axisConfig = [
    { color: 0xff6666, pos: [5, 0, 0], rot: [0, 0, Math.PI / 2], label: 'φ_t: Up ↔ Down', labelPos: [10, 0, 0] },
    { color: 0x66ff66, pos: [0, 0, 5], rot: [Math.PI / 2, 0, 0], label: 'φ_s: Charm ↔ Strange', labelPos: [0, 0, 10] },
    { color: 0xffff66, pos: [0, 5, 0], rot: [0, 0, 0], label: 'Coherence', labelPos: [0, 10, 0] },
  ];
  
  for (const { color, pos, rot, label, labelPos } of axisConfig) {
    const geom = new THREE.CylinderGeometry(0.05, 0.05, 10, 8);
    const mat = new THREE.MeshPhongMaterial({ color });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.rotation.set(rot[0], rot[1], rot[2]);
    group.add(mesh);
    
    // Label sprite
    const sprite = createTextSprite(label);
    sprite.position.set(labelPos[0], labelPos[1], labelPos[2]);
    group.add(sprite);
  }
}

function buildPentagram(group: THREE.Group) {
  const pent = createKCBSPentagram(0, 5);
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x8888ff, transparent: true, opacity: 0.6 });
  const starMat = new THREE.LineBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.4 });
  
  // Pentagon edges
  for (let i = 0; i < 5; i++) {
    const o1 = pent.observables[i].direction;
    const o2 = pent.observables[(i + 1) % 5].direction;
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(o1.φ_t, 0.1, o1.φ_s),
      new THREE.Vector3(o2.φ_t, 0.1, o2.φ_s),
    ]);
    group.add(new THREE.Line(geom, edgeMat));
  }
  
  // Inner star
  for (let i = 0; i < 5; i++) {
    const o1 = pent.observables[i].direction;
    const o2 = pent.observables[(i + 2) % 5].direction;
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(o1.φ_t, 0.1, o1.φ_s),
      new THREE.Vector3(o2.φ_t, 0.1, o2.φ_s),
    ]);
    group.add(new THREE.Line(geom, starMat));
  }
  
  // Nodes
  const nodeMat = new THREE.MeshPhongMaterial({ color: 0xaaaaff, emissive: 0x4444aa, emissiveIntensity: 0.3 });
  for (const obs of pent.observables) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), nodeMat);
    mesh.position.set(obs.direction.φ_t, 0.1, obs.direction.φ_s);
    group.add(mesh);
  }
}

function buildTorus(group: THREE.Group) {
  const geom = new THREE.TorusGeometry(6, 0.05, 8, 50);
  const mat = new THREE.MeshPhongMaterial({ color: 0x444466, transparent: true, opacity: 0.3 });
  
  const t1 = new THREE.Mesh(geom, mat);
  t1.rotation.x = Math.PI / 2;
  group.add(t1);
  
  const t2 = new THREE.Mesh(geom.clone(), mat.clone());
  t2.rotation.z = Math.PI / 2;
  group.add(t2);
}

function createTextSprite(text: string): THREE.Sprite {
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
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }));
  sprite.scale.set(4, 1, 1);
  return sprite;
}

// ============================================
// DYNAMIC UPDATES
// ============================================

function clearGroup(group: THREE.Group) {
  while (group.children.length > 0) {
    const child = group.children[0];
    group.remove(child);
    if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
      if ('geometry' in child) child.geometry.dispose();
      if ('material' in child && child.material instanceof THREE.Material) {
        child.material.dispose();
      }
    }
  }
}

export function updateHadrons(group: THREE.Group, hadrons: HadronTriangle[]) {
  clearGroup(group);
  
  const scale = 2;
  for (const h of hadrons) {
    const yOffset = h.coherence * 3;
    
    // Vertex positions
    const rPos = new THREE.Vector3(h.R.phase.φ_t * scale - Math.PI * scale, yOffset, h.R.phase.φ_s * scale - Math.PI * scale);
    const uPos = new THREE.Vector3(h.U.phase.φ_t * scale - Math.PI * scale, yOffset + 0.3, h.U.phase.φ_s * scale - Math.PI * scale);
    const cPos = new THREE.Vector3(h.C.phase.φ_t * scale - Math.PI * scale, yOffset + 0.6, h.C.phase.φ_s * scale - Math.PI * scale);
    
    // Triangle outline
    const lineGeom = new THREE.BufferGeometry().setFromPoints([rPos, uPos, cPos, rPos]);
    const lineMat = new THREE.LineBasicMaterial({
      color: getQuarkColor(h.R.quark.time),
      transparent: true,
      opacity: 0.5 + h.persistence * 0.3
    });
    group.add(new THREE.Line(lineGeom, lineMat));
    
    // Vertex spheres
    const vertices = [
      { pos: rPos, color: h.R.quark.time, size: 0.15 },
      { pos: uPos, color: h.U.quark.space, size: 0.12 },
      { pos: cPos, color: h.C.quark.closure, size: 0.10 },
    ];
    
    for (const { pos, color, size } of vertices) {
      const c = getQuarkColor(color);
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(size, 8, 8),
        new THREE.MeshPhongMaterial({ color: c, emissive: c, emissiveIntensity: 0.3 })
      );
      mesh.position.copy(pos);
      group.add(mesh);
    }
    
    // Filled face
    const faceGeom = new THREE.BufferGeometry();
    faceGeom.setAttribute('position', new THREE.BufferAttribute(
      new Float32Array([rPos.x, rPos.y, rPos.z, uPos.x, uPos.y, uPos.z, cPos.x, cPos.y, cPos.z]), 3
    ));
    const faceMat = new THREE.MeshBasicMaterial({
      color: getQuarkColor(h.R.quark.time),
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    });
    group.add(new THREE.Mesh(faceGeom, faceMat));
  }
}

export function updateVoids(group: THREE.Group, positions: Array<{ position: [number, number, number]; radius: number }>) {
  clearGroup(group);
  
  for (const v of positions) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(v.radius, 16, 16),
      new THREE.MeshPhongMaterial({
        color: 0x111122,
        emissive: 0x220022,
        emissiveIntensity: 0.2,
        transparent: true,
        opacity: 0.8
      })
    );
    mesh.position.set(...v.position);
    group.add(mesh);
  }
}

export function updateWave(line: THREE.Line, waveform: { R: number[]; G: number[]; B: number[] }) {
  const points: THREE.Vector3[] = [];
  
  for (let i = 0; i < 64; i++) {
    const t = i / 64;
    const r = waveform.R[i] || 0;
    const g = waveform.G[i] || 0;
    const b = waveform.B[i] || 0;
    
    const angle = t * Math.PI * 4;
    const radius = 3 + t * 2;
    points.push(new THREE.Vector3(
      Math.cos(angle) * radius + r * 0.5,
      t * 5 - 2.5 + g * 0.5,
      Math.sin(angle) * radius + b * 0.5
    ));
  }
  
  line.geometry.dispose();
  line.geometry = new THREE.BufferGeometry().setFromPoints(points);
}

// ============================================
// ANIMATION
// ============================================

export function animateScene(state: PhaseSceneState, _phaseEngine: PhaseEngineState | null) {
  state.controls.update();
  
  // Labels face camera
  state.groups.axes.children.forEach(child => {
    if (child instanceof THREE.Sprite) {
      child.lookAt(state.camera.position);
    }
  });
  
  // Gentle hadron rotation
  state.groups.hadrons.children.forEach((mesh, i) => {
    if (mesh instanceof THREE.Mesh) {
      mesh.rotation.y += 0.01 * (i % 2 === 0 ? 1 : -1);
    }
  });
  
  state.renderer.render(state.scene, state.camera);
}

export function resizeScene(state: PhaseSceneState, width: number, height: number) {
  state.camera.aspect = width / height;
  state.camera.updateProjectionMatrix();
  state.renderer.setSize(width, height);
}
