// Cognitive: Emergent Emotion System
// No hardcoded emotion labels - emotions are learned patterns from waveform dynamics

import { CHANNELS } from '../math/channels.js';

// ============================================================
// StateSignature - Captures current agent state as a vector
// All values are relative/normalized, no fixed constants
// ============================================================

/**
 * Compute a state signature vector from agent state.
 * This captures the "shape" of the current cognitive state.
 * All normalization is relative to the agent's own history.
 * @param {object} agent
 * @returns {number[]}
 */
export function computeStateSignature(agent) {
  const signature = [];
  
  // 1. Channel activation pattern (6 values) - relative ratios only
  const waveform = agent.attentionState?.waveform;
  if (waveform) {
    let totalNorm = 0;
    const channelNorms = [];
    
    for (const channel of CHANNELS) {
      const wf = waveform.getChannel(channel);
      const norm = wf.normSquared();
      channelNorms.push(norm);
      totalNorm += norm;
    }
    
    // Pure ratios - no hardcoded scaling
    for (const norm of channelNorms) {
      signature.push(totalNorm > 0 ? norm / totalNorm : 1 / CHANNELS.length);
    }
  } else {
    // Uniform distribution if no waveform
    const uniform = 1 / CHANNELS.length;
    for (let i = 0; i < CHANNELS.length; i++) {
      signature.push(uniform);
    }
  }
  
  // 2. Graph topology ratios (2 values) - relative only
  const graph = agent.graph;
  const occCount = graph.getAllOccurrences().length;
  const relCount = graph.getAllRelations().length;
  
  // Ratio of relations to possible relations (density)
  const maxRelations = occCount > 1 ? occCount * (occCount - 1) : 1;
  const density = relCount / maxRelations;
  
  // Ratio of relations per occurrence (connectivity)
  const connectivity = occCount > 0 ? relCount / occCount : 0;
  const normalizedConnectivity = connectivity / (connectivity + 1); // Sigmoid-like normalization
  
  signature.push(density, normalizedConnectivity);
  
  // 3. Value field distribution shape (2 values) - relative statistics
  const valueField = agent.valueField;
  let mean = 0.5, spread = 0.5;
  
  if (valueField && valueField.values && valueField.values.size > 0) {
    const values = [...valueField.values.values()];
    mean = values.reduce((a, b) => a + b, 0) / values.length;
    
    // Spread as coefficient of variation (relative to mean)
    if (values.length > 1) {
      const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length;
      const stdDev = Math.sqrt(variance);
      spread = mean > 0 ? stdDev / mean : stdDev; // Coefficient of variation
      spread = spread / (spread + 1); // Normalize to 0-1
    }
  }
  
  signature.push(mean, spread);
  
  // 4. Waveform dynamics (2 values) - rate of change indicators
  const dynamics = computeWaveformDynamics(agent);
  signature.push(dynamics.changeRate, dynamics.focusRatio);
  
  // Total: 6 + 2 + 2 + 2 = 12 dimensions (all relative)
  return signature;
}

/**
 * Compute waveform dynamics - how the waveform is changing.
 */
function computeWaveformDynamics(agent) {
  const waveform = agent.attentionState?.waveform;
  if (!waveform) {
    return { changeRate: 0.5, focusRatio: 0.5 };
  }
  
  let totalAmp = 0;
  let maxAmp = 0;
  let entryCount = 0;
  
  for (const channel of CHANNELS) {
    const wf = waveform.getChannel(channel);
    for (const id of wf.keys()) {
      const amp = wf.get(id);
      const magSq = amp.re * amp.re + amp.im * amp.im;
      totalAmp += magSq;
      maxAmp = Math.max(maxAmp, magSq);
      entryCount++;
    }
  }
  
  // Focus ratio: how concentrated is amplitude (high = focused, low = spread)
  const avgAmp = entryCount > 0 ? totalAmp / entryCount : 0;
  const focusRatio = avgAmp > 0 ? maxAmp / (totalAmp || 1) : 0.5;
  
  // Change rate: based on phase distribution (approximation)
  let phaseVariance = 0;
  if (entryCount > 0) {
    const phases = [];
    for (const channel of CHANNELS) {
      const wf = waveform.getChannel(channel);
      for (const id of wf.keys()) {
        const amp = wf.get(id);
        phases.push(Math.atan2(amp.im, amp.re));
      }
    }
    if (phases.length > 1) {
      const meanPhase = phases.reduce((a, b) => a + b, 0) / phases.length;
      phaseVariance = phases.reduce((a, p) => a + (p - meanPhase) ** 2, 0) / phases.length;
    }
  }
  const changeRate = phaseVariance / (phaseVariance + 1); // Normalize
  
  return { changeRate, focusRatio };
}

