/**
 * Wave Autoencoder: Learns compressed representations of wave states.
 * 
 * From the ontology:
 * - Learns persistent waveform patterns
 * - Encodes waves into latent space for comparison
 * - Enables detection of non-invertible regions (black holes)
 */

import { v4 as uuidv4 } from 'uuid';
import { WaveState, getAmplitudes, createWaveState } from '../core/ontology/wave-state';
import { Complex, complex, normalize, magnitude } from '../core/math/complex';
import { AUTOENCODER_LATENT_DIM, LEARNING_RATE, WAVE_DIMENSION } from '../config/constants';

export interface LatentWave {
  id: string;
  vector: Float32Array;
  createdAt: number;
  sourceWaveId?: string;
  metadata?: Record<string, unknown>;
}

export interface WaveAutoencoder {
  encode(wave: WaveState): Promise<LatentWave>;
  decode(latent: LatentWave): Promise<WaveState>;
  train(waves: WaveState[]): Promise<TrainingResult>;
  getReconstructionError(wave: WaveState): Promise<number>;
  getLatentDimension(): number;
}

export interface TrainingResult {
  epochsRun: number;
  finalLoss: number;
  lossHistory: number[];
}

export interface AutoencoderWeights {
  encoderWeights: Float32Array;   // [inputDim * latentDim]
  encoderBias: Float32Array;      // [latentDim]
  decoderWeights: Float32Array;   // [latentDim * outputDim]
  decoderBias: Float32Array;      // [outputDim]
}

/**
 * Create a simple linear autoencoder for wave states.
 */
export function createWaveAutoencoder(
  inputDim: number = WAVE_DIMENSION,
  latentDim: number = AUTOENCODER_LATENT_DIM
): WaveAutoencoder {
  // Initialize weights with small random values
  const weights = initializeWeights(inputDim * 2, latentDim); // *2 for complex (re,im)
  
  return {
    async encode(wave: WaveState): Promise<LatentWave> {
      const amps = getAmplitudes(wave);
      const input = ampsToVector(amps);
      const latentVector = encodeVector(input, weights);
      
      return {
        id: uuidv4(),
        vector: latentVector,
        createdAt: Date.now(),
        sourceWaveId: wave.id
      };
    },
    
    async decode(latent: LatentWave): Promise<WaveState> {
      const outputVector = decodeVector(latent.vector, weights);
      const amps = vectorToAmps(outputVector);
      return createWaveState(normalize(amps), {
        type: 'decoded',
        sourceLatentId: latent.id
      });
    },
    
    async train(waves: WaveState[]): Promise<TrainingResult> {
      const epochs = 100;
      const lossHistory: number[] = [];
      
      for (let epoch = 0; epoch < epochs; epoch++) {
        let totalLoss = 0;
        
        for (const wave of waves) {
          const amps = getAmplitudes(wave);
          const input = ampsToVector(amps);
          
          // Forward pass
          const latent = encodeVector(input, weights);
          const output = decodeVector(latent, weights);
          
          // Calculate loss (MSE)
          const loss = calculateMSE(input, output);
          totalLoss += loss;
          
          // Backward pass (simplified gradient descent)
          updateWeights(input, latent, output, weights, LEARNING_RATE);
        }
        
        lossHistory.push(totalLoss / waves.length);
      }
      
      return {
        epochsRun: epochs,
        finalLoss: lossHistory[lossHistory.length - 1],
        lossHistory
      };
    },
    
    async getReconstructionError(wave: WaveState): Promise<number> {
      const latent = await this.encode(wave);
      const reconstructed = await this.decode(latent);
      
      const originalAmps = getAmplitudes(wave);
      const reconstructedAmps = getAmplitudes(reconstructed);
      
      return calculateAmplitudeError(originalAmps, reconstructedAmps);
    },
    
    getLatentDimension(): number {
      return latentDim;
    }
  };
}

/**
 * Initialize autoencoder weights.
 */
function initializeWeights(inputDim: number, latentDim: number): AutoencoderWeights {
  const scale = Math.sqrt(2 / (inputDim + latentDim));
  
  return {
    encoderWeights: new Float32Array(inputDim * latentDim).map(() => (Math.random() - 0.5) * scale),
    encoderBias: new Float32Array(latentDim).fill(0),
    decoderWeights: new Float32Array(latentDim * inputDim).map(() => (Math.random() - 0.5) * scale),
    decoderBias: new Float32Array(inputDim).fill(0)
  };
}

/**
 * Convert complex amplitudes to flat vector.
 */
function ampsToVector(amps: Complex[]): Float32Array {
  const vector = new Float32Array(amps.length * 2);
  for (let i = 0; i < amps.length; i++) {
    vector[i * 2] = amps[i].re;
    vector[i * 2 + 1] = amps[i].im;
  }
  return vector;
}

