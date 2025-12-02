/**
 * Fractal Pentagram Visualization
 * 
 * Renders the nested pentagram hierarchy that drives reality observations.
 * The pentagram-within-pentagram structure at golden ratio scales is the
 * generative core of all observations.
 */

import * as THREE from 'three';
import { SceneContext } from './three-scene';
import { 
  FractalPentagram, 
  PentagramLayer,
  PHI,
  PHI_INVERSE_SQUARED,
  PENTAGRAM_ANGLE,
  getStarPoints
} from '../core/math/fractal-pentagram';
import { RENDER_CONFIG } from '../config/render-config';
import { Complex } from '../core/math/complex';

export interface FractalPentagramView {
  group: THREE.Group;
  update(pentagram: FractalPentagram): void;
  setFocusDepth(depth: number): void;
  setFocusEdge(edge: number): void;
  dispose(): void;
}

interface LayerMeshes {
  pentagon: THREE.Line;
  star: THREE.Line;
  vertices: THREE.Mesh[];
  amplitudeIndicators: THREE.Mesh[];
  connections: THREE.Line[];
}

/**
 * Create a fractal pentagram view that visualizes the generative structure.
 */
export function createFractalPentagramView(
  ctx: SceneContext,
  baseRadius: number = 4
): FractalPentagramView {
  const group = new THREE.Group();
  ctx.scene.add(group);
  
  const layerMeshes: LayerMeshes[] = [];
  let focusDepth = 0;
  let focusEdge = 0;
  
  // Color gradient from outer to inner (golden ratio themed)
  const getLayerColor = (depth: number, maxDepth: number): number => {
    const t = depth / maxDepth;
    // Transition from purple (outer) to gold (inner)
    const r = Math.floor(128 + 127 * t);
    const g = Math.floor(64 + 191 * t);
    const b = Math.floor(192 - 64 * t);
    return (r << 16) | (g << 8) | b;
  };
  
  // Materials
  const createLayerMaterials = (depth: number, maxDepth: number) => {
    const color = getLayerColor(depth, maxDepth);
    const opacity = 1 - depth * 0.1;
    
    return {
      edge: new THREE.LineBasicMaterial({
        color,
        linewidth: 2,
        transparent: true,
        opacity
      }),
      star: new THREE.LineBasicMaterial({
        color,
        linewidth: 1,
        transparent: true,
        opacity: opacity * 0.5
      }),
      vertex: new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity
      }),
      amplitude: new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8
      })
    };
  };
  
  /**
   * Build meshes for a single layer.
   */
  const buildLayerMeshes = (
    layer: PentagramLayer,
    maxDepth: number
  ): LayerMeshes => {
    const materials = createLayerMaterials(layer.depth, maxDepth);
    const scale = baseRadius * layer.scale;
    
    // Pentagon vertices
    const pentagonPoints: THREE.Vector3[] = [];
    for (let i = 0; i <= 5; i++) {
      const idx = i % 5;
      const angle = layer.rotation + idx * PENTAGRAM_ANGLE - Math.PI / 2;
      pentagonPoints.push(new THREE.Vector3(
        Math.cos(angle) * scale,
        Math.sin(angle) * scale,
        -layer.depth * 0.3 // Depth offset in z
      ));
    }
    
    const pentagonGeometry = new THREE.BufferGeometry().setFromPoints(pentagonPoints);
    const pentagon = new THREE.Line(pentagonGeometry, materials.edge);
    group.add(pentagon);
    
    // Star (connect every other vertex)
    const starLines: THREE.Line[] = [];
    for (let i = 0; i < 5; i++) {
      const start = i;
      const end = (i + 2) % 5;
      
      const startAngle = layer.rotation + start * PENTAGRAM_ANGLE - Math.PI / 2;
      const endAngle = layer.rotation + end * PENTAGRAM_ANGLE - Math.PI / 2;
      
      const starGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(
          Math.cos(startAngle) * scale,
          Math.sin(startAngle) * scale,
          -layer.depth * 0.3
        ),
        new THREE.Vector3(
          Math.cos(endAngle) * scale,
          Math.sin(endAngle) * scale,
          -layer.depth * 0.3
        )
      ]);
      
      const starLine = new THREE.Line(starGeometry, materials.star);
      group.add(starLine);
      starLines.push(starLine);
    }
    
    const star = starLines[0]; // Reference to first star line
    
    // Vertex spheres
    const vertexGeometry = new THREE.SphereGeometry(0.08 * Math.pow(PHI_INVERSE_SQUARED, layer.depth / 2), 8, 8);
    const vertices: THREE.Mesh[] = [];
    const amplitudeIndicators: THREE.Mesh[] = [];
    
    for (let i = 0; i < 5; i++) {
      const angle = layer.rotation + i * PENTAGRAM_ANGLE - Math.PI / 2;
      
      // Vertex sphere
      const vertex = new THREE.Mesh(vertexGeometry, materials.vertex.clone());
      vertex.position.set(
        Math.cos(angle) * scale,
        Math.sin(angle) * scale,
        -layer.depth * 0.3
      );
      vertex.userData = { depth: layer.depth, index: i };
      group.add(vertex);
      vertices.push(vertex);
      
      // Amplitude indicator (ring around vertex)
      const ampGeometry = new THREE.RingGeometry(
        0.1 * Math.pow(PHI_INVERSE_SQUARED, layer.depth / 2),
        0.15 * Math.pow(PHI_INVERSE_SQUARED, layer.depth / 2),
        16
      );
      const ampIndicator = new THREE.Mesh(ampGeometry, materials.amplitude.clone());
      ampIndicator.position.copy(vertex.position);
      ampIndicator.position.z += 0.01;
      group.add(ampIndicator);
      amplitudeIndicators.push(ampIndicator);
    }
    
    // Inter-layer connections (to child layer)
    const connections: THREE.Line[] = [];
    
    return {
      pentagon,
      star,
      vertices,
      amplitudeIndicators,
      connections
    };
  };
  
  /**
   * Update layer meshes based on current pentagram state.
   */
  const updateLayerMeshes = (
    meshes: LayerMeshes,
    layer: PentagramLayer
  ): void => {
    const scale = baseRadius * layer.scale;
    
    // Update vertex positions and amplitudes
    for (let i = 0; i < 5; i++) {
      const angle = layer.rotation + i * PENTAGRAM_ANGLE - Math.PI / 2;
      const x = Math.cos(angle) * scale;
      const y = Math.sin(angle) * scale;
      const z = -layer.depth * 0.3;
      
      meshes.vertices[i].position.set(x, y, z);
      meshes.amplitudeIndicators[i].position.set(x, y, z + 0.01);
      
      // Scale amplitude indicator by vertex amplitude
      const amp = layer.vertices[i].amplitude;
      const ampMag = Math.sqrt(amp.re * amp.re + amp.im * amp.im);
      meshes.amplitudeIndicators[i].scale.setScalar(1 + ampMag * 2);
      
      // Color by phase
      const phase = layer.vertices[i].phase;
      const hue = (phase / (2 * Math.PI) + 0.5) % 1;
      (meshes.amplitudeIndicators[i].material as THREE.MeshBasicMaterial).color.setHSL(hue, 0.8, 0.6);
    }
    
    // Update pentagon geometry
    const pentagonPositions = meshes.pentagon.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i <= 5; i++) {
      const idx = i % 5;
      const angle = layer.rotation + idx * PENTAGRAM_ANGLE - Math.PI / 2;
      pentagonPositions.setXYZ(
        i,
        Math.cos(angle) * scale,
        Math.sin(angle) * scale,
        -layer.depth * 0.3
      );
    }
    pentagonPositions.needsUpdate = true;
  };
  
  /**
   * Highlight focused edge.
   */
  const highlightFocus = (): void => {
    if (focusDepth >= layerMeshes.length) return;
    
    // Reset all vertices to their layer colors
    for (let d = 0; d < layerMeshes.length; d++) {
      const meshes = layerMeshes[d];
      const layerColor = getLayerColor(d, layerMeshes.length);
      for (const v of meshes.vertices) {
        (v.material as THREE.MeshBasicMaterial).color.setHex(layerColor);
      }
    }
    
    // Highlight focused edge vertices
    const meshes = layerMeshes[focusDepth];
    const v1 = focusEdge;
    const v2 = (focusEdge + 1) % 5;
    
    (meshes.vertices[v1].material as THREE.MeshBasicMaterial).color.setHex(0x00ff00);
    (meshes.vertices[v2].material as THREE.MeshBasicMaterial).color.setHex(0x00ff00);
  };
  
  return {
    group,
    
    update(pentagram: FractalPentagram): void {
      // Ensure we have meshes for all layers
      while (layerMeshes.length < pentagram.layers.length) {
        const depth = layerMeshes.length;
        const layer = pentagram.layers[depth];
        const meshes = buildLayerMeshes(layer, pentagram.maxDepth);
        layerMeshes.push(meshes);
      }
      
      // Update each layer
      for (let i = 0; i < pentagram.layers.length; i++) {
        updateLayerMeshes(layerMeshes[i], pentagram.layers[i]);
      }
      
      highlightFocus();
    },
    
    setFocusDepth(depth: number): void {
      focusDepth = depth;
      highlightFocus();
    },
    
    setFocusEdge(edge: number): void {
      focusEdge = edge % 5;
      highlightFocus();
    },
    
    dispose(): void {
      ctx.scene.remove(group);
      
      for (const meshes of layerMeshes) {
        meshes.pentagon.geometry.dispose();
        (meshes.pentagon.material as THREE.Material).dispose();
        meshes.star.geometry.dispose();
        (meshes.star.material as THREE.Material).dispose();
        
        for (const v of meshes.vertices) {
          v.geometry.dispose();
          (v.material as THREE.Material).dispose();
        }
        
        for (const a of meshes.amplitudeIndicators) {
          a.geometry.dispose();
          (a.material as THREE.Material).dispose();
        }
      }
    }
  };
}

