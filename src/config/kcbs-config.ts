/**
 * KCBS (Klyachko-Can-Binicioglu-Shumovsky) pentagram configuration.
 * Defines the geometry of contextual observables forming a pentagram.
 */

import { KCBS_OBSERVABLE_COUNT } from './constants';

// Golden ratio for pentagram geometry
export const PHI = (1 + Math.sqrt(5)) / 2;

// Angular separation between adjacent observables (72 degrees)
export const KCBS_ANGLE_SEPARATION = (2 * Math.PI) / KCBS_OBSERVABLE_COUNT;

// Quantum bound for KCBS inequality violation
// Classical limit: 2, Quantum limit: sqrt(5) ≈ 2.236
export const KCBS_CLASSICAL_BOUND = 2;
export const KCBS_QUANTUM_BOUND = Math.sqrt(5);

/**
 * Generate default KCBS observable directions on a unit circle.
 * These form the vertices of a regular pentagon.
 */
export function generateKCBSDirections(): Float32Array[] {
  const directions: Float32Array[] = [];
  
  for (let i = 0; i < KCBS_OBSERVABLE_COUNT; i++) {
    const angle = i * KCBS_ANGLE_SEPARATION;
    // 3D unit vector in the x-y plane
    directions.push(new Float32Array([
      Math.cos(angle),
      Math.sin(angle),
      0
    ]));
  }
  
  return directions;
}

/**
 * Generate pentagram star points (inner vertices).
 * These are the intersection points of the pentagon's diagonals.
 */
export function generatePentagramStarPoints(): Float32Array[] {
  const points: Float32Array[] = [];
  const innerRadius = 1 / (PHI * PHI); // Inner radius of pentagram
  
  for (let i = 0; i < KCBS_OBSERVABLE_COUNT; i++) {
    // Offset by half the angle separation for star points
    const angle = i * KCBS_ANGLE_SEPARATION + KCBS_ANGLE_SEPARATION / 2;
    points.push(new Float32Array([
      innerRadius * Math.cos(angle),
      innerRadius * Math.sin(angle),
      0
    ]));
  }
  
  return points;
}

/**
 * Context edge definitions: each context connects two compatible observables.
 * In KCBS, contexts form a cycle: (0,1), (1,2), (2,3), (3,4), (4,0)
 */
export const KCBS_CONTEXT_EDGES: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 0]
];

/**
 * Non-adjacent (incompatible) pairs in the pentagon.
 * These form the internal star edges.
 */
export const KCBS_STAR_EDGES: [number, number][] = [
  [0, 2],
  [1, 3],
  [2, 4],
  [3, 0],
  [4, 1]
];
