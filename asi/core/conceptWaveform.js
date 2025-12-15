// Core: ConceptWaveform
// A concept IS a waveform pattern - the interference signature that emerges from processing
// NOT a label with metadata - the waveform state itself IS the concept

import { MultiChannelWaveform, CHANNELS } from '../math/channels.js';
import { Waveform, cAbsSq, complex, cMul, cAdd, cScale } from '../math/waveforms.js';
import { QuarkSpinPattern, SPIN_UP, SPIN_DOWN, SPIN_ZERO } from '../math/quarkSpins.js';

// ============================================================
// ConceptWaveform - A concept AS a waveform pattern
// ============================================================

/**
 * ConceptWaveform: A concept is not a label - it IS the waveform pattern.
 * 
 * The waveform encodes:
 * - The interference pattern from all symmetry inversions that created it
 * - Its relation to other concepts via transformation operators
 * - Its "meaning" through resonance with other patterns
 */
export class ConceptWaveform {
  /**
   * @param {string} [label] - Optional human-readable label (not the concept itself)
   */
  constructor(label = null) {
    // The concept IS this waveform
    this.waveform = new MultiChannelWaveform();
    
    // Initialize with small random amplitudes (superposition)
    this._initializeSuperposition();
    
    // Optional label for human readability (NOT the concept)
    this.label = label;
    
    // History of transformations that shaped this concept
    this.transformationHistory = [];
    
    // Coherence: how "collapsed" is this concept (0 = superposition, 1 = definite)
    this.coherence = 0;
    
    // Count of observations that reinforced this pattern
    this.observationCount = 0;
  }

  /**
   * Initialize in superposition state (all possibilities).
   */
  _initializeSuperposition() {
    for (const channel of CHANNELS) {
      const wf = new Waveform();
      // Start with small uniform amplitude across a base state
      const phase = Math.random() * 2 * Math.PI;
      wf.set('base', {
        re: 0.1 * Math.cos(phase),
        im: 0.1 * Math.sin(phase)
      });
      this.waveform.setChannel(channel, wf);
    }
    this.waveform.normalizeAll();
  }

  /**
   * Apply a symmetry transformation (spin operator) to this concept.
   * This is how relations are encoded - as transformations.
   * 
   * @param {QuarkSpinPattern} spinPattern - The transformation to apply
   * @param {string} [transformLabel] - Label for the transformation
   */
  applyTransformation(spinPattern, transformLabel = null) {
    const channels = ['u', 'd', 's', 'c', 't', 'b'];
    
    for (const channelName of channels) {
      const spin = spinPattern.getSpin(channelName);
      const channel = this.waveform.getChannel(channelName);
      if (!channel) continue;
      
      if (spin > 0) {
        // Spin up: constructive interference
        this._applySpinTransform(channel, Math.PI / 6, 1.5);
      } else if (spin < 0) {
        // Spin down: destructive interference
        this._applySpinTransform(channel, -Math.PI / 6, 0.67);
      }
      // Spin zero: superposition preserved
    }
    
    this.waveform.normalizeAll();
    
    // Record transformation
    this.transformationHistory.push({
      pattern: spinPattern.getPatternString(),
      label: transformLabel,
      timestamp: Date.now()
    });
    
    // Increase coherence with each transformation
    this.coherence = Math.min(1, this.coherence + 0.1);
  }

  /**
   * Apply spin transformation to a channel.
   */
  _applySpinTransform(channel, phaseRotation, amplitudeFactor) {
    const cos = Math.cos(phaseRotation);
    const sin = Math.sin(phaseRotation);
    
    for (const id of channel.keys()) {
      const amp = channel.get(id);
      channel.set(id, {
        re: (amp.re * cos - amp.im * sin) * amplitudeFactor,
        im: (amp.re * sin + amp.im * cos) * amplitudeFactor
      });
    }
  }

  /**
   * Compute resonance with another concept waveform.
   * High resonance = similar meaning / related concepts.
   * 
   * @param {ConceptWaveform} other
   * @returns {number} Resonance value 0-1
   */
  resonanceWith(other) {
    let totalResonance = 0;
    let channelCount = 0;
    
    for (const channelName of CHANNELS) {
      const myChannel = this.waveform.getChannel(channelName);
      const otherChannel = other.waveform.getChannel(channelName);
      
      if (!myChannel || !otherChannel) continue;
      
      // Compute inner product (interference)
      let innerProduct = { re: 0, im: 0 };
      
      for (const id of myChannel.keys()) {
        const myAmp = myChannel.get(id);
        const otherAmp = otherChannel.get(id) || { re: 0, im: 0 };
        
        // Complex conjugate inner product: <ψ|φ> = Σ ψ* φ
        innerProduct.re += myAmp.re * otherAmp.re + myAmp.im * otherAmp.im;
        innerProduct.im += myAmp.re * otherAmp.im - myAmp.im * otherAmp.re;
      }
      
      // Resonance = magnitude of inner product
      const resonance = Math.sqrt(innerProduct.re * innerProduct.re + innerProduct.im * innerProduct.im);
      totalResonance += resonance;
      channelCount++;
    }
    
    return channelCount > 0 ? totalResonance / channelCount : 0;
  }

