// Cognitive: Universes

import { StateSpace, State } from '../core/states.js';
import { ContextSystem, Context } from '../core/contexts.js';
import { ScaleSystem, ScaleLevel } from '../core/scales.js';
import { ConsensusWorld } from './xyzBubbles.js';

// ============================================================
// UniverseModel - A complete universe with its own state space
// ============================================================

/**
 * UniverseModel: represents a complete universe with its own
 * state space, contexts, scale system, and consensus world.
 */
export class UniverseModel {
  /**
   * @param {string} id
   * @param {StateSpace} stateSpace
   * @param {ContextSystem} contexts
   * @param {ScaleSystem} scaleSystem
   * @param {ConsensusWorld} consensusWorld
   * @param {object} [metadata={}]
   */
  constructor(id, stateSpace, contexts, scaleSystem, consensusWorld, metadata = {}) {
    this.id = id;
    this.stateSpace = stateSpace;
    this.contexts = contexts;
    this.scaleSystem = scaleSystem;
    this.consensusWorld = consensusWorld;
    this.metadata = metadata;
  }

  /**
   * Serialize to plain object.
   * @returns {object}
   */
  toJSON() {
    return {
      id: this.id,
      stateSpace: this.stateSpace.toJSON(),
      contexts: this.contexts.toJSON(),
      scaleSystem: this.scaleSystem.toJSON(),
      consensusWorld: this.consensusWorld.toJSON(),
      metadata: this.metadata
    };
  }
}

// ============================================================
// UniverseGraph - Connectivity of universe models
// ============================================================

/**
 * UniverseGraph: represents the connectivity between universe models,
 * including parent-child relationships via black holes.
 */
export class UniverseGraph {
  constructor() {
    /** @type {Map<string, UniverseModel>} */
    this.universes = new Map();
    /** @type {Array<{ fromId: string, toId: string, viaBlackHoleId: string, metadata: object }>} */
    this.edges = [];
  }

  /**
   * Add a universe to the graph.
   * @param {UniverseModel} universeModel
   */
  addUniverse(universeModel) {
    this.universes.set(universeModel.id, universeModel);
  }

  /**
   * Add an edge between universes (via black hole).
   * @param {string} fromId - Parent universe
   * @param {string} toId - Child universe
   * @param {string} viaBlackHoleId - Black hole that spawned the child
   * @param {object} [metadata={}]
   */
  addEdge(fromId, toId, viaBlackHoleId, metadata = {}) {
    this.edges.push({ fromId, toId, viaBlackHoleId, metadata });
  }

  /**
   * Get a universe by id.
   * @param {string} id
   * @returns {UniverseModel | undefined}
   */
  getUniverse(id) {
    return this.universes.get(id);
  }

  /**
   * Get all child universes of a given universe.
   * @param {string} id
   * @returns {UniverseModel[]}
   */
  getChildren(id) {
    const childIds = this.edges
      .filter(e => e.fromId === id)
      .map(e => e.toId);
    return childIds
      .map(cid => this.universes.get(cid))
      .filter(u => u !== undefined);
  }

  /**
   * Serialize to plain object.
   * @returns {object}
   */
  toJSON() {
    const universesObj = {};
    for (const [id, universe] of this.universes) {
      universesObj[id] = universe.toJSON();
    }
    return {
      universes: universesObj,
      edges: this.edges
    };
  }
}

// ============================================================
// Helper: Spawn Child Universe
// ============================================================

/**
 * Spawn a child universe from a parent universe via a black hole.
 * Clones parent's stateSpace/contexts and adds origin metadata.
 * @param {UniverseModel} parentUniverse
 * @param {string} collapseRegionSignature - Signature from black hole
 * @param {string} newId - ID for the new universe
 * @returns {UniverseModel}
 */
export function spawnChildUniverse(parentUniverse, collapseRegionSignature, newId) {
  // Clone state space
  const newStateSpace = new StateSpace();
  for (const state of parentUniverse.stateSpace.getAllStates()) {
    newStateSpace.createState(
      state.id,
      [...state.occurrenceIds],
      { ...state.metadata }
    );
  }

  // Clone context system
  const newContexts = new ContextSystem();
  for (const context of parentUniverse.contexts.getAllContexts()) {
    newContexts.createContext(
      context.id,
      [...context.stateIds],
      { ...context.metadata }
    );
  }

  // Clone scale system
  const newScaleSystem = new ScaleSystem();
  for (const [levelId, level] of parentUniverse.scaleSystem.levels) {
    // For simplicity, reference the same state space (could deep clone if needed)
    const newLevel = new ScaleLevel(levelId, newStateSpace, { ...level.metadata });
    newScaleSystem.addLevel(newLevel);
  }
  // Copy refinement relationships
  for (const [childId, parentId] of parentUniverse.scaleSystem.refinement) {
    newScaleSystem.setRefinement(childId, parentId);
  }

  // Create new consensus world
  const newConsensusWorld = new ConsensusWorld(
    newStateSpace,
    newContexts,
    { inheritedFrom: parentUniverse.id }
  );

  // Create new universe with origin metadata
  return new UniverseModel(
    newId,
    newStateSpace,
    newContexts,
    newScaleSystem,
    newConsensusWorld,
    {
      originSignature: collapseRegionSignature,
      parentUniverseId: parentUniverse.id,
      spawnedAt: Date.now()
    }
  );
}
