// Cognitive: XYZ Bubbles

import { MultiChannelWaveform } from '../math/channels.js';
import { StateSpace } from '../core/states.js';
import { ContextSystem } from '../core/contexts.js';
import { ScaleSystem } from '../core/scales.js';

// ============================================================
// PotentialSpace (X) - The space of possibilities
// ============================================================

/**
 * PotentialSpace (X): represents the potential space of an agent.
 * Contains the multi-scale structure and current state space reference.
 */
export class PotentialSpace {
  /**
   * @param {ScaleSystem} scaleSystem
   * @param {StateSpace} stateSpace - Reference to current scale's state space
   * @param {object} [metadata={}]
   */
  constructor(scaleSystem, stateSpace, metadata = {}) {
    this.scaleSystem = scaleSystem;
    this.stateSpace = stateSpace;
    this.metadata = metadata;
  }

  /**
   * Serialize to plain object.
   * @returns {object}
   */
  toJSON() {
    return {
      scaleSystem: this.scaleSystem.toJSON(),
      stateSpace: this.stateSpace.toJSON(),
      metadata: this.metadata
    };
  }
}

// ============================================================
// AttentionState (Y) - Current attention focus
// ============================================================

/**
 * AttentionState (Y): represents the current attention state of an agent.
 * Contains a multi-channel waveform over the state/path space.
 */
export class AttentionState {
  /**
   * @param {MultiChannelWaveform} waveform
   * @param {string} [currentScaleId="scale:0"]
   * @param {object} [metadata={}]
   */
  constructor(waveform, currentScaleId = "scale:0", metadata = {}) {
    this.waveform = waveform;
    this.currentScaleId = currentScaleId;
    this.metadata = metadata;
  }

  /**
   * Serialize to plain object.
   * @returns {object}
   */
  toJSON() {
    return {
      waveform: this.waveform.toJSON(),
      currentScaleId: this.currentScaleId,
      metadata: this.metadata
    };
  }
}

// ============================================================
// ConsensusWorld (Z) - Stabilized world model
// ============================================================

/**
 * ConsensusWorld (Z): represents the stabilized world model.
 * Contains states and contexts visible as consensus.
 */
export class ConsensusWorld {
  /**
   * @param {StateSpace} stateSpace
   * @param {ContextSystem} contexts
   * @param {object} [metadata={}]
   */
  constructor(stateSpace, contexts, metadata = {}) {
    this.stateSpace = stateSpace;
    this.contexts = contexts;
    this.metadata = metadata;
  }

  /**
   * Serialize to plain object.
   * @returns {object}
   */
  toJSON() {
    return {
      stateSpace: this.stateSpace.toJSON(),
      contexts: this.contexts.toJSON(),
      metadata: this.metadata
    };
  }
}