  /**
   * Find the transformation that would convert this concept to another.
   * This IS the relation between concepts.
   * 
   * @param {ConceptWaveform} target
   * @returns {QuarkSpinPattern} The transformation (symmetry operation)
   */
  findTransformationTo(target) {
    const pattern = new QuarkSpinPattern();
    
    for (const channelName of CHANNELS) {
      const myChannel = this.waveform.getChannel(channelName);
      const targetChannel = target.waveform.getChannel(channelName);
      
      if (!myChannel || !targetChannel) continue;
      
      // Compare channel states
      const myNorm = myChannel.normSquared();
      const targetNorm = targetChannel.normSquared();
      
      // Determine spin direction from amplitude change
      if (targetNorm > myNorm * 1.2) {
        pattern.setSpin(channelName, SPIN_UP);  // Constructive
      } else if (targetNorm < myNorm * 0.8) {
        pattern.setSpin(channelName, SPIN_DOWN); // Destructive
      }
      // Otherwise stays in superposition
    }
    
    return pattern;
  }

  /**
   * Attempt to invert this concept (find its "opposite").
   * Understanding = successful inversion.
   * 
   * @returns {{ success: boolean, inverse: ConceptWaveform, error: number }}
   */
  attemptInversion() {
    const inverse = new ConceptWaveform(this.label ? `¬${this.label}` : null);
    
    // Copy waveform and flip all phases
    for (const channelName of CHANNELS) {
      const channel = this.waveform.getChannel(channelName);
      const invChannel = new Waveform();
      
      for (const id of channel.keys()) {
        const amp = channel.get(id);
        // Complex conjugate = phase inversion
        invChannel.set(id, { re: amp.re, im: -amp.im });
      }
      
      inverse.waveform.setChannel(channelName, invChannel);
    }
    
    // Check: does inverse * original = identity?
    const product = this.resonanceWith(inverse);
    
    // If resonance is near 0, inversion was successful (orthogonal)
    const error = Math.abs(product);
    const success = error < 0.3;
    
    return { success, inverse, error };
  }

  /**
   * Reinforce this concept from an observation.
   * Makes the pattern more definite (increases coherence).
   * 
   * @param {MultiChannelWaveform} observedWaveform
   */
  reinforceFrom(observedWaveform) {
    this.observationCount++;
    const alpha = 1 / this.observationCount;
    
    // Blend towards observed waveform
    for (const channelName of CHANNELS) {
      const myChannel = this.waveform.getChannel(channelName);
      const observedChannel = observedWaveform.getChannel(channelName);
      
      if (!myChannel || !observedChannel) continue;
      
      for (const id of observedChannel.keys()) {
        const observed = observedChannel.get(id);
        const current = myChannel.get(id) || { re: 0, im: 0 };
        
        // Exponential moving average
        myChannel.set(id, {
          re: current.re * (1 - alpha) + observed.re * alpha,
          im: current.im * (1 - alpha) + observed.im * alpha
        });
      }
    }
    
    this.waveform.normalizeAll();
    this.coherence = Math.min(1, this.coherence + 0.05);
  }

  /**
   * Get the spin pattern signature of this concept.
   * Derived from the waveform state, not stored separately.
   */
  getSpinSignature() {
    const pattern = new QuarkSpinPattern();
    
    // Derive spin from channel amplitudes relative to average
    let totalNorm = 0;
    const norms = {};
    
    for (const channelName of CHANNELS) {
      const channel = this.waveform.getChannel(channelName);
      norms[channelName] = channel ? channel.normSquared() : 0;
      totalNorm += norms[channelName];
    }
    
    const avgNorm = totalNorm / CHANNELS.length;
    
    for (const channelName of CHANNELS) {
      if (norms[channelName] > avgNorm * 1.3) {
        pattern.setSpin(channelName, SPIN_UP);
      } else if (norms[channelName] < avgNorm * 0.7) {
        pattern.setSpin(channelName, SPIN_DOWN);
      }
      // Otherwise superposition
    }
    
    return pattern;
  }

