/**
 * Spectral decomposition and eigenvalue computations.
 * Essential for measurement outcomes and observable analysis.
 */

import { Complex, complex, magnitude, multiply, add, scale, conjugate, norm, normalize } from './complex';
import { Matrix, createMatrix, matrixVectorMultiply, adjoint, matrixMultiply, identity, outerProduct } from './linear-algebra';

export interface EigenPair {
  eigenvalue: number;  // Real for Hermitian matrices
  eigenvector: Complex[];
}

export interface SpectralDecomposition {
  eigenPairs: EigenPair[];
  isComplete: boolean;
}

/**
 * Power iteration to find dominant eigenvector of a Hermitian matrix.
 * Simple but effective for small matrices.
 */
export function powerIteration(
  m: Matrix,
  maxIterations: number = 100,
  tolerance: number = 1e-10
): EigenPair {
  if (m.rows !== m.cols) throw new Error('Matrix must be square');
  const n = m.rows;
  
  // Random initial vector
  let v: Complex[] = [];
  for (let i = 0; i < n; i++) {
    v.push(complex(Math.random() - 0.5, Math.random() - 0.5));
  }
  v = normalize(v);
  
  let eigenvalue = 0;
  
  for (let iter = 0; iter < maxIterations; iter++) {
    const vNew = matrixVectorMultiply(m, v);
    const newNorm = norm(vNew);
    
    if (newNorm < tolerance) {
      return { eigenvalue: 0, eigenvector: v };
    }
    
    const vNormalized = normalize(vNew);
    
    // Rayleigh quotient for eigenvalue estimate
    const Mv = matrixVectorMultiply(m, vNormalized);
    let numerator = complex(0);
    for (let i = 0; i < n; i++) {
      numerator = add(numerator, multiply(conjugate(vNormalized[i]), Mv[i]));
    }
    const newEigenvalue = numerator.re; // Real for Hermitian
    
    if (Math.abs(newEigenvalue - eigenvalue) < tolerance) {
      return { eigenvalue: newEigenvalue, eigenvector: vNormalized };
    }
    
    eigenvalue = newEigenvalue;
    v = vNormalized;
  }
  
  return { eigenvalue, eigenvector: v };
}

/**
 * Deflation: remove contribution of known eigenpair from matrix.
 */
export function deflate(m: Matrix, eigenPair: EigenPair): Matrix {
  const proj = outerProduct(eigenPair.eigenvector, eigenPair.eigenvector);
  const result = createMatrix(m.rows, m.cols);
  
  for (let i = 0; i < m.rows; i++) {
    for (let j = 0; j < m.cols; j++) {
      result.data[i][j] = add(
        m.data[i][j],
        scale(proj.data[i][j], -eigenPair.eigenvalue)
      );
    }
  }
  return result;
}

/**
 * Simple spectral decomposition using power iteration with deflation.
 * For production use, consider proper QR algorithm implementation.
 */
export function spectralDecomposition(
  m: Matrix,
  numEigenvalues?: number
): SpectralDecomposition {
  if (m.rows !== m.cols) throw new Error('Matrix must be square');
  
  const n = m.rows;
  const count = numEigenvalues ?? n;
  const eigenPairs: EigenPair[] = [];
  let current = m;
  
  for (let i = 0; i < count; i++) {
    const pair = powerIteration(current);
    if (magnitude(complex(pair.eigenvalue)) < 1e-10) break;
    
    eigenPairs.push(pair);
    current = deflate(current, pair);
  }
  
  return {
    eigenPairs,
    isComplete: eigenPairs.length === n
  };
}

/**
 * Reconstruct matrix from spectral decomposition: M = Σ λᵢ|vᵢ⟩⟨vᵢ|
 */
export function reconstructFromSpectral(decomp: SpectralDecomposition, n: number): Matrix {
  const result = createMatrix(n, n);
  
  for (const pair of decomp.eigenPairs) {
    const proj = outerProduct(pair.eigenvector, pair.eigenvector);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        result.data[i][j] = add(
          result.data[i][j],
          scale(proj.data[i][j], pair.eigenvalue)
        );
      }
    }
  }
  return result;
}

/**
 * Create measurement projectors from an observable's spectral decomposition.
 */
export function measurementProjectors(decomp: SpectralDecomposition): Matrix[] {
  return decomp.eigenPairs.map(pair => outerProduct(pair.eigenvector, pair.eigenvector));
}

/**
 * Expected value of observable M in state |ψ⟩: ⟨ψ|M|ψ⟩
 */
export function expectationValue(m: Matrix, state: Complex[]): number {
  const Mpsi = matrixVectorMultiply(m, state);
  let result = complex(0);
  for (let i = 0; i < state.length; i++) {
    result = add(result, multiply(conjugate(state[i]), Mpsi[i]));
  }
  return result.re; // Real for Hermitian observables
}

/**
 * Variance of observable M in state |ψ⟩: ⟨M²⟩ - ⟨M⟩²
 */
export function variance(m: Matrix, state: Complex[]): number {
  const expVal = expectationValue(m, state);
  const m2 = matrixMultiply(m, m);
  const expVal2 = expectationValue(m2, state);
  return expVal2 - expVal * expVal;
}

/**
 * Born rule probability for measuring eigenvalue λᵢ: |⟨vᵢ|ψ⟩|²
 */
export function bornProbability(eigenvector: Complex[], state: Complex[]): number {
  let amplitude = complex(0);
  for (let i = 0; i < state.length; i++) {
    amplitude = add(amplitude, multiply(conjugate(eigenvector[i]), state[i]));
  }
  return amplitude.re * amplitude.re + amplitude.im * amplitude.im;
}

/**
 * Collapse state after measurement outcome corresponding to eigenvalue.
 * Projects state onto eigenvector and normalizes.
 */
export function collapseState(state: Complex[], eigenvector: Complex[]): Complex[] {
  let amplitude = complex(0);
  for (let i = 0; i < state.length; i++) {
    amplitude = add(amplitude, multiply(conjugate(eigenvector[i]), state[i]));
  }
  
  // |ψ'⟩ = ⟨v|ψ⟩|v⟩ / |⟨v|ψ⟩|
  const mag = magnitude(amplitude);
  if (mag < 1e-10) {
    // Zero probability event - return original eigenvector
    return eigenvector;
  }
  
  return eigenvector.map(v => scale(v, magnitude(amplitude) / mag));
}

/**
 * Simulate measurement: sample outcome according to Born rule probabilities.
 */
export function simulateMeasurement(
  state: Complex[],
  decomp: SpectralDecomposition
): { outcome: number; eigenvalue: number; newState: Complex[] } {
  const probabilities = decomp.eigenPairs.map(pair => 
    bornProbability(pair.eigenvector, state)
  );
  
  // Normalize probabilities
  const total = probabilities.reduce((a, b) => a + b, 0);
  const normalized = probabilities.map(p => p / total);
  
  // Sample
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < normalized.length; i++) {
    cumulative += normalized[i];
    if (r < cumulative) {
      return {
        outcome: i,
        eigenvalue: decomp.eigenPairs[i].eigenvalue,
        newState: normalize(decomp.eigenPairs[i].eigenvector)
      };
    }
  }
  
  // Fallback to last
  const last = decomp.eigenPairs.length - 1;
  return {
    outcome: last,
    eigenvalue: decomp.eigenPairs[last].eigenvalue,
    newState: normalize(decomp.eigenPairs[last].eigenvector)
  };
}
