/**
 * Hadronizer: Extracts stable tri-channel patterns (hadrons) from wave traces.
 * 
 * From the ontology:
 * - Hadrons are stable R/U/C wavelength patterns
 * - They represent persistent entities across multiple closure cycles
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  Hadron, 
  HadronChannel, 
  Wavelength, 
  createHadron, 
  createWavelength,
  getHadronSignature,
  signatureSimilarity,
  updateHadronStability,
  isStableHadron,
  findMatchingHadron
} from '../core/ontology/hadron';
import { WaveState, getAmplitudes } from '../core/ontology/wave-state';
import { Complex } from '../core/math/complex';

export interface WaveTraceEntry {
  id: string;
  logicalTime: number;
  rWave: WaveState;   // Reference channel wave
  uWave: WaveState;   // Update channel wave
  cWave: WaveState;   // Closure channel wave
}

export interface Hadronizer {
  updateFromTraces(traces: WaveTraceEntry[]): Promise<Hadron[]>;
  getActiveHadrons(): Hadron[];
  getStableHadrons(): Hadron[];
  findHadron(signature: { rFreq: number; uFreq: number; cFreq: number }): Hadron | null;
  decayHadrons(currentTick: number): void;
}

export interface HadronExtractionConfig {
  minStability: number;
  frequencyBins: number;
  matchThreshold: number;
  decayRate: number;
}

const DEFAULT_CONFIG: HadronExtractionConfig = {
  minStability: 0.5,
  frequencyBins: 16,
  matchThreshold: 0.75,
  decayRate: 0.02
};

/**
 * Create a hadronizer for extracting stable patterns.
 */
export function createHadronizer(config: Partial<HadronExtractionConfig> = {}): Hadronizer {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const hadrons: Hadron[] = [];
  
  return {
    async updateFromTraces(traces: WaveTraceEntry[]): Promise<Hadron[]> {
      const newOrUpdated: Hadron[] = [];
      
      for (const trace of traces) {
        // Extract wavelengths from each channel
        const rWavelength = extractWavelength(trace.rWave, 'R');
        const uWavelength = extractWavelength(trace.uWave, 'U');
        const cWavelength = extractWavelength(trace.cWave, 'C');
        
        // Create signature for matching
        const signature = {
          rFrequency: rWavelength.frequency,
          uFrequency: uWavelength.frequency,
          cFrequency: cWavelength.frequency,
          rPhase: rWavelength.phase,
          uPhase: uWavelength.phase,
          cPhase: cWavelength.phase
        };
        
        // Try to find matching existing hadron
        const existing = findMatchingHadron(signature, hadrons, cfg.matchThreshold);
        
        if (existing) {
          // Update existing hadron
          const updated = updateHadronStability(
            existing,
            { R: rWavelength, U: uWavelength, C: cWavelength },
            trace.logicalTime
          );
          
          // Replace in list
          const idx = hadrons.findIndex(h => h.id === existing.id);
          if (idx >= 0) {
            hadrons[idx] = updated;
          }
          
          updated.supportingTraceIds.push(trace.id);
          newOrUpdated.push(updated);
        } else {
          // Create new hadron
          const newHadron = createHadron(
            rWavelength,
            uWavelength,
            cWavelength,
            trace.logicalTime,
            { sourceTraceId: trace.id }
          );
          newHadron.supportingTraceIds.push(trace.id);
          hadrons.push(newHadron);
          newOrUpdated.push(newHadron);
        }
      }
      
      return newOrUpdated;
    },
    
    getActiveHadrons(): Hadron[] {
      return hadrons.filter(h => h.stabilityScore > 0.1);
    },
    
    getStableHadrons(): Hadron[] {
      return hadrons.filter(isStableHadron);
    },
    
    findHadron(signature: { rFreq: number; uFreq: number; cFreq: number }): Hadron | null {
      const fullSig = {
        rFrequency: signature.rFreq,
        uFrequency: signature.uFreq,
        cFrequency: signature.cFreq,
        rPhase: 0,
        uPhase: 0,
        cPhase: 0
      };
      return findMatchingHadron(fullSig, hadrons, cfg.matchThreshold);
    },
    
    decayHadrons(currentTick: number): void {
      for (let i = hadrons.length - 1; i >= 0; i--) {
        const h = hadrons[i];
        const timeSince = currentTick - h.lastObservedAt;
        const decayFactor = Math.exp(-cfg.decayRate * timeSince);
        
        h.stabilityScore *= decayFactor;
        
        // Remove very weak hadrons
        if (h.stabilityScore < 0.01) {
          hadrons.splice(i, 1);
        }
      }
    }
  };
}

/**
 * Extract dominant wavelength from a wave state.
 */
function extractWavelength(wave: WaveState, channel: HadronChannel): Wavelength {
  const amps = getAmplitudes(wave);
  
  // Perform simple FFT-like frequency extraction
  const { frequency, amplitude, phase } = extractDominantFrequency(amps);
  
  return createWavelength(frequency, phase, amplitude, { channelIndex: channel === 'R' ? 0 : channel === 'U' ? 1 : 2 });
}

/**
 * Extract dominant frequency from complex amplitudes using DFT.
 */
function extractDominantFrequency(amps: Complex[]): {
  frequency: number;
  amplitude: number;
  phase: number;
} {
  const n = amps.length;
  if (n === 0) {
    return { frequency: 0, amplitude: 0, phase: 0 };
  }
  
  // Simple DFT to find dominant frequency
  let maxMag = 0;
  let maxFreq = 0;
  let maxPhase = 0;
  
  for (let k = 0; k < n; k++) {
    let sumRe = 0;
    let sumIm = 0;
    
    for (let j = 0; j < n; j++) {
      const angle = -2 * Math.PI * k * j / n;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      
      sumRe += amps[j].re * cos - amps[j].im * sin;
      sumIm += amps[j].re * sin + amps[j].im * cos;
    }
    
    const mag = Math.sqrt(sumRe * sumRe + sumIm * sumIm);
    
    if (mag > maxMag && k > 0) { // Skip DC component
      maxMag = mag;
      maxFreq = k;
      maxPhase = Math.atan2(sumIm, sumRe);
    }
  }
  
  return {
    frequency: maxFreq / n,
    amplitude: maxMag / n,
    phase: maxPhase
  };
}

/**
 * Create wave trace entry from frame channels.
 */
export function createWaveTraceEntry(
  rWave: WaveState,
  uWave: WaveState,
  cWave: WaveState,
  logicalTime: number
): WaveTraceEntry {
  return {
    id: uuidv4(),
    logicalTime,
    rWave,
    uWave,
    cWave
  };
}

/**
 * Convert frame to wave trace entry.
 */
export function frameToTraceEntry(frame: {
  referenceState: WaveState;
  updateState: WaveState;
  closureState: WaveState;
  logicalTime: { tick: number };
}): WaveTraceEntry {
  return createWaveTraceEntry(
    frame.referenceState,
    frame.updateState,
    frame.closureState,
    frame.logicalTime.tick
  );
}

/**
 * Get hadron statistics.
 */
export function getHadronizerStats(hadronizer: Hadronizer): {
  totalHadrons: number;
  stableHadrons: number;
  avgStability: number;
} {
  const all = hadronizer.getActiveHadrons();
  const stable = hadronizer.getStableHadrons();
  
  const avgStability = all.length > 0
    ? all.reduce((sum, h) => sum + h.stabilityScore, 0) / all.length
    : 0;
  
  return {
    totalHadrons: all.length,
    stableHadrons: stable.length,
    avgStability
  };
}
