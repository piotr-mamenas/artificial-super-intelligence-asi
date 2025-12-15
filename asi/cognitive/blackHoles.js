// Cognitive: Black Holes

import { StateSpace } from '../core/states.js';
import { buildCurvatureMap } from '../core/geometry.js';

// ============================================================
// BlackHoleDetector - Symmetry collapse detection
// ============================================================

/**
 * BlackHoleDetector: identifies regions where states collapse
 * (high curvature = many loops = symmetry/indistinguishability).
 */
export class BlackHoleDetector {
  /**
   * Identify collapse regions based on curvature threshold.
   * @param {StateSpace} stateSpace
   * @param {{ [stateId: string]: number }} curvatureMap
   * @param {number} thresholdCurvature - Minimum curvature to be considered collapsed
   * @param {number} minClusterSize - Minimum states to form a region
   * @returns {Array<{ id: string, stateIds: string[], metadata: { curvatureStats: object } }>}
   */
  identifyCollapseRegions(stateSpace, curvatureMap, thresholdCurvature, minClusterSize) {
    // Find all high-curvature states
    const highCurvatureStates = [];
    for (const [stateId, curvature] of Object.entries(curvatureMap)) {
      if (curvature >= thresholdCurvature) {
        highCurvatureStates.push({ stateId, curvature });
      }
    }

    if (highCurvatureStates.length < minClusterSize) {
      return [];
    }

    // Simple clustering: group by curvature similarity
    // Sort by curvature and cluster nearby values
    highCurvatureStates.sort((a, b) => b.curvature - a.curvature);

    const regions = [];
    let currentCluster = [];
    let lastCurvature = null;

    for (const entry of highCurvatureStates) {
      if (lastCurvature === null || Math.abs(entry.curvature - lastCurvature) < thresholdCurvature * 0.5) {
        currentCluster.push(entry);
      } else {
        // Start new cluster
        if (currentCluster.length >= minClusterSize) {
          regions.push(this._buildRegion(regions.length, currentCluster));
        }
        currentCluster = [entry];
      }
      lastCurvature = entry.curvature;
    }

    // Don't forget the last cluster
    if (currentCluster.length >= minClusterSize) {
      regions.push(this._buildRegion(regions.length, currentCluster));
    }

    // If no clusters formed but we have enough high-curvature states, treat all as one region
    if (regions.length === 0 && highCurvatureStates.length >= minClusterSize) {
      regions.push(this._buildRegion(0, highCurvatureStates));
    }

    return regions;
  }

  /**
   * Build a collapse region from a cluster of states.
   * @private
   */
  _buildRegion(index, cluster) {
    const stateIds = cluster.map(e => e.stateId);
    const curvatures = cluster.map(e => e.curvature);

    const sum = curvatures.reduce((a, b) => a + b, 0);
    const mean = sum / curvatures.length;
    const min = Math.min(...curvatures);
    const max = Math.max(...curvatures);

    return {
      id: `blackhole:${index}`,
      stateIds,
      metadata: {
        curvatureStats: {
          mean,
          min,
          max,
          count: curvatures.length
        }
      }
    };
  }

  /**
   * Generate a compact signature for a collapse region.
   * This signature can seed new universe models.
   * @param {{ id: string, stateIds: string[], metadata: { curvatureStats: object } }} collapseRegion
   * @returns {string}
   */
  collapseRegionToSignature(collapseRegion) {
    const sortedIds = [...collapseRegion.stateIds].sort();
    const stats = collapseRegion.metadata.curvatureStats;

    const signature = {
      states: sortedIds.join("|"),
      curvature: {
        mean: stats.mean.toFixed(4),
        range: `${stats.min.toFixed(4)}-${stats.max.toFixed(4)}`,
        count: stats.count
      }
    };

    return JSON.stringify(signature);
  }
}
