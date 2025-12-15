// Cognitive: Value & Emotion

import { StateSpace } from '../core/states.js';
import { AttentionState } from './xyzBubbles.js';
import { Waveform } from '../math/waveforms.js';

// ============================================================
// ValueField - Numeric value per state
// ============================================================

/**
 * ValueField: represents a numeric value assigned to each state.
 */
export class ValueField {
  constructor() {
    /** @type {Map<string, number>} */
    this.values = new Map();
  }

  /**
   * Set value for a state.
   * @param {string} stateId
   * @param {number} value
   */
  setValue(stateId, value) {
    this.values.set(stateId, value);
  }

  /**
   * Get value for a state.
   * @param {string} stateId
   * @param {number} [defaultValue=0]
   * @returns {number}
   */
  getValue(stateId, defaultValue = 0) {
    return this.values.has(stateId) ? this.values.get(stateId) : defaultValue;
  }

  /**
   * Get all values as an array.
   * @returns {number[]}
   */
  getAllValues() {
    return [...this.values.values()];
  }

  /**
   * Serialize to plain object.
   * @returns {object}
   */
  toJSON() {
    return Object.fromEntries(this.values);
  }
}

// ============================================================
// Local Value Statistics
// ============================================================

/**
 * Estimate local value statistics around an anchor state.
 * @param {ValueField} valueField
 * @param {StateSpace} stateSpace
 * @param {string} anchorStateId
 * @param {string[]} neighbors - Array of nearby state IDs
 * @returns {{ meanValue: number, minValue: number, maxValue: number, variance: number }}
 */
export function estimateLocalValueStats(valueField, stateSpace, anchorStateId, neighbors) {
  const allIds = [anchorStateId, ...neighbors];
  const values = allIds.map(id => valueField.getValue(id, 0));

  if (values.length === 0) {
    return { meanValue: 0, minValue: 0, maxValue: 0, variance: 0 };
  }

  const sum = values.reduce((a, b) => a + b, 0);
  const meanValue = sum / values.length;
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  const squaredDiffs = values.map(v => (v - meanValue) ** 2);
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;

  return { meanValue, minValue, maxValue, variance };
}

// ============================================================
// Emotion Estimator
// ============================================================

/**
 * EmotionEstimator: infers emotion labels from value statistics and context.
 */
export class EmotionEstimator {
  /**
   * Infer an emotion label based on local value stats and context.
   * @param {object} params
   * @param {{ meanValue: number, minValue: number, maxValue: number, variance: number }} params.anchorStats
   * @param {number} params.reachability - [0,1] how reachable high-value states are
   * @param {number} params.uncertainty - [0,1] uncertainty level
   * @returns {string} - Emotion label
   */
  inferEmotion({ anchorStats, reachability, uncertainty }) {
    const { meanValue, minValue, maxValue, variance } = anchorStats;
    const valueRange = maxValue - minValue;
    const normalizedMean = valueRange > 0 ? (meanValue - minValue) / valueRange : 0.5;

    // High uncertainty + moderate values → curiosity
    if (uncertainty > 0.6 && normalizedMean > 0.3 && normalizedMean < 0.7) {
      return "curiosity";
    }

    // Many high values + good reachability → joy
    if (meanValue > 0.6 && reachability > 0.5) {
      return "joy";
    }

    // Many low values → fear
    if (meanValue < 0.3 && minValue < 0.2) {
      return "fear";
    }

    // Drop in reachability to high values → sadness
    if (maxValue > 0.7 && reachability < 0.3) {
      return "sadness";
    }

    // Blocked high values + high value contrast → anger
    if (maxValue > 0.7 && reachability < 0.4 && variance > 0.1) {
      return "anger";
    }

    // Default
    return "neutral";
  }
}