/**
 * Create particle system showing observation flow through pentagram.
 */
export function createObservationParticles(
  ctx: SceneContext,
  pentagram: FractalPentagram,
  baseRadius: number = 4
): {
  update: (dt: number) => void;
  dispose: () => void;
} {
  const particleCount = 200;
  const geometry = new THREE.BufferGeometry();
  
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);
  
  // Particle state
  const particleDepths = new Float32Array(particleCount);
  const particleAngles = new Float32Array(particleCount);
  const particleSpeeds = new Float32Array(particleCount);
  
  // Initialize particles
  for (let i = 0; i < particleCount; i++) {
    particleDepths[i] = Math.random() * pentagram.maxDepth;
    particleAngles[i] = Math.random() * Math.PI * 2;
    particleSpeeds[i] = 0.5 + Math.random() * 1.5;
    sizes[i] = 0.02 + Math.random() * 0.03;
    
    updateParticle(i);
  }
  
  function updateParticle(i: number): void {
    const depth = particleDepths[i];
    const angle = particleAngles[i];
    const scale = baseRadius * Math.pow(PHI_INVERSE_SQUARED, depth);
    
    positions[i * 3] = Math.cos(angle) * scale;
    positions[i * 3 + 1] = Math.sin(angle) * scale;
    positions[i * 3 + 2] = -depth * 0.3;
    
    // Color based on depth (outer = purple, inner = gold)
    const t = depth / pentagram.maxDepth;
    colors[i * 3] = 0.5 + 0.5 * t;     // R
    colors[i * 3 + 1] = 0.25 + 0.75 * t; // G
    colors[i * 3 + 2] = 0.75 - 0.25 * t; // B
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  
  const material = new THREE.PointsMaterial({
    size: 0.05,
    vertexColors: true,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending
  });
  
  const points = new THREE.Points(geometry, material);
  ctx.scene.add(points);
  
  return {
    update(dt: number): void {
      for (let i = 0; i < particleCount; i++) {
        // Spiral inward following golden ratio
        particleDepths[i] += dt * particleSpeeds[i] * 0.5;
        particleAngles[i] += dt * particleSpeeds[i] * PHI;
        
        // Reset when reaching center
        if (particleDepths[i] > pentagram.maxDepth) {
          particleDepths[i] = 0;
          particleAngles[i] = Math.random() * Math.PI * 2;
        }
        
        updateParticle(i);
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
