// Core: Scales

import { StateSpace } from './states.js';

/**
 * ScaleLevel: a state space at a particular scale of abstraction.
 */
export class ScaleLevel {
  /**
   * @param {string} id - e.g. "scale:0", "scale:1"
   * @param {StateSpace} stateSpace
   * @param {object} [metadata={}]
   */
  constructor(id, stateSpace, metadata = {}) {
    this.id = id;
    this.stateSpace = stateSpace;
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
      metadata: this.metadata
    };
  }
}

/**
 * ScaleSystem: manages multiple scale levels and their relationships.
 */
export class ScaleSystem {
  constructor() {
    /** @type {Map<string, ScaleLevel>} */
    this.levels = new Map();
    /** @type {Map<string, string>} childId → parentId (refinement: child is finer than parent) */
    this.refinement = new Map();
    /** @type {Map<string, Set<string>>} parentId → Set of childIds (abstraction: parent abstracts children) */
    this.abstraction = new Map();
  }

  /**
   * Add a scale level.
   * @param {ScaleLevel} scaleLevel
   */
  addLevel(scaleLevel) {
    this.levels.set(scaleLevel.id, scaleLevel);
    if (!this.abstraction.has(scaleLevel.id)) {
      this.abstraction.set(scaleLevel.id, new Set());
    }
  }

  /**
   * Get a scale level by id.
   * @param {string} id
   * @returns {ScaleLevel | undefined}
   */
  getLevel(id) {
    return this.levels.get(id);
  }

  /**
   * Set refinement relationship: child is a finer scale than parent.
   * @param {string} childId
   * @param {string} parentId
   */
  setRefinement(childId, parentId) {
    this.refinement.set(childId, parentId);
    if (!this.abstraction.has(parentId)) {
      this.abstraction.set(parentId, new Set());
    }
    this.abstraction.get(parentId).add(childId);
  }

  /**
   * Get the parent (coarser) scale of a child scale.
   * @param {string} childId
   * @returns {string | undefined}
   */
  getParent(childId) {
    return this.refinement.get(childId);
  }

  /**
   * Get all children (finer scales) of a parent scale.
   * @param {string} parentId
   * @returns {string[]}
   */
  getChildren(parentId) {
    const set = this.abstraction.get(parentId);
    return set ? Array.from(set) : [];
  }

  /**
   * Serialize to plain object.
   * @returns {object}
   */
  toJSON() {
    const levelsObj = {};
    for (const [id, level] of this.levels) {
      levelsObj[id] = level.toJSON();
    }
    const abstractionObj = {};
    for (const [parentId, childSet] of this.abstraction) {
      abstractionObj[parentId] = Array.from(childSet);
    }
    return {
      levels: levelsObj,
      refinement: Object.fromEntries(this.refinement),
      abstraction: abstractionObj
    };
  }
}

/**
 * Build a single-scale system from a StateSpace.
 * @param {StateSpace} stateSpace
 * @returns {ScaleSystem}
 */
export function buildSingleScaleSystem(stateSpace) {
  const scaleSystem = new ScaleSystem();
  const level = new ScaleLevel("scale:0", stateSpace, { description: "Base scale" });
  scaleSystem.addLevel(level);
  return scaleSystem;
}
