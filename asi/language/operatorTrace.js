// Language: Operator Trace Collection
// Records and analyzes quark operator sequences during language processing

import { CHANNELS } from '../math/channels.js';

// ============================================================
// Quark Operator Types and Their Linguistic Roles
// ============================================================

export const QUARK_OPERATORS = {
  up: {
    name: 'Up',
    symbol: 'U_u',
    role: 'assertion',
    description: 'Evidence-raising / affirmation - increases amplitude for consistent paths'
  },
  down: {
    name: 'Down', 
    symbol: 'U_d',
    role: 'negation',
    description: 'Contradiction / evidence-lowering - decreases amplitude for incompatible paths'
  },
  strange: {
    name: 'Strange',
    symbol: 'U_s', 
    role: 'context-switch',
    description: 'Context switching - moves amplitude between different frames/interpretations'
  },
  charm: {
    name: 'Charm',
    symbol: 'U_c',
    role: 'abstraction',
    description: 'Compression / abstraction - merges similar paths into abstract representations'
  },
  top: {
    name: 'Top',
    symbol: 'U_t',
    role: 'structural',
    description: 'Global constraints - enforces consistency with learned rules/grammar'
  },
  bottom: {
    name: 'Bottom',
    symbol: 'U_b',
    role: 'grounding',
    description: 'Grounding - aligns waveform with raw observations and concrete experience'
  }
};

// Map channel names to operator types
export const CHANNEL_TO_OPERATOR = {
  'u': 'up',
  'd': 'down',
  's': 'strange',
  'c': 'charm',
  't': 'top',
  'b': 'bottom'
};

// ============================================================
// OperatorTracer - Records operator activity during processing
// ============================================================

/**
 * OperatorTracer: monitors and records quark operator applications
 * during linguistic processing.
 */
export class OperatorTracer {
  constructor() {
    this.currentTrace = [];
    this.isRecording = false;
    this.traceHistory = [];
    this.maxHistory = 100;
  }

  /**
   * Start recording a new trace.
   */
  startTrace() {
    this.currentTrace = [];
    this.isRecording = true;
  }

  /**
   * Stop recording and return the trace.
   * @returns {Array}
   */
  endTrace() {
    this.isRecording = false;
    const trace = [...this.currentTrace];
    
    // Store in history
    if (trace.length > 0) {
      this.traceHistory.push({
        trace,
        timestamp: Date.now()
      });
      
      // Trim history
      if (this.traceHistory.length > this.maxHistory) {
        this.traceHistory.shift();
      }
    }
    
    this.currentTrace = [];
    return trace;
  }

  /**
   * Record an operator application.
   * @param {string} operatorType - One of: up, down, strange, charm, top, bottom
   * @param {object} [params] - Operator parameters
   * @param {object} [context] - Additional context (e.g., affected states)
   */
  record(operatorType, params = {}, context = {}) {
    if (!this.isRecording) return;
    
    if (!QUARK_OPERATORS[operatorType]) {
      console.warn(`Unknown operator type: ${operatorType}`);
      return;
    }
    
    this.currentTrace.push({
      type: operatorType,
      params,
      context,
      timestamp: Date.now()
    });
  }

  /**
   * Infer operator type from waveform change.
   * Analyzes before/after waveform to determine which operators were active.
   * @param {object} waveformBefore
   * @param {object} waveformAfter
   * @returns {Array} Inferred operator sequence
   */
  inferOperatorsFromDelta(waveformBefore, waveformAfter) {
    if (!waveformBefore || !waveformAfter) return [];
    
    const inferred = [];
    const channelDeltas = {};
    
    // Compute per-channel changes
    for (const channel of CHANNELS) {
      const before = waveformBefore.channels?.[channel]?.norm || 0;
      const after = waveformAfter.channels?.[channel]?.norm || 0;
      channelDeltas[channel] = after - before;
    }
    
    // Infer operators based on channel changes
    // Up channel increased significantly → 'up' operator
    if (channelDeltas['u'] > 0.1) {
      inferred.push({ type: 'up', strength: channelDeltas['u'] });
    }
    
    // Down channel increased → 'down' operator
    if (channelDeltas['d'] > 0.1) {
      inferred.push({ type: 'down', strength: channelDeltas['d'] });
    }
    
    // Strange channel changed (context switch)
    if (Math.abs(channelDeltas['s']) > 0.1) {
      inferred.push({ type: 'strange', strength: Math.abs(channelDeltas['s']) });
    }
    
    // Charm channel increased (abstraction)
    if (channelDeltas['c'] > 0.1) {
      inferred.push({ type: 'charm', strength: channelDeltas['c'] });
    }
    
    // Top channel changed (structural)
    if (Math.abs(channelDeltas['t']) > 0.05) {
      inferred.push({ type: 'top', strength: Math.abs(channelDeltas['t']) });
    }
    
    // Bottom channel changed (grounding)
    if (Math.abs(channelDeltas['b']) > 0.1) {
      inferred.push({ type: 'bottom', strength: Math.abs(channelDeltas['b']) });
    }
    
    // Sort by strength
    inferred.sort((a, b) => b.strength - a.strength);
    
    return inferred;
  }

