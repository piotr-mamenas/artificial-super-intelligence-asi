// Language: Linguistic Occurrence
// A linguistic occurrence is an occurrence with signal, waveform traces, and operator trace

import { Occurrence } from '../core/occurrences.js';

// ============================================================
// LinguisticOccurrence - Word/phrase occurrence with traces
// ============================================================

/**
 * LinguisticOccurrence: an occurrence in the aboutness graph that represents
 * a linguistic event (spoken/written word or phrase).
 * 
 * Records:
 * - signal: the raw form (text/phonetic)
 * - waveformBefore: Y state before processing
 * - waveformAfter: Y state after processing
 * - operatorTrace: sequence of quark operators applied
 * - context: neighboring occurrences
 */
export class LinguisticOccurrence extends Occurrence {
  /**
   * @param {object} config
   * @param {string} config.id
   * @param {string} config.signal - The raw signal (text token, phoneme sequence)
   * @param {object} [config.waveformBefore] - Waveform snapshot before processing
   * @param {object} [config.waveformAfter] - Waveform snapshot after processing
   * @param {Array} [config.operatorTrace] - Sequence of operator applications
   * @param {string[]} [config.contextIds] - IDs of neighboring occurrences
   * @param {object} [config.metadata]
   */
  constructor(config) {
    super({
      id: config.id,
      mode: 'U', // Linguistic occurrences start as potential
      payload: { signal: config.signal },
      metadata: { ...config.metadata, isLinguistic: true }
    });
    
    this.signal = config.signal;
    this.normalizedSignal = this._normalizeSignal(config.signal);
    this.waveformBefore = config.waveformBefore || null;
    this.waveformAfter = config.waveformAfter || null;
    this.operatorTrace = config.operatorTrace || [];
    this.contextIds = config.contextIds || [];
    this.timestamp = Date.now();
  }

  /**
   * Normalize signal for comparison (lowercase, trim).
   */
  _normalizeSignal(signal) {
    return signal.toLowerCase().trim();
  }

  /**
   * Record the waveform state before processing this occurrence.
   * @param {MultiChannelWaveform} waveform
   */
  recordWaveformBefore(waveform) {
    this.waveformBefore = this._snapshotWaveform(waveform);
  }

  /**
   * Record the waveform state after processing this occurrence.
   * @param {MultiChannelWaveform} waveform
   */
  recordWaveformAfter(waveform) {
    this.waveformAfter = this._snapshotWaveform(waveform);
  }

  /**
   * Create a snapshot of waveform state (channel norms and top amplitudes).
   */
  _snapshotWaveform(waveform) {
    if (!waveform || !waveform.channels) return null;
    
    const snapshot = {
      timestamp: Date.now(),
      channels: {}
    };
    
    for (const [name, wf] of Object.entries(waveform.channels)) {
      const entries = [];
      for (const id of wf.keys()) {
        const amp = wf.get(id);
        entries.push({
          id,
          re: amp.re,
          im: amp.im,
          magSq: amp.re * amp.re + amp.im * amp.im
        });
      }
      entries.sort((a, b) => b.magSq - a.magSq);
      
      snapshot.channels[name] = {
        norm: wf.normSquared(),
        topEntries: entries.slice(0, 5)
      };
    }
    
    return snapshot;
  }

  /**
   * Add an operator application to the trace.
   * @param {string} operatorType - One of: 'up', 'down', 'strange', 'charm', 'top', 'bottom'
   * @param {object} [params] - Operator parameters
   */
  addOperatorToTrace(operatorType, params = {}) {
    this.operatorTrace.push({
      type: operatorType,
      params,
      timestamp: Date.now()
    });
  }

  /**
   * Get the operator trace as a type sequence.
   * @returns {string[]}
   */
  getOperatorSequence() {
    return this.operatorTrace.map(op => op.type);
  }

  /**
   * Compute the waveform delta (change from before to after).
   * @returns {object|null}
   */
  computeWaveformDelta() {
    if (!this.waveformBefore || !this.waveformAfter) return null;
    
    const delta = { channels: {} };
    
    for (const channelName of Object.keys(this.waveformBefore.channels)) {
      const before = this.waveformBefore.channels[channelName];
      const after = this.waveformAfter.channels[channelName] || { norm: 0 };
      
      delta.channels[channelName] = {
        normDelta: after.norm - before.norm,
        normRatio: before.norm > 0 ? after.norm / before.norm : (after.norm > 0 ? Infinity : 1)
      };
    }
    
    return delta;
  }

  /**
   * Check if this occurrence's signal matches another (for clustering).
   * @param {LinguisticOccurrence} other
   * @returns {boolean}
   */
  signalMatches(other) {
    return this.normalizedSignal === other.normalizedSignal;
  }

  /**
   * Serialize for storage/debugging.
   */
  toJSON() {
    return {
      id: this.id,
      signal: this.signal,
      normalizedSignal: this.normalizedSignal,
      operatorTrace: this.operatorTrace,
      contextIds: this.contextIds,
      hasWaveformBefore: !!this.waveformBefore,
      hasWaveformAfter: !!this.waveformAfter,
      timestamp: this.timestamp
    };
  }
}

// ============================================================
// Helper: Segment text into candidate forms
// ============================================================

/**
 * Segment a text string into candidate word forms.
 * @param {string} text
 * @returns {string[]}
 */
export function segmentIntoForms(text) {
  // Simple tokenization - split on whitespace and punctuation
  return text
    .toLowerCase()
    .split(/[\s,.!?;:'"()\[\]{}]+/)
    .filter(token => token.length > 0);
}

/**
 * Compute signal similarity between two forms (Levenshtein-based).
 * @param {string} form1
 * @param {string} form2
 * @returns {number} 0-1 similarity score
 */
export function signalSimilarity(form1, form2) {
  const s1 = form1.toLowerCase();
  const s2 = form2.toLowerCase();
  
  if (s1 === s2) return 1.0;
  
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  
  // Simple edit distance
  const dist = levenshteinDistance(s1, s2);
  return 1 - (dist / maxLen);
}

/**
 * Levenshtein edit distance.
 */
function levenshteinDistance(s1, s2) {
  const m = s1.length;
  const n = s2.length;
  
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  
  return dp[m][n];
}
