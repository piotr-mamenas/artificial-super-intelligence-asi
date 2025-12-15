// Visualization: Snapshots

import { Agent } from '../agent/agent.js';
import { MultiAgentSystem } from '../agent/multiAgent.js';
import { UniverseGraph } from '../cognitive/universes.js';

// ============================================================
// Snapshot API for Visualization
// ============================================================

/**
 * Build a snapshot of a single agent for visualization.
 * @param {Agent} agent
 * @returns {object}
 */
export function buildAgentSnapshot(agent) {
  return agent.toSnapshot();
}

/**
 * Build a snapshot of a multi-agent system for visualization.
 * @param {MultiAgentSystem} mas
 * @returns {object}
 */
export function buildMultiAgentSnapshot(mas) {
  return mas.toSnapshot();
}

/**
 * Build a snapshot of a universe graph for visualization.
 * @param {UniverseGraph} universeGraph
 * @returns {object}
 */
export function buildUniverseGraphSnapshot(universeGraph) {
  return universeGraph.toJSON();
}
