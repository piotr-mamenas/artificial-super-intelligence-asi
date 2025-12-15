/**
 * Spinor and Matrix operations for SU(2) quantum mechanics
 * Implements 2-component spinors and 2x2/4x4 matrices
 */

import {
  Complex, complex, add, sub, mul, scale, conj, abs2,
  ZERO, ONE, I, isZero
} from './complex';

// ============================================================
// Types
// ============================================================

/** 2-component spinor: [amplitude_up, amplitude_down] */
export type Spinor = [Complex, Complex];

/** 2x2 complex matrix */
export type Mat2x2 = [[Complex, Complex], [Complex, Complex]];

/** 4x4 complex matrix (for two-qubit operations) */
export type Mat4x4 = [
  [Complex, Complex, Complex, Complex],
  [Complex, Complex, Complex, Complex],
  [Complex, Complex, Complex, Complex],
  [Complex, Complex, Complex, Complex]
];

/** 4-component vector (tensor product of two spinors) */
export type Vec4 = [Complex, Complex, Complex, Complex];

// ============================================================
// Spinor Operations
// ============================================================

export function spinor(up: Complex, down: Complex): Spinor {
  return [up, down];
}

export function spinorUp(): Spinor {
  return [ONE, ZERO];
}

export function spinorDown(): Spinor {
  return [ZERO, ONE];
}

export function spinorNorm(s: Spinor): number {
  return Math.sqrt(abs2(s[0]) + abs2(s[1]));
}

export function normalizeSpinor(s: Spinor): Spinor {
  const n = spinorNorm(s);
  if (n === 0) return [ZERO, ZERO];
  return [scale(s[0], 1 / n), scale(s[1], 1 / n)];
}

export function spinorAdd(a: Spinor, b: Spinor): Spinor {
  return [add(a[0], b[0]), add(a[1], b[1])];
}

export function spinorScale(s: Spinor, c: Complex): Spinor {
  return [mul(s[0], c), mul(s[1], c)];
}

export function spinorInnerProduct(a: Spinor, b: Spinor): Complex {
  return add(mul(conj(a[0]), b[0]), mul(conj(a[1]), b[1]));
}

/** Euclidean distance between spinors */
export function spinorDistance(a: Spinor, b: Spinor): number {
  const d0 = sub(a[0], b[0]);
  const d1 = sub(a[1], b[1]);
  return Math.sqrt(abs2(d0) + abs2(d1));
}

/** Probability of measuring spin up */
export function probUp(s: Spinor): number {
  return abs2(s[0]);
}

/** Probability of measuring spin down */
export function probDown(s: Spinor): number {
  return abs2(s[1]);
}

// ============================================================
// Pauli Matrices
// ============================================================

export const PAULI_I: Mat2x2 = [
  [ONE, ZERO],
  [ZERO, ONE],
];

export const PAULI_X: Mat2x2 = [
  [ZERO, ONE],
  [ONE, ZERO],
];

export const PAULI_Y: Mat2x2 = [
  [ZERO, { re: 0, im: -1 }],
  [I, ZERO],
];

export const PAULI_Z: Mat2x2 = [
  [ONE, ZERO],
  [ZERO, { re: -1, im: 0 }],
];

// ============================================================
// 2x2 Matrix Operations
// ============================================================

export function mat2x2Identity(): Mat2x2 {
  return [[ONE, ZERO], [ZERO, ONE]];
}

export function mat2x2Zero(): Mat2x2 {
  return [[ZERO, ZERO], [ZERO, ZERO]];
}

export function mat2x2Add(a: Mat2x2, b: Mat2x2): Mat2x2 {
  return [
    [add(a[0][0], b[0][0]), add(a[0][1], b[0][1])],
    [add(a[1][0], b[1][0]), add(a[1][1], b[1][1])],
  ];
}

export function mat2x2Scale(m: Mat2x2, c: Complex): Mat2x2 {
  return [
    [mul(m[0][0], c), mul(m[0][1], c)],
    [mul(m[1][0], c), mul(m[1][1], c)],
  ];
}