  /**
   * Get operator statistics from trace history.
   * @returns {object}
   */
  getStatistics() {
    const stats = {
      totalTraces: this.traceHistory.length,
      operatorCounts: { up: 0, down: 0, strange: 0, charm: 0, top: 0, bottom: 0 },
      avgTraceLength: 0,
      commonSequences: []
    };
    
    if (this.traceHistory.length === 0) return stats;
    
    let totalLength = 0;
    const sequenceCounts = new Map();
    
    for (const { trace } of this.traceHistory) {
      totalLength += trace.length;
      
      // Count operators
      for (const op of trace) {
        if (stats.operatorCounts.hasOwnProperty(op.type)) {
          stats.operatorCounts[op.type]++;
        }
      }
      
      // Track sequences (first 3 operators)
      const seqKey = trace.slice(0, 3).map(op => op.type).join('-');
      sequenceCounts.set(seqKey, (sequenceCounts.get(seqKey) || 0) + 1);
    }
    
    stats.avgTraceLength = totalLength / this.traceHistory.length;
    
    // Get most common sequences
    stats.commonSequences = [...sequenceCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([seq, count]) => ({ sequence: seq, count }));
    
    return stats;
  }
}

// ============================================================
// Waveform Transformation Analyzer
// ============================================================

/**
 * Analyze the transformation between two waveforms to find
 * the operator pattern that maps one to the other.
 */
export class TransformationAnalyzer {
  /**
   * Analyze transformation from waveform A to waveform B.
   * @param {object} wfA - Source waveform snapshot
   * @param {object} wfB - Target waveform snapshot
   * @returns {object} Transformation analysis
   */
  analyze(wfA, wfB) {
    if (!wfA || !wfB) {
      return { valid: false, reason: 'Missing waveform' };
    }
    
    const analysis = {
      valid: true,
      channelChanges: {},
      dominantOperator: null,
      operatorSignature: [],
      similarity: 0
    };
    
    // Analyze per-channel changes
    let totalChangeMagnitude = 0;
    const operatorScores = { up: 0, down: 0, strange: 0, charm: 0, top: 0, bottom: 0 };
    
    for (const channel of CHANNELS) {
      const normA = wfA.channels?.[channel]?.norm || 0;
      const normB = wfB.channels?.[channel]?.norm || 0;
      const delta = normB - normA;
      const ratio = normA > 0 ? normB / normA : (normB > 0 ? 2 : 1);
      
      analysis.channelChanges[channel] = { delta, ratio, before: normA, after: normB };
      totalChangeMagnitude += Math.abs(delta);
      
      // Map channel change to operator score
      const opType = CHANNEL_TO_OPERATOR[channel];
      if (opType) {
        operatorScores[opType] = Math.abs(delta);
      }
    }
    
    // Normalize operator scores
    if (totalChangeMagnitude > 0) {
      for (const op of Object.keys(operatorScores)) {
        operatorScores[op] /= totalChangeMagnitude;
      }
    }
    
    // Find dominant operator
    let maxScore = 0;
    for (const [op, score] of Object.entries(operatorScores)) {
      if (score > maxScore) {
        maxScore = score;
        analysis.dominantOperator = op;
      }
    }
    
    // Build operator signature (ordered by strength)
    analysis.operatorSignature = Object.entries(operatorScores)
      .filter(([_, score]) => score > 0.1)
      .sort((a, b) => b[1] - a[1])
      .map(([op, score]) => ({ operator: op, weight: score }));
    
    // Compute overall similarity (inverse of change magnitude)
    analysis.similarity = 1 / (1 + totalChangeMagnitude);
    
    return analysis;
  }

  /**
   * Compare two transformation patterns.
   * @param {object} transform1
   * @param {object} transform2
   * @returns {number} Similarity 0-1
   */
  compareTransformations(transform1, transform2) {
    if (!transform1.valid || !transform2.valid) return 0;
    
    // Compare operator signatures
    const sig1 = transform1.operatorSignature;
    const sig2 = transform2.operatorSignature;
    
    // Build weight vectors
    const weights1 = { up: 0, down: 0, strange: 0, charm: 0, top: 0, bottom: 0 };
    const weights2 = { up: 0, down: 0, strange: 0, charm: 0, top: 0, bottom: 0 };
    
    for (const { operator, weight } of sig1) {
      weights1[operator] = weight;
    }
    for (const { operator, weight } of sig2) {
      weights2[operator] = weight;
    }
    
    // Cosine similarity
    let dot = 0, norm1 = 0, norm2 = 0;
    for (const op of Object.keys(weights1)) {
      dot += weights1[op] * weights2[op];
      norm1 += weights1[op] * weights1[op];
      norm2 += weights2[op] * weights2[op];
    }
    
    const denom = Math.sqrt(norm1) * Math.sqrt(norm2);
    return denom > 0 ? dot / denom : 0;
  }
}

// ============================================================
// Global tracer instance
// ============================================================

export const globalTracer = new OperatorTracer();
export const transformationAnalyzer = new TransformationAnalyzer();
