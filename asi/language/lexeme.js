// Language: Lexeme (Word Type)
// A lexeme is the learned type behind linguistic occurrences
// Defined by: form cluster, spin pattern, grounding region

import { 
  QuarkSpinPattern, 
  SPIN_UP, 
  SPIN_DOWN, 
  SPIN_ZERO 
} from '../math/quarkSpins.js';

// ============================================================
// OperatorPattern - Quark spin pattern for lexeme transformation
// ============================================================

/**
 * OperatorPattern: represents the quark spin transformation
 * that a lexeme applies to the waveform.
 * 
 * Uses discrete half-spins (+1/2, -1/2, 0), NOT continuous weights.
 * The spin pattern determines how this word transforms meaning.
 */
export class OperatorPattern {
  constructor() {
    // Spin pattern (discrete half-spins)
    this.spinPattern = new QuarkSpinPattern();
    
    // Accumulated spin votes (used to collapse to discrete values)
    this.spinVotes = {
      u: 0, d: 0, s: 0, c: 0, t: 0, b: 0
    };
    
    // Typical operator sequence
    this.sequence = [];
    
    // Number of traces used to build this pattern
    this.traceCount = 0;
    
    // Legacy: weights for compatibility (derived from spins)
    this.weights = { up: 0, down: 0, strange: 0, charm: 0, top: 0, bottom: 0 };
  }

  /**
   * Update pattern from an operator trace.
   * Operators vote for spin direction, then collapse to discrete spins.
   * @param {Array} trace - Array of {type, params} objects
   */
  updateFromTrace(trace) {
    this.traceCount++;
    const sequence = [];
    
    // Each operator in trace votes for spin direction
    for (const op of trace) {
      const channel = this._operatorToChannel(op.type);
      if (channel) {
        // Positive operators vote up, negative vote down
        const vote = op.negative ? -1 : 1;
        this.spinVotes[channel] += vote;
        sequence.push(op.type);
      }
    }
    
    // Collapse votes to discrete spins
    this._collapseSpins();
    
    // Update sequence
    if (sequence.length > 0) {
      this.sequence = sequence;
    }
    
    // Update legacy weights from spins
    this._updateWeightsFromSpins();
  }

  /**
   * Map operator type to channel name.
   */
  _operatorToChannel(opType) {
    const map = {
      up: 'u', down: 'd', strange: 's', 
      charm: 'c', top: 't', bottom: 'b'
    };
    return map[opType] || null;
  }

  /**
   * Collapse accumulated votes to discrete spin values.
   * Votes > threshold → spin up
   * Votes < -threshold → spin down
   * Otherwise → superposition
   */
  _collapseSpins() {
    const threshold = Math.max(1, this.traceCount * 0.3);
    
    for (const [channel, votes] of Object.entries(this.spinVotes)) {
      if (votes > threshold) {
        this.spinPattern.setSpin(channel, SPIN_UP);
      } else if (votes < -threshold) {
        this.spinPattern.setSpin(channel, SPIN_DOWN);
      } else {
        this.spinPattern.setSpin(channel, SPIN_ZERO);
      }
    }
  }

  /**
   * Update legacy weights from spin pattern.
   */
  _updateWeightsFromSpins() {
    const channelToOp = { u: 'up', d: 'down', s: 'strange', c: 'charm', t: 'top', b: 'bottom' };
    for (const [channel, opName] of Object.entries(channelToOp)) {
      const spin = this.spinPattern.getSpin(channel);
      // Convert spin to weight: +0.5 → 1, -0.5 → -1, 0 → 0
      this.weights[opName] = spin * 2;
    }
  }

  /**
   * Get the dominant operator type (highest spin magnitude).
   */
  getDominantOperator() {
    const channelToOp = { u: 'up', d: 'down', s: 'strange', c: 'charm', t: 'top', b: 'bottom' };
    let maxMag = 0;
    let dominant = 'up';
    
    for (const [channel, opName] of Object.entries(channelToOp)) {
      const mag = Math.abs(this.spinPattern.getSpin(channel));
      if (mag > maxMag) {
        maxMag = mag;
        dominant = opName;
      }
    }
    return dominant;
  }

  /**
   * Get the spin pattern string (e.g., "+0-0+0").
   */
  getSpinString() {
    return this.spinPattern.getPatternString();
  }

  /**
   * Compute similarity to another operator pattern.
   * Measures spin alignment.
   */
  similarity(other) {
    return this.spinPattern.similarity(other.spinPattern);
  }