export function mat2x2Mul(a: Mat2x2, b: Mat2x2): Mat2x2 {
  return [
    [
      add(mul(a[0][0], b[0][0]), mul(a[0][1], b[1][0])),
      add(mul(a[0][0], b[0][1]), mul(a[0][1], b[1][1])),
    ],
    [
      add(mul(a[1][0], b[0][0]), mul(a[1][1], b[1][0])),
      add(mul(a[1][0], b[0][1]), mul(a[1][1], b[1][1])),
    ],
  ];
}

export function mat2x2VecMul(m: Mat2x2, v: Spinor): Spinor {
  return [
    add(mul(m[0][0], v[0]), mul(m[0][1], v[1])),
    add(mul(m[1][0], v[0]), mul(m[1][1], v[1])),
  ];
}

export function mat2x2Adjoint(m: Mat2x2): Mat2x2 {
  return [
    [conj(m[0][0]), conj(m[1][0])],
    [conj(m[0][1]), conj(m[1][1])],
  ];
}

export function mat2x2Trace(m: Mat2x2): Complex {
  return add(m[0][0], m[1][1]);
}

export function mat2x2Det(m: Mat2x2): Complex {
  return sub(mul(m[0][0], m[1][1]), mul(m[0][1], m[1][0]));
}

// ============================================================
// SU(2) Rotation Matrices
// ============================================================

/** R_x(θ) = exp(-iθX/2) = cos(θ/2)I - i·sin(θ/2)X */
export function Rx(theta: number): Mat2x2 {
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  return [
    [complex(c, 0), complex(0, -s)],
    [complex(0, -s), complex(c, 0)],
  ];
}

/** R_y(θ) = exp(-iθY/2) = cos(θ/2)I - i·sin(θ/2)Y */
export function Ry(theta: number): Mat2x2 {
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  return [
    [complex(c, 0), complex(-s, 0)],
    [complex(s, 0), complex(c, 0)],
  ];
}

/** R_z(θ) = exp(-iθZ/2) = cos(θ/2)I - i·sin(θ/2)Z */
export function Rz(theta: number): Mat2x2 {
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  return [
    [complex(c, -s), ZERO],
    [ZERO, complex(c, s)],
  ];
}

/** General rotation R_n(θ) about axis n = (nx, ny, nz) */
export function Rn(nx: number, ny: number, nz: number, theta: number): Mat2x2 {
  // Normalize axis
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (len === 0) return mat2x2Identity();
  nx /= len; ny /= len; nz /= len;

  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);

  // R = cos(θ/2)I - i·sin(θ/2)(nx·X + ny·Y + nz·Z)
  return [
    [complex(c, -s * nz), complex(-s * ny, -s * nx)],
    [complex(s * ny, -s * nx), complex(c, s * nz)],
  ];
}

// ============================================================
// Projectors
// ============================================================

/** Projector onto spin-up: |↑⟩⟨↑| */
export const PROJ_UP: Mat2x2 = [
  [ONE, ZERO],
  [ZERO, ZERO],
];

/** Projector onto spin-down: |↓⟩⟨↓| */
export const PROJ_DOWN: Mat2x2 = [
  [ZERO, ZERO],
  [ZERO, ONE],
];

/** Create projector onto arbitrary normalized spinor |ψ⟩⟨ψ| */
export function projector(s: Spinor): Mat2x2 {
  const ns = normalizeSpinor(s);
  return [
    [mul(ns[0], conj(ns[0])), mul(ns[0], conj(ns[1]))],
    [mul(ns[1], conj(ns[0])), mul(ns[1], conj(ns[1]))],
  ];
}

/** Apply projector and renormalize */
export function applyProjector(P: Mat2x2, s: Spinor): Spinor {
  const projected = mat2x2VecMul(P, s);
  if (isZero(projected[0]) && isZero(projected[1])) {
    return projected; // Zero vector - projection annihilates state
  }
  return normalizeSpinor(projected);
}

// ============================================================
// 4D Operations (Two-qubit / Tensor Product)
// ============================================================

/** Tensor product of two spinors: |a⟩ ⊗ |b⟩ */
export function tensor2(a: Spinor, b: Spinor): Vec4 {
  return [
    mul(a[0], b[0]), // |00⟩
    mul(a[0], b[1]), // |01⟩
    mul(a[1], b[0]), // |10⟩
    mul(a[1], b[1]), // |11⟩
  ];
}

