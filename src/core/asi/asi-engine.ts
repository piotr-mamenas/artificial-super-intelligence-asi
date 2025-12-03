/**
 * ASI ENGINE - Complete Architecture
 * 
 * Section 8: ASI Architecture - Logical Modules
 * 
 * Core ASI loop:
 * 1. PERCEIVE: Receive/generate sentences about objects
 * 2. TRANSFORM: Compute waveforms via Fourier module
 * 3. EVALUATE: Compute T_o(O,S) for each observer
 * 4. DECIDE: Use truth values to select actions/beliefs
 * 5. LEARN: Adjust filters when feedback available
 */

import {
  OrientationState,
  createOrientationState,
  initializeFromNothingness,
  applyFlipSequence,
  FlipSequence
} from './primitive-ontology';
import { ThreeChannelWaveform } from './waveform';
import {
  ASIObject,
  createASIObject
} from './objects';
import {
  InfoHadron,
  InfoLepton,
  createInfoHadron,
  applyLeptonToHadron,
  tickLepton
} from './info-particles';
import {
  WordKernel,
  ConnectionKernel,
  Sentence,
  constructSentence,
  createStandardLexicon,
  createStandardConnections,
  createWordKernel,
  createConnectionKernel
} from './lexicon';
import {
  ASIObserver,
  createASIObserver,
  computeEpistemicTruth,
  computeObserverAgreement,
  ArchetypeType
} from './observers';
import {
  LearningDataset,
  LabeledExample,
  trainObserver
} from './learning';
import { findDominantFrequency } from './waveform';

// ============================================
// 8.1 CORE MODULES
// ============================================

/**
 * ASI Engine State
 */
export interface ASIEngineState {
  // Fundamental: The spinning nothingness base
  baseState: OrientationState;
  
  // Objects
  objects: Map<string, ASIObject>;
  
  // Info-particles
  hadrons: InfoHadron[];
  leptons: InfoLepton[];
  
  // Lexicon
  wordKernels: Map<string, WordKernel>;
  connectionKernels: Map<string, ConnectionKernel>;
  
  // Observers
  observers: Map<string, ASIObserver>;
  
  // Learning data
  datasets: Map<string, LearningDataset>;
  
  // Sentences (working memory)
  activeSentences: Sentence[];
  
  // Time
  tick: number;
}

/**
 * ASI Engine Interface
 */
export interface ASIEngine {
  state: ASIEngineState;
  
  // Object Manager
  createObject(name: string, fromNothingness?: boolean): ASIObject;
  getObject(id: string): ASIObject | undefined;
  getAllObjects(): ASIObject[];
  
  // Lexicon Manager
  addWord(word: string, emotionalEffect: { R: number; G: number; B: number }): WordKernel;
  addConnection(from: string, to: string, type: ConnectionKernel['relationshipType']): ConnectionKernel;
  
  // Sentence Constructor
  constructSentence(words: string[], baseObjectId?: string): Sentence;
  
  // Observer Manager
  createObserver(name: string, archetype?: ArchetypeType): ASIObserver;
  getObserver(id: string): ASIObserver | undefined;
  getAllObservers(): ASIObserver[];
  
  // Epistemic evaluation
  evaluateTruth(observerId: string, objectId: string, sentence: Sentence): number;
  evaluateConsensus(objectId: string, sentence: Sentence): { mean: number; agreement: number };
  
  // Info-particle operations
  createHadronFromObject(objectId: string): InfoHadron | null;
  applyLepton(hadronId: string, lepton: InfoLepton): InfoHadron | null;
  
  // Learning
  addLabeledExample(datasetName: string, example: LabeledExample): void;
  trainObserver(observerId: string, datasetName: string): { accuracy: number; improved: boolean };
  
