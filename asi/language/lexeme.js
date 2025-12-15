// Language: Lexeme (Word Type)
// A lexeme is the learned type behind linguistic occurrences
// Defined by: form cluster, canonical operator pattern, grounding region

// ============================================================
// OperatorPattern - Canonical quark operator composition
// ============================================================

/**
 * OperatorPattern: represents the canonical quark-operator transformation
 * that a lexeme applies to the waveform.
 * 
 * Operators: up, down, strange, charm, top, bottom
 * Pattern is a weighted composition of these operators.
 */
export class OperatorPattern {
  constructor() {
    // Weights for each operator type (learned from traces)
    this.weights = {
      up: 0,      // Assertion / evidence-raising
      down: 0,    // Negation / evidence-lowering
      strange: 0, // Context switching
      charm: 0,   // Compression / abstraction
      top: 0,     // Structural constraints
      bottom: 0   // Grounding to experience
    };
    
    // Typical operator sequence (most common ordering)
    this.sequence = [];
    
    // Number of traces used to build this pattern
    this.traceCount = 0;
  }

  /**
   * Update pattern from an operator trace.
   * @param {Array} trace - Array of {type, params} objects
   */
  updateFromTrace(trace) {
    this.traceCount++;
    const alpha = 1 / this.traceCount; // Learning rate decays
    
    // Count operator occurrences in trace
    const counts = { up: 0, down: 0, strange: 0, charm: 0, top: 0, bottom: 0 };
    const sequence = [];
    
    for (const op of trace) {
      if (counts.hasOwnProperty(op.type)) {
        counts[op.type]++;
        sequence.push(op.type);
      }
    }
    
    // Normalize counts
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    
    // Update weights with exponential moving average
    for (const opType of Object.keys(this.weights)) {
      const newWeight = counts[opType] / total;
      this.weights[opType] = this.weights[opType] * (1 - alpha) + newWeight * alpha;
    }
    
    // Update typical sequence (keep if similar to existing)
    if (this.sequence.length === 0) {
      this.sequence = sequence;
    } else if (sequence.length > 0) {
      // Blend: keep existing if similar, otherwise update slowly
      const similarity = this._sequenceSimilarity(this.sequence, sequence);
      if (similarity < 0.5 && this.traceCount > 3) {
        // Significantly different - might be multi-sense word
        // For now, just keep the more common pattern
      } else {
        this.sequence = sequence;
      }
    }
  }

  /**
   * Compute similarity between two operator sequences.
   */
  _sequenceSimilarity(seq1, seq2) {
    if (seq1.length === 0 && seq2.length === 0) return 1;
    if (seq1.length === 0 || seq2.length === 0) return 0;
    
    // Count matching operators in same positions
    const minLen = Math.min(seq1.length, seq2.length);
    const maxLen = Math.max(seq1.length, seq2.length);
    let matches = 0;
    
    for (let i = 0; i < minLen; i++) {
      if (seq1[i] === seq2[i]) matches++;
    }
    
    return matches / maxLen;
  }

  /**
   * Get the dominant operator type.
   * @returns {string}
   */
  getDominantOperator() {
    let maxWeight = -1;
    let dominant = 'up';
    
    for (const [op, weight] of Object.entries(this.weights)) {
      if (weight > maxWeight) {
        maxWeight = weight;
        dominant = op;
      }
    }
    
    return dominant;
  }

  /**
   * Compute similarity to another operator pattern.
   * @param {OperatorPattern} other
   * @returns {number} 0-1 similarity
   */
  similarity(other) {
    // Cosine similarity of weight vectors
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (const op of Object.keys(this.weights)) {
      const a = this.weights[op];
      const b = other.weights[op];
      dotProduct += a * b;
      normA += a * a;
      normB += b * b;
    }
    
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom > 0 ? dotProduct / denom : 0;
  }

  /**
   * Create a copy of this pattern.
   */
  clone() {
    const copy = new OperatorPattern();
    copy.weights = { ...this.weights };
    copy.sequence = [...this.sequence];
    copy.traceCount = this.traceCount;
    return copy;
  }

  /**
   * Serialize to JSON.
   */
  toJSON() {
    return {
      weights: { ...this.weights },
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
