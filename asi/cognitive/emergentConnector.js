// Cognitive: Emergent Connector System
// Connectors are spin patterns - combinations of half-spin quark states

import { CHANNELS } from '../math/channels.js';
import { 
  QuarkSpinPattern, 
  SPIN_UP, 
  SPIN_DOWN, 
  SPIN_ZERO,
  CONNECTOR_SPIN_PATTERNS 
} from '../math/quarkSpins.js';

// ============================================================
// Quark Operator Patterns for Connectors
// The connector IS the operator transformation, not a label
// ============================================================

/**
 * QUARK_CONNECTOR_PATTERNS: Each connector type is defined by its
 * operator signature - the transformation it applies.
 * 
 * These are NOT hardcoded labels - they emerge from the operator weights.
 * The names are just for human readability.
 */
export const OPERATOR_ROLES = {
  up: 'assertion',      // Affirms existence/property
  down: 'negation',     // Denies/excludes
  strange: 'context',   // Shifts interpretation frame
  charm: 'abstraction', // Generalizes/categorizes
  top: 'structure',     // Grammatical/logical constraint
  bottom: 'grounding'   // Anchors to concrete experience
};

// ============================================================
// ConnectorPattern - The operator transformation of a connector
// ============================================================

/**
 * ConnectorPattern: represents a connector as a spin pattern.
 * Connectors are combinations of half-spin quark states, not weights.
 */
export class ConnectorPattern {
  constructor() {
    // Spin pattern (6 channels, each +1/2, -1/2, or 0)
    this.spinPattern = new QuarkSpinPattern();
    
    // Direction: does this connector go from specific→general or general→specific?
    this.direction = 0; // -1 = generalizing, 0 = neutral, 1 = specifying
    
    // Symmetry: is the relation symmetric (A~B means B~A)?
    this.symmetry = 0; // 0 = asymmetric, 1 = symmetric
    
    // Examples of usage
    this.examples = [];
    this.count = 0;
    
    // Legacy: operator weights for compatibility
    this.operatorWeights = { up: 0, down: 0, strange: 0, charm: 0, top: 0, bottom: 0 };
  }

  /**
   * Update pattern from a transformation context.
   */
  updateFromContext(context) {
    this.count++;
    
    // Get the spin pattern for this transformation type
    const inferredSpins = this._inferSpinPattern(context);
    
    // Update our spin pattern (collapse towards the inferred pattern)
    if (this.count === 1) {
      // First update - just copy
      this.spinPattern = inferredSpins.clone();
    } else {
      // Subsequent updates - collapse superpositions towards new pattern
      this.spinPattern.collapseTowards(inferredSpins);
    }
    
    // Update legacy weights from spins
    this._updateWeightsFromSpins();
    
    // Update direction
    const alpha = 1 / this.count;
    this.direction = this.direction * (1 - alpha) + context.direction * alpha;
    
    // Update symmetry
    this.symmetry = this.symmetry * (1 - alpha) + context.symmetry * alpha;
    
    // Store example
    if (context.sentence && this.examples.length < 5) {
      this.examples.push(context.sentence);
    }
  }

  /**
   * Infer spin pattern from transformation context.
   */
  _inferSpinPattern(context) {
    const transformType = context.transformType || 'assertion';
    
    // Use predefined spin patterns if available
    if (CONNECTOR_SPIN_PATTERNS[transformType]) {
      return CONNECTOR_SPIN_PATTERNS[transformType].clone();
    }
    
    // Otherwise create from transformation type
    const pattern = new QuarkSpinPattern();
    
    switch (transformType) {
      case 'is-a':
      case 'subsumption':
        // Assertion (u+) + Abstraction (c+)
        pattern.setSpin('u', SPIN_UP);
        pattern.setSpin('c', SPIN_UP);
        break;
        
      case 'has-a':
      case 'possession':
        // Assertion (u+) + Grounding (b+)
        pattern.setSpin('u', SPIN_UP);
        pattern.setSpin('b', SPIN_UP);
        break;
        
      case 'means':
      case 'definition':
        // Abstraction (c+) + Context (s+)
        pattern.setSpin('c', SPIN_UP);
        pattern.setSpin('s', SPIN_UP);
        break;
        
      case 'causes':
      case 'causation':
        // Structure (t+) + Grounding (b+) + Assertion (u+)
        pattern.setSpin('u', SPIN_UP);
        pattern.setSpin('t', SPIN_UP);
        pattern.setSpin('b', SPIN_UP);
        break;
        
      case 'negation':
      case 'not':
        // Negation (d+) + Anti-assertion (u-)
        pattern.setSpin('u', SPIN_DOWN);
        pattern.setSpin('d', SPIN_UP);
        break;
        
      case 'similarity':
      case 'like':
        // Context (s+) + Abstraction (c+)
        pattern.setSpin('s', SPIN_UP);
        pattern.setSpin('c', SPIN_UP);
        break;
        
      case 'part-of':
      case 'composition':
        // Grounding (b+) + Structure (t+)
        pattern.setSpin('t', SPIN_UP);
        pattern.setSpin('b', SPIN_UP);
        break;
        
      default:
        // Default: assertion with context
        pattern.setSpin('u', SPIN_UP);
        pattern.setSpin('s', SPIN_UP);
    }
    
    return pattern;
  }