  // Core loop
  perceive(words: string[], objectId?: string): Sentence;
  transform(sentence: Sentence): ThreeChannelWaveform;
  evaluate(sentence: Sentence, objectId: string): Map<string, number>;
  decide(evaluations: Map<string, number>): { action: string; confidence: number };
  learn(feedback: { correct: boolean; sentence: Sentence; objectId: string }): void;
  
  // Tick forward
  tick(dt?: number): void;
  
  // Inversion operations (fundamental)
  applyFlips(flips: FlipSequence): void;
}

// ============================================
// CREATE ASI ENGINE
// ============================================

export function createASIEngine(): ASIEngine {
  // Initialize from spinning nothingness
  const baseState = createOrientationState();
  initializeFromNothingness(baseState);
  
  const state: ASIEngineState = {
    baseState,
    objects: new Map(),
    hadrons: [],
    leptons: [],
    wordKernels: createStandardLexicon(),
    connectionKernels: createStandardConnections(),
    observers: new Map(),
    datasets: new Map(),
    activeSentences: [],
    tick: 0
  };
  
  // ============================================
  // OBJECT MANAGER
  // ============================================
  
  function createObject(name: string, fromNothingness: boolean = true): ASIObject {
    let orientationState: OrientationState;
    
    if (fromNothingness) {
      orientationState = createOrientationState();
      initializeFromNothingness(orientationState);
    } else {
      // Copy base state
      orientationState = {
        R: new Int8Array(state.baseState.R),
        G: new Int8Array(state.baseState.G),
        B: new Int8Array(state.baseState.B)
      };
    }
    
    const obj = createASIObject(name, orientationState);
    state.objects.set(obj.id, obj);
    return obj;
  }
  
  function getObject(id: string): ASIObject | undefined {
    return state.objects.get(id);
  }
  
  function getAllObjects(): ASIObject[] {
    return Array.from(state.objects.values());
  }
  
  // ============================================
  // LEXICON MANAGER
  // ============================================
  
  function addWord(
    word: string,
    emotionalEffect: { R: number; G: number; B: number }
  ): WordKernel {
    const kernel = createWordKernel(word, emotionalEffect);
    state.wordKernels.set(word, kernel);
    return kernel;
  }
  
  function addConnection(
    from: string,
    to: string,
    type: ConnectionKernel['relationshipType']
  ): ConnectionKernel {
    const kernel = createConnectionKernel(from, to, type);
    state.connectionKernels.set(`${from}->${to}`, kernel);
    return kernel;
  }
  
  // ============================================
  // SENTENCE CONSTRUCTOR
  // ============================================
  
  function buildSentence(words: string[], baseObjectId?: string): Sentence {
    const baseObject = baseObjectId ? state.objects.get(baseObjectId) : undefined;
    const sentence = constructSentence(words, state.wordKernels, state.connectionKernels, baseObject);
    state.activeSentences.push(sentence);
    
    // Keep only last 100 sentences
    if (state.activeSentences.length > 100) {
      state.activeSentences.shift();
    }
    
    return sentence;
  }
  
  // ============================================
  // OBSERVER MANAGER
  // ============================================
  
  function createObserverFn(name: string, archetype: ArchetypeType = 'neutral'): ASIObserver {
    const observer = createASIObserver(name, archetype);
    state.observers.set(observer.id, observer);
    return observer;
  }
  
  function getObserver(id: string): ASIObserver | undefined {
    return state.observers.get(id);
  }
  
  function getAllObservers(): ASIObserver[] {
    return Array.from(state.observers.values());
  }
  
  // ============================================
  // EPISTEMIC EVALUATION
  // ============================================
  
  function evaluateTruth(
    observerId: string,
    objectId: string,
    sentence: Sentence
  ): number {
    const observer = state.observers.get(observerId);
    const obj = state.objects.get(objectId);
    
    if (!observer || !obj) return 0;
    
    return computeEpistemicTruth(observer, obj, sentence);
  }
  
  function evaluateConsensus(
    objectId: string,
    sentence: Sentence
  ): { mean: number; agreement: number } {
    const obj = state.objects.get(objectId);
    if (!obj) return { mean: 0, agreement: 0 };
    
    const observers = Array.from(state.observers.values());
    if (observers.length === 0) return { mean: 0, agreement: 0 };
    
    const result = computeObserverAgreement(observers, obj, sentence);
    return { mean: result.meanTruth, agreement: result.agreementLevel };
  }
  
  // ============================================
  // INFO-PARTICLE OPERATIONS
  // ============================================
  
  function createHadronFromObject(objectId: string): InfoHadron | null {
    const obj = state.objects.get(objectId);
    if (!obj) return null;
    
    const dominant = findDominantFrequency(obj.waveform.R);
    const hadron = createInfoHadron(
      obj.emotionalColor,
      dominant.frequency,
      {},
      { objectIds: [objectId] }
    );
    
    state.hadrons.push(hadron);
    return hadron;
  }
  
  function applyLeptonFn(hadronId: string, lepton: InfoLepton): InfoHadron | null {
    const hadronIndex = state.hadrons.findIndex(h => h.id === hadronId);
    if (hadronIndex === -1) return null;
    
    const newHadron = applyLeptonToHadron(state.hadrons[hadronIndex], lepton);
    state.hadrons[hadronIndex] = newHadron;
    
    return newHadron;
  }
  
  // ============================================
  // LEARNING
  // ============================================
  
  function addLabeledExample(datasetName: string, example: LabeledExample): void {
    let dataset = state.datasets.get(datasetName);
    if (!dataset) {
      dataset = { name: datasetName, examples: [] };
      state.datasets.set(datasetName, dataset);
    }
    dataset.examples.push(example);
  }
  
  function trainObserverFn(
    observerId: string,
    datasetName: string
  ): { accuracy: number; improved: boolean } {
    const observer = state.observers.get(observerId);
    const dataset = state.datasets.get(datasetName);
    
    if (!observer || !dataset) {
      return { accuracy: 0, improved: false };
    }
    
    const result = trainObserver(observer, dataset);
    return { accuracy: result.finalAccuracy, improved: result.improved };
  }
  
  // ============================================
  // 8.2 CORE ASI LOOP
  // ============================================
  
  /**
   * PERCEIVE: Receive or generate word sequences about objects.
   * Update inversion histories via K_w, K_{ij}.
   */
  function perceive(words: string[], objectId?: string): Sentence {
    return buildSentence(words, objectId);
  }
  
  /**
   * TRANSFORM: Compute Ψ_{O,S,c}(f) via Fourier module.
   */
  function transform(sentence: Sentence): ThreeChannelWaveform {
    return sentence.waveform;
  }
  
  /**
   * EVALUATE: For each observer, compute T_o(O,S).
   */
  function evaluate(sentence: Sentence, objectId: string): Map<string, number> {
    const results = new Map<string, number>();
    const obj = state.objects.get(objectId);
    
    if (!obj) return results;
    
    for (const [observerId, observer] of state.observers) {
      const truth = computeEpistemicTruth(observer, obj, sentence);
      results.set(observerId, truth);
    }
    
    return results;
  }
  
  /**
   * DECIDE: Use T_o values to select actions, beliefs, or internal state changes.
   */
  function decide(evaluations: Map<string, number>): { action: string; confidence: number } {
    if (evaluations.size === 0) {
      return { action: 'uncertain', confidence: 0 };
    }
    
    // Compute mean truth across observers
    let sum = 0;
    for (const truth of evaluations.values()) {
      sum += truth;
    }
    const meanTruth = sum / evaluations.size;
    
    // Compute variance (disagreement)
    let variance = 0;
    for (const truth of evaluations.values()) {
      variance += (truth - meanTruth) ** 2;
    }
    variance /= evaluations.size;
    
    const confidence = 1 / (1 + variance * 10);
    
    if (meanTruth > 0.7 && confidence > 0.5) {
      return { action: 'accept', confidence };
    } else if (meanTruth < 0.3 && confidence > 0.5) {
      return { action: 'reject', confidence };
    } else {
      return { action: 'uncertain', confidence };
    }
  }
  
  /**
   * LEARN: When feedback is available, adjust W_o.
   */
  function learn(feedback: { correct: boolean; sentence: Sentence; objectId: string }): void {
    // Create temporary labeled example
    const obj = state.objects.get(feedback.objectId);
    if (!obj) return;
    
    // For each observer, slightly adjust filter based on feedback
    for (const observer of state.observers.values()) {
      const currentTruth = computeEpistemicTruth(observer, obj, feedback.sentence);
      
      // Adjust filter to increase/decrease truth based on correctness
      const adjustment = feedback.correct ? 0.01 : -0.01;
      const direction = currentTruth > 0.5 ? 1 : -1;
      
      for (let i = 0; i < state.baseState.R.length && i < observer.filter.R.length; i++) {
        observer.filter.R[i] = Math.max(0, observer.filter.R[i] + adjustment * direction);
        observer.filter.G[i] = Math.max(0, observer.filter.G[i] + adjustment * direction);
        observer.filter.B[i] = Math.max(0, observer.filter.B[i] + adjustment * direction);
      }
    }
  }
  
  // ============================================
  // TICK
  // ============================================
  
  function tickFn(_dt: number = 1): void {
    state.tick++;
    
    // Age and remove expired leptons
    for (let i = state.leptons.length - 1; i >= 0; i--) {
      const result = tickLepton(state.leptons[i]);
      if (!result) {
        state.leptons.splice(i, 1);
      }
    }
    
    // Decay hadron stability over time
    for (const hadron of state.hadrons) {
      hadron.stability *= 0.999;
    }
    
    // Remove very unstable hadrons
    state.hadrons = state.hadrons.filter(h => h.stability > 0.01);
  }
  
  // ============================================
  // FUNDAMENTAL INVERSION OPERATIONS
  // ============================================
  
  function applyFlips(flips: FlipSequence): void {
    applyFlipSequence(state.baseState, flips);
  }
  
  // ============================================
  // RETURN ENGINE
  // ============================================
  
  return {
    state,
    
    // Object Manager
    createObject,
    getObject,
    getAllObjects,
    
    // Lexicon Manager
    addWord,
    addConnection,
    
    // Sentence Constructor
    constructSentence: buildSentence,
    
    // Observer Manager
    createObserver: createObserverFn,
    getObserver,
    getAllObservers,
    
    // Epistemic evaluation
    evaluateTruth,
    evaluateConsensus,
    
    // Info-particle operations
    createHadronFromObject,
    applyLepton: applyLeptonFn,
    
    // Learning
    addLabeledExample,
    trainObserver: trainObserverFn,
    
    // Core loop
    perceive,
    transform,
    evaluate,
    decide,
    learn,
    
    // Tick
    tick: tickFn,
    
    // Fundamental operations
    applyFlips
  };
}

// ============================================
// CONVENIENCE: Run ASI cycle
// ============================================

/**
 * Run one complete ASI cycle.
 */
export function runASICycle(
  engine: ASIEngine,
  words: string[],
  objectId: string
): {
  sentence: Sentence;
  waveform: ThreeChannelWaveform;
  evaluations: Map<string, number>;
  decision: { action: string; confidence: number };
} {
  // 1. Perceive
  const sentence = engine.perceive(words, objectId);
  
  // 2. Transform
  const waveform = engine.transform(sentence);
  
  // 3. Evaluate
  const evaluations = engine.evaluate(sentence, objectId);
  
  // 4. Decide
  const decision = engine.decide(evaluations);
  
  // 5. Tick forward
  engine.tick();
  
  return { sentence, waveform, evaluations, decision };
}
