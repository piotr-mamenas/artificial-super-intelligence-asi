// Core: Contexts

import { State, StateSpace } from './states.js';

/**
 * Context: a set of states that can be jointly reasoned about without contradiction.
 */
export class Context {
  /**
   * @param {string} id
   * @param {string[]} [stateIds=[]]
   * @param {object} [metadata={}]
   */
  constructor(id, stateIds = [], metadata = {}) {
    this.id = id;
    this.stateIds = [...stateIds];
    this.metadata = metadata;
  }

  /**
   * Add a state to this context.
   * @param {string} stateId
   */
  addStateId(stateId) {
    if (!this.stateIds.includes(stateId)) {
      this.stateIds.push(stateId);
    }
  }

  /**
   * Remove a state from this context.
   * @param {string} stateId
   */
  removeStateId(stateId) {
    const idx = this.stateIds.indexOf(stateId);
    if (idx !== -1) {
      this.stateIds.splice(idx, 1);
    }
  }

  /**
   * Check if this context contains a state.
   * @param {string} stateId
   * @returns {boolean}
   */
  hasStateId(stateId) {
    return this.stateIds.includes(stateId);
  }

  /**
   * Serialize to plain object.
   * @returns {object}
   */
  toJSON() {
    return {
      id: this.id,
      stateIds: this.stateIds,
      metadata: this.metadata
    };
  }
}

/**
 * ContextSystem: manages contexts and state-to-context mappings.
 */
export class ContextSystem {
  constructor() {
    /** @type {Map<string, Context>} */
    this.contexts = new Map();
    /** @type {Map<string, Set<string>>} stateId → Set of contextIds */
    this.stateToContexts = new Map();
  }

  /**
   * Create a new context.
   * @param {string} id
   * @param {string[]} [stateIds=[]]
   * @param {object} [metadata={}]
   * @returns {Context}
   */
  createContext(id, stateIds = [], metadata = {}) {
    const context = new Context(id, stateIds, metadata);
    this.contexts.set(id, context);
    for (const stateId of stateIds) {
      if (!this.stateToContexts.has(stateId)) {
        this.stateToContexts.set(stateId, new Set());
      }
      this.stateToContexts.get(stateId).add(id);
    }
    return context;
  }

  /**
   * Get a context by id.
   * @param {string} id
   * @returns {Context | undefined}
   */
  getContext(id) {
    return this.contexts.get(id);
  }

  /**
   * Add a state to a context.
   * @param {string} stateId
   * @param {string} contextId
   */
  addStateToContext(stateId, contextId) {
    const context = this.contexts.get(contextId);
    if (!context) {
      throw new Error(`ContextSystem: context '${contextId}' not found`);
    }
    context.addStateId(stateId);
    if (!this.stateToContexts.has(stateId)) {
      this.stateToContexts.set(stateId, new Set());
    }
    this.stateToContexts.get(stateId).add(contextId);
  }

  /**
   * Get all context IDs containing a state.
   * @param {string} stateId
   * @returns {string[]}
   */
  getContextsOfState(stateId) {
    const set = this.stateToContexts.get(stateId);
    return set ? Array.from(set) : [];
  }

  /**
   * Get all contexts.
   * @returns {Context[]}
   */
  getAllContexts() {
    return Array.from(this.contexts.values());
  }

  /**
   * Serialize to plain object.
   * @returns {object}
   */
  toJSON() {
    const stateToContextsObj = {};
    for (const [stateId, contextSet] of this.stateToContexts) {
      stateToContextsObj[stateId] = Array.from(contextSet);
    }
    return {
      contexts: this.getAllContexts().map(c => c.toJSON()),
      stateToContexts: stateToContextsObj
    };
  }
}

/**
 * Build a default ContextSystem from a StateSpace.
 * Creates one global context containing all states.
 * @param {StateSpace} stateSpace
 * @returns {ContextSystem}
 */
export function buildDefaultContexts(stateSpace) {
  const contextSystem = new ContextSystem();
  const allStateIds = stateSpace.getAllStates().map(s => s.id);
  contextSystem.createContext("global", allStateIds, { description: "Global context containing all states" });
  return contextSystem;
}