/**
 * Convert flat vector back to complex amplitudes.
 */
function vectorToAmps(vector: Float32Array): Complex[] {
  const amps: Complex[] = [];
  for (let i = 0; i < vector.length; i += 2) {
    amps.push(complex(vector[i], vector[i + 1]));
  }
  return amps;
}

/**
 * Encode input vector to latent space.
 */
function encodeVector(input: Float32Array, weights: AutoencoderWeights): Float32Array {
  const latentDim = weights.encoderBias.length;
  const inputDim = input.length;
  const latent = new Float32Array(latentDim);
  
  for (let j = 0; j < latentDim; j++) {
    let sum = weights.encoderBias[j];
    for (let i = 0; i < inputDim; i++) {
      sum += input[i] * weights.encoderWeights[i * latentDim + j];
    }
    latent[j] = Math.tanh(sum); // Activation
  }
  
  return latent;
}

/**
 * Decode latent vector to output space.
 */
function decodeVector(latent: Float32Array, weights: AutoencoderWeights): Float32Array {
  const latentDim = latent.length;
  const outputDim = weights.decoderBias.length;
  const output = new Float32Array(outputDim);
  
  for (let i = 0; i < outputDim; i++) {
    let sum = weights.decoderBias[i];
    for (let j = 0; j < latentDim; j++) {
      sum += latent[j] * weights.decoderWeights[j * outputDim + i];
    }
    output[i] = sum; // Linear output
  }
  
  return output;
}

/**
 * Calculate mean squared error.
 */
function calculateMSE(input: Float32Array, output: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < input.length; i++) {
    const diff = input[i] - output[i];
    sum += diff * diff;
  }
  return sum / input.length;
}

/**
 * Update weights using gradient descent.
 */
function updateWeights(
  input: Float32Array,
  latent: Float32Array,
  output: Float32Array,
  weights: AutoencoderWeights,
  lr: number
): void {
  const outputDim = output.length;
  const latentDim = latent.length;
  
  // Calculate output error
  const outputError = new Float32Array(outputDim);
  for (let i = 0; i < outputDim; i++) {
    outputError[i] = input[i] - output[i];
  }
  
  // Update decoder weights and bias
  for (let j = 0; j < latentDim; j++) {
    for (let i = 0; i < outputDim; i++) {
      weights.decoderWeights[j * outputDim + i] += lr * outputError[i] * latent[j];
    }
  }
  for (let i = 0; i < outputDim; i++) {
    weights.decoderBias[i] += lr * outputError[i];
  }
  
  // Calculate latent error (backprop through decoder)
  const latentError = new Float32Array(latentDim);
  for (let j = 0; j < latentDim; j++) {
    let sum = 0;
    for (let i = 0; i < outputDim; i++) {
      sum += outputError[i] * weights.decoderWeights[j * outputDim + i];
    }
    // Derivative of tanh
    latentError[j] = sum * (1 - latent[j] * latent[j]);
  }
  
  // Update encoder weights and bias
  const inputDim = input.length;
  for (let i = 0; i < inputDim; i++) {
    for (let j = 0; j < latentDim; j++) {
      weights.encoderWeights[i * latentDim + j] += lr * latentError[j] * input[i];
    }
  }
  for (let j = 0; j < latentDim; j++) {
    weights.encoderBias[j] += lr * latentError[j];
  }
}

/**
 * Calculate amplitude error between two sets of complex amplitudes.
 */
function calculateAmplitudeError(a: Complex[], b: Complex[]): number {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  
  for (let i = 0; i < len; i++) {
    const diffRe = a[i].re - b[i].re;
    const diffIm = a[i].im - b[i].im;
    sum += diffRe * diffRe + diffIm * diffIm;
  }
  
  return Math.sqrt(sum / len);
}

/**
 * Calculate distance between two latent vectors.
 */
export function latentDistance(a: LatentWave, b: LatentWave): number {
  if (a.vector.length !== b.vector.length) {
    throw new Error('Latent dimensions must match');
  }
  
  let sum = 0;
  for (let i = 0; i < a.vector.length; i++) {
    const diff = a.vector[i] - b.vector[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Calculate cosine similarity between latent vectors.
 */
export function latentSimilarity(a: LatentWave, b: LatentWave): number {
  if (a.vector.length !== b.vector.length) {
    throw new Error('Latent dimensions must match');
  }
  
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.vector.length; i++) {
    dot += a.vector[i] * b.vector[i];
    normA += a.vector[i] * a.vector[i];
    normB += b.vector[i] * b.vector[i];
  }
  
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}
