// Cognitive: Emergent Connector System
// No hardcoded relation types - connectors are learned patterns

// ============================================================
// ConnectorSignature - Captures context of a connection
// ============================================================

/**
 * Compute a connector signature from the context of two concepts being linked.
 * This captures the "shape" of how two things are being related.
 * @param {object} context
 * @param {string} context.fromConcept
 * @param {string} context.toConcept
 * @param {string} context.sentence - Original sentence
 * @param {string[]} context.surroundingWords - Words around the connector
 * @param {object} agent - The agent (for state context)
 * @returns {number[]}
 */
export function computeConnectorSignature(context, agent) {
  const signature = [];
  
  // 1. Syntactic position features (4 values)
  const sentence = context.sentence.toLowerCase();
  const fromPos = sentence.indexOf(context.fromConcept.toLowerCase());
  const toPos = sentence.indexOf(context.toConcept.toLowerCase());
  const sentenceLen = sentence.length;
  
  signature.push(
    fromPos >= 0 ? fromPos / sentenceLen : 0.5,  // Relative position of from
    toPos >= 0 ? toPos / sentenceLen : 0.5,      // Relative position of to
    fromPos < toPos ? 1 : 0,                      // Order: from before to?
    Math.abs(toPos - fromPos) / sentenceLen       // Distance between concepts
  );
  
  // 2. Connector word features (6 values) - what words appear between/around
  const connectorWords = extractConnectorWords(sentence, context.fromConcept, context.toConcept);
  signature.push(
    connectorWords.includes('is') || connectorWords.includes('are') ? 1 : 0,
    connectorWords.includes('has') || connectorWords.includes('have') ? 1 : 0,
    connectorWords.includes('means') || connectorWords.includes('represents') ? 1 : 0,
    connectorWords.includes('causes') || connectorWords.includes('makes') ? 1 : 0,
    connectorWords.includes('like') || connectorWords.includes('similar') ? 1 : 0,
    connectorWords.includes('not') || connectorWords.includes('opposite') ? 1 : 0
  );
  
  // 3. Concept features (4 values)
  const fromLen = context.fromConcept.length;
  const toLen = context.toConcept.length;
  signature.push(
    Math.min(1, fromLen / 20),                    // Normalized from length
    Math.min(1, toLen / 20),                      // Normalized to length
    fromLen > toLen ? 1 : 0,                      // From longer than to?
    context.fromConcept[0] === context.toConcept[0] ? 1 : 0  // Same first letter?
  );
  
  // 4. Agent state context (2 values)
  if (agent) {
    const graphSize = agent.graph.getAllOccurrences().length;
    const relationCount = agent.graph.getAllRelations().length;
    signature.push(
      Math.min(1, graphSize / 100),
      Math.min(1, relationCount / 100)
    );
  } else {
    signature.push(0.5, 0.5);
  }
  
  // Total: 4 + 6 + 4 + 2 = 16 dimensions
  return signature;
}

/**
 * Extract words between two concepts in a sentence.
 */
function extractConnectorWords(sentence, from, to) {
  const lowerSentence = sentence.toLowerCase();
  const fromIdx = lowerSentence.indexOf(from.toLowerCase());
  const toIdx = lowerSentence.indexOf(to.toLowerCase());
  
  if (fromIdx < 0 || toIdx < 0) return [];
  
  const start = Math.min(fromIdx + from.length, toIdx + to.length);
  const end = Math.max(fromIdx, toIdx);
  
  if (start >= end) return [];
  
  const between = lowerSentence.slice(start, end);
  return between.split(/\s+/).filter(w => w.length > 0);
}

// ============================================================
// EmergentConnectorField - Learns connector types from usage
// ============================================================

/**
 * EmergentConnectorField: connector types are learned patterns, not hardcoded.
 */
export class EmergentConnectorField {
  constructor() {
    /** @type {Map<string, { signature: number[], count: number, examples: string[] }>} */
    this.learnedConnectors = new Map();
    
    this.similarityThreshold = 0.6;
    this.maxExamples = 5; // Store example sentences per connector type
  }

