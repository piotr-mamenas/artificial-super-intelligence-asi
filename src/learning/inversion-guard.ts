/**
 * Inversion Guard: Checks if frames can be inverted (reconstructed).
 * 
 * From the ontology:
 * - Non-invertible regions indicate black hole candidates
 * - High reconstruction error = information loss = horizon crossing
 */

import { v4 as uuidv4 } from 'uuid';
import { SelfWorldFrame } from '../world/self-world-frame';
import { WaveAutoencoder, LatentWave, createWaveAutoencoder } from './wave-autoencoder';
import { WaveState, calculateFidelity } from '../core/ontology/wave-state';
import { INVERSION_ERROR_THRESHOLD, INVERSION_UNCERTAINTY_THRESHOLD } from '../config/constants';

export interface InversionCheckResult {
  id: string;
  isInvertible: boolean;
  reconstructionError: number;
  latentLogLikelihood?: number;
  uncertainty: number;
  latent: LatentWave;
  reconstructedFrame: SelfWorldFrame;
  timestamp: number;
}

export interface InversionGuard {
  check(frame: SelfWorldFrame): Promise<InversionCheckResult>;
  getThresholds(): { error: number; uncertainty: number };
  setThresholds(error: number, uncertainty: number): void;
  getRecentChecks(): InversionCheckResult[];
  getStatistics(): InversionStatistics;
}

export interface InversionStatistics {
  totalChecks: number;
  invertibleCount: number;
  nonInvertibleCount: number;
  avgError: number;
  avgUncertainty: number;
  recentNonInvertibleRate: number;
}

/**
 * Create an inversion guard with an autoencoder backend.
 */
export function createInversionGuard(autoencoder?: WaveAutoencoder): InversionGuard {
  const ae = autoencoder ?? createWaveAutoencoder();
  let errorThreshold = INVERSION_ERROR_THRESHOLD;
  let uncertaintyThreshold = INVERSION_UNCERTAINTY_THRESHOLD;
  const recentChecks: InversionCheckResult[] = [];
  const maxRecentChecks = 100;
  
  // Running statistics
  let totalChecks = 0;
  let invertibleCount = 0;
  let nonInvertibleCount = 0;
  let errorSum = 0;
  let uncertaintySum = 0;
  
  return {
    async check(frame: SelfWorldFrame): Promise<InversionCheckResult> {
      // Encode the closure state (main state to check)
      const latent = await ae.encode(frame.closureState);
      
      // Decode back
      const reconstructedWave = await ae.decode(latent);
      
      // Calculate reconstruction error
      const error = await ae.getReconstructionError(frame.closureState);
      
      // Calculate uncertainty based on latent space properties
      const uncertainty = calculateLatentUncertainty(latent);
      
      // Determine invertibility
      const isInvertible = error < errorThreshold && uncertainty < uncertaintyThreshold;
      
      // Create reconstructed frame
      const reconstructedFrame: SelfWorldFrame = {
        ...frame,
        id: uuidv4(),
        closureState: reconstructedWave,
        metadata: { ...frame.metadata, reconstructed: true }
      };
      
      const result: InversionCheckResult = {
        id: uuidv4(),
        isInvertible,
        reconstructionError: error,
        uncertainty,
        latent,
        reconstructedFrame,
        timestamp: Date.now()
      };
      
      // Update statistics
      totalChecks++;
      if (isInvertible) {
        invertibleCount++;
      } else {
        nonInvertibleCount++;
      }
      errorSum += error;
      uncertaintySum += uncertainty;
      
      // Store in recent checks
      recentChecks.push(result);
      if (recentChecks.length > maxRecentChecks) {
        recentChecks.shift();
      }
      
      return result;
    },
    
    getThresholds(): { error: number; uncertainty: number } {
      return { error: errorThreshold, uncertainty: uncertaintyThreshold };
    },
    
    setThresholds(error: number, uncertainty: number): void {
      errorThreshold = error;
      uncertaintyThreshold = uncertainty;
    },
    
    getRecentChecks(): InversionCheckResult[] {
      return [...recentChecks];
    },
    
    getStatistics(): InversionStatistics {
      const recentNonInvertible = recentChecks.filter(c => !c.isInvertible).length;
      
      return {
        totalChecks,
        invertibleCount,
        nonInvertibleCount,
        avgError: totalChecks > 0 ? errorSum / totalChecks : 0,
        avgUncertainty: totalChecks > 0 ? uncertaintySum / totalChecks : 0,
        recentNonInvertibleRate: recentChecks.length > 0 
          ? recentNonInvertible / recentChecks.length 
          : 0
      };
    }
  };
}

/**
 * Calculate uncertainty from latent vector properties.
 * Higher variance in latent dimensions = higher uncertainty.
 */
function calculateLatentUncertainty(latent: LatentWave): number {
  const vec = latent.vector;
  const n = vec.length;
  
  if (n === 0) return 1;
  
  // Calculate mean
  let mean = 0;
  for (let i = 0; i < n; i++) {
    mean += vec[i];
  }
  mean /= n;
  
  // Calculate variance
  let variance = 0;
  for (let i = 0; i < n; i++) {
    const diff = vec[i] - mean;
    variance += diff * diff;
  }
  variance /= n;
  
  // Map variance to uncertainty (0 to 1)
  // High variance = high uncertainty
  return Math.min(1, Math.sqrt(variance));
}

/**
 * Batch check multiple frames.
 */
export async function batchCheck(
  guard: InversionGuard,
  frames: SelfWorldFrame[]
): Promise<InversionCheckResult[]> {
  const results: InversionCheckResult[] = [];
  
  for (const frame of frames) {
    const result = await guard.check(frame);
    results.push(result);
  }
  
  return results;
}

/**
 * Find non-invertible frames in a sequence.
 */
export async function findNonInvertibleFrames(
  guard: InversionGuard,
  frames: SelfWorldFrame[]
): Promise<{ frame: SelfWorldFrame; result: InversionCheckResult }[]> {
  const nonInvertible: { frame: SelfWorldFrame; result: InversionCheckResult }[] = [];
  
  for (const frame of frames) {
    const result = await guard.check(frame);
    if (!result.isInvertible) {
      nonInvertible.push({ frame, result });
    }
  }
  
  return nonInvertible;
}

/**
 * Calculate inversion quality score (0 = worst, 1 = best).
 */
export function calculateInversionQuality(result: InversionCheckResult): number {
  const errorScore = Math.max(0, 1 - result.reconstructionError);
  const uncertaintyScore = Math.max(0, 1 - result.uncertainty);
  return (errorScore + uncertaintyScore) / 2;
}

/**
 * Adaptive threshold adjustment based on recent history.
 */
export function adjustThresholdsAdaptively(
  guard: InversionGuard,
  targetInvertibleRate: number = 0.8
): void {
  const stats = guard.getStatistics();
  const currentRate = stats.totalChecks > 0 
    ? stats.invertibleCount / stats.totalChecks 
    : 1;
  
  const thresholds = guard.getThresholds();
  
  if (currentRate < targetInvertibleRate) {
    // Too many non-invertible, relax thresholds
    guard.setThresholds(
      thresholds.error * 1.1,
      thresholds.uncertainty * 1.1
    );
  } else if (currentRate > targetInvertibleRate + 0.1) {
    // Too many invertible, tighten thresholds
    guard.setThresholds(
      thresholds.error * 0.95,
      thresholds.uncertainty * 0.95
    );
  }
}
