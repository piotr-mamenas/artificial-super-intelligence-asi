/**
 * Complex number arithmetic for wave amplitudes.
 * Complex numbers are fundamental to quantum mechanics and wave descriptions.
 */

export interface Complex {
  re: number;
  im: number;
}

export function complex(re: number, im: number = 0): Complex {
  return { re, im };
}

export function add(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im };
}

export function subtract(a: Complex, b: Complex): Complex {
  return { re: a.re - b.re, im: a.im - b.im };
}

export function multiply(a: Complex, b: Complex): Complex {
  return {
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re
  };
}

export function divide(a: Complex, b: Complex): Complex {
  const denom = b.re * b.re + b.im * b.im;
  if (denom === 0) throw new Error('Division by zero');
  return {
    re: (a.re * b.re + a.im * b.im) / denom,
    im: (a.im * b.re - a.re * b.im) / denom
  };
}

export function conjugate(z: Complex): Complex {
  return { re: z.re, im: -z.im };
}

export function magnitude(z: Complex): number {
  return Math.sqrt(z.re * z.re + z.im * z.im);
}

export function magnitudeSquared(z: Complex): number {
  return z.re * z.re + z.im * z.im;
}

export function phase(z: Complex): number {
  return Math.atan2(z.im, z.re);
}

export function fromPolar(r: number, theta: number): Complex {
  return { re: r * Math.cos(theta), im: r * Math.sin(theta) };
}

export function scale(z: Complex, s: number): Complex {
  return { re: z.re * s, im: z.im * s };
}

export function negate(z: Complex): Complex {
  return { re: -z.re, im: -z.im };
}

/**
 * Inversion operation: z → 1/z
 * Fundamental to the double-inversion ontology.
 */
export function invert(z: Complex): Complex {
  return divide(complex(1), z);
}

/**
 * Double inversion: z → 1/(1/z) = z
 * Demonstrates the (−)(−) = (+) identity principle.
 */
export function doubleInvert(z: Complex): Complex {
  return invert(invert(z));
}

export function exp(z: Complex): Complex {
  const expRe = Math.exp(z.re);
  return {
    re: expRe * Math.cos(z.im),
    im: expRe * Math.sin(z.im)
  };
}

export function log(z: Complex): Complex {
  return {
    re: Math.log(magnitude(z)),
    im: phase(z)
  };
}

export function sqrt(z: Complex): Complex {
  const r = magnitude(z);
  const theta = phase(z);
  return fromPolar(Math.sqrt(r), theta / 2);
}

export function equals(a: Complex, b: Complex, epsilon: number = 1e-10): boolean {
  return Math.abs(a.re - b.re) < epsilon && Math.abs(a.im - b.im) < epsilon;
}

/**
 * Pack complex array into Float32Array [re0, im0, re1, im1, ...]
 */
export function packComplexArray(arr: Complex[]): Float32Array {
  const result = new Float32Array(arr.length * 2);
  for (let i = 0; i < arr.length; i++) {
    result[i * 2] = arr[i].re;
    result[i * 2 + 1] = arr[i].im;
  }
  return result;
}

/**
 * Unpack Float32Array [re0, im0, re1, im1, ...] into complex array
 */
export function unpackComplexArray(arr: Float32Array): Complex[] {
  const result: Complex[] = [];
  for (let i = 0; i < arr.length; i += 2) {
    result.push({ re: arr[i], im: arr[i + 1] });
  }
  return result;
}

/**
 * Inner product of two complex vectors (conjugate-linear in first argument)
 */
export function innerProduct(a: Complex[], b: Complex[]): Complex {
  if (a.length !== b.length) throw new Error('Vector length mismatch');
  let result = complex(0);
  for (let i = 0; i < a.length; i++) {
    result = add(result, multiply(conjugate(a[i]), b[i]));
  }
  return result;
}

/**
 * Norm of a complex vector
 */
export function norm(v: Complex[]): number {
  return Math.sqrt(innerProduct(v, v).re);
}

/**
 * Normalize a complex vector
 */
export function normalize(v: Complex[]): Complex[] {
  const n = norm(v);
  if (n === 0) return v.map(() => complex(0));
  return v.map(z => scale(z, 1 / n));
}
