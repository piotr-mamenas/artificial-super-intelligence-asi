/**
 * ASI Core Module Index
 * 
 * Exports all ASI components for easy importing.
 * 
 * Architecture based on:
 * - Spinning nothingness (primitive void)
 * - Double inversions (J_c² = Id)
 * - Waveforms as traces of inversion histories
 * - No LLMs - pure math and algorithms
 */

// Primitive Ontology (Section 1)
export {
  N,
  AXES,
  type Axis,
  type Orientation,
  type OrientationState,
  type InversionVector,
  type FlipSequence,
  type InversionTrace,
  flip,
  applyFlip,
  createOrientationState,
  initializeFromNothingness,
  getInversionVector,
  applyFlipSequence,
  verifyDoubleInversion,
  getInversionTrace
} from './primitive-ontology';

// Waveforms (Section 2)
export {
  M,
  FREQUENCIES,
  type Complex,
  type AxisWaveform,
  type ThreeChannelWaveform,
  complexAdd,
  complexMul,
  complexMag,
  complexMagSquared,
  complexExp,
  complexScale,
  computeAxisWaveform,
  computeFullAxisWaveform,
  computeThreeChannelWaveform,
  getWaveformAtFrequency,
  computeWaveformEnergy,
  findDominantFrequency,
  computeWaveformSimilarity,
  waveformToColor
} from './waveform';

// Objects (Section 3)
export {
  type EmotionalColor,
  type ASIObject,
  emotionalColorToRGB,
  emotionalColorToNormalized,
  computeEmotionalColor,
  computeBaseEnvelope,
  createASIObject,
  createASIObjectFromArrays,
  createRandomASIObject,
  computeObjectAxisWaveform,
  approximateObjectWaveform,
  measureColorStability,
  updateObjectStability
} from './objects';

// Info-Particles (Section 4)
export {
  type SensoryWeight,
  type HadronContext,
  type InfoHadron,
  type InfoLepton,
  computeIntensity,
  createInfoHadron,
  createInfoLepton,
  applyLeptonToHadron,
  tickLepton,
  isLeptonAlive,
  hadronSimilarity,
  mergeHadrons
} from './info-particles';

// Lexicon (Section 5)
export {
  type WordKernel,
  type ConnectionKernel,
  type Sentence,
  applyWordKernel,
  createWordKernel,
  createConnectionKernel,
  constructSentence,
  computeObjectSentenceWaveform,
  createStandardLexicon,
  createStandardConnections
} from './lexicon';

// Observers (Section 6)
export {
  type ObserverFilter,
  type ASIObserver,
  type ArchetypeType,
  createEmptyFilter,
  createUniformFilter,
  createRandomFilter,
  createArchetypeFilter,
  createASIObserver,
  computeEpistemicTruth,
  compareSentences,
  computeObserverAgreement,
  findAgreementClusters
} from './observers';

// Learning (Section 7)
export {
  type LabeledExample,
  type LearningDataset,
  computeAccuracy,
  computeDetailedAccuracy,
  optimizeFilterGradientFree,
  optimizeFilterGradientBased,
  trainObserver
} from './learning';

// ASI Engine (Section 8)
export {
  type ASIEngineState,
  type ASIEngine,
  createASIEngine,
  runASICycle
} from './asi-engine';
