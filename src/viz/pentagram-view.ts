/**
 * KCBS Pentagram Visualization
 */

import * as THREE from 'three';
import { SceneContext } from './three-scene';
import { KCBSPentagramRotation, KCBSContext, KCBSPentagram } from '../core/math/kcbs-graph';
import { RENDER_CONFIG } from '../config/render-config';
import { PHI, generateKCBSDirections, generatePentagramStarPoints } from '../config/kcbs-config';

export interface PentagramView {
  group: THREE.Group;
  updateRotation(rotation: KCBSPentagramRotation): void;
  highlightContext(context: KCBSContext): void;
  clearHighlight(): void;
  setVisible(visible: boolean): void;
  dispose(): void;
}

/**
 * Create a pentagram visualization.
 */
export function createPentagramView(ctx: SceneContext, radius: number = 3): PentagramView {
  const group = new THREE.Group();
  ctx.scene.add(group);
  
  // Materials
  const edgeMaterial = new THREE.LineBasicMaterial({
    color: RENDER_CONFIG.colors.pentagramEdge,
    linewidth: 2
  });
  
  const starMaterial = new THREE.LineBasicMaterial({
    color: RENDER_CONFIG.colors.pentagramStar,
    linewidth: 1,
    transparent: true,
    opacity: 0.5
  });
  
  const vertexMaterial = new THREE.MeshBasicMaterial({
    color: RENDER_CONFIG.colors.pentagramVertex
  });
  
  const highlightMaterial = new THREE.MeshBasicMaterial({
    color: RENDER_CONFIG.colors.activeContext,
    emissive: new THREE.Color(RENDER_CONFIG.colors.activeContext),
    emissiveIntensity: 0.5
  });
  
  // Vertex geometry
  const vertexGeometry = new THREE.SphereGeometry(RENDER_CONFIG.sizes.vertexSize, 16, 16);
  
  // Create vertices
  const directions = generateKCBSDirections();
  const vertices: THREE.Mesh[] = [];
  
  for (let i = 0; i < 5; i++) {
    const vertex = new THREE.Mesh(vertexGeometry, vertexMaterial.clone());
    vertex.position.set(
      directions[i][0] * radius,
      directions[i][1] * radius,
      directions[i][2] * radius
    );
    vertex.userData = { observableIndex: i };
    vertices.push(vertex);
    group.add(vertex);
  }
  
  // Create pentagon edges
  const pentagonPoints: THREE.Vector3[] = [];
  for (let i = 0; i <= 5; i++) {
    const idx = i % 5;
    pentagonPoints.push(new THREE.Vector3(
      directions[idx][0] * radius,
      directions[idx][1] * radius,
      directions[idx][2] * radius
    ));
  }
  
  const pentagonGeometry = new THREE.BufferGeometry().setFromPoints(pentagonPoints);
  const pentagonLine = new THREE.Line(pentagonGeometry, edgeMaterial);
  group.add(pentagonLine);
  
  // Create star (internal) edges
  const starPoints = generatePentagramStarPoints();
  for (let i = 0; i < 5; i++) {
    const start = directions[i];
    const end = directions[(i + 2) % 5]; // Connect to vertex 2 steps away
    
    const starGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(start[0] * radius, start[1] * radius, start[2] * radius),
      new THREE.Vector3(end[0] * radius, end[1] * radius, end[2] * radius)
    ]);
    const starLine = new THREE.Line(starGeometry, starMaterial);
    group.add(starLine);
  }
  
  // Highlight objects
  let highlightedVertices: THREE.Mesh[] = [];
  
  return {
    group,
    
    updateRotation(rotation: KCBSPentagramRotation): void {
      // Rotate the entire group
      group.rotation.z = rotation.angle;
      
      // Also update individual vertex positions based on rotated directions
      for (let i = 0; i < 5; i++) {
        const dir = rotation.rotatedDirections[i];
        vertices[i].position.set(dir[0] * radius, dir[1] * radius, dir[2] * radius);
      }
    },
    
    highlightContext(context: KCBSContext): void {
      this.clearHighlight();
      
      // Highlight the two vertices in the context
      const idx1 = context.edgeIndex;
      const idx2 = (context.edgeIndex + 1) % 5;
      
      vertices[idx1].material = highlightMaterial.clone();
      vertices[idx2].material = highlightMaterial.clone();
      
      highlightedVertices = [vertices[idx1], vertices[idx2]];
    },
    
    clearHighlight(): void {
      for (const v of highlightedVertices) {
        v.material = vertexMaterial.clone();
      }
      highlightedVertices = [];
    },
    
    setVisible(visible: boolean): void {
      group.visible = visible;
    },
    
    dispose(): void {
      ctx.scene.remove(group);
      vertexGeometry.dispose();
      edgeMaterial.dispose();
      starMaterial.dispose();
      vertexMaterial.dispose();
      highlightMaterial.dispose();
    }
  };
}

/**
 * Create nested pentagram views (multiple layers).
 */
export function createNestedPentagramViews(
  ctx: SceneContext,
  numLayers: number,
  baseRadius: number = 3
): PentagramView[] {
  const views: PentagramView[] = [];
  
  for (let i = 0; i < numLayers; i++) {
    // Each layer has smaller radius and slight z-offset
    const layerRadius = baseRadius * Math.pow(0.6, i);
    const view = createPentagramView(ctx, layerRadius);
    
    // Offset in z
    view.group.position.z = -i * 0.5;
    
    // Initial rotation offset
    view.group.rotation.z = i * Math.PI / 5; // 36 degrees per layer
    
    // Fade out deeper layers
    view.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
        const material = obj.material as THREE.Material;
        if (material.transparent !== undefined) {
          material.transparent = true;
          material.opacity = Math.pow(0.7, i);
        }
      }
    });
    
    views.push(view);
  }
  
  return views;
}

/**
 * Animate pentagram rotation over time.
 */
export function animatePentagramRotation(
  view: PentagramView,
  pentagram: KCBSPentagram,
  speed: number = 0.001
): { update: (delta: number) => void; stop: () => void } {
  let angle = 0;
  let isRunning = true;
  
  return {
    update(delta: number): void {
      if (!isRunning) return;
      
      angle += speed * delta * 1000;
      
      // Create rotation state
      const rotation: KCBSPentagramRotation = {
        angle,
        pentagram,
        rotatedDirections: pentagram.observables.map((obs, i) => {
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
      
      view.updateRotation(rotation);
    },
    
    stop(): void {
      isRunning = false;
    }
  };
}
