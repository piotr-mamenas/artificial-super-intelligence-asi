// Language: Symmetry Query System
// Walk back through operator inversion paths to find similarities and reproduce patterns

import { CHANNELS } from '../math/channels.js';
import { QUARK_OPERATORS } from './operatorTrace.js';

// ============================================================
// SymmetryPath - A recorded path of transformations
// ============================================================

/**
 * SymmetryPath: represents a sequence of operator transformations
 * that connects two states or concepts.
 */
export class SymmetryPath {
  constructor(startId, endId) {
    this.startId = startId;
    this.endId = endId;
    this.steps = []; // Array of { operator, params, deltaSignature }
    this.totalTransformation = null;
  }

  addStep(operator, params, deltaSignature) {
    this.steps.push({ operator, params, deltaSignature, timestamp: Date.now() });
  }

  /**
   * Get the sequence of operators as a string.
   */
  getOperatorSequence() {
    return this.steps.map(s => s.operator).join(' → ');
  }

  /**
   * Compute the inverse path (walk back).
   */
  inverse() {
    const inv = new SymmetryPath(this.endId, this.startId);
    
    // Reverse and invert each step
    for (let i = this.steps.length - 1; i >= 0; i--) {
      const step = this.steps[i];
      const inverseOp = getInverseOperator(step.operator);
      const inverseDelta = step.deltaSignature ? step.deltaSignature.map(v => -v) : null;
      inv.addStep(inverseOp, step.params, inverseDelta);
    }
    
    return inv;
  }

  /**
   * Check if this path is similar to another (same operator sequence).
   */
  isSimilarTo(other, threshold = 0.8) {
    if (this.steps.length !== other.steps.length) {
      // Allow some length difference
      const lenRatio = Math.min(this.steps.length, other.steps.length) / 
                       Math.max(this.steps.length, other.steps.length);
      if (lenRatio < threshold) return false;
    }
    
    // Compare operator sequences
    const minLen = Math.min(this.steps.length, other.steps.length);
    let matches = 0;
    
    for (let i = 0; i < minLen; i++) {
      if (this.steps[i].operator === other.steps[i].operator) {
        matches++;
      }
    }
    
    return matches / minLen >= threshold;
  }

  toJSON() {
    return {
      startId: this.startId,
      endId: this.endId,
      steps: this.steps.map(s => ({ operator: s.operator, timestamp: s.timestamp })),
      sequence: this.getOperatorSequence()
    };
  }
}

/**
 * Get the inverse of an operator (for walking back).
 */
function getInverseOperator(op) {
  const inverses = {
    'up': 'down',
    'down': 'up',
    'strange': 'strange', // Context switch is its own inverse
    'charm': 'bottom',    // Abstraction ↔ Grounding
    'bottom': 'charm',
    'top': 'top'          // Structural constraints are symmetric
  };
  return inverses[op] || op;
}

// ============================================================
// SymmetryQueryEngine - Query and search through symmetry paths
// ============================================================

/**
 * SymmetryQueryEngine: searches for patterns and paths through the
 * learned symmetry space.
 */
export class SymmetryQueryEngine {
  constructor(agent) {
    this.agent = agent;
    
    // Cache of recorded paths
    this.pathCache = new Map(); // "startId:endId" -> SymmetryPath
    
    // Index of concepts by dominant operator
    this.operatorIndex = new Map(); // operator -> Set of conceptIds
    
    // Transformation history
    this.transformationHistory = [];
    this.maxHistory = 200;
  }

  /**
   * Record a transformation between two concepts.
   */
  recordTransformation(fromConcept, toConcept, operatorTrace, signature = null) {
    const pathKey = `${fromConcept}:${toConcept}`;
    
    let path = this.pathCache.get(pathKey);
    if (!path) {
      path = new SymmetryPath(fromConcept, toConcept);
      this.pathCache.set(pathKey, path);
    }
    
    // Add steps from operator trace
    for (const op of operatorTrace) {
      path.addStep(op.type, op.params || {}, null);
    }
    
    // Update operator index
    if (operatorTrace.length > 0) {
      const dominantOp = this._getDominantOperator(operatorTrace);
      if (!this.operatorIndex.has(dominantOp)) {
        this.operatorIndex.set(dominantOp, new Set());
      }
      this.operatorIndex.get(dominantOp).add(fromConcept);
      this.operatorIndex.get(dominantOp).add(toConcept);
    }
    
    // Track in history
    this.transformationHistory.push({
      from: fromConcept,
      to: toConcept,
      operators: operatorTrace.map(o => o.type),
      timestamp: Date.now()
    });
    
    if (this.transformationHistory.length > this.maxHistory) {
      this.transformationHistory.shift();
    }
    
    return path;
  }

