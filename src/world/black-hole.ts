/**
 * Black Hole Region: Area where inversion repeatedly fails.
 * 
 * From the ontology:
 * - Black holes are regions where observations are non-invertible
 * - Symmetry distinction fails in these regions
 * - They can spawn nested realities with their own internal structure
 */

import { v4 as uuidv4 } from 'uuid';
import { BLACK_HOLE_MIN_FRAMES, BLACK_HOLE_PERSISTENCE_THRESHOLD } from '../config/constants';

export interface LatentWave {
  id: string;
  vector: Float32Array;
  createdAt: number;
  metadata?: Record<string, unknown>;
}

export interface BlackHoleRegion {
  id: string;
  frameIds: string[];           // Frames that contributed to this black hole
  center: LatentWave;           // Center of the non-invertible region
  radius: number;               // Size of the region in latent space
  inversionErrorSum: number;    // Accumulated inversion errors
  firstSeenAt: number;          // Logical tick
  lastSeenAt: number;           // Logical tick
  persistence: number;          // How long it has existed (ticks)
  isActive: boolean;            // Whether it's still accumulating
  nestedRealityId?: string;     // ID of spawned nested reality (if any)
  metadata?: Record<string, unknown>;
}

export interface BlackHoleCandidate {
  frameId: string;
  latentPosition: Float32Array;
  inversionError: number;
  timestamp: number;
}

/**
 * Create a new black hole region.
 */
export function createBlackHoleRegion(
  frameIds: string[],
  center: LatentWave,
  inversionError: number,
  logicalTick: number
): BlackHoleRegion {
  return {
    id: uuidv4(),
    frameIds,
    center,
    radius: 0.1, // Initial small radius
    inversionErrorSum: inversionError,
    firstSeenAt: logicalTick,
    lastSeenAt: logicalTick,
    persistence: 1,
    isActive: true
  };
}

/**
 * Update black hole with new observation.
 */
export function updateBlackHole(
  blackHole: BlackHoleRegion,
  newFrameId: string,
  newLatent: LatentWave,
  inversionError: number,
  logicalTick: number
): BlackHoleRegion {
  // Update center using exponential moving average
  const alpha = 0.3;
  const newCenter: LatentWave = {
    id: uuidv4(),
    vector: new Float32Array(blackHole.center.vector.length),
    createdAt: Date.now()
  };
  
  for (let i = 0; i < blackHole.center.vector.length; i++) {
    newCenter.vector[i] = blackHole.center.vector[i] * (1 - alpha) + newLatent.vector[i] * alpha;
  }
  
  // Expand radius based on distance to new point
  const distance = latentDistance(blackHole.center.vector, newLatent.vector);
  const newRadius = Math.max(blackHole.radius, distance * 1.1);
  
  return {
    ...blackHole,
    frameIds: [...blackHole.frameIds, newFrameId],
    center: newCenter,
    radius: newRadius,
    inversionErrorSum: blackHole.inversionErrorSum + inversionError,
    lastSeenAt: logicalTick,
    persistence: blackHole.persistence + 1
  };
}

/**
 * Calculate distance between two latent vectors.
 */
export function latentDistance(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error('Latent vectors must have same dimension');
  }
  
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Check if a latent position is inside a black hole region.
 */
export function isInsideBlackHole(
  position: Float32Array,
  blackHole: BlackHoleRegion
): boolean {
  const dist = latentDistance(position, blackHole.center.vector);
  return dist <= blackHole.radius;
}

/**
 * Check if black hole is mature enough to spawn nested reality.
 */
export function isReadyToSpawnReality(blackHole: BlackHoleRegion): boolean {
  return blackHole.frameIds.length >= BLACK_HOLE_MIN_FRAMES &&
         blackHole.persistence >= BLACK_HOLE_MIN_FRAMES &&
         blackHole.inversionErrorSum / blackHole.frameIds.length > BLACK_HOLE_PERSISTENCE_THRESHOLD &&
         !blackHole.nestedRealityId; // Not already spawned
}

/**
 * Calculate black hole "mass" - total accumulated non-invertibility.
 */
export function calculateBlackHoleMass(blackHole: BlackHoleRegion): number {
  return blackHole.inversionErrorSum * blackHole.persistence;
}

/**
 * Calculate black hole "spin" - rotational aspect of the region.
 */
export function calculateBlackHoleSpin(blackHole: BlackHoleRegion): number {
  // Based on asymmetry of the center vector
  if (blackHole.center.vector.length < 2) return 0;
  
  let sum = 0;
  for (let i = 0; i < blackHole.center.vector.length - 1; i++) {
    sum += blackHole.center.vector[i] * blackHole.center.vector[i + 1];
  }
  return sum / blackHole.center.vector.length;
}

/**
 * Decay black hole if not recently observed.
 */
export function decayBlackHole(
  blackHole: BlackHoleRegion,
  currentTick: number,
  decayRate: number = 0.05
): BlackHoleRegion {
  const timeSinceSeen = currentTick - blackHole.lastSeenAt;
  const decayFactor = Math.exp(-decayRate * timeSinceSeen);
  
  return {
    ...blackHole,
    radius: blackHole.radius * decayFactor,
    inversionErrorSum: blackHole.inversionErrorSum * decayFactor,
    isActive: decayFactor > 0.1
  };
}

/**
 * Merge two overlapping black holes.
 */
export function mergeBlackHoles(
  bh1: BlackHoleRegion,
  bh2: BlackHoleRegion
): BlackHoleRegion {
  // Weight by accumulated error
  const totalError = bh1.inversionErrorSum + bh2.inversionErrorSum;
  const w1 = bh1.inversionErrorSum / totalError;
  const w2 = bh2.inversionErrorSum / totalError;
  
  const dim = bh1.center.vector.length;
  const mergedCenter: LatentWave = {
    id: uuidv4(),
    vector: new Float32Array(dim),
    createdAt: Date.now()
  };
  
  for (let i = 0; i < dim; i++) {
    mergedCenter.vector[i] = bh1.center.vector[i] * w1 + bh2.center.vector[i] * w2;
  }
  
  return {
    id: uuidv4(),
    frameIds: [...bh1.frameIds, ...bh2.frameIds],
    center: mergedCenter,
    radius: Math.max(bh1.radius, bh2.radius) * 1.2,
    inversionErrorSum: totalError,
    firstSeenAt: Math.min(bh1.firstSeenAt, bh2.firstSeenAt),
    lastSeenAt: Math.max(bh1.lastSeenAt, bh2.lastSeenAt),
    persistence: bh1.persistence + bh2.persistence,
    isActive: bh1.isActive || bh2.isActive
  };
}

/**
 * Create a summary of black hole for display.
 */
export function blackHoleSummary(blackHole: BlackHoleRegion): {
  id: string;
  mass: number;
  spin: number;
  age: number;
  frameCount: number;
  hasNestedReality: boolean;
} {
  return {
    id: blackHole.id,
    mass: calculateBlackHoleMass(blackHole),
    spin: calculateBlackHoleSpin(blackHole),
    age: blackHole.persistence,
    frameCount: blackHole.frameIds.length,
    hasNestedReality: !!blackHole.nestedRealityId
  };
}