// ============================================================
// EmergentEmotionField - Learns emotions from user teaching
// ============================================================

/**
 * EmergentEmotionField: emotions are learned patterns, not hardcoded labels.
 * Similarity threshold adapts based on learned pattern distribution.
 */
export class EmergentEmotionField {
  constructor() {
    /** @type {Map<string, { signature: number[], count: number, lastSeen: number, history: number[][] }>} */
    this.learnedPatterns = new Map();
    
    /** @type {number[]} */
    this.lastSignature = null;
    
    /** @type {string} */
    this.lastEmotion = null;
    
    // Adaptive threshold - starts permissive, tightens with more patterns
    this._baseThreshold = 0.5;
    
    // Track signature history for restructuring
    this.signatureHistory = [];
    this.maxHistory = 50;
  }
  
  /**
   * Get adaptive similarity threshold based on number of learned patterns.
   * More patterns = higher threshold needed to distinguish them.
   */
  get similarityThreshold() {
    const patternCount = this.learnedPatterns.size;
    if (patternCount <= 1) return this._baseThreshold;
    // Threshold increases logarithmically with pattern count
    return Math.min(0.95, this._baseThreshold + Math.log(patternCount) * 0.1);
  }

  /**
   * Learn an emotion label associated with current state signature.
   * @param {string} label - User-provided emotion word
   * @param {number[]} signature - Current state signature
   */
  learn(label, signature) {
    const normalizedLabel = label.toLowerCase().trim();
    
    // Track in global history for restructuring
    this.signatureHistory.push({ label: normalizedLabel, signature: [...signature], timestamp: Date.now() });
    if (this.signatureHistory.length > this.maxHistory) {
      this.signatureHistory.shift();
    }
    
    if (this.learnedPatterns.has(normalizedLabel)) {
      // Update existing pattern with moving average
      const existing = this.learnedPatterns.get(normalizedLabel);
      const alpha = 1 / (existing.count + 1);
      
      existing.signature = existing.signature.map((v, i) => 
        v * (1 - alpha) + signature[i] * alpha
      );
      existing.count++;
      existing.lastSeen = Date.now();
      
      // Keep recent history for this pattern
      existing.history.push([...signature]);
      if (existing.history.length > 10) existing.history.shift();
    } else {
      // New pattern
      this.learnedPatterns.set(normalizedLabel, {
        signature: [...signature],
        count: 1,
        lastSeen: Date.now(),
        history: [[...signature]]
      });
    }
    
    // Check if restructuring is needed
    this._maybeRestructure();
  }
  
  /**
   * Check if patterns need restructuring and do it if necessary.
   * Restructuring merges similar patterns or splits divergent ones.
   */
  _maybeRestructure() {
    if (this.learnedPatterns.size < 2) return;
    
    const patterns = [...this.learnedPatterns.entries()];
    
    // Check for patterns that should be merged (very similar)
    for (let i = 0; i < patterns.length; i++) {
      for (let j = i + 1; j < patterns.length; j++) {
        const [label1, data1] = patterns[i];
        const [label2, data2] = patterns[j];
        
        const similarity = this._cosineSimilarity(data1.signature, data2.signature);
        
        // If extremely similar (>0.95), merge into the more established one
        if (similarity > 0.95) {
          const keepLabel = data1.count >= data2.count ? label1 : label2;
          const removeLabel = keepLabel === label1 ? label2 : label1;
          const keepData = keepLabel === label1 ? data1 : data2;
          const removeData = keepLabel === label1 ? data2 : data1;
          
          // Merge signatures
          const totalCount = keepData.count + removeData.count;
          keepData.signature = keepData.signature.map((v, idx) => 
            (v * keepData.count + removeData.signature[idx] * removeData.count) / totalCount
          );
          keepData.count = totalCount;
          keepData.history = [...keepData.history, ...removeData.history].slice(-10);
          
          this.learnedPatterns.delete(removeLabel);
          return; // Only one restructure per call
        }
      }
    }
  }
  