  /**
   * Update legacy weights from spin pattern.
   */
  _updateWeightsFromSpins() {
    const mapping = { u: 'up', d: 'down', s: 'strange', c: 'charm', t: 'top', b: 'bottom' };
    
    for (const [channel, opName] of Object.entries(mapping)) {
      const spin = this.spinPattern.getSpin(channel);
      // Convert spin to weight: +0.5 -> 1.0, -0.5 -> 0.0, 0 -> 0.5
      this.operatorWeights[opName] = spin + 0.5;
    }
  }

  /**
   * Get the dominant operator (what this connector primarily does).
   */
  getDominantOperator() {
    const mapping = ['u', 'd', 's', 'c', 't', 'b'];
    const names = ['up', 'down', 'strange', 'charm', 'top', 'bottom'];
    
    let maxSpin = -1;
    let dominant = 'up';
    
    for (let i = 0; i < mapping.length; i++) {
      const spin = this.spinPattern.getSpin(mapping[i]);
      if (spin > maxSpin) {
        maxSpin = spin;
        dominant = names[i];
      }
    }
    
    return dominant;
  }

  /**
   * Get the semantic role of this connector.
   */
  getSemanticRole() {
    const dominant = this.getDominantOperator();
    return OPERATOR_ROLES[dominant];
  }

  /**
   * Compute similarity to another pattern using spin alignment.
   */
  similarity(other) {
    return this.spinPattern.similarity(other.spinPattern);
  }

  /**
   * Get as operator sequence for symmetry recording.
   * Returns channels with spin-up as the active operators.
   */
  toOperatorSequence() {
    const mapping = { u: 'up', d: 'down', s: 'strange', c: 'charm', t: 'top', b: 'bottom' };
    const sequence = [];
    
    for (const [channel, opName] of Object.entries(mapping)) {
      if (this.spinPattern.spins[channel].isUp()) {
        sequence.push(opName);
      }
    }
    
    return sequence.length > 0 ? sequence : ['up'];
  }

  /**
   * Get spin pattern string for display.
   */
  getSpinString() {
    return this.spinPattern.getPatternString();
  }

  toJSON() {
    return {
      spinPattern: this.spinPattern.toJSON(),
      spinString: this.getSpinString(),
      operatorWeights: { ...this.operatorWeights },
      dominant: this.getDominantOperator(),
      role: this.getSemanticRole(),
      direction: this.direction,
      symmetry: this.symmetry,
      count: this.count,
      examples: this.examples
    };
  }
}

// ============================================================
// Infer transformation type from sentence
// ============================================================

/**
 * Infer the transformation type from a sentence.
 * Returns context for building the connector pattern.
 */
export function inferTransformationType(sentence, fromConcept, toConcept) {
  const lower = sentence.toLowerCase();
  const words = extractWordsBetween(lower, fromConcept.toLowerCase(), toConcept.toLowerCase());
  
  // Default context
  const context = {
    sentence,
    fromConcept,
    toConcept,
    transformType: 'assertion',
    direction: 0,  // -1 = generalizing, 1 = specifying
    symmetry: 0    // 0 = asymmetric, 1 = symmetric
  };
  
  // Infer transformation type from connector words
  if (words.some(w => ['is', 'are', 'be'].includes(w))) {
    if (words.some(w => ['a', 'an'].includes(w))) {
      context.transformType = 'is-a';
      context.direction = -1; // Generalizing (cat → animal)
    } else if (words.includes('not')) {
      context.transformType = 'negation';
      context.direction = 0;
    } else if (words.some(w => ['like', 'similar'].includes(w))) {
      context.transformType = 'similarity';
      context.symmetry = 1; // Symmetric
    } else {
      context.transformType = 'is-a';
      context.direction = -1;
    }
  } else if (words.some(w => ['has', 'have', 'contains', 'includes'].includes(w))) {
    context.transformType = 'has-a';
    context.direction = 1; // Specifying (cat has tail)
  } else if (words.some(w => ['means', 'represents', 'defines'].includes(w))) {
    context.transformType = 'means';
    context.direction = 0;
  } else if (words.some(w => ['causes', 'makes', 'creates', 'produces'].includes(w))) {
    context.transformType = 'causes';
    context.direction = 1;
  } else if (words.some(w => ['part', 'member', 'belongs'].includes(w))) {
    context.transformType = 'part-of';
    context.direction = 1;
  } else if (words.some(w => ['relates', 'connects', 'associated'].includes(w))) {
    context.transformType = 'assertion';
    context.symmetry = 0.5; // Partially symmetric
  }
  
  return context;
}

