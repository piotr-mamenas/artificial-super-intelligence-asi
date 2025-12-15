// Math: Quark Spins
// Quarks are half-spins (+1/2, -1/2) that combine to create patterns
// NOT weights - discrete spin values that interfere/combine

// ============================================================
// Spin Values - Half-integer spins like real quarks
// ============================================================

export const SPIN_UP = 0.5;    // +1/2
export const SPIN_DOWN = -0.5; // -1/2
export const SPIN_ZERO = 0;    // Superposition / undefined

/**
 * QuarkSpin: represents a single quark's spin state.
 * Can be +1/2, -1/2, or in superposition.
 */
export class QuarkSpin {
  constructor(value = SPIN_ZERO) {
    // Clamp to valid spin values
    this.value = this._quantize(value);
    
    // Phase angle (for interference)
    this.phase = 0;
    
    // Coherence (how "collapsed" is this spin)
    this.coherence = Math.abs(value) > 0 ? 1 : 0;
  }

  /**
   * Quantize to nearest valid spin state.
   */
  _quantize(v) {
    if (v > 0.25) return SPIN_UP;
    if (v < -0.25) return SPIN_DOWN;
    return SPIN_ZERO;
  }

  /**
   * Is this spin up?
   */
  isUp() {
    return this.value === SPIN_UP;
  }

  /**
   * Is this spin down?
   */
  isDown() {
    return this.value === SPIN_DOWN;
  }

  /**
   * Is this in superposition (undefined)?
   */
  isSuperposition() {
    return this.value === SPIN_ZERO;
  }

  /**
   * Flip the spin.
   */
  flip() {
    this.value = -this.value;
    return this;
  }

  /**
   * Combine with another spin (addition with clamping).
   */
  combine(other) {
    const combined = this.value + other.value;
    // Combined spins can be -1, -0.5, 0, +0.5, +1
    // For our purposes, we care about the sign pattern
    return new QuarkSpin(combined > 0 ? SPIN_UP : combined < 0 ? SPIN_DOWN : SPIN_ZERO);
  }

  /**
   * Check if aligned with another spin.
   */
  isAlignedWith(other) {
    return this.value * other.value > 0;
  }

  /**
   * Check if anti-aligned (opposite) to another spin.
   */
  isAntiAlignedWith(other) {
    return this.value * other.value < 0;
  }

  clone() {
    const s = new QuarkSpin(this.value);
    s.phase = this.phase;
    s.coherence = this.coherence;
    return s;
  }
}

// ============================================================
// QuarkSpinPattern - Six spins forming a pattern
// ============================================================

/**
 * QuarkSpinPattern: the six quark channels as spins.
 * Patterns emerge from the combination of spin alignments.
 */
export class QuarkSpinPattern {
  constructor() {
    // Six quark channels as spins
    this.spins = {
      u: new QuarkSpin(SPIN_ZERO),  // Up quark
      d: new QuarkSpin(SPIN_ZERO),  // Down quark
      s: new QuarkSpin(SPIN_ZERO),  // Strange quark
      c: new QuarkSpin(SPIN_ZERO),  // Charm quark
      t: new QuarkSpin(SPIN_ZERO),  // Top quark
      b: new QuarkSpin(SPIN_ZERO)   // Bottom quark
    };
  }

  /**
   * Set a spin value for a channel.
   * @param {string} channel - u, d, s, c, t, or b
   * @param {number} value - SPIN_UP, SPIN_DOWN, or SPIN_ZERO
   */
  setSpin(channel, value) {
    if (this.spins[channel]) {
      this.spins[channel] = new QuarkSpin(value);
    }
    return this;
  }

  /**
   * Get the spin value for a channel.
   */
  getSpin(channel) {
    return this.spins[channel]?.value || SPIN_ZERO;
  }

  /**
   * Get the total spin (sum of all spins).
   * In real physics, this would be the net angular momentum.
   */
  totalSpin() {
    let total = 0;
    for (const spin of Object.values(this.spins)) {
      total += spin.value;
    }
    return total;
  }

  /**
   * Get the spin configuration as a string pattern.
   * e.g., "++-0-0" for u+, d+, s-, c=0, t-, b=0
   */
  getPatternString() {
    const chars = [];
    for (const [channel, spin] of Object.entries(this.spins)) {
      if (spin.isUp()) chars.push('+');
      else if (spin.isDown()) chars.push('-');
      else chars.push('0');
    }
    return chars.join('');
  }

