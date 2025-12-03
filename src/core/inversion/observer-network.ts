/**
 * Observer Network - Multiple observers whose consensus drives manifestation
 * 
 * KEY INSIGHT: Reality manifests when observers AGREE.
 * 
 * Each observer has their own wave field and attempts inversions.
 * Observers exchange waves with each other.
 * When wave patterns RESONATE (agree), manifestation strengthens.
 * Repeating consensual patterns become "solid" perceived reality.
 * 
 * 4 Observers in a network:
 * 
 *    Observer A ←──wave──→ Observer B
 *        ↑                      ↑
 *        │                      │
 *      wave                   wave
 *        │                      │
 *        ↓                      ↓
 *    Observer D ←──wave──→ Observer C
 * 
 * Consensus = resonance of wave patterns
 * High consensus → strong manifestation (solid reality)
 * Low consensus → weak manifestation (uncertain)
 * No consensus → void (doesn't exist in shared reality)
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  Invertible, 
  Hadron,
  createRandomInvertible 
} from './inversion-engine';

// ============================================
// OBSERVER: An entity with its own wave field
// ============================================

export interface Observer {
  id: string;
  name: string;
  
  // Observer's local wave field
  waveField: Float32Array;
  fieldSize: number;
  
  // Observer's local hadrons (what this observer has successfully inverted)
  localHadrons: Hadron[];
  
  // Wave trace history
  trace: number[];
  
  // Connections to other observers
  connections: string[]; // IDs of connected observers
  
  // Incoming waves from other observers
  incomingWaves: Map<string, Float32Array>;
}

// ============================================
// CONSENSUS: Agreement between observers
// ============================================

export interface ConsensusResult {
  elementId: string;
  observers: string[];          // Who participated
  agreementLevel: number;       // 0-1, how much they agree
  consensusSignature: Float32Array; // The agreed-upon pattern
  isManifested: boolean;        // Did it reach manifestation threshold?
}

// ============================================
// MANIFESTATION: Reality that emerges from consensus
// ============================================

export interface Manifestation {
  id: string;
  position: [number, number, number];
  
  // Consensus data
  consensusLevel: number;       // How strong is the agreement (0-1)
  participatingObservers: string[];
  
  // The manifested content
  element: Invertible;
  sharedSignature: Float32Array;
  
  // Stability (increases with repeated consensus)
  stability: number;
  repeatCount: number;
  
  // Visual properties
  color: [number, number, number];
  radius: number;
  opacity: number;  // Based on consensus level
}

// ============================================
// OBSERVER NETWORK
// ============================================

export interface ObserverNetwork {
  observers: Map<string, Observer>;
  manifestations: Manifestation[];
  
  // Create observers
  createObserver(name: string): Observer;
  connectObservers(id1: string, id2: string): void;
  
  // Wave exchange
  exchangeWaves(): void;
  sendWave(fromId: string, toId: string, wave: Float32Array): void;
  
  // Inversion with consensus
  proposeInversion(observerId: string, element: Invertible): void;
  computeConsensus(element: Invertible): ConsensusResult;
  
  // Manifestation
  updateManifestations(): void;
  getManifestations(): Manifestation[];
  
  // Tick
  tick(dt: number): void;
}

/**
 * Create an observer network with N observers in a ring/mesh topology.
 */