  /**
   * Clone this concept.
   */
  clone() {
    const copy = new ConceptWaveform(this.label);
    copy.waveform = this.waveform.clone();
    copy.transformationHistory = [...this.transformationHistory];
    copy.coherence = this.coherence;
    copy.observationCount = this.observationCount;
    return copy;
  }

  /**
   * Serialize for display/debugging.
   */
  toJSON() {
    const signature = this.getSpinSignature();
    return {
      label: this.label,
      spinSignature: signature.getPatternString(),
      coherence: this.coherence,
      observationCount: this.observationCount,
      transformationCount: this.transformationHistory.length
    };
  }
}

// ============================================================
// ConceptSpace - Collection of concept waveforms
// ============================================================

/**
 * ConceptSpace: The space of all learned concept waveforms.
 * Replaces the graph-based storage with waveform resonance.
 */
export class ConceptSpace {
  constructor() {
    // All learned concepts as waveforms
    this.concepts = new Map();  // label -> ConceptWaveform
    
    // Learned transformations (symmetry operations)
    this.transformations = [];  // { from, to, pattern }
  }

  /**
   * Learn a concept from input signal.
   * The waveform state after processing IS the concept.
   * 
   * @param {string} signal - Input signal
   * @param {MultiChannelWaveform} waveformState - Waveform after processing
   * @returns {ConceptWaveform}
   */
  learnConcept(signal, waveformState) {
    let concept = this.concepts.get(signal.toLowerCase());
    
    if (!concept) {
      concept = new ConceptWaveform(signal);
      this.concepts.set(signal.toLowerCase(), concept);
    }
    
    // Reinforce from observed waveform
    concept.reinforceFrom(waveformState);
    
    return concept;
  }

  /**
   * Learn a relation as a transformation between concept waveforms.
   * 
   * @param {string} fromLabel
   * @param {string} toLabel
   * @param {QuarkSpinPattern} transformPattern
   */
  learnTransformation(fromLabel, toLabel, transformPattern) {
    const fromConcept = this.concepts.get(fromLabel.toLowerCase());
    const toConcept = this.concepts.get(toLabel.toLowerCase());
    
    if (fromConcept && toConcept) {
      // Apply transformation to verify it works
      const test = fromConcept.clone();
      test.applyTransformation(transformPattern, `${fromLabel} → ${toLabel}`);
      
      // Check resonance with target
      const resonance = test.resonanceWith(toConcept);
      
      this.transformations.push({
        from: fromLabel.toLowerCase(),
        to: toLabel.toLowerCase(),
        pattern: transformPattern,
        verified: resonance > 0.5,
        resonance
      });
    }
  }

  /**
   * Find concepts that resonate with a query waveform.
   * This is how we "answer questions" - by resonance, not lookup.
   * 
   * @param {MultiChannelWaveform} queryWaveform
   * @param {number} threshold
   * @returns {Array<{ concept: ConceptWaveform, resonance: number }>}
   */
  findResonant(queryWaveform, threshold = 0.3) {
    const queryConcept = new ConceptWaveform();
    queryConcept.waveform = queryWaveform;
    
    const results = [];
    
    for (const [label, concept] of this.concepts) {
      const resonance = concept.resonanceWith(queryConcept);
      if (resonance > threshold) {
        results.push({ concept, label, resonance });
      }
    }
    
    return results.sort((a, b) => b.resonance - a.resonance);
  }

  /**
   * Find transformation path between two concepts.
   * Returns the chain of symmetry operations.
   * 
   * @param {string} fromLabel
   * @param {string} toLabel
   * @returns {Array<QuarkSpinPattern>|null}
   */
  findPath(fromLabel, toLabel) {
    const from = this.concepts.get(fromLabel.toLowerCase());
    const to = this.concepts.get(toLabel.toLowerCase());
    
    if (!from || !to) return null;
    
    // Direct transformation
    const direct = from.findTransformationTo(to);
    
    // Check if direct path works (high resonance after transform)
    const test = from.clone();
    test.applyTransformation(direct);
    const resonance = test.resonanceWith(to);
    
    if (resonance > 0.5) {
      return [direct];
    }
    
    // Try learned transformations
    const directTrans = this.transformations.find(
      t => t.from === fromLabel.toLowerCase() && t.to === toLabel.toLowerCase()
    );
    
    if (directTrans) {
      return [directTrans.pattern];
    }
    
    return null;
  }

  /**
   * Get statistics about the concept space.
   */
  getStatistics() {
    return {
      conceptCount: this.concepts.size,
      transformationCount: this.transformations.length,
      avgCoherence: Array.from(this.concepts.values())
        .reduce((sum, c) => sum + c.coherence, 0) / Math.max(1, this.concepts.size)
    };
  }
}
