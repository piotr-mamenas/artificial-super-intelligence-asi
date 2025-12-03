/**
 * WAVEFORM MODULE
 * 
 * Section 2: From Inversion History to Waveform
 * 
 * Waveforms are traces of inversion histories.
 * Computed via Discrete Fourier Transform of orientation sequences.
 */

import { OrientationState, AXES, N } from './primitive-ontology';

// ============================================
// 2.1 DISCRETE SEMANTIC FREQUENCIES
// ============================================

/**
 * Discrete set of semantic frequencies: F = {f_1, ..., f_M}
 * Lower frequencies = slower emotional rhythms
 * Higher frequencies = rapid fluctuations
 */
export const M = 16; // Number of frequency components
export const FREQUENCIES: number[] = Array.from({ length: M }, (_, i) => (i + 1) / M);

// ============================================
// COMPLEX NUMBER REPRESENTATION
// ============================================

export interface Complex {
  re: number;
  im: number;
}

export function complexAdd(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im };
}

export function complexMul(a: Complex, b: Complex): Complex {
  return {
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re
  };
}

export function complexMag(c: Complex): number {
  return Math.sqrt(c.re * c.re + c.im * c.im);
}

export function complexMagSquared(c: Complex): number {
  return c.re * c.re + c.im * c.im;
}

export function complexExp(theta: number): Complex {
  return { re: Math.cos(theta), im: Math.sin(theta) };
}

export function complexScale(c: Complex, s: number): Complex {
  return { re: c.re * s, im: c.im * s };
}

// ============================================
// 2.1 FOURIER-LIKE TRANSFORM
// ============================================

/**
 * Compute complex amplitude for axis c at frequency f_j:
 * 
 * a_c(f_j) = Σ_{n=0}^{N-1} σ_c(n) · e^{-i·2π·f_j·n/N}
 * 
 * The axis waveform is: Ψ_c(f_j) := a_c(f_j)
 */
export function computeAxisWaveform(
  trace: Int8Array | number[],
  frequency: number
): Complex {
  let result: Complex = { re: 0, im: 0 };
  
  for (let n = 0; n < N; n++) {
    const sigma = trace[n];
    if (sigma === 0) continue;
    
    const theta = -2 * Math.PI * frequency * n / N;
    const exp = complexExp(theta);
    const term = complexScale(exp, sigma);
    result = complexAdd(result, term);
  }
  
  return result;
}

/**
 * Axis Waveform: Ψ_c(f) for all frequencies
 */
export interface AxisWaveform {
  amplitudes: Complex[]; // One per frequency in F
}

export function computeFullAxisWaveform(trace: Int8Array | number[]): AxisWaveform {
  return {
    amplitudes: FREQUENCIES.map(f => computeAxisWaveform(trace, f))
  };
}

// ============================================
// 2.2 THREE-CHANNEL WAVEFORM
// ============================================

/**
 * 3-channel waveform: Ψ(f_j) = (Ψ_R(f_j), Ψ_G(f_j), Ψ_B(f_j))
 */
export interface ThreeChannelWaveform {
  R: AxisWaveform;
  G: AxisWaveform;
  B: AxisWaveform;
}

export function computeThreeChannelWaveform(state: OrientationState): ThreeChannelWaveform {
  return {
    R: computeFullAxisWaveform(state.R),
    G: computeFullAxisWaveform(state.G),
    B: computeFullAxisWaveform(state.B)
  };
}

/**
 * Get waveform amplitude at specific frequency for all axes.
 */
export function getWaveformAtFrequency(
  waveform: ThreeChannelWaveform,
  freqIndex: number
): [Complex, Complex, Complex] {
  return [
    waveform.R.amplitudes[freqIndex],
    waveform.G.amplitudes[freqIndex],
    waveform.B.amplitudes[freqIndex]
  ];
}

/**
 * Compute total energy of waveform (sum of |Ψ_c(f)|² over all c, f)
 */
export function computeWaveformEnergy(waveform: ThreeChannelWaveform): number {
  let energy = 0;
  
  for (const axis of AXES) {
    for (const amp of waveform[axis].amplitudes) {
      energy += complexMagSquared(amp);
    }
  }
  
  return energy;
}

/**
 * Find dominant frequency (highest energy) for an axis
 */
export function findDominantFrequency(axisWaveform: AxisWaveform): {
  frequency: number;
  amplitude: Complex;
  index: number;
} {
  let maxEnergy = 0;
  let maxIndex = 0;
  
  for (let i = 0; i < axisWaveform.amplitudes.length; i++) {
    const energy = complexMagSquared(axisWaveform.amplitudes[i]);
    if (energy > maxEnergy) {
      maxEnergy = energy;
      maxIndex = i;
    }
  }
  
  return {
    frequency: FREQUENCIES[maxIndex],
    amplitude: axisWaveform.amplitudes[maxIndex],
    index: maxIndex
  };
}

// ============================================
// WAVEFORM SIMILARITY (for consensus)
// ============================================

/**
 * Compute similarity between two waveforms.
 * Uses normalized dot product of amplitudes.
 */
export function computeWaveformSimilarity(
  w1: ThreeChannelWaveform,
  w2: ThreeChannelWaveform
): number {
  let dot = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (const axis of AXES) {
    for (let i = 0; i < M; i++) {
      const a1 = w1[axis].amplitudes[i];
      const a2 = w2[axis].amplitudes[i];
      
      // Real part correlation
      dot += a1.re * a2.re + a1.im * a2.im;
      norm1 += complexMagSquared(a1);
      norm2 += complexMagSquared(a2);
    }
  }
  
  const denom = Math.sqrt(norm1 * norm2);
  if (denom === 0) return 0;
  
  return dot / denom;
}

/**
 * Convert waveform to RGB color (for visualization).
 * Maps dominant amplitudes to color channels.
 */
export function waveformToColor(waveform: ThreeChannelWaveform): [number, number, number] {
  const rDom = findDominantFrequency(waveform.R);
  const gDom = findDominantFrequency(waveform.G);
  const bDom = findDominantFrequency(waveform.B);
  
  // Map amplitude magnitude to [0, 1]
  const maxMag = Math.max(
    complexMag(rDom.amplitude),
    complexMag(gDom.amplitude),
    complexMag(bDom.amplitude),
    1
  );
  
  return [
    complexMag(rDom.amplitude) / maxMag,
    complexMag(gDom.amplitude) / maxMag,
    complexMag(bDom.amplitude) / maxMag
  ];
}
