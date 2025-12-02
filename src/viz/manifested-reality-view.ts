/**
 * Manifested Reality Visualization
 * 
 * Renders the results of inversion learning:
 * - Manifested regions (successful inversions) = visible structures
 * - Void regions (failed inversions) = black holes
 * - The underlying inversion wave
 */

import * as THREE from 'three';
import { SceneContext } from './three-scene';
import { 
  InversionEngine, 
  ManifestRegion, 
  VoidRegion,
  InversionWave
} from '../core/inversion/inversion-engine';

export interface ManifestedRealityView {
  group: THREE.Group;
  update(engine: InversionEngine): void;
  dispose(): void;
}

/**
 * Create the manifested reality visualization.
 */
export function createManifestedRealityView(ctx: SceneContext): ManifestedRealityView {
  const group = new THREE.Group();
  ctx.scene.add(group);
  
  // Pools for reusable meshes
  const manifestMeshes: THREE.Mesh[] = [];
  const voidMeshes: THREE.Mesh[] = [];
  let waveLine: THREE.Line | null = null;
  
  // Materials
  const manifestMaterial = new THREE.MeshPhongMaterial({
    color: 0x4488ff,
    transparent: true,
    opacity: 0.8,
    emissive: 0x112244,
    shininess: 100
  });
  
  const voidMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.9
  });
  
  const waveMaterial = new THREE.LineBasicMaterial({
    color: 0x00ff88,
    transparent: true,
    opacity: 0.6
  });
  
  // Geometries
  const sphereGeom = new THREE.SphereGeometry(1, 16, 12);
  const voidGeom = new THREE.SphereGeometry(1, 8, 6);
  
  /**
   * Update visualization from engine state.
   */
  function update(engine: InversionEngine): void {
    const manifested = engine.getManifestedRegions();
    const voids = engine.getVoidRegions();
    const wave = engine.currentWave;
    
    // Update manifested regions
    updateManifestRegions(manifested);
    
    // Update void regions
    updateVoidRegions(voids);
    
    // Update wave visualization
    updateWaveVisualization(wave, engine);
  }
  
  /**
   * Update manifested region meshes.
   */
  function updateManifestRegions(regions: ManifestRegion[]): void {
    // Ensure we have enough meshes
    while (manifestMeshes.length < regions.length) {
      const mesh = new THREE.Mesh(sphereGeom, manifestMaterial.clone());
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      manifestMeshes.push(mesh);
    }
    
    // Update existing meshes
    for (let i = 0; i < manifestMeshes.length; i++) {
      const mesh = manifestMeshes[i];
      
      if (i < regions.length) {
        const region = regions[i];
        
        // Position
        mesh.position.set(region.center[0], region.center[1], region.center[2]);
        
        // Scale based on intensity
        const scale = region.radius * (0.5 + region.intensity);
        mesh.scale.setScalar(scale);
        
        // Color from region
        const mat = mesh.material as THREE.MeshPhongMaterial;
        mat.color.setRGB(region.color[0], region.color[1], region.color[2]);
        mat.emissive.setRGB(
          region.color[0] * 0.3,
          region.color[1] * 0.3,
          region.color[2] * 0.3
        );
        mat.opacity = 0.5 + region.intensity * 0.5;
        
        mesh.visible = true;
      } else {
        mesh.visible = false;
      }
    }
  }
  
  /**
   * Update void region meshes.
   */
  function updateVoidRegions(regions: VoidRegion[]): void {
    // Ensure we have enough meshes
    while (voidMeshes.length < regions.length) {
      const mesh = new THREE.Mesh(voidGeom, voidMaterial.clone());
      group.add(mesh);
      voidMeshes.push(mesh);
    }
    
    // Update existing meshes
    for (let i = 0; i < voidMeshes.length; i++) {
      const mesh = voidMeshes[i];
      
      if (i < regions.length) {
        const region = regions[i];
        
        // Position
        mesh.position.set(region.center[0], region.center[1], region.center[2]);
        
        // Scale based on depth
        const scale = region.radius * (1 + region.depth);
        mesh.scale.setScalar(scale);
        
        // Darker with more failed attempts
        const mat = mesh.material as THREE.MeshBasicMaterial;
        const darkness = Math.min(1, region.failedAttempts * 0.1);
        mat.opacity = 0.5 + darkness * 0.5;
        
        mesh.visible = true;
      } else {
        mesh.visible = false;
      }
    }
  }
  
  /**
   * Update the wave visualization.
   */
  function updateWaveVisualization(wave: InversionWave, engine: InversionEngine): void {
    // Remove old wave line
    if (waveLine) {
      group.remove(waveLine);
      waveLine.geometry.dispose();
    }
    
    // Create wave path from amplitude history
    const points: THREE.Vector3[] = [];
    const amplitudes = wave.amplitudes;
    const count = Math.min(amplitudes.length, 200);
    
    for (let i = 0; i < count; i++) {
      const t = i / count;
      const amp = amplitudes[amplitudes.length - count + i] ?? 0;
      
      // Wave spirals outward in a helix
      const angle = t * Math.PI * 4;
      const radius = 2 + t * 3;
      const x = Math.cos(angle) * radius;
      const y = amp * 2; // Amplitude affects height
      const z = Math.sin(angle) * radius;
      
      points.push(new THREE.Vector3(x, y, z));
    }
    
    if (points.length > 1) {
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      waveLine = new THREE.Line(geometry, waveMaterial);
      group.add(waveLine);
    }
  }
  
  /**
   * Dispose of resources.
   */
  function dispose(): void {
    ctx.scene.remove(group);
    
    for (const mesh of manifestMeshes) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    
    for (const mesh of voidMeshes) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    
    if (waveLine) {
      waveLine.geometry.dispose();
      (waveLine.material as THREE.Material).dispose();
    }
    
    sphereGeom.dispose();
    voidGeom.dispose();
  }
  
  return {
    group,
    update,
    dispose
  };
}