  /**
   * Create a copy of this pattern.
   */
  clone() {
    const copy = new OperatorPattern();
    copy.spinPattern = this.spinPattern.clone();
    copy.spinVotes = { ...this.spinVotes };
    copy.sequence = [...this.sequence];
    copy.traceCount = this.traceCount;
    copy.weights = { ...this.weights };
    return copy;
  }

  /**
   * Serialize to JSON.
   */
  toJSON() {
    return {
      spinPattern: this.spinPattern.getPatternString(),
      spins: this.spinPattern.toJSON(),
      sequence: [...this.sequence],
      traceCount: this.traceCount,
      dominant: this.getDominantOperator()
    };
  }
}

// ============================================================
// GroundingRegion - Anchoring to aboutness graph
// ============================================================

/**
 * GroundingRegion: represents the region of state/path space
 * that a lexeme tends to activate (semantic anchor).
 */
export class GroundingRegion {
  constructor() {
    // State IDs this lexeme grounds to, with activation strength
    this.stateActivations = new Map(); // stateId -> activation strength
    
    // Occurrence IDs this lexeme is about
    this.aboutnessTargets = new Set();
    
    // Co-occurring non-linguistic context
    this.contextSignature = {
      occurrenceTypes: new Map(), // type -> count
      channelBias: { up: 0, down: 0, strange: 0, charm: 0, top: 0, bottom: 0 }
    };
  }

  /**
   * Update grounding from a linguistic occurrence.
   * @param {object} waveformAfter - Waveform snapshot after processing
   * @param {string[]} contextIds - Co-occurring occurrence IDs
   */
  updateFromOccurrence(waveformAfter, contextIds) {
    // Update state activations from waveform
    if (waveformAfter && waveformAfter.channels) {
      for (const [channelName, channelData] of Object.entries(waveformAfter.channels)) {
        if (channelData.topEntries) {
          for (const entry of channelData.topEntries) {
            const current = this.stateActivations.get(entry.id) || 0;
            this.stateActivations.set(entry.id, current + entry.magSq);
          }
        }
      }
    }
    
    // Update aboutness targets
    for (const id of contextIds) {
      this.aboutnessTargets.add(id);
    }
  }

  /**
   * Get top grounded states.
   * @param {number} k
   * @returns {Array<{id: string, activation: number}>}
   */
  getTopGroundedStates(k = 5) {
    const entries = [...this.stateActivations.entries()]
      .map(([id, activation]) => ({ id, activation }))
      .sort((a, b) => b.activation - a.activation);
    return entries.slice(0, k);
  }

  /**
   * Compute grounding similarity to another region.
   * @param {GroundingRegion} other
   * @returns {number}
   */
  similarity(other) {
    // Jaccard similarity of aboutness targets
    const intersection = [...this.aboutnessTargets].filter(id => other.aboutnessTargets.has(id));
    const union = new Set([...this.aboutnessTargets, ...other.aboutnessTargets]);
    
    if (union.size === 0) return 0;
    return intersection.length / union.size;
  }

  /**
   * Serialize to JSON.
   */
  toJSON() {
    return {
      topStates: this.getTopGroundedStates(5),
      aboutnessTargetCount: this.aboutnessTargets.size,
      aboutnessTargets: [...this.aboutnessTargets].slice(0, 10)
    };
  }
}

// ============================================================
// Lexeme - The learned word type
// ============================================================

/**
 * Lexeme: a learned word type with:
 * - Form cluster (signal variants)
 * - Canonical operator pattern
 * - Grounding region
 */
export class Lexeme {
  /**
   * @param {string} canonicalForm - Primary form of this lexeme
   */
  constructor(canonicalForm) {
    this.id = `lexeme:${canonicalForm}:${Date.now()}`;
    this.canonicalForm = canonicalForm.toLowerCase().trim();
    
    // Form cluster - variants that map to this lexeme
    this.formCluster = new Set([this.canonicalForm]);
    
    // Learned operator pattern
    this.operatorPattern = new OperatorPattern();
    
    // Grounding to aboutness graph
    this.groundingRegion = new GroundingRegion();
    
    // Statistics
    this.occurrenceCount = 0;
    this.firstSeen = Date.now();
    this.lastSeen = Date.now();
    
    // Maturity: proto-lexeme (learning) vs grounded (stable)
    this.isGrounded = false;
    this.groundingConfidence = 0;
  }