/**
 * Extract words between two concepts.
 */
function extractWordsBetween(sentence, from, to) {
  const fromIdx = sentence.indexOf(from);
  const toIdx = sentence.indexOf(to);
  
  if (fromIdx < 0 || toIdx < 0) return [];
  
  let between;
  if (fromIdx < toIdx) {
    between = sentence.slice(fromIdx + from.length, toIdx);
  } else {
    between = sentence.slice(toIdx + to.length, fromIdx);
  }
  
  return between.trim().split(/\s+/).filter(w => w.length > 0);
}

// ============================================================
// EmergentConnectorField - Learns connector types as operator patterns
// ============================================================

/**
 * EmergentConnectorField: connectors are operator transformation patterns.
 * Similar transformations cluster into the same connector type.
 */
export class EmergentConnectorField {
  constructor() {
    /** @type {Map<string, ConnectorPattern>} label -> pattern */
    this.learnedConnectors = new Map();
    
    this.similarityThreshold = 0.7;
  }

  /**
   * Learn a connector from a transformation context.
   * @param {string} sentence - The original sentence
   * @param {string} fromConcept
   * @param {string} toConcept
   * @returns {{ label: string, pattern: ConnectorPattern, isNew: boolean }}
   */
  learnFromSentence(sentence, fromConcept, toConcept) {
    // Infer the transformation type from the sentence
    const context = inferTransformationType(sentence, fromConcept, toConcept);
    
    // Find or create a matching connector pattern
    const result = this._findOrCreateConnector(context);
    
    // Update the pattern with this example
    result.pattern.updateFromContext(context);
    
    return result;
  }

  /**
   * Find existing connector or create new one based on transformation type.
   */
  _findOrCreateConnector(context) {
    const transformType = context.transformType;
    
    // First, check if we have a connector for this transform type
    if (this.learnedConnectors.has(transformType)) {
      return {
        label: transformType,
        pattern: this.learnedConnectors.get(transformType),
        isNew: false
      };
    }
    
    // Check if any existing connector has similar operator weights
    const tempPattern = new ConnectorPattern();
    tempPattern.updateFromContext(context);
    
    for (const [label, existingPattern] of this.learnedConnectors) {
      if (tempPattern.similarity(existingPattern) >= this.similarityThreshold) {
        return {
          label,
          pattern: existingPattern,
          isNew: false
        };
      }
    }
    
    // Create new connector
    const newPattern = new ConnectorPattern();
    this.learnedConnectors.set(transformType, newPattern);
    
    return {
      label: transformType,
      pattern: newPattern,
      isNew: true
    };
  }

  /**
   * Get connector pattern by label.
   */
  getConnector(label) {
    return this.learnedConnectors.get(label.toLowerCase());
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
    const pattern = this.learnedConnectors.get(label.toLowerCase());
    return pattern ? pattern.examples : [];
  }

  /**
   * Get the operator sequence for a connector (for symmetry recording).
   * @param {string} label
   * @returns {string[]}
   */
  getOperatorSequence(label) {
    const pattern = this.learnedConnectors.get(label.toLowerCase());
    return pattern ? pattern.toOperatorSequence() : ['up'];
  }

  /**
   * Find connectors similar to a given operator pattern.
   * @param {object} operatorWeights
   * @returns {Array<{label: string, similarity: number}>}
   */
  findSimilar(operatorWeights) {
    const results = [];
    
    const queryPattern = new ConnectorPattern();
    queryPattern.operatorWeights = { ...operatorWeights };
    
    for (const [label, pattern] of this.learnedConnectors) {
      const sim = queryPattern.similarity(pattern);
      if (sim > 0.3) {
        results.push({ label, similarity: sim, pattern: pattern.toJSON() });
      }
    }
    
    results.sort((a, b) => b.similarity - a.similarity);
    return results;
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
    for (const [label, pattern] of this.learnedConnectors) {
      connectors[label] = pattern.toJSON();
    }
    
    return {
      learnedConnectors: this.getLearnedConnectors(),
      connectorCount: this.learnedConnectors.size,
      connectors
    };
  }
}

// ============================================================
// Legacy compatibility exports
// ============================================================

/**
 * Compute connector signature (legacy - now uses operator patterns).
 * @deprecated Use learnFromSentence instead
 */
export function computeConnectorSignature(context, agent) {
  const transformContext = inferTransformationType(
    context.sentence, 
    context.fromConcept, 
    context.toConcept
  );
  
  const pattern = new ConnectorPattern();
  pattern.updateFromContext(transformContext);
  
  // Return operator weights as array for compatibility
  return Object.values(pattern.operatorWeights);
}

/**
 * Extract connector word from sentence.
 */
export function extractConnectorWord(sentence, from, to) {
  const context = inferTransformationType(sentence, from, to);
  return context.transformType;
}