  /**
   * Count aligned pairs (spins pointing same direction).
   */
  countAlignedPairs() {
    const channels = Object.keys(this.spins);
    let aligned = 0;
    for (let i = 0; i < channels.length; i++) {
      for (let j = i + 1; j < channels.length; j++) {
        if (this.spins[channels[i]].isAlignedWith(this.spins[channels[j]])) {
          aligned++;
        }
      }
    }
    return aligned;
  }

  /**
   * Count anti-aligned pairs (spins pointing opposite directions).
   */
  countAntiAlignedPairs() {
    const channels = Object.keys(this.spins);
    let antiAligned = 0;
    for (let i = 0; i < channels.length; i++) {
      for (let j = i + 1; j < channels.length; j++) {
        if (this.spins[channels[i]].isAntiAlignedWith(this.spins[channels[j]])) {
          antiAligned++;
        }
      }
    }
    return antiAligned;
  }

  /**
   * Get the "charge" - based on quark charges.
   * u, c, t have charge +2/3
   * d, s, b have charge -1/3
   * Combined with spin gives effective charge.
   */
  effectiveCharge() {
    const upTypeCharge = 2/3;   // u, c, t
    const downTypeCharge = -1/3; // d, s, b
    
    let charge = 0;
    charge += this.spins.u.value * upTypeCharge;
    charge += this.spins.c.value * upTypeCharge;
    charge += this.spins.t.value * upTypeCharge;
    charge += this.spins.d.value * downTypeCharge;
    charge += this.spins.s.value * downTypeCharge;
    charge += this.spins.b.value * downTypeCharge;
    
    return charge;
  }

  /**
   * Compute similarity to another pattern.
   * Based on spin alignment, not cosine similarity.
   */
  similarity(other) {
    let matches = 0;
    let total = 0;
    
    for (const channel of Object.keys(this.spins)) {
      const myVal = this.spins[channel].value;
      const otherVal = other.spins[channel].value;
      
      // Skip if either is in superposition
      if (myVal === SPIN_ZERO || otherVal === SPIN_ZERO) continue;
      
      total++;
      if (myVal === otherVal) matches++;
    }
    
    return total > 0 ? matches / total : 0.5;
  }

  /**
   * Check if this pattern is the "opposite" of another.
   * All non-zero spins are flipped.
   */
  isOppositeOf(other) {
    for (const channel of Object.keys(this.spins)) {
      const myVal = this.spins[channel].value;
      const otherVal = other.spins[channel].value;
      
      if (myVal !== SPIN_ZERO && otherVal !== SPIN_ZERO) {
        if (myVal !== -otherVal) return false;
      }
    }
    return true;
  }

  /**
   * Get uncertainty - how many spins are in superposition?
   */
  uncertainty() {
    let uncertain = 0;
    for (const spin of Object.values(this.spins)) {
      if (spin.isSuperposition()) uncertain++;
    }
    return uncertain / 6; // Normalized 0-1
  }

  /**
   * Collapse superpositions based on context.
   * @param {QuarkSpinPattern} context - Pattern to bias towards
   */
  collapseTowards(context) {
    for (const channel of Object.keys(this.spins)) {
      if (this.spins[channel].isSuperposition()) {
        const contextVal = context.spins[channel].value;
        if (contextVal !== SPIN_ZERO) {
          // Collapse towards context spin
          this.spins[channel] = new QuarkSpin(contextVal);
        }
      }
    }
    return this;
  }

  /**
   * Create a copy.
   */
  clone() {
    const copy = new QuarkSpinPattern();
    for (const [channel, spin] of Object.entries(this.spins)) {
      copy.spins[channel] = spin.clone();
    }
    return copy;
  }

  /**
   * Serialize to object.
   */
  toJSON() {
    const spins = {};
    for (const [channel, spin] of Object.entries(this.spins)) {
      spins[channel] = spin.value;
    }
    return {
      spins,
      pattern: this.getPatternString(),
      totalSpin: this.totalSpin(),
      uncertainty: this.uncertainty(),
      effectiveCharge: this.effectiveCharge()
    };
  }
}

// ============================================================
// Predefined Spin Patterns for common concepts
// ============================================================

/**
 * Create a spin pattern from a description.
 */