  /**
   * Force restructure all patterns based on current history.
   * Useful when the agent's understanding has significantly changed.
   */
  restructure() {
    if (this.signatureHistory.length < 5) return { restructured: false, reason: 'insufficient history' };
    
    // Recompute all pattern signatures from their history
    for (const [label, data] of this.learnedPatterns) {
      if (data.history.length > 0) {
        // Recompute signature as average of history
        const dims = data.history[0].length;
        const newSig = new Array(dims).fill(0);
        
        for (const hist of data.history) {
          for (let i = 0; i < dims; i++) {
            newSig[i] += hist[i] / data.history.length;
          }
        }
        
        data.signature = newSig;
      }
    }
    
    // Run merge check
    this._maybeRestructure();
    
    return { restructured: true, patternCount: this.learnedPatterns.size };
  }

  /**
   * Infer emotion from current state signature.
   * Returns the closest learned pattern or null if none match.
   * @param {number[]} signature
   * @returns {{ label: string|null, similarity: number, signature: number[] }}
   */
  infer(signature) {
    this.lastSignature = signature;
    
    if (this.learnedPatterns.size === 0) {
      this.lastEmotion = null;
      return { label: null, similarity: 0, signature };
    }
    
    let bestMatch = null;
    let bestSimilarity = -1;
    
    for (const [label, pattern] of this.learnedPatterns) {
      const similarity = this._cosineSimilarity(signature, pattern.signature);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = label;
      }
    }
    
    // Only return if above threshold
    if (bestSimilarity >= this.similarityThreshold) {
      this.lastEmotion = bestMatch;
      return { label: bestMatch, similarity: bestSimilarity, signature };
    }
    
    this.lastEmotion = null;
    return { label: null, similarity: bestSimilarity, signature };
  }

  /**
   * Compute cosine similarity between two vectors.
   */
  _cosineSimilarity(a, b) {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom > 0 ? dotProduct / denom : 0;
  }

  /**
   * Get all learned emotion patterns.
   * @returns {string[]}
   */
  getLearnedEmotions() {
    return [...this.learnedPatterns.keys()];
  }

  /**
   * Forget a learned emotion.
   * @param {string} label
   */
  forget(label) {
    this.learnedPatterns.delete(label.toLowerCase().trim());
  }

  /**
   * Serialize to JSON.
   */
  toJSON() {
    const patterns = {};
    for (const [label, data] of this.learnedPatterns) {
      patterns[label] = {
        signature: data.signature,
        count: data.count,
        lastSeen: data.lastSeen
      };
    }
    
    return {
      learnedEmotions: this.getLearnedEmotions(),
      patternCount: this.learnedPatterns.size,
      lastEmotion: this.lastEmotion,
      patterns
    };
  }
}

// ============================================================
// EmergentEmotionDetector - Learns to detect emotion teaching
// No hardcoded patterns - learns from signal words
// ============================================================

/**
 * EmergentEmotionDetector: learns which words signal emotion teaching.
 * Instead of hardcoded patterns, it learns from usage.
 */
export class EmergentEmotionDetector {
  constructor() {
    // Signal words that precede emotion labels (learned, not hardcoded)
    this.signalPatterns = new Map(); // pattern -> { count, successRate }
    
    // Track recent detections for learning
    this.detectionHistory = [];
  }
  
