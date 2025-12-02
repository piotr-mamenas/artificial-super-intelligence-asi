/**
 * Linear algebra operations for Hilbert space manipulations.
 * Provides matrix operations essential for quantum transformations.
 */

import { Complex, complex, add, multiply, conjugate, scale, norm, normalize as normalizeVec } from './complex';

export interface Matrix {
  rows: number;
  cols: number;
  data: Complex[][];
}

export function createMatrix(rows: number, cols: number): Matrix {
  const data: Complex[][] = [];
  for (let i = 0; i < rows; i++) {
    data[i] = [];
    for (let j = 0; j < cols; j++) {
      data[i][j] = complex(0);
    }
  }
  return { rows, cols, data };
}

export function identity(n: number): Matrix {
  const m = createMatrix(n, n);
  for (let i = 0; i < n; i++) {
    m.data[i][i] = complex(1);
  }
  return m;
}

export function fromArray(arr: Complex[][]): Matrix {
  const rows = arr.length;
  const cols = arr[0]?.length ?? 0;
  return { rows, cols, data: arr };
}

export function matrixMultiply(a: Matrix, b: Matrix): Matrix {
  if (a.cols !== b.rows) throw new Error('Matrix dimension mismatch');
  const result = createMatrix(a.rows, b.cols);
  
  for (let i = 0; i < a.rows; i++) {
    for (let j = 0; j < b.cols; j++) {
      let sum = complex(0);
      for (let k = 0; k < a.cols; k++) {
        sum = add(sum, multiply(a.data[i][k], b.data[k][j]));
      }
      result.data[i][j] = sum;
    }
  }
  return result;
}

export function matrixVectorMultiply(m: Matrix, v: Complex[]): Complex[] {
  if (m.cols !== v.length) throw new Error('Dimension mismatch');
  const result: Complex[] = [];
  
  for (let i = 0; i < m.rows; i++) {
    let sum = complex(0);
    for (let j = 0; j < m.cols; j++) {
      sum = add(sum, multiply(m.data[i][j], v[j]));
    }
    result.push(sum);
  }
  return result;
}

export function transpose(m: Matrix): Matrix {
  const result = createMatrix(m.cols, m.rows);
  for (let i = 0; i < m.rows; i++) {
    for (let j = 0; j < m.cols; j++) {
      result.data[j][i] = m.data[i][j];
    }
  }
  return result;
}

export function adjoint(m: Matrix): Matrix {
  const result = createMatrix(m.cols, m.rows);
  for (let i = 0; i < m.rows; i++) {
    for (let j = 0; j < m.cols; j++) {
      result.data[j][i] = conjugate(m.data[i][j]);
    }
  }
  return result;
}

/**
 * Tensor product of two matrices (Kronecker product).
 * Essential for composing multi-particle systems.
 */
export function tensorProduct(a: Matrix, b: Matrix): Matrix {
  const result = createMatrix(a.rows * b.rows, a.cols * b.cols);
  
  for (let i = 0; i < a.rows; i++) {
    for (let j = 0; j < a.cols; j++) {
      for (let k = 0; k < b.rows; k++) {
        for (let l = 0; l < b.cols; l++) {
          result.data[i * b.rows + k][j * b.cols + l] = multiply(a.data[i][j], b.data[k][l]);
        }
      }
    }
  }
  return result;
}

/**
 * Outer product of two vectors: |u⟩⟨v|
 */
export function outerProduct(u: Complex[], v: Complex[]): Matrix {
  const result = createMatrix(u.length, v.length);
  for (let i = 0; i < u.length; i++) {
    for (let j = 0; j < v.length; j++) {
      result.data[i][j] = multiply(u[i], conjugate(v[j]));
    }
  }
  return result;
}

/**
 * Projection operator onto a normalized vector: |v⟩⟨v|
 */
export function projector(v: Complex[]): Matrix {
  const normalized = normalizeVec(v);
  return outerProduct(normalized, normalized);
}

/**
 * Trace of a square matrix
 */
export function trace(m: Matrix): Complex {
  if (m.rows !== m.cols) throw new Error('Matrix must be square');
  let result = complex(0);
  for (let i = 0; i < m.rows; i++) {
    result = add(result, m.data[i][i]);
  }
  return result;
}

/**
 * Frobenius norm of a matrix
 */
export function frobeniusNorm(m: Matrix): number {
  let sum = 0;
  for (let i = 0; i < m.rows; i++) {
    for (let j = 0; j < m.cols; j++) {
      const z = m.data[i][j];
      sum += z.re * z.re + z.im * z.im;
    }
  }
  return Math.sqrt(sum);
}

export function scaleMatrix(m: Matrix, s: number): Matrix {
  const result = createMatrix(m.rows, m.cols);
  for (let i = 0; i < m.rows; i++) {
    for (let j = 0; j < m.cols; j++) {
      result.data[i][j] = scale(m.data[i][j], s);
    }
  }
  return result;
}

export function addMatrices(a: Matrix, b: Matrix): Matrix {
  if (a.rows !== b.rows || a.cols !== b.cols) throw new Error('Dimension mismatch');
  const result = createMatrix(a.rows, a.cols);
  for (let i = 0; i < a.rows; i++) {
    for (let j = 0; j < a.cols; j++) {
      result.data[i][j] = add(a.data[i][j], b.data[i][j]);
    }
  }
  return result;
}

/**
 * Pauli matrices - fundamental 2x2 operators for spin/qubit systems
 */
export const PAULI = {
  I: fromArray([
    [complex(1), complex(0)],
    [complex(0), complex(1)]
  ]),
  X: fromArray([
    [complex(0), complex(1)],
    [complex(1), complex(0)]
  ]),
  Y: fromArray([
    [complex(0), complex(0, -1)],
    [complex(0, 1), complex(0)]
  ]),
  Z: fromArray([
    [complex(1), complex(0)],
    [complex(0), complex(-1)]
  ])
};

/**
 * Create rotation matrix around an axis in Bloch sphere.
 * R_n(θ) = cos(θ/2)I - i*sin(θ/2)(n·σ)
 */
export function rotationMatrix(nx: number, ny: number, nz: number, theta: number): Matrix {
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  
  return fromArray([
    [
      complex(c, -s * nz),
      complex(-s * ny, -s * nx)
    ],
    [
      complex(s * ny, -s * nx),
      complex(c, s * nz)
    ]
  ]);
}

/**
 * Check if matrix is unitary (U†U = I)
 */
export function isUnitary(m: Matrix, epsilon: number = 1e-10): boolean {
  if (m.rows !== m.cols) return false;
  const product = matrixMultiply(adjoint(m), m);
  const id = identity(m.rows);
  
  for (let i = 0; i < m.rows; i++) {
    for (let j = 0; j < m.cols; j++) {
      const diff = add(product.data[i][j], scale(id.data[i][j], -1));
      if (Math.abs(diff.re) > epsilon || Math.abs(diff.im) > epsilon) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Check if matrix is Hermitian (M† = M)
 */
export function isHermitian(m: Matrix, epsilon: number = 1e-10): boolean {
  if (m.rows !== m.cols) return false;
  
  for (let i = 0; i < m.rows; i++) {
    for (let j = 0; j < m.cols; j++) {
      const mij = m.data[i][j];
      const mji = m.data[j][i];
      if (Math.abs(mij.re - mji.re) > epsilon || Math.abs(mij.im + mji.im) > epsilon) {
        return false;
      }
    }
  }
  return true;
}
