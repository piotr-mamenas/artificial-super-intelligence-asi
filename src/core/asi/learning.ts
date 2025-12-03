/**
 * LEARNING MODULE
 * 
 * Section 7: Learning and Archetypes
 * 
 * Non-LLM learning via numeric optimization of observer filters W_o.
 * No black-box sequence models - only explicit kernels, transforms, and optimization.
 */

import { AXES } from './primitive-ontology';
import { M } from './waveform';
import { ASIObject } from './objects';
import { Sentence } from './lexicon';
import { 
  ASIObserver, 
  ObserverFilter, 
  computeEpistemicTruth,
  createEmptyFilter 
} from './observers';

// ============================================
// 7.2 LABELED DATASET
// ============================================

/**
 * Labeled example for learning.
 * External labels for properties (e.g., safe vs dangerous).
 */
export interface LabeledExample {
  object: ASIObject;
  trueSentence: Sentence;   // The correct interpretation
  falseSentence: Sentence;  // The incorrect interpretation
  label: string;            // Category label (e.g., "safe", "dangerous")
}

/**
 * Learning dataset.
 */
export interface LearningDataset {
  examples: LabeledExample[];
  name: string;
}

// ============================================
// 7.2 ACCURACY COMPUTATION
// ============================================

/**
 * Compute accuracy for observer on labeled dataset.
 * 
 * Acc(o) = #{(O, S_true, S_false) ∈ D | T_o(O, S_true) > T_o(O, S_false)} / |D|
 */
export function computeAccuracy(
  observer: ASIObserver,
  dataset: LearningDataset
): number {
  if (dataset.examples.length === 0) return 0.5;
  
  let correct = 0;
  
  for (const example of dataset.examples) {
    const truthTrue = computeEpistemicTruth(observer, example.object, example.trueSentence);
    const truthFalse = computeEpistemicTruth(observer, example.object, example.falseSentence);
    
    if (truthTrue > truthFalse) {
      correct++;
    }
  }
  
  return correct / dataset.examples.length;
}

/**
 * Compute detailed accuracy metrics.
 */
export function computeDetailedAccuracy(
  observer: ASIObserver,
  dataset: LearningDataset
): {
  accuracy: number;
  truePositives: number;
  falsePositives: number;
  margin: number;
} {
  if (dataset.examples.length === 0) {
    return { accuracy: 0.5, truePositives: 0, falsePositives: 0, margin: 0 };
  }
  
  let truePositives = 0;
  let falsePositives = 0;
  let totalMargin = 0;
  
  for (const example of dataset.examples) {
    const truthTrue = computeEpistemicTruth(observer, example.object, example.trueSentence);
    const truthFalse = computeEpistemicTruth(observer, example.object, example.falseSentence);
    
    const margin = truthTrue - truthFalse;
    totalMargin += margin;
    
    if (truthTrue > truthFalse) {
      truePositives++;
    } else {
      falsePositives++;
    }
  }
  
  return {
    accuracy: truePositives / dataset.examples.length,
    truePositives,
    falsePositives,
    margin: totalMargin / dataset.examples.length
  };
}

// ============================================
// 7.3 FILTER OPTIMIZATION (Non-LLM Learning)
// ============================================

/**
 * Generate random perturbation for filter.
 */
function generatePerturbation(magnitude: number): ObserverFilter {
  const delta = createEmptyFilter();
  
  for (let i = 0; i < M; i++) {
    delta.R[i] = (Math.random() - 0.5) * 2 * magnitude;
    delta.G[i] = (Math.random() - 0.5) * 2 * magnitude;
    delta.B[i] = (Math.random() - 0.5) * 2 * magnitude;
  }
  
  return delta;
}

/**
 * Apply perturbation to filter.
 */
function applyPerturbation(
  filter: ObserverFilter,
  delta: ObserverFilter,
  clip: boolean = true
): ObserverFilter {
  const result = createEmptyFilter();
  
  for (let i = 0; i < M; i++) {
    result.R[i] = filter.R[i] + delta.R[i];
    result.G[i] = filter.G[i] + delta.G[i];
    result.B[i] = filter.B[i] + delta.B[i];
    
    if (clip) {
      // Ensure non-negative (W_o ≥ 0)
      result.R[i] = Math.max(0, result.R[i]);
      result.G[i] = Math.max(0, result.G[i]);
      result.B[i] = Math.max(0, result.B[i]);
    }
  }
  
  return result;
}

/**
 * Copy filter.
 */
function copyFilter(filter: ObserverFilter): ObserverFilter {
  return {
    R: new Float32Array(filter.R),
    G: new Float32Array(filter.G),
    B: new Float32Array(filter.B)
  };
}

/**
 * Gradient-free optimization of observer filter.
 * 
 * Algorithm:
 * 1. Propose perturbation ΔW (random small change)
 * 2. Compute Acc(o') where W_o' = W_o + ΔW
 * 3. If Acc(o') > Acc(o), accept: W_o ← W_o'
 * 4. Else reject
 * 5. Repeat until stopping criterion
 */
