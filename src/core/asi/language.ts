/**
 * PURE EMERGENT LANGUAGE MODULE
 * 
 * ZERO HARDCODED VALUES.
 * Everything emerges from inversion dynamics:
 * - Words are just tokens with inversion histories
 * - Meaning emerges from inversion patterns
 * - No assumptions about positive/negative
 * - The algorithm discovers structure itself
 */

// ============================================
// WORD STATE - Pure inversion history
// ============================================

export interface WordState {
  token: string;
  
  // Raw inversion history - no interpretation
  inversionResults: number[];  // Each inversion error value
  
  // Sequence tracking - pure co-occurrence
  seenWith: Map<string, number>;      // Which tokens appeared in same message
  followedBy: Map<string, number>;    // What came after this token
  precededBy: Map<string, number>;    // What came before this token
  
  // Raw counts
  totalSeen: number;
}

// ============================================
// EMERGENT VOCABULARY
// ============================================

export class EmergentVocabulary {
  private tokens: Map<string, WordState> = new Map();
  private sequence: string[] = [];  // Recent token sequence
  
  /**
   * Process raw text - no interpretation, just tracking
   */
  process(text: string): WordState[] {
    const newTokens = this.tokenize(text);
    const states: WordState[] = [];
    
    for (let i = 0; i < newTokens.length; i++) {
      const token = newTokens[i];
      let state = this.tokens.get(token);
      
      if (!state) {
        // New token - empty state
        state = {
          token,
          inversionResults: [],
          seenWith: new Map(),
          followedBy: new Map(),
          precededBy: new Map(),
          totalSeen: 0,
        };
        this.tokens.set(token, state);
      }
      
      state.totalSeen++;
      
      // Track co-occurrence with other tokens in this message
      for (const other of newTokens) {
        if (other !== token) {
          state.seenWith.set(other, (state.seenWith.get(other) || 0) + 1);
        }
      }
      
      // Track sequence
      if (i > 0) {
        const prev = newTokens[i - 1];
        state.precededBy.set(prev, (state.precededBy.get(prev) || 0) + 1);
        
        const prevState = this.tokens.get(prev);
        if (prevState) {
          prevState.followedBy.set(token, (prevState.followedBy.get(token) || 0) + 1);
        }
      }
      
      states.push(state);
      this.sequence.push(token);
    }
    
    return states;
  }
  
  /**
   * Record inversion result - just store the raw error
   */
  recordInversion(tokens: string[], error: number): void {
    for (const t of tokens) {
      const state = this.tokens.get(t.toLowerCase());
      if (state) {
        state.inversionResults.push(error);
      }
    }
  }
  
  /**
   * Tokenize - minimal processing
   */
  private tokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 0);
  }
  
  /**
   * Get token state
   */
  get(token: string): WordState | undefined {
    return this.tokens.get(token.toLowerCase());
  }
  
  /**
   * Get all tokens
   */
  all(): WordState[] {
    return Array.from(this.tokens.values());
  }
  
  /**
   * Vocabulary size
   */
  get size(): number {
    return this.tokens.size;
  }
  
  /**
   * Compute emergent similarity between tokens
   * Based purely on inversion history patterns
   */
  similarity(a: string, b: string): number {
    const stateA = this.tokens.get(a.toLowerCase());
    const stateB = this.tokens.get(b.toLowerCase());
    
    if (!stateA || !stateB) return 0;
    if (stateA.inversionResults.length === 0 || stateB.inversionResults.length === 0) return 0;
    
    // Compare inversion error distributions
    const avgA = stateA.inversionResults.reduce((s, v) => s + v, 0) / stateA.inversionResults.length;
    const avgB = stateB.inversionResults.reduce((s, v) => s + v, 0) / stateB.inversionResults.length;
    
    // Similarity = inverse of difference
    return 1 / (1 + Math.abs(avgA - avgB));
  }
  
  /**
   * Find tokens with similar inversion patterns
   */
  findSimilar(token: string, limit: number): string[] {
    const all = this.all();
    const scored = all
      .filter(s => s.token !== token.toLowerCase())
      .map(s => ({ token: s.token, sim: this.similarity(token, s.token) }))
      .sort((a, b) => b.sim - a.sim);
    
    return scored.slice(0, limit).map(s => s.token);
  }
  
  /**
   * Get likely next tokens based on sequence history
   */
  likelyNext(token: string, limit: number): string[] {
    const state = this.tokens.get(token.toLowerCase());
    if (!state) return [];
    
    const followers = Array.from(state.followedBy.entries())
      .sort((a, b) => b[1] - a[1]);
    
    return followers.slice(0, limit).map(f => f[0]);
  }
  
  /**
   * Compute emergent "state" from tokens
   * No hardcoded interpretation - just statistical summary
   */
  computeState(tokens: string[]): { mean: number; variance: number; count: number } {
    const errors: number[] = [];
    
    for (const t of tokens) {
      const state = this.tokens.get(t.toLowerCase());
      if (state) {
        errors.push(...state.inversionResults);
      }
    }
    
    if (errors.length === 0) {
      return { mean: 0, variance: 0, count: 0 };
    }
    
    const mean = errors.reduce((s, v) => s + v, 0) / errors.length;
    const variance = errors.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / errors.length;
    
    return { mean, variance, count: errors.length };
  }
}