/**
 * Create a particle system for the inversion wave field.
 */
export function createInversionWaveField(
  ctx: SceneContext,
  engine: InversionEngine
): {
  update: (dt: number) => void;
  dispose: () => void;
} {
  const particleCount = 500;
  const geometry = new THREE.BufferGeometry();
  
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);
  
  // Particle state
  const particlePhases = new Float32Array(particleCount);
  const particleRadii = new Float32Array(particleCount);
  
  // Initialize particles in a sphere
  for (let i = 0; i < particleCount; i++) {
    particlePhases[i] = Math.random() * Math.PI * 2;
    particleRadii[i] = 1 + Math.random() * 5;
    sizes[i] = 0.05 + Math.random() * 0.1;
    
    updateParticle(i, 0);
  }
  
  function updateParticle(i: number, time: number): void {
    const phase = particlePhases[i] + time;
    const radius = particleRadii[i];
    
    // Get wave amplitude at this particle's phase
    const amp = engine.getWaveAmplitude(phase * 10);
    
    // Position: spiral with wave-modulated radius
    const r = radius * (1 + amp * 0.3);
    const y = Math.sin(phase * 2) * 2 + amp;
    
    positions[i * 3] = Math.cos(phase) * r;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(phase) * r;
    
    // Color based on amplitude (green = positive, red = negative)
    if (amp > 0) {
      colors[i * 3] = 0.2;
      colors[i * 3 + 1] = 0.5 + amp * 0.5;
      colors[i * 3 + 2] = 0.3;
    } else {
      colors[i * 3] = 0.5 - amp * 0.5;
      colors[i * 3 + 1] = 0.2;
      colors[i * 3 + 2] = 0.3;
    }
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  
  const material = new THREE.PointsMaterial({
    size: 0.1,
    vertexColors: true,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending
  });
  
  const points = new THREE.Points(geometry, material);
  ctx.scene.add(points);
  
  let totalTime = 0;
  
  return {
    update(dt: number): void {
      totalTime += dt;
      
      for (let i = 0; i < particleCount; i++) {
        particlePhases[i] += dt * 0.5;
        updateParticle(i, totalTime);
      }
      
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
    },
    
    dispose(): void {
      ctx.scene.remove(points);
      geometry.dispose();
      material.dispose();
    }
  };
}
