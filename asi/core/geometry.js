// Core: Geometry

import { AboutnessGraph } from './aboutnessGraph.js';
import { StateSpace, findAllSimplePaths } from './states.js';

/**
 * Compute shortest path length between two occurrences using BFS.
 * @param {AboutnessGraph} graph
 * @param {string} startId
 * @param {string} endId
 * @param {number} [maxDepth=10]
 * @returns {number} - Number of steps, or Infinity if unreachable
 */
export function computeShortestPathLength(graph, startId, endId, maxDepth = 10) {
  if (startId === endId) return 0;

  const visited = new Set([startId]);
  const queue = [{ id: startId, depth: 0 }];

  while (queue.length > 0) {
    const { id, depth } = queue.shift();

    if (depth >= maxDepth) continue;

    const outgoing = graph.getOutgoing(id);
    for (const rel of outgoing) {
      if (rel.to === endId) return depth + 1;
      if (!visited.has(rel.to)) {
        visited.add(rel.to);
        queue.push({ id: rel.to, depth: depth + 1 });
      }
    }
  }

  return Infinity;
}

/**
 * Build a distance matrix between states using representative occurrences.
 * @param {AboutnessGraph} graph
 * @param {StateSpace} stateSpace
 * @param {number} [maxDepth=10]
 * @returns {{ distances: { [stateId: string]: { [stateId: string]: number } } }}
 */
export function buildStateDistanceMatrix(graph, stateSpace, maxDepth = 10) {
  const distances = {};
  const states = stateSpace.getAllStates();

  // Get representative occurrence for each state (first one)
  const stateReps = new Map();
  for (const state of states) {
    if (state.occurrenceIds.length > 0) {
      stateReps.set(state.id, state.occurrenceIds[0]);
    }
  }

  // Compute pairwise distances
  for (const stateA of states) {
    distances[stateA.id] = {};
    const repA = stateReps.get(stateA.id);

    for (const stateB of states) {
      const repB = stateReps.get(stateB.id);

      if (!repA || !repB) {
        distances[stateA.id][stateB.id] = Infinity;
      } else {
        distances[stateA.id][stateB.id] = computeShortestPathLength(graph, repA, repB, maxDepth);
      }
    }
  }

  return { distances };
}

/**
 * Find simple loops for each state's occurrences.
 * @param {AboutnessGraph} graph
 * @param {StateSpace} stateSpace
 * @param {number} [maxDepth=6]
 * @returns {Array<{ stateId: string, occurrenceId: string, nodeIds: string[], length: number }>}
 */
export function findStateLoops(graph, stateSpace, maxDepth = 6) {
  const loops = [];

  for (const state of stateSpace.getAllStates()) {
    for (const occId of state.occurrenceIds) {
      // Find paths that could loop back
      const pathsFromOcc = findAllSimplePaths(graph, occId, maxDepth);

      for (const path of pathsFromOcc) {
        // Check if any neighbor of the last node connects back to start
        if (path.nodeIds.length >= 2) {
          const lastNodeId = path.nodeIds[path.nodeIds.length - 1];
          const outgoing = graph.getOutgoing(lastNodeId);

          for (const rel of outgoing) {
            if (rel.to === occId) {
              // Found a loop: path + edge back to start
              const loopNodeIds = [...path.nodeIds, occId];
              loops.push({
                stateId: state.id,
                occurrenceId: occId,
                nodeIds: loopNodeIds,
                length: loopNodeIds.length - 1
              });
            }
          }
        }
      }
    }
  }

  return loops;
}

/**
 * Estimate curvature for a state based on its loops.
 * Curvature ~ number of distinct loops / average loop length.
 * @param {string} stateId
 * @param {Array<{ stateId: string, occurrenceId: string, nodeIds: string[], length: number }>} loopsForState
 * @returns {number}
 */
export function estimateCurvature(stateId, loopsForState) {
  if (loopsForState.length === 0) return 0;

  const totalLength = loopsForState.reduce((sum, loop) => sum + loop.length, 0);
  const avgLength = totalLength / loopsForState.length;

  if (avgLength === 0) return 0;

  return loopsForState.length / avgLength;
}

/**
 * Build a curvature map for all states.
 * @param {AboutnessGraph} graph
 * @param {StateSpace} stateSpace
 * @param {number} [maxDepth=6]
 * @returns {{ [stateId: string]: number }}
 */
export function buildCurvatureMap(graph, stateSpace, maxDepth = 6) {
  const allLoops = findStateLoops(graph, stateSpace, maxDepth);
  const curvatureMap = {};

  // Group loops by stateId
  const loopsByState = new Map();
  for (const state of stateSpace.getAllStates()) {
    loopsByState.set(state.id, []);
  }
  for (const loop of allLoops) {
    if (loopsByState.has(loop.stateId)) {
      loopsByState.get(loop.stateId).push(loop);
    }
  }

  // Compute curvature for each state
  for (const [stateId, stateLoops] of loopsByState) {
    curvatureMap[stateId] = estimateCurvature(stateId, stateLoops);
  }

  return curvatureMap;
}
