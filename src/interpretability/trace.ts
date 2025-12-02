/**
 * Trace: Records wave state evolution through the system.
 */

import { v4 as uuidv4 } from 'uuid';
import { WaveState } from '../core/ontology/wave-state';

export interface WaveTraceEntry {
  id: string;
  logicalTime: number;
  nodeId: string;
  symmetryPairId: string;
  beforeRaise: WaveState;
  raisedWave: WaveState;
  collapsedWave: WaveState;
  parentTraceId?: string;
  metadata?: Record<string, unknown>;
}

export interface TraceStore {
  append(entry: WaveTraceEntry): Promise<void>;
  getByTimeRange(startTick: number, endTick: number): Promise<WaveTraceEntry[]>;
  getByNodeId(nodeId: string): Promise<WaveTraceEntry[]>;
  getByPlanId(planId: string): Promise<WaveTraceEntry[]>;
  getRecent(count: number): Promise<WaveTraceEntry[]>;
  clear(): Promise<void>;
}

/**
 * Create an in-memory trace store.
 */
export function createTraceStore(maxEntries: number = 10000): TraceStore {
  const entries: WaveTraceEntry[] = [];
  
  return {
    async append(entry: WaveTraceEntry): Promise<void> {
      entries.push(entry);
      if (entries.length > maxEntries) {
        entries.shift();
      }
    },
    
    async getByTimeRange(startTick: number, endTick: number): Promise<WaveTraceEntry[]> {
      return entries.filter(e => e.logicalTime >= startTick && e.logicalTime <= endTick);
    },
    
    async getByNodeId(nodeId: string): Promise<WaveTraceEntry[]> {
      return entries.filter(e => e.nodeId === nodeId);
    },
    
    async getByPlanId(planId: string): Promise<WaveTraceEntry[]> {
      return entries.filter(e => e.metadata?.planId === planId);
    },
    
    async getRecent(count: number): Promise<WaveTraceEntry[]> {
      return entries.slice(-count);
    },
    
    async clear(): Promise<void> {
      entries.length = 0;
    }
  };
}

/**
 * Create a wave trace entry.
 */
export function createTraceEntry(
  logicalTime: number,
  nodeId: string,
  symmetryPairId: string,
  beforeRaise: WaveState,
  raisedWave: WaveState,
  collapsedWave: WaveState,
  parentTraceId?: string,
  metadata?: Record<string, unknown>
): WaveTraceEntry {
  return {
    id: uuidv4(),
    logicalTime,
    nodeId,
    symmetryPairId,
    beforeRaise,
    raisedWave,
    collapsedWave,
    parentTraceId,
    metadata
  };
}

/**
 * Summarize a sequence of traces.
 */
export function summarizeTraces(traces: WaveTraceEntry[]): {
  count: number;
  timeRange: [number, number];
  uniqueNodes: number;
  avgRaiseChange: number;
  avgCollapseChange: number;
} {
  if (traces.length === 0) {
    return {
      count: 0,
      timeRange: [0, 0],
      uniqueNodes: 0,
      avgRaiseChange: 0,
      avgCollapseChange: 0
    };
  }
  
  const times = traces.map(t => t.logicalTime);
  const nodes = new Set(traces.map(t => t.nodeId));
  
  let raiseChangeSum = 0;
  let collapseChangeSum = 0;
  
  for (const trace of traces) {
    raiseChangeSum += calculateWaveChange(trace.beforeRaise, trace.raisedWave);
    collapseChangeSum += calculateWaveChange(trace.raisedWave, trace.collapsedWave);
  }
  
  return {
    count: traces.length,
    timeRange: [Math.min(...times), Math.max(...times)],
    uniqueNodes: nodes.size,
    avgRaiseChange: raiseChangeSum / traces.length,
    avgCollapseChange: collapseChangeSum / traces.length
  };
}

/**
 * Calculate magnitude of change between two wave states.
 */
function calculateWaveChange(before: WaveState, after: WaveState): number {
  let sum = 0;
  const len = Math.min(before.amplitudes.length, after.amplitudes.length);
  
  for (let i = 0; i < len; i++) {
    const diff = before.amplitudes[i] - after.amplitudes[i];
    sum += diff * diff;
  }
  
  return Math.sqrt(sum / len);
}

/**
 * Build trace tree from entries.
 */
export function buildTraceTree(entries: WaveTraceEntry[]): Map<string, WaveTraceEntry[]> {
  const tree = new Map<string, WaveTraceEntry[]>();
  
  // Root entries (no parent)
  tree.set('root', entries.filter(e => !e.parentTraceId));
  
  // Child entries grouped by parent
  for (const entry of entries) {
    if (entry.parentTraceId) {
      const siblings = tree.get(entry.parentTraceId) ?? [];
      siblings.push(entry);
      tree.set(entry.parentTraceId, siblings);
    }
  }
  
  return tree;
}
