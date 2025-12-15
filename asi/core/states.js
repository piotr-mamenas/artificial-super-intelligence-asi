// Core: States (Paths, Path IDs, Causal Order)

import { AboutnessGraph } from './aboutnessGraph.js';
import { Occurrence } from './occurrences.js';

/**
 * @typedef {Object} Path
 * @property {string} id - Unique path ID (e.g. "path:from->...->to")
 * @property {string[]} nodeIds - Sequence of occurrence IDs
 * @property {number} length - nodeIds.length - 1
 */

/**
 * Generate a deterministic path ID from node IDs.
 * @param {string[]} nodeIds
 * @returns {string}
 */
export function generatePathId(nodeIds) {
  return "path:" + nodeIds.join("->");
}

/**
 * Find all simple paths (no revisiting nodes) from a start node using depth-limited DFS.
 * @param {AboutnessGraph} graph
 * @param {string} startId
 * @param {number} [maxDepth=4]
 * @returns {Path[]}
 */
export function findAllSimplePaths(graph, startId, maxDepth = 4) {
  const paths = [];

  /**
   * DFS helper
   * @param {string} currentId
   * @param {string[]} currentPath
   * @param {Set<string>} visited
   * @param {number} depth
   */
  function dfs(currentId, currentPath, visited, depth) {
    // Record this path (every path from start is valid, including single node)
    if (currentPath.length > 0) {
      paths.push({
        id: generatePathId(currentPath),
        nodeIds: [...currentPath],
        length: currentPath.length - 1
      });
    }

    // Stop if max depth reached
    if (depth >= maxDepth) return;

    // Explore outgoing edges
    const outgoing = graph.getOutgoing(currentId);
    for (const rel of outgoing) {
      if (!visited.has(rel.to)) {
        visited.add(rel.to);
        currentPath.push(rel.to);
        dfs(rel.to, currentPath, visited, depth + 1);
        currentPath.pop();
        visited.delete(rel.to);
      }
    }
  }

  // Start DFS from startId
  const visited = new Set([startId]);
  dfs(startId, [startId], visited, 0);

  return paths;
}

/**
 * Check if toId is reachable from fromId within maxDepth steps.
 * @param {AboutnessGraph} graph
 * @param {string} fromId
 * @param {string} toId
 * @param {number} [maxDepth=10]
 * @returns {boolean}
 */
export function isReachable(graph, fromId, toId, maxDepth = 10) {
  if (fromId === toId) return true;

  const visited = new Set([fromId]);
  const queue = [{ id: fromId, depth: 0 }];

  while (queue.length > 0) {
    const { id, depth } = queue.shift();

    if (depth >= maxDepth) continue;

    const outgoing = graph.getOutgoing(id);
    for (const rel of outgoing) {
      if (rel.to === toId) return true;
      if (!visited.has(rel.to)) {
        visited.add(rel.to);
        queue.push({ id: rel.to, depth: depth + 1 });
      }
    }
  }

  return false;
}

/**
 * Get nodes ordered by increasing distance from rootId (BFS order).
 * @param {AboutnessGraph} graph
 * @param {string} rootId
 * @param {number} [maxDepth=10]
 * @returns {string[]}
 */
export function getCausalOrder(graph, rootId, maxDepth = 10) {
  const order = [];
  const visited = new Set([rootId]);
  const queue = [{ id: rootId, depth: 0 }];

  while (queue.length > 0) {
    const { id, depth } = queue.shift();
    order.push(id);

    if (depth >= maxDepth) continue;

    const outgoing = graph.getOutgoing(id);
    for (const rel of outgoing) {
      if (!visited.has(rel.to)) {
        visited.add(rel.to);
        queue.push({ id: rel.to, depth: depth + 1 });
      }
    }
  }

  return order;
}

// ============================================================
// States and Equivalence Classes
// ============================================================

/**
 * State: an equivalence class of occurrences that play the same role.
 */
export class State {
  /**
   * @param {string} id
   * @param {string[]} [occurrenceIds=[]]
   * @param {object} [metadata={}]
   */
  constructor(id, occurrenceIds = [], metadata = {}) {
    this.id = id;
    this.occurrenceIds = [...occurrenceIds];
    this.metadata = metadata;
  }