export function optimizeFilterGradientFree(
  observer: ASIObserver,
  dataset: LearningDataset,
  options: {
    maxIterations?: number;
    perturbationMagnitude?: number;
    targetAccuracy?: number;
    onProgress?: (iteration: number, accuracy: number) => void;
  } = {}
): {
  finalAccuracy: number;
  iterations: number;
  improved: boolean;
} {
  const maxIterations = options.maxIterations ?? 1000;
  const perturbationMagnitude = options.perturbationMagnitude ?? 0.1;
  const targetAccuracy = options.targetAccuracy ?? 0.95;
  
  let currentAccuracy = computeAccuracy(observer, dataset);
  const initialAccuracy = currentAccuracy;
  
  for (let i = 0; i < maxIterations; i++) {
    // Generate perturbation
    const delta = generatePerturbation(perturbationMagnitude);
    
    // Create perturbed filter
    const perturbedFilter = applyPerturbation(observer.filter, delta);
    
    // Temporarily apply and compute accuracy
    const originalFilter = copyFilter(observer.filter);
    observer.filter = perturbedFilter;
    const newAccuracy = computeAccuracy(observer, dataset);
    
    if (newAccuracy > currentAccuracy) {
      // Accept
      currentAccuracy = newAccuracy;
      observer.accuracy = newAccuracy;
      
      options.onProgress?.(i, currentAccuracy);
      
      if (currentAccuracy >= targetAccuracy) {
        return {
          finalAccuracy: currentAccuracy,
          iterations: i + 1,
          improved: currentAccuracy > initialAccuracy
        };
      }
    } else {
      // Reject - restore original
      observer.filter = originalFilter;
    }
  }
  
  return {
    finalAccuracy: currentAccuracy,
    iterations: maxIterations,
    improved: currentAccuracy > initialAccuracy
  };
}

// ============================================
// GRADIENT-BASED OPTIMIZATION (Optional)
// ============================================

/**
 * Compute numerical gradient of accuracy w.r.t. filter.
 */
function computeNumericalGradient(
  observer: ASIObserver,
  dataset: LearningDataset,
  epsilon: number = 0.001
): ObserverFilter {
  const gradient = createEmptyFilter();
  const originalFilter = copyFilter(observer.filter);
  
  for (const axis of AXES) {
    for (let i = 0; i < M; i++) {
      // Perturb positively
      observer.filter[axis][i] = originalFilter[axis][i] + epsilon;
      const accPlus = computeAccuracy(observer, dataset);
      
      // Perturb negatively
      observer.filter[axis][i] = originalFilter[axis][i] - epsilon;
      const accMinus = computeAccuracy(observer, dataset);
      
      // Restore
      observer.filter[axis][i] = originalFilter[axis][i];
      
      // Central difference gradient
      gradient[axis][i] = (accPlus - accMinus) / (2 * epsilon);
    }
  }
  
  observer.filter = originalFilter;
  return gradient;
}

/**
 * Gradient-based optimization of observer filter.
 * Uses numerical gradients (no LLMs).
 */
export function optimizeFilterGradientBased(
  observer: ASIObserver,
  dataset: LearningDataset,
  options: {
    maxIterations?: number;
    learningRate?: number;
    targetAccuracy?: number;
    onProgress?: (iteration: number, accuracy: number) => void;
  } = {}
): {
  finalAccuracy: number;
  iterations: number;
  improved: boolean;
} {
  const maxIterations = options.maxIterations ?? 500;
  const learningRate = options.learningRate ?? observer.learningRate;
  const targetAccuracy = options.targetAccuracy ?? 0.95;
  
  let currentAccuracy = computeAccuracy(observer, dataset);
  const initialAccuracy = currentAccuracy;
  
  for (let i = 0; i < maxIterations; i++) {
    // Compute gradient
    const gradient = computeNumericalGradient(observer, dataset);
    
    // Update filter: W_o ← W_o + lr * gradient (gradient ascent for accuracy)
    for (const axis of AXES) {
      for (let j = 0; j < M; j++) {
        observer.filter[axis][j] += learningRate * gradient[axis][j];
        // Clip to non-negative
        observer.filter[axis][j] = Math.max(0, observer.filter[axis][j]);
      }
    }
    
    currentAccuracy = computeAccuracy(observer, dataset);
    observer.accuracy = currentAccuracy;
    
    options.onProgress?.(i, currentAccuracy);
    
    if (currentAccuracy >= targetAccuracy) {
      return {
        finalAccuracy: currentAccuracy,
        iterations: i + 1,
        improved: currentAccuracy > initialAccuracy
      };
    }
  }
  
  return {
    finalAccuracy: currentAccuracy,
    iterations: maxIterations,
    improved: currentAccuracy > initialAccuracy
  };
}

// ============================================
// KERNEL OPTIMIZATION (Optional)
// ============================================

/**
 * Optimize word kernels based on labeled data.
 * This adjusts K_w to better align with truth labels.
 */
export function optimizeWordKernels(
  _dataset: LearningDataset,
  _wordKernels: Map<string, unknown>,
  _options: {
    maxIterations?: number;
    learningRate?: number;
  } = {}
): void {
  // TODO: Implement kernel optimization
  // This would adjust K_w values to improve accuracy
  console.log('Word kernel optimization not yet implemented');
}

// ============================================
// LEARNING SUMMARY
// ============================================

/**
 * Train observer on dataset and return summary.
 */
export function trainObserver(
  observer: ASIObserver,
  dataset: LearningDataset,
  method: 'gradient-free' | 'gradient-based' = 'gradient-free'
): {
  method: string;
  initialAccuracy: number;
  finalAccuracy: number;
  iterations: number;
  improved: boolean;
} {
  const initialAccuracy = computeAccuracy(observer, dataset);
  
  const result = method === 'gradient-free'
    ? optimizeFilterGradientFree(observer, dataset)
    : optimizeFilterGradientBased(observer, dataset);
  
  return {
    method,
    initialAccuracy,
    ...result
  };
}