export function createSpinPattern(desc) {
  const pattern = new QuarkSpinPattern();
  
  // desc is like { u: '+', d: '-', s: '0', c: '+', t: '0', b: '-' }
  // or { u: 0.5, d: -0.5, s: 0, c: 0.5, t: 0, b: -0.5 }
  for (const [channel, val] of Object.entries(desc)) {
    if (typeof val === 'string') {
      if (val === '+') pattern.setSpin(channel, SPIN_UP);
      else if (val === '-') pattern.setSpin(channel, SPIN_DOWN);
      else pattern.setSpin(channel, SPIN_ZERO);
    } else {
      pattern.setSpin(channel, val);
    }
  }
  
  return pattern;
}

/**
 * CONNECTOR_SPIN_PATTERNS: Empty by default - patterns EMERGE from usage.
 * This map is populated dynamically as patterns are learned.
 * No hardcoded connector types.
 */
export const CONNECTOR_SPIN_PATTERNS = new Map();

/**
 * Learn a connector spin pattern from observed transformations.
 * Patterns emerge from repeated observations, not from hardcoding.
 * @param {string} label - Learned label
 * @param {QuarkSpinPattern} pattern - Observed pattern
 */
export function learnConnectorPattern(label, pattern) {
  const existing = CONNECTOR_SPIN_PATTERNS.get(label);
  if (existing) {
    // Reinforce existing pattern
    existing.collapseTowards(pattern);
  } else {
    // Learn new pattern
    CONNECTOR_SPIN_PATTERNS.set(label, pattern.clone());
  }
}

/**
 * Get a learned connector pattern, or null if not learned.
 * @param {string} label
 * @returns {QuarkSpinPattern|null}
 */
export function getConnectorPattern(label) {
  return CONNECTOR_SPIN_PATTERNS.get(label) || null;
}

// ============================================================
// Spin-based Waveform Analysis
// ============================================================

/**
 * Compute spin pattern from waveform channel activations.
 * Converts continuous amplitudes to discrete spins.
 * @param {object} waveform - MultiChannelWaveform
 * @returns {QuarkSpinPattern}
 */
export function waveformToSpinPattern(waveform) {
  const pattern = new QuarkSpinPattern();
  
  if (!waveform || !waveform.channels) return pattern;
  
  // Get total norm for comparison
  let totalNorm = 0;
  const norms = {};
  
  for (const channel of ['u', 'd', 's', 'c', 't', 'b']) {
    const wf = waveform.getChannel(channel);
    const norm = wf.normSquared();
    norms[channel] = norm;
    totalNorm += norm;
  }
  
  if (totalNorm === 0) return pattern;
  
  // Average norm
  const avgNorm = totalNorm / 6;
  
  // Convert to spins based on deviation from average
  for (const channel of ['u', 'd', 's', 'c', 't', 'b']) {
    const ratio = norms[channel] / avgNorm;
    
    if (ratio > 1.3) {
      // Significantly above average = spin up
      pattern.setSpin(channel, SPIN_UP);
    } else if (ratio < 0.7) {
      // Significantly below average = spin down  
      pattern.setSpin(channel, SPIN_DOWN);
    }
    // Otherwise stays at SPIN_ZERO (superposition)
  }
  
  return pattern;
}

/**
 * Detect uncertainty from waveform.
 * High uncertainty = ASI doesn't know.
 * @param {object} waveform
 * @returns {{ uncertainty: number, confident: boolean, pattern: QuarkSpinPattern }}
 */
export function detectUncertainty(waveform) {
  const pattern = waveformToSpinPattern(waveform);
  const uncertainty = pattern.uncertainty();
  
  // Also check amplitude spread
  let amplitudeSpread = 0;
  if (waveform && waveform.channels) {
    const amps = [];
    for (const channel of ['u', 'd', 's', 'c', 't', 'b']) {
      const wf = waveform.getChannel(channel);
      for (const id of wf.keys()) {
        const amp = wf.get(id);
        amps.push(amp.re * amp.re + amp.im * amp.im);
      }
    }
    
    if (amps.length > 1) {
      const mean = amps.reduce((a, b) => a + b, 0) / amps.length;
      amplitudeSpread = amps.reduce((a, v) => a + Math.abs(v - mean), 0) / amps.length;
    }
  }
  
  // High uncertainty if many spins in superposition AND amplitude is spread out
  const normalizedSpread = amplitudeSpread / (amplitudeSpread + 0.1);
  const combinedUncertainty = (uncertainty + normalizedSpread) / 2;
  
  return {
    uncertainty: combinedUncertainty,
    confident: combinedUncertainty < 0.4,
    pattern,
    spinUncertainty: uncertainty,
    amplitudeSpread: normalizedSpread
  };
}