  _getDominantOperator(trace) {
    const counts = {};
    for (const op of trace) {
      counts[op.type] = (counts[op.type] || 0) + 1;
    }
    let max = 0, dominant = 'up';
    for (const [op, count] of Object.entries(counts)) {
      if (count > max) { max = count; dominant = op; }
    }
    return dominant;
  }

  /**
   * Find path between two concepts.
   */
  findPath(fromConcept, toConcept) {
    const directKey = `${fromConcept}:${toConcept}`;
    if (this.pathCache.has(directKey)) {
      return this.pathCache.get(directKey);
    }
    
    // Try reverse path
    const reverseKey = `${toConcept}:${fromConcept}`;
    if (this.pathCache.has(reverseKey)) {
      return this.pathCache.get(reverseKey).inverse();
    }
    
    // Try to find indirect path through intermediate concepts
    return this._findIndirectPath(fromConcept, toConcept);
  }

  /**
   * Find indirect path through intermediate concepts (BFS).
   */
  _findIndirectPath(from, to, maxDepth = 3) {
    const visited = new Set([from]);
    const queue = [{ concept: from, path: [] }];
    
    while (queue.length > 0) {
      const { concept, path } = queue.shift();
      
      if (path.length >= maxDepth) continue;
      
      // Find all paths from this concept
      for (const [key, storedPath] of this.pathCache) {
        const [start, end] = key.split(':');
        
        if (start === concept && !visited.has(end)) {
          const newPath = [...path, storedPath];
          
          if (end === to) {
            // Found path - combine all steps
            return this._combinePaths(from, to, newPath);
          }
          
          visited.add(end);
          queue.push({ concept: end, path: newPath });
        }
      }
    }
    
    return null; // No path found
  }

  /**
   * Combine multiple paths into one.
   */
  _combinePaths(from, to, paths) {
    const combined = new SymmetryPath(from, to);
    for (const p of paths) {
      for (const step of p.steps) {
        combined.addStep(step.operator, step.params, step.deltaSignature);
      }
    }
    return combined;
  }

  /**
   * Find concepts similar to a given concept by operator pattern.
   */
  findSimilarByOperator(concept, threshold = 0.6) {
    const results = [];
    
    // Get paths involving this concept
    const conceptPaths = [];
    for (const [key, path] of this.pathCache) {
      if (key.startsWith(concept + ':') || key.endsWith(':' + concept)) {
        conceptPaths.push(path);
      }
    }
    
    if (conceptPaths.length === 0) return results;
    
    // Find other concepts with similar paths
    for (const [key, otherPath] of this.pathCache) {
      const [start, end] = key.split(':');
      if (start === concept || end === concept) continue;
      
      for (const myPath of conceptPaths) {
        if (myPath.isSimilarTo(otherPath, threshold)) {
          results.push({
            concept: start === concept ? end : start,
            otherConcept: start,
            similarity: this._computePathSimilarity(myPath, otherPath),
            matchingPath: otherPath.getOperatorSequence()
          });
        }
      }
    }
    
    // Sort by similarity
    results.sort((a, b) => b.similarity - a.similarity);
    
    // Deduplicate
    const seen = new Set();
    return results.filter(r => {
      if (seen.has(r.concept)) return false;
      seen.add(r.concept);
      return true;
    });
  }

  _computePathSimilarity(p1, p2) {
    const minLen = Math.min(p1.steps.length, p2.steps.length);
    const maxLen = Math.max(p1.steps.length, p2.steps.length);
    if (maxLen === 0) return 1;
    
    let matches = 0;
    for (let i = 0; i < minLen; i++) {
      if (p1.steps[i].operator === p2.steps[i].operator) matches++;
    }
    
    return matches / maxLen;
  }

