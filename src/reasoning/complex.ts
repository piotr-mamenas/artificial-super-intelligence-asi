/**
 * Complex number operations for quantum state manipulation
 * Foundation for all QFT computations
 */

export interface Complex {
  re: number;
  im: number;
}

// ============================================================
// Construction
// ============================================================

export function complex(re: number, im: number = 0): Complex {
  return { re, im };
}

export const ZERO: Complex = { re: 0, im: 0 };
export const ONE: Complex = { re: 1, im: 0 };
export const I: Complex = { re: 0, im: 1 };

// ============================================================
// Basic Operations
// ============================================================

export function add(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im };
}

export function sub(a: Complex, b: Complex): Complex {
  return { re: a.re - b.re, im: a.im - b.im };
}

export function mul(a: Complex, b: Complex): Complex {
  return {
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re,
  };
}

export function div(a: Complex, b: Complex): Complex {
  const denom = b.re * b.re + b.im * b.im;
  if (denom === 0) throw new Error('Division by zero');
  return {
    re: (a.re * b.re + a.im * b.im) / denom,
    im: (a.im * b.re - a.re * b.im) / denom,
  };
}

export function scale(a: Complex, s: number): Complex {
  return { re: a.re * s, im: a.im * s };
}

export function neg(a: Complex): Complex {
  return { re: -a.re, im: -a.im };
}

// ============================================================
// Unary Operations
// ============================================================

export function conj(a: Complex): Complex {
  return { re: a.re, im: -a.im };
}

export function abs(a: Complex): number {
  return Math.sqrt(a.re * a.re + a.im * a.im);
}

export function abs2(a: Complex): number {
  return a.re * a.re + a.im * a.im;
}

export function arg(a: Complex): number {
  return Math.atan2(a.im, a.re);
}

// ============================================================
// Exponential & Trigonometric
// ============================================================

/** e^(i*theta) = cos(theta) + i*sin(theta) */
export function expI(theta: number): Complex {
  return { re: Math.cos(theta), im: Math.sin(theta) };
}

/** e^z = e^(re) * (cos(im) + i*sin(im)) */
export function exp(z: Complex): Complex {
  const r = Math.exp(z.re);
  return { re: r * Math.cos(z.im), im: r * Math.sin(z.im) };
}

/** sqrt(z) - principal branch */
export function sqrt(z: Complex): Complex {
  const r = abs(z);
  const theta = arg(z);
  const sqrtR = Math.sqrt(r);
  return { re: sqrtR * Math.cos(theta / 2), im: sqrtR * Math.sin(theta / 2) };
}

// ============================================================
// Comparison
// ============================================================

export function eq(a: Complex, b: Complex, epsilon: number = 1e-10): boolean {
  return Math.abs(a.re - b.re) < epsilon && Math.abs(a.im - b.im) < epsilon;
}

export function isZero(a: Complex, epsilon: number = 1e-10): boolean {
  return abs(a) < epsilon;
}

// ============================================================
// String representation
// ============================================================

export function toString(a: Complex, precision: number = 4): string {
  const re = a.re.toFixed(precision);
  const im = a.im.toFixed(precision);
  if (Math.abs(a.im) < 1e-10) return re;
  if (Math.abs(a.re) < 1e-10) return `${im}i`;
  const sign = a.im >= 0 ? '+' : '';
  return `${re}${sign}${im}i`;
}