  /**
   * Learn a connector type from context.
   * @param {string} label - User-provided or inferred connector word
   * @param {number[]} signature - Context signature
   * @param {string} [example] - Example sentence
   */
  learn(label, signature, example = null) {
    const normalizedLabel = label.toLowerCase().trim();
    
    if (this.learnedConnectors.has(normalizedLabel)) {
      const existing = this.learnedConnectors.get(normalizedLabel);
      const alpha = 1 / (existing.count + 1);
      
      existing.signature = existing.signature.map((v, i) => 
        v * (1 - alpha) + signature[i] * alpha
      );
      existing.count++;
      
      if (example && existing.examples.length < this.maxExamples) {
        existing.examples.push(example);
      }
    } else {
      this.learnedConnectors.set(normalizedLabel, {
        signature: [...signature],
        count: 1,
        examples: example ? [example] : []
      });
    }
  }

  /**
   * Infer connector type from context signature.
   * Returns closest learned pattern or generates a new one.
   * @param {number[]} signature
   * @param {string} [fallbackWord] - Word to use if no match found
   * @returns {{ label: string, similarity: number, isNew: boolean }}
   */
  infer(signature, fallbackWord = null) {
    if (this.learnedConnectors.size === 0) {
      // No learned connectors yet - use fallback or generate
      const label = fallbackWord || this._generateConnectorId();
      return { label, similarity: 0, isNew: true };
    }
    
    let bestMatch = null;
    let bestSimilarity = -1;
    
    for (const [label, pattern] of this.learnedConnectors) {
      const similarity = this._cosineSimilarity(signature, pattern.signature);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = label;
      }
    }
    
    if (bestSimilarity >= this.similarityThreshold) {
      return { label: bestMatch, similarity: bestSimilarity, isNew: false };
    }
    
    // Below threshold - this is a new connector type
    const label = fallbackWord || this._generateConnectorId();
    return { label, similarity: bestSimilarity, isNew: true };
  }

  /**
   * Generate a unique connector ID for novel connection types.
   */
  _generateConnectorId() {
    return `link_${this.learnedConnectors.size + 1}`;
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
   * Get all learned connector types.
   * @returns {string[]}
   */
  getLearnedConnectors() {
    return [...this.learnedConnectors.keys()];
  }

  /**
   * Get examples for a connector type.
   * @param {string} label
   * @returns {string[]}
   */
  getExamples(label) {
    const connector = this.learnedConnectors.get(label.toLowerCase());
    return connector ? connector.examples : [];
  }

  /**
   * Forget a connector type.
   * @param {string} label
   */
  forget(label) {
    this.learnedConnectors.delete(label.toLowerCase().trim());
  }

  /**
   * Serialize to JSON.
   */
  toJSON() {
    const connectors = {};
    for (const [label, data] of this.learnedConnectors) {
      connectors[label] = {
        count: data.count,
        examples: data.examples
      };
    }
    
    return {
      learnedConnectors: this.getLearnedConnectors(),
      connectorCount: this.learnedConnectors.size,
      connectors
    };
  }
}

// ============================================================
// Helper: Extract connector word from sentence
// ============================================================

/**
 * Try to extract the connector word between two concepts.
 * @param {string} sentence
 * @param {string} from
 * @param {string} to
 * @returns {string|null}
 */
export function extractConnectorWord(sentence, from, to) {
  const lowerSentence = sentence.toLowerCase();
  const lowerFrom = from.toLowerCase();
  const lowerTo = to.toLowerCase();
  
  const fromIdx = lowerSentence.indexOf(lowerFrom);
  const toIdx = lowerSentence.indexOf(lowerTo);
  
  if (fromIdx < 0 || toIdx < 0) return null;
  
  // Get the part between the concepts
  let between;
  if (fromIdx < toIdx) {
    between = lowerSentence.slice(fromIdx + lowerFrom.length, toIdx);
  } else {
    between = lowerSentence.slice(toIdx + lowerTo.length, fromIdx);
  }
  
  // Extract meaningful connector words
  const words = between.trim().split(/\s+/).filter(w => w.length > 1);
  
  // Prefer certain connector words
  const preferredConnectors = ['is', 'are', 'has', 'have', 'means', 'causes', 
    'makes', 'creates', 'contains', 'includes', 'relates', 'connects', 'like'];
  
  for (const word of words) {
    if (preferredConnectors.includes(word)) {
      return word;
    }
  }
  
  // Return first meaningful word if any
  return words.length > 0 ? words[0] : null;
}