  /**
   * Add a form variant to the cluster.
   * @param {string} form
   */
  addFormVariant(form) {
    this.formCluster.add(form.toLowerCase().trim());
  }

  /**
   * Check if a form belongs to this lexeme's cluster.
   * @param {string} form
   * @returns {boolean}
   */
  matchesForm(form) {
    return this.formCluster.has(form.toLowerCase().trim());
  }

  /**
   * Update lexeme from a linguistic occurrence.
   * @param {LinguisticOccurrence} occurrence
   */
  updateFromOccurrence(occurrence) {
    this.occurrenceCount++;
    this.lastSeen = Date.now();
    
    // Add form variant
    this.addFormVariant(occurrence.signal);
    
    // Update operator pattern from trace
    if (occurrence.operatorTrace.length > 0) {
      this.operatorPattern.updateFromTrace(occurrence.operatorTrace);
    }
    
    // Update grounding
    this.groundingRegion.updateFromOccurrence(
      occurrence.waveformAfter,
      occurrence.contextIds
    );
    
    // Check grounding status
    this._updateGroundingStatus();
  }

  /**
   * Update whether this lexeme is considered "grounded".
   */
  _updateGroundingStatus() {
    // Grounding confidence based on:
    // - Number of occurrences
    // - Consistency of operator pattern
    // - Strength of grounding anchors
    
    const occurrenceFactor = Math.min(1, this.occurrenceCount / 10);
    const patternFactor = this.operatorPattern.traceCount > 0 
      ? Math.min(1, this.operatorPattern.traceCount / 5) 
      : 0;
    const groundingFactor = this.groundingRegion.aboutnessTargets.size > 0 ? 1 : 0;
    
    this.groundingConfidence = (occurrenceFactor + patternFactor + groundingFactor) / 3;
    this.isGrounded = this.groundingConfidence > 0.5;
  }

  /**
   * Compute similarity to another lexeme.
   * @param {Lexeme} other
   * @returns {{ total: number, operator: number, grounding: number }}
   */
  similarity(other) {
    const operatorSim = this.operatorPattern.similarity(other.operatorPattern);
    const groundingSim = this.groundingRegion.similarity(other.groundingRegion);
    
    // Weighted combination
    const total = 0.6 * operatorSim + 0.4 * groundingSim;
    
    return { total, operator: operatorSim, grounding: groundingSim };
  }

  /**
   * Check if this lexeme is an antonym of another.
   * Antonyms have operator patterns that reverse each other's effects.
   * @param {Lexeme} other
   * @returns {boolean}
   */
  isAntonymOf(other) {
    // Check if up/down weights are inverted
    const thisUp = this.operatorPattern.weights.up;
    const thisDown = this.operatorPattern.weights.down;
    const otherUp = other.operatorPattern.weights.up;
    const otherDown = other.operatorPattern.weights.down;
    
    // Antonyms: one is up-heavy, other is down-heavy, similar grounding
    const upDownInversion = (thisUp > thisDown && otherDown > otherUp) ||
                            (thisDown > thisUp && otherUp > otherDown);
    const groundingSimilar = this.groundingRegion.similarity(other.groundingRegion) > 0.3;
    
    return upDownInversion && groundingSimilar;
  }

  /**
   * Get semantic role based on dominant operator.
   * @returns {string}
   */
  getSemanticRole() {
    const dominant = this.operatorPattern.getDominantOperator();
    
    const roles = {
      up: 'assertive',      // Names, affirms (nouns, adjectives)
      down: 'negating',     // Denies, excludes (not, no)
      strange: 'contextual', // Shifts meaning (polysemy, metaphor)
      charm: 'abstracting',  // Generalizes (categories, quantifiers)
      top: 'structural',     // Grammar words (articles, prepositions)
      bottom: 'grounding'    // Concrete reference (this, here, proper nouns)
    };
    
    return roles[dominant] || 'unknown';
  }

  /**
   * Serialize to JSON.
   */
  toJSON() {
    return {
      id: this.id,
      canonicalForm: this.canonicalForm,
      formVariants: [...this.formCluster],
      operatorPattern: this.operatorPattern.toJSON(),
      grounding: this.groundingRegion.toJSON(),
      occurrenceCount: this.occurrenceCount,
      isGrounded: this.isGrounded,
      groundingConfidence: this.groundingConfidence,
      semanticRole: this.getSemanticRole()
    };
  }
}