  /**
   * Walk back from a concept through its transformation history.
   * Returns the chain of transformations that led to this concept.
   */
  walkBack(concept, maxSteps = 10) {
    const chain = [];
    const visited = new Set();
    let current = concept;
    
    while (chain.length < maxSteps && !visited.has(current)) {
      visited.add(current);
      
      // Find transformations that led TO this concept
      let found = false;
      for (const [key, path] of this.pathCache) {
        const [start, end] = key.split(':');
        if (end === current && !visited.has(start)) {
          chain.unshift({
            from: start,
            to: end,
            operators: path.getOperatorSequence(),
            inverse: path.inverse().getOperatorSequence()
          });
          current = start;
          found = true;
          break;
        }
      }
      
      if (!found) break;
    }
    
    return {
      concept,
      chain,
      depth: chain.length,
      canReproduce: chain.length > 0
    };
  }

  /**
   * Try to reproduce a concept by walking its transformation path forward.
   */
  reproduce(concept, agent) {
    const walkback = this.walkBack(concept);
    
    if (!walkback.canReproduce) {
      return { success: false, reason: 'No transformation path found' };
    }
    
    const reproductionSteps = [];
    
    // Walk forward through the chain, applying operators
    for (const step of walkback.chain) {
      reproductionSteps.push({
        from: step.from,
        to: step.to,
        appliedOperators: step.operators
      });
    }
    
    return {
      success: true,
      concept,
      steps: reproductionSteps,
      totalSteps: walkback.depth
    };
  }

  /**
   * Find all concepts reachable from a starting concept.
   */
  findReachable(startConcept, maxDepth = 5) {
    const reachable = new Map(); // concept -> { depth, path }
    const queue = [{ concept: startConcept, depth: 0, path: [] }];
    
    while (queue.length > 0) {
      const { concept, depth, path } = queue.shift();
      
      if (depth > maxDepth) continue;
      if (reachable.has(concept) && reachable.get(concept).depth <= depth) continue;
      
      reachable.set(concept, { depth, path: path.join(' → ') });
      
      // Find all outgoing paths
      for (const [key, storedPath] of this.pathCache) {
        const [start, end] = key.split(':');
        if (start === concept) {
          queue.push({
            concept: end,
            depth: depth + 1,
            path: [...path, storedPath.getOperatorSequence()]
          });
        }
      }
    }
    
    return reachable;
  }

  /**
   * Query for patterns matching an operator signature.
   */
  queryByOperatorSignature(operators) {
    const results = [];
    const targetSet = new Set(operators);
    
    for (const [key, path] of this.pathCache) {
      const pathOps = new Set(path.steps.map(s => s.operator));
      
      // Check overlap
      const intersection = [...targetSet].filter(op => pathOps.has(op));
      const similarity = intersection.length / Math.max(targetSet.size, pathOps.size);
      
      if (similarity > 0.5) {
        const [start, end] = key.split(':');
        results.push({
          from: start,
          to: end,
          sequence: path.getOperatorSequence(),
          similarity
        });
      }
    }
    
    results.sort((a, b) => b.similarity - a.similarity);
    return results;
  }

  /**
   * Get statistics about the symmetry space.
   */
  getStatistics() {
    const operatorCounts = {};
    let totalSteps = 0;
    
    for (const [, path] of this.pathCache) {
      for (const step of path.steps) {
        operatorCounts[step.operator] = (operatorCounts[step.operator] || 0) + 1;
        totalSteps++;
      }
    }
    
    return {
      totalPaths: this.pathCache.size,
      totalSteps,
      operatorDistribution: operatorCounts,
      conceptsByOperator: Object.fromEntries(
        [...this.operatorIndex.entries()].map(([op, set]) => [op, set.size])
      ),
      historyLength: this.transformationHistory.length
    };
  }

  toJSON() {
    return {
      statistics: this.getStatistics(),
      paths: [...this.pathCache.entries()].slice(0, 20).map(([key, path]) => ({
        key,
        ...path.toJSON()
      }))
    };
  }
}
