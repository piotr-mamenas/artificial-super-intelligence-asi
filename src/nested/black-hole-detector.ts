/**
 * Black Hole Detector: Identifies regions where inversion repeatedly fails.
 */

import { v4 as uuidv4 } from 'uuid';
import { SelfWorldFrame } from '../world/self-world-frame';
import { InversionCheckResult } from '../learning/inversion-guard';
import { 
  BlackHoleRegion, 
  createBlackHoleRegion, 
  updateBlackHole, 
  latentDistance,
  isReadyToSpawnReality 
} from '../world/black-hole';
import { LatentWave } from '../learning/wave-autoencoder';
import { BLACK_HOLE_MIN_FRAMES } from '../config/constants';

export interface BlackHoleDetector {
  tryUpdate(frame: SelfWorldFrame, inversion: InversionCheckResult): Promise<BlackHoleRegion | null>;
  getActiveRegions(): BlackHoleRegion[];
  getReadyRegions(): BlackHoleRegion[];
  pruneStaleRegions(currentTick: number): void;
}

export interface DetectorConfig {
  minErrorThreshold: number;
  clusterRadius: number;
  staleAfterTicks: number;
}

const DEFAULT_CONFIG: DetectorConfig = {
  minErrorThreshold: 0.3,
  clusterRadius: 0.5,
  staleAfterTicks: 50
};

/**
 * Create a black hole detector.
 */
export function createBlackHoleDetector(config: Partial<DetectorConfig> = {}): BlackHoleDetector {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const regions: BlackHoleRegion[] = [];
  
  return {
    async tryUpdate(
      frame: SelfWorldFrame,
      inversion: InversionCheckResult
    ): Promise<BlackHoleRegion | null> {
      // Only consider non-invertible frames
      if (inversion.isInvertible) {
        return null;
      }
      
      // Check if error exceeds threshold
      if (inversion.reconstructionError < cfg.minErrorThreshold) {
        return null;
      }
      
      const latent = inversion.latent;
      
      // Try to find existing region this frame belongs to
      let matchingRegion: BlackHoleRegion | null = null;
      let minDistance = cfg.clusterRadius;
      
      for (const region of regions) {
        const dist = latentDistance(latent.vector, region.center.vector);
        if (dist < minDistance) {
          minDistance = dist;
          matchingRegion = region;
        }
      }
      
      if (matchingRegion) {
        // Update existing region
        const updated = updateBlackHole(
          matchingRegion,
          frame.id,
          latent,
          inversion.reconstructionError,
          frame.logicalTime.tick
        );
        
        // Replace in list
        const idx = regions.findIndex(r => r.id === matchingRegion!.id);
        if (idx >= 0) {
          regions[idx] = updated;
        }
        
        return updated;
      } else {
        // Create new region
        const newRegion = createBlackHoleRegion(
          [frame.id],
          latent,
          inversion.reconstructionError,
          frame.logicalTime.tick
        );
        
        regions.push(newRegion);
        return newRegion;
      }
    },
    
    getActiveRegions(): BlackHoleRegion[] {
      return regions.filter(r => r.isActive);
    },
    
    getReadyRegions(): BlackHoleRegion[] {
      return regions.filter(isReadyToSpawnReality);
    },
    
    pruneStaleRegions(currentTick: number): void {
      for (let i = regions.length - 1; i >= 0; i--) {
        const region = regions[i];
        const staleness = currentTick - region.lastSeenAt;
        
        if (staleness > cfg.staleAfterTicks && !region.nestedRealityId) {
          regions.splice(i, 1);
        }
      }
    }
  };
}

/**
 * Analyze black hole region patterns.
 */
export function analyzeBlackHolePattern(region: BlackHoleRegion): {
  avgError: number;
  growthRate: number;
  stability: number;
} {
  const avgError = region.inversionErrorSum / Math.max(1, region.frameIds.length);
  const age = region.persistence;
  const growthRate = region.frameIds.length / Math.max(1, age);
  const stability = Math.min(1, age / BLACK_HOLE_MIN_FRAMES);
  
  return { avgError, growthRate, stability };
}