export function createObserverNetwork(observerCount: number = 4): ObserverNetwork {
  const observers = new Map<string, Observer>();
  const manifestations: Manifestation[] = [];
  const pendingProposals: Map<string, { element: Invertible; proposer: string }> = new Map();
  
  const FIELD_SIZE = 16; // Smaller field per observer
  const CONSENSUS_THRESHOLD = 0.6; // Agreement level needed for manifestation
  
  /**
   * Create a new observer with its own wave field.
   */
  function createObserver(name: string): Observer {
    const id = uuidv4();
    const waveField = new Float32Array(FIELD_SIZE * FIELD_SIZE * FIELD_SIZE);
    
    // Initialize with small random fluctuations
    for (let i = 0; i < waveField.length; i++) {
      waveField[i] = (Math.random() - 0.5) * 0.1;
    }
    
    const observer: Observer = {
      id,
      name,
      waveField,
      fieldSize: FIELD_SIZE,
      localHadrons: [],
      trace: [],
      connections: [],
      incomingWaves: new Map()
    };
    
    observers.set(id, observer);
    return observer;
  }
  
  /**
   * Connect two observers so they can exchange waves.
   */
  function connectObservers(id1: string, id2: string): void {
    const o1 = observers.get(id1);
    const o2 = observers.get(id2);
    
    if (o1 && o2) {
      if (!o1.connections.includes(id2)) o1.connections.push(id2);
      if (!o2.connections.includes(id1)) o2.connections.push(id1);
    }
  }
  
  /**
   * Exchange waves between all connected observers.
   * This is how they communicate and build consensus.
   */
  function exchangeWaves(): void {
    // Each observer sends their current wave state to connected observers
    for (const [observerId, observer] of observers) {
      for (const connectedId of observer.connections) {
        // Extract a signature from the wave field to send
        const signature = extractWaveSignature(observer.waveField);
        sendWave(observerId, connectedId, signature);
      }
    }
    
    // Each observer integrates incoming waves
    for (const [_id, observer] of observers) {
      integrateIncomingWaves(observer);
    }
  }
  
  /**
   * Send a wave from one observer to another.
   */
  function sendWave(fromId: string, toId: string, wave: Float32Array): void {
    const receiver = observers.get(toId);
    if (receiver) {
      receiver.incomingWaves.set(fromId, wave);
    }
  }
  
  /**
   * Extract a compact wave signature from the full field.
   */
  function extractWaveSignature(field: Float32Array): Float32Array {
    const signatureSize = 16;
    const signature = new Float32Array(signatureSize);
    const step = Math.floor(field.length / signatureSize);
    
    for (let i = 0; i < signatureSize; i++) {
      // Sample the field at regular intervals
      signature[i] = field[i * step] || 0;
    }
    
    return signature;
  }
  
  /**
   * Integrate incoming waves into observer's field.
   * Waves from other observers influence local perception.
   */
  function integrateIncomingWaves(observer: Observer): void {
    if (observer.incomingWaves.size === 0) return;
    
    // Average incoming waves
    const combined = new Float32Array(16);
    let count = 0;
    
    for (const wave of observer.incomingWaves.values()) {
      for (let i = 0; i < Math.min(combined.length, wave.length); i++) {
        combined[i] += wave[i];
      }
      count++;
    }
    
    if (count > 0) {
      for (let i = 0; i < combined.length; i++) {
        combined[i] /= count;
      }
    }
    
    // Influence local wave field with combined incoming waves
    const step = Math.floor(observer.waveField.length / combined.length);
    for (let i = 0; i < combined.length; i++) {
      const idx = i * step;
      if (idx < observer.waveField.length) {
        // Blend: 70% local, 30% incoming
        observer.waveField[idx] = observer.waveField[idx] * 0.7 + combined[i] * 0.3;
      }
    }
    
    // Record in trace
    const avgAmplitude = combined.reduce((a, b) => a + b, 0) / combined.length;
    observer.trace.push(avgAmplitude);
    if (observer.trace.length > 500) observer.trace.shift();
    
    // Clear incoming for next round
    observer.incomingWaves.clear();
  }
  
  /**
   * An observer proposes an inversion.
   * Other observers will evaluate and potentially agree.
   */
  function proposeInversion(observerId: string, element: Invertible): void {
    pendingProposals.set(element.id, { element, proposer: observerId });
  }
  
  /**
   * Compute consensus for an element across all observers.
   * How much do observers AGREE on this inversion?
   */
  function computeConsensus(element: Invertible): ConsensusResult {
    const signatures: Float32Array[] = [];
    const participatingObservers: string[] = [];
    
    // Get each observer's "opinion" (wave signature for this element)
    for (const [observerId, observer] of observers) {
      const signature = computeObserverSignature(observer, element);
      signatures.push(signature);
      participatingObservers.push(observerId);
    }
    
    // Compute agreement: how similar are all signatures?
    let totalAgreement = 0;
    let pairCount = 0;
    
    for (let i = 0; i < signatures.length; i++) {
      for (let j = i + 1; j < signatures.length; j++) {
        totalAgreement += computeSignatureSimilarity(signatures[i], signatures[j]);
        pairCount++;
      }
    }
    
    const agreementLevel = pairCount > 0 ? totalAgreement / pairCount : 0;
    
    // Compute consensus signature (average of all signatures)
    const consensusSignature = new Float32Array(16);
    for (const sig of signatures) {
      for (let i = 0; i < consensusSignature.length; i++) {
        consensusSignature[i] += sig[i] / signatures.length;
      }
    }
    
    return {
      elementId: element.id,
      observers: participatingObservers,
      agreementLevel,
      consensusSignature,
      isManifested: agreementLevel >= CONSENSUS_THRESHOLD
    };
  }
  
  /**
   * Compute an observer's signature for a specific element.
   */
  function computeObserverSignature(observer: Observer, element: Invertible): Float32Array {
    const signature = new Float32Array(16);
    
    // Signature is based on observer's wave field + element values
    for (let i = 0; i < 16; i++) {
      const fieldIdx = Math.floor(i * observer.waveField.length / 16);
      const elemIdx = i % element.value.length;
      
      signature[i] = observer.waveField[fieldIdx] * element.value[elemIdx];
    }
    
    // Normalize
    let norm = 0;
    for (let i = 0; i < 16; i++) norm += signature[i] * signature[i];
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let i = 0; i < 16; i++) signature[i] /= norm;
    }
    
    return signature;
  }
  
  /**
   * Compute similarity between two signatures.
   */
  function computeSignatureSimilarity(s1: Float32Array, s2: Float32Array): number {
    let dot = 0;
    const len = Math.min(s1.length, s2.length);
    
    for (let i = 0; i < len; i++) {
      dot += s1[i] * s2[i];
    }
    
    // Map from [-1, 1] to [0, 1]
    return (dot + 1) / 2;
  }
  
  /**
   * Update manifestations based on consensus.
   */
  function updateManifestations(): void {
    // Process pending proposals
    for (const [_elementId, proposal] of pendingProposals) {
      const consensus = computeConsensus(proposal.element);
      
      if (consensus.isManifested) {
        // Check if this manifestation already exists
        const existing = manifestations.find(m => 
          computeSignatureSimilarity(m.sharedSignature, consensus.consensusSignature) > 0.9
        );
        
        if (existing) {
          // Strengthen existing manifestation (repeated consensus)
          existing.stability += 0.1;
          existing.repeatCount++;
          existing.consensusLevel = (existing.consensusLevel + consensus.agreementLevel) / 2;
          existing.opacity = Math.min(1, existing.consensusLevel);
        } else {
          // Create new manifestation
          const pos: [number, number, number] = [
            (proposal.element.value[0] ?? 0) * 5,
            (proposal.element.value[1] ?? 0) * 5,
            (proposal.element.value[2] ?? 0) * 5
          ];
          
          const manifestation: Manifestation = {
            id: uuidv4(),
            position: pos,
            consensusLevel: consensus.agreementLevel,
            participatingObservers: consensus.observers,
            element: proposal.element,
            sharedSignature: consensus.consensusSignature,
            stability: 0.1,
            repeatCount: 1,
            color: [
              Math.abs(proposal.element.value[3] ?? 0.5),
              Math.abs(proposal.element.value[4] ?? 0.5),
              Math.abs(proposal.element.value[5] ?? 0.5)
            ],
            radius: 0.2 + consensus.agreementLevel * 0.3,
            opacity: consensus.agreementLevel
          };
          
          manifestations.push(manifestation);
        }
      }
    }
    
    pendingProposals.clear();
    
    // Decay unstable manifestations
    for (let i = manifestations.length - 1; i >= 0; i--) {
      manifestations[i].stability *= 0.99;
      if (manifestations[i].stability < 0.01 && manifestations[i].repeatCount < 3) {
        manifestations.splice(i, 1); // Fades from reality
      }
    }
  }
  
  /**
   * Tick the network forward.
   */
  function tick(_dt: number): void {
    // Exchange waves between observers
    exchangeWaves();
    
    // Each observer attempts random inversions
    for (const [observerId, _observer] of observers) {
      if (Math.random() < 0.3) { // 30% chance per tick
        const element = createRandomInvertible(16);
        proposeInversion(observerId, element);
      }
    }
    
    // Update manifestations based on consensus
    updateManifestations();
  }
  
  // Initialize default 4 observers in a ring
  const names = ['Alpha', 'Beta', 'Gamma', 'Delta'];
  const observerIds: string[] = [];
  
  for (let i = 0; i < observerCount; i++) {
    const obs = createObserver(names[i] || `Observer ${i}`);
    observerIds.push(obs.id);
  }
  
  // Connect in a ring + cross (full mesh for 4)
  for (let i = 0; i < observerIds.length; i++) {
    for (let j = i + 1; j < observerIds.length; j++) {
      connectObservers(observerIds[i], observerIds[j]);
    }
  }
  
  return {
    observers,
    manifestations,
    
    createObserver,
    connectObservers,
    
    exchangeWaves,
    sendWave,
    
    proposeInversion,
    computeConsensus,
    
    updateManifestations,
    getManifestations: () => manifestations,
    
    tick
  };
}