/** Tensor product of two 2x2 matrices: A ⊗ B */
export function tensorMat2x2(a: Mat2x2, b: Mat2x2): Mat4x4 {
  const result: Mat4x4 = [
    [ZERO, ZERO, ZERO, ZERO],
    [ZERO, ZERO, ZERO, ZERO],
    [ZERO, ZERO, ZERO, ZERO],
    [ZERO, ZERO, ZERO, ZERO],
  ];
  
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      for (let k = 0; k < 2; k++) {
        for (let l = 0; l < 2; l++) {
          result[2 * i + k][2 * j + l] = mul(a[i][j], b[k][l]);
        }
      }
    }
  }
  return result;
}

export function mat4x4Identity(): Mat4x4 {
  return [
    [ONE, ZERO, ZERO, ZERO],
    [ZERO, ONE, ZERO, ZERO],
    [ZERO, ZERO, ONE, ZERO],
    [ZERO, ZERO, ZERO, ONE],
  ];
}

export function mat4x4VecMul(m: Mat4x4, v: Vec4): Vec4 {
  return [
    add(add(add(mul(m[0][0], v[0]), mul(m[0][1], v[1])), mul(m[0][2], v[2])), mul(m[0][3], v[3])),
    add(add(add(mul(m[1][0], v[0]), mul(m[1][1], v[1])), mul(m[1][2], v[2])), mul(m[1][3], v[3])),
    add(add(add(mul(m[2][0], v[0]), mul(m[2][1], v[1])), mul(m[2][2], v[2])), mul(m[2][3], v[3])),
    add(add(add(mul(m[3][0], v[0]), mul(m[3][1], v[1])), mul(m[3][2], v[2])), mul(m[3][3], v[3])),
  ];
}

/** Build controlled-U gate: |0⟩⟨0| ⊗ I + |1⟩⟨1| ⊗ U */
export function controlledUnitary(U: Mat2x2): Mat4x4 {
  // Control on first qubit, U acts on second
  // |0⟩⟨0| ⊗ I: top-left 2x2 block is I
  // |1⟩⟨1| ⊗ U: bottom-right 2x2 block is U
  return [
    [ONE, ZERO, ZERO, ZERO],
    [ZERO, ONE, ZERO, ZERO],
    [ZERO, ZERO, U[0][0], U[0][1]],
    [ZERO, ZERO, U[1][0], U[1][1]],
  ];
}

/** Extract reduced spinor for second system by partial trace over first */
export function partialTraceFirst(v: Vec4): Spinor {
  // Trace out first qubit, keeping second
  // ρ_B = Tr_A(|ψ⟩⟨ψ|)
  // For pure state |ψ⟩ = a|00⟩ + b|01⟩ + c|10⟩ + d|11⟩
  // Approximation: return dominant branch spinor
  const prob0 = abs2(v[0]) + abs2(v[1]); // probability first qubit is 0
  const prob1 = abs2(v[2]) + abs2(v[3]); // probability first qubit is 1
  
  if (prob0 >= prob1) {
    // First qubit more likely 0, return second qubit state conditioned on that
    const n = Math.sqrt(prob0);
    if (n === 0) return [ZERO, ZERO];
    return normalizeSpinor([scale(v[0], 1 / n), scale(v[1], 1 / n)]);
  } else {
    // First qubit more likely 1
    const n = Math.sqrt(prob1);
    if (n === 0) return [ZERO, ZERO];
    return normalizeSpinor([scale(v[2], 1 / n), scale(v[3], 1 / n)]);
  }
}

/** Extract both spinors (approximate factorization) */
export function factorizeVec4(v: Vec4): [Spinor, Spinor] {
  // Try to approximately factorize |ψ⟩ ≈ |a⟩ ⊗ |b⟩
  // This is only exact for product states
  
  // First spinor: marginal on first qubit
  const a0_sq = abs2(v[0]) + abs2(v[1]);
  const a1_sq = abs2(v[2]) + abs2(v[3]);
  const spinorA: Spinor = normalizeSpinor([
    complex(Math.sqrt(a0_sq), 0),
    complex(Math.sqrt(a1_sq), 0),
  ]);
  
  // Second spinor: partial trace
  const spinorB = partialTraceFirst(v);
  
  return [spinorA, spinorB];
}