  /**
   * Add an occurrence to this state.
   * @param {string} id
   */
  addOccurrence(id) {
    if (!this.occurrenceIds.includes(id)) {
      this.occurrenceIds.push(id);
    }
  }

  /**
   * Remove an occurrence from this state.
   * @param {string} id
   */
  removeOccurrence(id) {
    const idx = this.occurrenceIds.indexOf(id);
    if (idx !== -1) {
      this.occurrenceIds.splice(idx, 1);
    }
  }

  /**
   * Serialize to plain object.
   * @returns {object}
   */
  toJSON() {
    return {
      id: this.id,
      occurrenceIds: this.occurrenceIds,
      metadata: this.metadata
    };
  }
}

/**
 * StateSpace: manages states and occurrence-to-state mappings.
 */
export class StateSpace {
  constructor() {
    /** @type {Map<string, State>} */
    this.states = new Map();
    /** @type {Map<string, string>} occurrenceId → stateId */
    this.occurrenceToState = new Map();
  }

  /**
   * Create a new state and map occurrences to it.
   * @param {string} id
   * @param {string[]} [occurrenceIds=[]]
   * @param {object} [metadata={}]
   * @returns {State}
   */
  createState(id, occurrenceIds = [], metadata = {}) {
    const state = new State(id, occurrenceIds, metadata);
    this.states.set(id, state);
    for (const occId of occurrenceIds) {
      this.occurrenceToState.set(occId, id);
    }
    return state;
  }

  /**
   * Assign an occurrence to a state.
   * @param {string} occurrenceId
   * @param {string} stateId
   */
  assignOccurrenceToState(occurrenceId, stateId) {
    const state = this.states.get(stateId);
    if (!state) {
      throw new Error(`StateSpace: state '${stateId}' not found`);
    }
    // Remove from previous state if any
    const prevStateId = this.occurrenceToState.get(occurrenceId);
    if (prevStateId && prevStateId !== stateId) {
      const prevState = this.states.get(prevStateId);
      if (prevState) {
        prevState.removeOccurrence(occurrenceId);
      }
    }
    state.addOccurrence(occurrenceId);
    this.occurrenceToState.set(occurrenceId, stateId);
  }

  /**
   * Get a state by id.
   * @param {string} stateId
   * @returns {State | undefined}
   */
  getState(stateId) {
    return this.states.get(stateId);
  }

  /**
   * Get the state containing an occurrence.
   * @param {string} occurrenceId
   * @returns {State | undefined}
   */
  getStateOfOccurrence(occurrenceId) {
    const stateId = this.occurrenceToState.get(occurrenceId);
    return stateId ? this.states.get(stateId) : undefined;
  }

  /**
   * Get all states.
   * @returns {State[]}
   */
  getAllStates() {
    return Array.from(this.states.values());
  }

  /**
   * Serialize to plain object.
   * @returns {object}
   */
  toJSON() {
    return {
      states: this.getAllStates().map(s => s.toJSON()),
      occurrenceToState: Object.fromEntries(this.occurrenceToState)
    };
  }
}

/**
 * Build a StateSpace from an AboutnessGraph by grouping occurrences.
 * @param {AboutnessGraph} graph
 * @param {boolean} [modeSensitive=false] - If true, group by (payload, mode); else by payload only
 * @returns {StateSpace}
 */
export function buildStateSpaceFromGraph(graph, modeSensitive = false) {
  const stateSpace = new StateSpace();
  const keyToOccurrences = new Map();

  // Group occurrences by equivalence key
  for (const occ of graph.getAllOccurrences()) {
    let key;
    if (modeSensitive) {
      key = JSON.stringify({ payload: occ.payload, mode: occ.mode });
    } else {
      key = JSON.stringify(occ.payload);
    }

    if (!keyToOccurrences.has(key)) {
      keyToOccurrences.set(key, []);
    }
    keyToOccurrences.get(key).push(occ.id);
  }

  // Create states for each equivalence class
  let stateIndex = 0;
  for (const [key, occIds] of keyToOccurrences) {
    const stateId = `state:${stateIndex}`;
    stateSpace.createState(stateId, occIds, { equivalenceKey: key });
    stateIndex++;
  }

  return stateSpace;
}