// ============================================
// EMERGENT RESPONSE - No templates
// ============================================

export class EmergentResponse {
  private vocab: EmergentVocabulary;
  
  constructor(vocab: EmergentVocabulary) {
    this.vocab = vocab;
  }
  
  /**
   * Generate response purely from emergent patterns
   */
  generate(inputTokens: string[], inversionError: number): string {
    const vocabSize = this.vocab.size;
    
    // Report raw state if vocabulary is small
    if (vocabSize < 5) {
      return `[${vocabSize} tokens | error: ${inversionError.toFixed(3)}]`;
    }
    
    const parts: string[] = [];
    
    // Find tokens with similar inversion patterns to current error
    const allTokens = this.vocab.all();
    const errorMatch = allTokens
      .filter(s => s.inversionResults.length > 0)
      .map(s => ({
        token: s.token,
        avgError: s.inversionResults.reduce((a, b) => a + b, 0) / s.inversionResults.length
      }))
      .sort((a, b) => Math.abs(a.avgError - inversionError) - Math.abs(b.avgError - inversionError));
    
    // Use tokens that historically had similar error values
    for (const match of errorMatch.slice(0, 3)) {
      parts.push(match.token);
    }
    
    // Add likely successors from input
    if (inputTokens.length > 0) {
      const last = inputTokens[inputTokens.length - 1];
      const next = this.vocab.likelyNext(last, 2);
      parts.push(...next);
    }
    
    if (parts.length === 0) {
      const state = this.vocab.computeState(inputTokens);
      return `[mean:${state.mean.toFixed(3)} var:${state.variance.toFixed(3)} n:${state.count}]`;
    }
    
    // Remove duplicates, limit length
    const unique = [...new Set(parts)].slice(0, 5);
    return unique.join(' ');
  }
}

// ============================================
// GLOBAL INSTANCES
// ============================================

let vocab: EmergentVocabulary | null = null;
let responder: EmergentResponse | null = null;

export function getVocabulary(): EmergentVocabulary {
  if (!vocab) vocab = new EmergentVocabulary();
  return vocab;
}

export function getResponder(): EmergentResponse {
  if (!responder) responder = new EmergentResponse(getVocabulary());
  return responder;
}

// ============================================
// API FUNCTIONS
// ============================================

export function processInput(text: string): WordState[] {
  return getVocabulary().process(text);
}

export function updateFromInversion(words: string[], _success: boolean, error: number): void {
  // Just record the error - no interpretation of success/failure
  getVocabulary().recordInversion(words, error);
}

export function generateResponse(
  inputWords: string[],
  _currentState: { R: number; G: number; B: number },
  _hadronCount: number,
  _voidCount: number
): string {
  // Get recent inversion error from word states
  const states = inputWords.map(w => getVocabulary().get(w)).filter(Boolean) as WordState[];
  const recentErrors = states.flatMap(s => s.inversionResults.slice(-5));
  const avgError = recentErrors.length > 0 
    ? recentErrors.reduce((a, b) => a + b, 0) / recentErrors.length 
    : 0.5;
  
  return getResponder().generate(inputWords, avgError);
}

export function analyzeSentiment(text: string): { score: number; label: string } {
  // Sentiment emerges from inversion history - no hardcoded thresholds
  const tokens = text.toLowerCase().split(/\s+/).filter(t => t.length > 0);
  const state = getVocabulary().computeState(tokens);
  
  // Score is just the mean error (lower = more "stable")
  // Label emerges from comparison to vocabulary average
  const allStates = getVocabulary().all();
  const globalMean = allStates.length > 0
    ? allStates.reduce((s, w) => {
        const avg = w.inversionResults.length > 0 
          ? w.inversionResults.reduce((a, b) => a + b, 0) / w.inversionResults.length 
          : 0;
        return s + avg;
      }, 0) / allStates.length
    : 0.5;
  
  // Label based on relative position to global mean
  let label: string;
  if (state.count === 0) {
    label = 'unknown';
  } else if (state.mean < globalMean) {
    label = 'stable';
  } else {
    label = 'unstable';
  }
  
  return { score: state.mean, label };
}

export function getVocabularyStats(): { 
  size: number; 
  totalEncounters: number;
  positiveWords: number;
  negativeWords: number;
} {
  const v = getVocabulary();
  const all = v.all();
  
  // Stats emerge from inversion history
  const globalMean = all.length > 0
    ? all.reduce((s, w) => {
        const avg = w.inversionResults.length > 0 
          ? w.inversionResults.reduce((a, b) => a + b, 0) / w.inversionResults.length 
          : 0;
        return s + avg;
      }, 0) / all.length
    : 0.5;
  
  return {
    size: all.length,
    totalEncounters: all.reduce((s, w) => s + w.totalSeen, 0),
    // "Positive" = below average error, "Negative" = above average error
    positiveWords: all.filter(w => {
      if (w.inversionResults.length === 0) return false;
      const avg = w.inversionResults.reduce((a, b) => a + b, 0) / w.inversionResults.length;
      return avg < globalMean;
    }).length,
    negativeWords: all.filter(w => {
      if (w.inversionResults.length === 0) return false;
      const avg = w.inversionResults.reduce((a, b) => a + b, 0) / w.inversionResults.length;
      return avg >= globalMean;
    }).length,
  };
}
