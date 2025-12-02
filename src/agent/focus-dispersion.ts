/**
 * Focus/Dispersion Control: Agent's ability to modulate wave concentration.
 * 
 * From the ontology:
 * - Focus = narrowing wave (sharper, less dispersion, more collapse-like)
 * - Dispersion = broadening wave (more superposed, less commitment)
 * - This is the agent's control over the first inversion before closure
 */

import { WaveState, raiseWave, focusWave, createWaveState, getAmplitudes, getProbabilities } from '../core/ontology/wave-state';
import { Complex, normalize } from '../core/math/complex';
import { FOCUS_MIN, FOCUS_MAX, DISPERSION_MIN, DISPERSION_MAX } from '../config/constants';

export interface FocusDispersionParams {
  focus: number;      // 0..1 (0 = no focus, 1 = full focus)
  dispersion: number; // 0..1 (0 = no dispersion, 1 = full spread)
}

export interface WaveLens {
  apply(wave: WaveState, params: FocusDispersionParams): WaveState;
  getFocusStrength(): number;
  getDispersionStrength(): number;
  setParams(params: FocusDispersionParams): void;
}

export interface LensEffect {
  inputEntropy: number;
  outputEntropy: number;
  focusApplied: number;
  dispersionApplied: number;
  peakAmplification: number;
}

/**
 * Create a wave lens for focus/dispersion control.
 */
export function createWaveLens(initialParams?: FocusDispersionParams): WaveLens {
  let params: FocusDispersionParams = initialParams ?? { focus: 0.5, dispersion: 0.5 };
  
  return {
    apply(wave: WaveState, overrideParams?: FocusDispersionParams): WaveState {
      const p = overrideParams ?? params;
      
      // Clamp parameters
      const focus = Math.max(FOCUS_MIN, Math.min(FOCUS_MAX, p.focus));
      const dispersion = Math.max(DISPERSION_MIN, Math.min(DISPERSION_MAX, p.dispersion));
      
      // Net effect: focus and dispersion oppose each other
      const netFocus = focus - dispersion;
      
      if (netFocus > 0) {
        // Apply focusing (sharpening)
        return focusWave(wave, netFocus);
      } else if (netFocus < 0) {
        // Apply dispersion (spreading)
        const { raised } = raiseWave(wave, -netFocus);
        return raised;
      }
      
      // Neutral: return unchanged
      return wave;
    },
    
    getFocusStrength(): number {
      return params.focus;
    },
    
    getDispersionStrength(): number {
      return params.dispersion;
    },
    
    setParams(newParams: FocusDispersionParams): void {
      params = {
        focus: Math.max(FOCUS_MIN, Math.min(FOCUS_MAX, newParams.focus)),
        dispersion: Math.max(DISPERSION_MIN, Math.min(DISPERSION_MAX, newParams.dispersion))
      };
    }
  };
}

/**
 * Calculate the effect of applying lens to a wave.
 */
export function calculateLensEffect(
  wave: WaveState,
  lens: WaveLens,
  params: FocusDispersionParams
): LensEffect {
  const probs = getProbabilities(wave);
  const inputEntropy = calculateEntropy(probs);
  
  const transformed = lens.apply(wave, params);
  const outputProbs = getProbabilities(transformed);
  const outputEntropy = calculateEntropy(outputProbs);
  
  // Peak amplification: ratio of max probability
  const inputMax = Math.max(...probs);
  const outputMax = Math.max(...outputProbs);
  
  return {
    inputEntropy,
    outputEntropy,
    focusApplied: params.focus,
    dispersionApplied: params.dispersion,
    peakAmplification: outputMax / (inputMax + 1e-10)
  };
}

/**
 * Calculate Shannon entropy of probability distribution.
 */
function calculateEntropy(probs: number[]): number {
  let entropy = 0;
  for (const p of probs) {
    if (p > 1e-10) {
      entropy -= p * Math.log2(p);
    }
  }
  return entropy;
}

/**
 * Adaptive lens that adjusts based on wave properties.
 */
export function createAdaptiveLens(
  targetEntropy: number = 2.0
): WaveLens {
  const baseLens = createWaveLens({ focus: 0.5, dispersion: 0.5 });
  
  return {
    ...baseLens,
    apply(wave: WaveState, params?: FocusDispersionParams): WaveState {
      const probs = getProbabilities(wave);
      const currentEntropy = calculateEntropy(probs);
      
      // Adjust focus/dispersion to move toward target entropy
      let adaptedParams: FocusDispersionParams;
      
      if (currentEntropy > targetEntropy) {
        // Too spread out, increase focus
        const focusBoost = (currentEntropy - targetEntropy) / currentEntropy;
        adaptedParams = {
          focus: Math.min(1, (params?.focus ?? 0.5) + focusBoost * 0.3),
          dispersion: Math.max(0, (params?.dispersion ?? 0.5) - focusBoost * 0.2)
        };
      } else {
        // Too focused, increase dispersion
        const disperseBoost = (targetEntropy - currentEntropy) / targetEntropy;
        adaptedParams = {
          focus: Math.max(0, (params?.focus ?? 0.5) - disperseBoost * 0.2),
          dispersion: Math.min(1, (params?.dispersion ?? 0.5) + disperseBoost * 0.3)
        };
      }
      
      return baseLens.apply(wave, adaptedParams);
    }
  };
}

/**
 * Apply Gaussian focusing kernel to wave amplitudes.
 */
export function applyGaussianFocus(
  wave: WaveState,
  centerIndex: number,
  sigma: number
): WaveState {
  const amps = getAmplitudes(wave);
  const n = amps.length;
  
  // Apply Gaussian weighting centered at centerIndex
  const focusedAmps: Complex[] = amps.map((a, i) => {
    const dist = Math.abs(i - centerIndex);
    const weight = Math.exp(-(dist * dist) / (2 * sigma * sigma));
    return { re: a.re * weight, im: a.im * weight };
  });
  
  return createWaveState(normalize(focusedAmps), {
    type: 'gaussian-focused',
    center: centerIndex,
    sigma
  });
}

/**
 * Apply uniform dispersion to wave.
 */
export function applyUniformDispersion(
  wave: WaveState,
  strength: number
): WaveState {
  const { raised } = raiseWave(wave, strength);
  return raised;
}

/**
 * Calculate optimal focus parameters for a given goal wave.
 */
export function calculateOptimalFocus(
  currentWave: WaveState,
  goalWave: WaveState
): FocusDispersionParams {
  const currentProbs = getProbabilities(currentWave);
  const goalProbs = getProbabilities(goalWave);
  
  const currentEntropy = calculateEntropy(currentProbs);
  const goalEntropy = calculateEntropy(goalProbs);
  
  // If goal is more focused (lower entropy), increase focus
  // If goal is more dispersed (higher entropy), increase dispersion
  const entropyDiff = goalEntropy - currentEntropy;
  
  if (entropyDiff < 0) {
    // Goal is more focused
    return {
      focus: Math.min(1, 0.5 + Math.abs(entropyDiff) * 0.2),
      dispersion: Math.max(0, 0.5 - Math.abs(entropyDiff) * 0.2)
    };
  } else {
    // Goal is more dispersed
    return {
      focus: Math.max(0, 0.5 - entropyDiff * 0.2),
      dispersion: Math.min(1, 0.5 + entropyDiff * 0.2)
    };
  }
}