  /**
   * Try to detect emotion teaching in text.
   * Returns detected emotion word or null.
   * @param {string} text
   * @param {Set<string>} knownEmotions - Already learned emotion labels
   * @returns {string|null}
   */
  detect(text, knownEmotions = new Set()) {
    const words = text.toLowerCase().split(/\s+/);
    
    // Strategy 1: Look for known emotions in the text
    for (const word of words) {
      if (knownEmotions.has(word)) {
        this._learnPattern(words, word);
        return word;
      }
    }
    
    // Strategy 2: Look for learned signal patterns
    for (let i = 0; i < words.length - 1; i++) {
      const pattern = words.slice(Math.max(0, i - 1), i + 1).join(' ');
      
      if (this.signalPatterns.has(pattern)) {
        const patternData = this.signalPatterns.get(pattern);
        // Only use pattern if it has good success rate
        if (patternData.successRate > 0.5 && i + 1 < words.length) {
          const candidate = words[i + 1];
          // Don't return common words
          if (candidate.length > 2 && !this._isCommonWord(candidate)) {
            return candidate;
          }
        }
      }
    }
    
    // Strategy 3: New potential pattern - look for "feel/feeling/am" + word
    // These emerge from the structure, not hardcoded
    const potentialSignals = this._findPotentialSignals(words);
    if (potentialSignals.length > 0) {
      const candidate = potentialSignals[0];
      if (!this._isCommonWord(candidate)) {
        return candidate;
      }
    }
    
    return null;
  }
  
  /**
   * Learn that a pattern preceded an emotion word.
   */
  _learnPattern(words, emotionWord) {
    const emotionIndex = words.indexOf(emotionWord);
    if (emotionIndex <= 0) return;
    
    // Learn the 1-2 words before the emotion as signal pattern
    const pattern = words.slice(Math.max(0, emotionIndex - 2), emotionIndex).join(' ');
    
    if (this.signalPatterns.has(pattern)) {
      const data = this.signalPatterns.get(pattern);
      data.count++;
      data.successRate = (data.successRate * (data.count - 1) + 1) / data.count;
    } else {
      this.signalPatterns.set(pattern, { count: 1, successRate: 1 });
    }
  }
  
  /**
   * Find potential signal words that might precede an emotion.
   */
  _findPotentialSignals(words) {
    const candidates = [];
    
    for (let i = 0; i < words.length - 1; i++) {
      const word = words[i];
      const next = words[i + 1];
      
      // Look for words that commonly precede descriptors
      // These patterns emerge from usage, initial bootstrapping only
      if (this.signalPatterns.size === 0) {
        // Bootstrap: very minimal initial signals (will be replaced by learned ones)
        if ((word === 'feel' || word === 'feeling' || word === 'am' || word === "i'm") && next) {
          candidates.push(next);
        }
      }
    }
    
    return candidates;
  }
  
  /**
   * Check if word is too common to be an emotion label.
   */
  _isCommonWord(word) {
    const common = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'be', 'to', 'of', 'and', 'that', 'it', 'for', 'on', 'with', 'as', 'at', 'by', 'this', 'from', 'or', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'his', 'they', 'we', 'she', 'he', 'my', 'your', 'so', 'if', 'about', 'into', 'just', 'now', 'like', 'very', 'when', 'also', 'no', 'way', 'could', 'than', 'them', 'been', 'have', 'has', 'will', 'would', 'there', 'their', 'what', 'which', 'do', 'how', 'up', 'out', 'some', 'other']);
    return common.has(word);
  }
  
  /**
   * Reinforce that a detection was correct (emotion was successfully learned).
   */
  reinforce(text, emotionWord) {
    const words = text.toLowerCase().split(/\s+/);
    this._learnPattern(words, emotionWord);
  }
  
  /**
   * Get learned signal patterns.
   */
  getLearnedPatterns() {
    return [...this.signalPatterns.entries()]
      .filter(([_, data]) => data.count >= 2)
      .map(([pattern, data]) => ({ pattern, ...data }));
  }
}

// Global detector instance
export const emotionDetector = new EmergentEmotionDetector();

/**
 * Detect emotion teaching using the emergent detector.
 * @param {string} text
 * @param {Set<string>} [knownEmotions]
 * @returns {string|null}
 */
export function detectEmotionTeaching(text, knownEmotions = new Set()) {
  return emotionDetector.detect(text, knownEmotions);
}
