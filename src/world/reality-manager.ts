/**
 * Reality Manager: Orchestrates multiple realities and nested reality spawning.
 */

import { v4 as uuidv4 } from 'uuid';
import { Reality, createReality, addChildReality, getRealityTree } from './reality';
import { BlackHoleRegion, isReadyToSpawnReality } from './black-hole';
import { MAX_NESTED_REALITY_DEPTH } from '../config/constants';

export interface RealityManager {
  rootReality: Reality;
  realities: Map<string, Reality>;
  
  getRootReality(): Reality;
  getReality(id: string): Reality | undefined;
  getAllRealities(): Reality[];
  getNestedRealities(): Reality[];
  spawnNestedReality(parentId: string, blackHole: BlackHoleRegion): Reality | null;
  tickAll(): Promise<void>;
  getHierarchy(): any;
}

/**
 * Create a reality manager with a root reality.
 */
export function createRealityManager(rootName: string = 'Root Reality'): RealityManager {
  const rootReality = createReality({ name: rootName, depth: 0 });
  const realities = new Map<string, Reality>();
  realities.set(rootReality.id, rootReality);
  
  return {
    rootReality,
    realities,
    
    getRootReality(): Reality {
      return this.rootReality;
    },
    
    getReality(id: string): Reality | undefined {
      return this.realities.get(id);
    },
    
    getAllRealities(): Reality[] {
      return Array.from(this.realities.values());
    },
    
    getNestedRealities(): Reality[] {
      return Array.from(this.realities.values()).filter(r => r.depth > 0);
    },
    
    spawnNestedReality(parentId: string, blackHole: BlackHoleRegion): Reality | null {
      const parent = this.realities.get(parentId);
      if (!parent) return null;
      
      // Check depth limit
      if (parent.depth >= MAX_NESTED_REALITY_DEPTH) {
        console.warn(`Cannot spawn nested reality: max depth ${MAX_NESTED_REALITY_DEPTH} reached`);
        return null;
      }
      
      // Check if black hole is ready
      if (!isReadyToSpawnReality(blackHole)) {
        return null;
      }
      
      // Create nested reality
      const nested = createReality({
        name: `Nested-${blackHole.id.slice(0, 8)}`,
        parentRealityId: parentId,
        depth: parent.depth + 1
      });
      
      // Register
      this.realities.set(nested.id, nested);
      addChildReality(parent, nested.id);
      
      // Mark black hole as having spawned
      blackHole.nestedRealityId = nested.id;
      
      return nested;
    },
    
    async tickAll(): Promise<void> {
      // Tick all realities, starting from deepest to root
      const sorted = Array.from(this.realities.values())
        .sort((a, b) => b.depth - a.depth);
      
      for (const reality of sorted) {
        if (reality.isRunning) {
          await reality.tick();
        }
      }
    },
    
    getHierarchy(): any {
      return getRealityTree(this.rootReality, this.realities);
    }
  };
}

/**
 * Find realities that contain a specific black hole.
 */
export function findRealitiesWithBlackHole(
  manager: RealityManager,
  blackHoleId: string
): Reality[] {
  return manager.getAllRealities().filter(r => 
    r.blackHoles.some(bh => bh.id === blackHoleId)
  );
}

/**
 * Get total reality count including nested.
 */
export function getTotalRealityCount(manager: RealityManager): number {
  return manager.realities.size;
}

/**
 * Get reality depth statistics.
 */
export function getRealityDepthStats(manager: RealityManager): {
  maxDepth: number;
  avgDepth: number;
  countByDepth: Map<number, number>;
} {
  const realities = manager.getAllRealities();
  const countByDepth = new Map<number, number>();
  let maxDepth = 0;
  let totalDepth = 0;
  
  for (const r of realities) {
    maxDepth = Math.max(maxDepth, r.depth);
    totalDepth += r.depth;
    countByDepth.set(r.depth, (countByDepth.get(r.depth) ?? 0) + 1);
  }
  
  return {
    maxDepth,
    avgDepth: totalDepth / realities.length,
    countByDepth
  };
}

/**
 * Prune inactive nested realities.
 */
export function pruneInactiveRealities(
  manager: RealityManager,
  minTicks: number = 10
): string[] {
  const pruned: string[] = [];
  
  for (const [id, reality] of manager.realities) {
    if (reality.depth > 0 && 
        !reality.isRunning && 
        reality.clock.getTick() < minTicks) {
      // Remove from parent
      if (reality.parentRealityId) {
        const parent = manager.realities.get(reality.parentRealityId);
        if (parent) {
          parent.childRealityIds = parent.childRealityIds.filter(cid => cid !== id);
        }
      }
      
      manager.realities.delete(id);
      pruned.push(id);
    }
  }
  
  return pruned;
}
