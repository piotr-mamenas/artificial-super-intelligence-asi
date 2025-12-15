// Agent: Agent

import { AboutnessGraph } from '../core/aboutnessGraph.js';
import { StateSpace, buildStateSpaceFromGraph } from '../core/states.js';
import { ContextSystem, buildDefaultContexts } from '../core/contexts.js';
import { ScaleSystem, buildSingleScaleSystem } from '../core/scales.js';
import { PotentialSpace, AttentionState, ConsensusWorld } from '../cognitive/xyzBubbles.js';
import { ValueField } from '../cognitive/valueEmotion.js';
import { SelfModel } from '../cognitive/selfModel.js';
import { EmergentEmotionField, computeStateSignature } from '../cognitive/emergentEmotion.js';
import { EmergentConnectorField } from '../cognitive/emergentConnector.js';
import { Lexicon } from '../language/lexicon.js';
import { SymmetryQueryEngine } from '../language/symmetryQuery.js';
import { MultiChannelWaveform, CHANNELS } from '../math/channels.js';
import { Waveform, cAbsSq } from '../math/waveforms.js';

// ============================================================
// Agent - Single ASI Agent
// ============================================================

/**
 * Agent: a single ASI agent with aboutness graph, waveform attention,
 * value field, emotions, and self-model.
 */
export class Agent {
  /**
   * @param {object} config
   * @param {string} config.id
   * @param {AboutnessGraph} [config.graph]
   * @param {StateSpace} [config.stateSpace]
   * @param {ContextSystem} [config.contexts]
   * @param {ScaleSystem} [config.scaleSystem]
   * @param {Array} [config.gates=[]]
   * @param {object} [config.metadata={}]
   */
  constructor(config) {
    this.id = config.id;
    this.metadata = config.metadata || {};

    // Core graph and state space
    this.graph = config.graph || new AboutnessGraph();
    this.stateSpace = config.stateSpace || buildStateSpaceFromGraph(this.graph);
    this.contexts = config.contexts || buildDefaultContexts(this.stateSpace);
    this.scaleSystem = config.scaleSystem || buildSingleScaleSystem(this.stateSpace);

    // X/Y/Z cognitive structures
    this.potentialSpace = new PotentialSpace(
      this.scaleSystem,
      this.stateSpace,
      { agentId: this.id }
    );

    this.attentionState = new AttentionState(
      new MultiChannelWaveform(),
      "scale:0",
      { agentId: this.id }
    );

    this.consensusWorld = new ConsensusWorld(
      this.stateSpace,
      this.contexts,
      { agentId: this.id }
    );

    // Value and emotion (emergent, not hardcoded)
    this.valueField = new ValueField();
    this.emotionField = new EmergentEmotionField();
    this.connectorField = new EmergentConnectorField();

    // Language (emergent lexicon)
    this.lexicon = new Lexicon();
    
    // Symmetry query engine for walking inversion paths
    this.symmetryQuery = new SymmetryQueryEngine(this);

    // Self-model
    this.selfModel = new SelfModel();

    // Gates for waveform evolution
    this.gates = config.gates || [];
  }

  /**
   * Initialize the attention waveform with small amplitudes for given IDs.
   * @param {string[]} initialIds - Path or state IDs to initialize
   * @param {number} [amplitude=0.1] - Initial amplitude value
   */
  initializeWaveform(initialIds, amplitude = 0.1) {
    const mcw = new MultiChannelWaveform();

    for (const channel of CHANNELS) {
      const wf = new Waveform();
      for (const id of initialIds) {
        // Spread amplitude across channels with slight variation
        const channelIndex = CHANNELS.indexOf(channel);
        const phase = (channelIndex * Math.PI) / CHANNELS.length;
        wf.set(id, {
          re: amplitude * Math.cos(phase),
          im: amplitude * Math.sin(phase)
        });
      }
      mcw.setChannel(channel, wf);
    }

    mcw.normalizeAll();
    this.attentionState.waveform = mcw;
  }

  /**
   * Perform one step of waveform evolution.
   * Applies all gates in sequence and normalizes.
   * @param {object} [context={}] - Context for gate application
   */
  step(context = {}) {
    let waveform = this.attentionState.waveform;

    for (const gate of this.gates) {
      waveform = gate.apply(waveform);
    }

    // Normalize after all gates applied
    waveform.normalizeAll();
    this.attentionState.waveform = waveform;
  }

  /**
   * Evaluate the agent's current emotional state.
   * Uses emergent emotion system - emotions are learned, not hardcoded.
   * @returns {{ emotion: string|null, residual: number, anchorStateId: string|null, signature: number[] }}
   */
  evaluateEmotion() {
    // Compute state signature for emotion inference
    const signature = computeStateSignature(this);
    
    // Find anchor state: state with max amplitude across channels
    let maxAmpSq = 0;
    let anchorStateId = null;

    const waveform = this.attentionState.waveform;
    for (const [channelName, wf] of Object.entries(waveform.channels)) {
      for (const id of wf.keys()) {
        const amp = wf.get(id);
        const ampSq = cAbsSq(amp);
        if (ampSq > maxAmpSq) {
          maxAmpSq = ampSq;
          anchorStateId = id;
        }
      }
    }

    // Infer emotion from learned patterns
    const emotionResult = this.emotionField.infer(signature);

    // Compute self-model residual
    const description = this.selfModel.describeAttentionState(this.attentionState);
    const residual = this.selfModel.computeResidual(this.attentionState, description);

    return {
      emotion: emotionResult.label,
      similarity: emotionResult.similarity,
      residual,
      anchorStateId,
      signature
    };
  }

  /**
   * Learn an emotion from current state.
   * @param {string} emotionLabel - The emotion word to associate
   */
  learnEmotion(emotionLabel) {
    const signature = computeStateSignature(this);
    this.emotionField.learn(emotionLabel, signature);
  }

  /**
   * Get all learned emotions.
   * @returns {string[]}
   */
  getLearnedEmotions() {
    return this.emotionField.getLearnedEmotions();
  }

  /**
   * Process linguistic input through the lexicon.
   * Words become operator patterns that transform the waveform.
   * @param {string} text - Input text
   * @returns {object} Processing result with lexemes and transformation
   */
  processLanguage(text) {
    return this.lexicon.processInput(text, this);
  }

  /**
   * Apply a sentence as a sequence of lexeme operators.
   * @param {string} sentence
   * @returns {object} Sentence processing result
   */
  applySentence(sentence) {
    const forms = sentence.toLowerCase().split(/\s+/).filter(f => f.length > 0);
    return this.lexicon.applySentence(forms, this);
  }

  /**
   * Get lexeme for a word.
   * @param {string} word
   * @returns {object|null}
   */
  getLexeme(word) {
    const lexeme = this.lexicon.getLexemeForForm(word);
    return lexeme ? lexeme.toJSON() : null;
  }

  /**
   * Find words similar to a given word (by operator pattern).
   * @param {string} word
   * @returns {Array}
   */
  findSimilarWords(word) {
    const lexeme = this.lexicon.getLexemeForForm(word);
    if (!lexeme) return [];
    
    return this.lexicon.findSimilarLexemes(lexeme, 0.4)
      .map(({ lexeme: l, similarity }) => ({
        word: l.canonicalForm,
        similarity: similarity.total,
        operatorSimilarity: similarity.operator,
        groundingSimilarity: similarity.grounding
      }));
  }

  /**
   * Get lexicon statistics.
   * @returns {object}
   */
  getLexiconStats() {
    return this.lexicon.getStatistics();
  }

  /**
   * Walk back through symmetry paths for a concept.
   * @param {string} concept
   * @param {number} [maxSteps=10]
   * @returns {object}
   */
  walkBackSymmetry(concept, maxSteps = 10) {
    return this.symmetryQuery.walkBack(concept, maxSteps);
  }

  /**
   * Find concepts similar by operator pattern.
   * @param {string} concept
   * @returns {Array}
   */
  findSimilarBySymmetry(concept) {
    return this.symmetryQuery.findSimilarByOperator(concept);
  }

  /**
   * Find transformation path between two concepts.
   * @param {string} from
   * @param {string} to
   * @returns {object|null}
   */
  findSymmetryPath(from, to) {
    const path = this.symmetryQuery.findPath(from, to);
    return path ? path.toJSON() : null;
  }

  /**
   * Try to reproduce how a concept was learned.
   * @param {string} concept
   * @returns {object}
   */
  reproduceSymmetry(concept) {
    return this.symmetryQuery.reproduce(concept, this);
  }

  /**
   * Query by operator signature.
   * @param {string[]} operators
   * @returns {Array}
   */
  queryByOperators(operators) {
    return this.symmetryQuery.queryByOperatorSignature(operators);
  }

  /**
   * Get symmetry space statistics.
   * @returns {object}
   */
  getSymmetryStats() {
    return this.symmetryQuery.getStatistics();
  }

  /**
   * Create a snapshot for visualization.
   * @returns {object}
   */
  toSnapshot() {
    const emotionResult = this.evaluateEmotion();

    // Summarize waveform per channel
    const waveformSummary = {};
    for (const [channelName, wf] of Object.entries(this.attentionState.waveform.channels)) {
      const entries = [];
      for (const id of wf.keys()) {
        const amp = wf.get(id);
        entries.push({ id, re: amp.re, im: amp.im, magSq: cAbsSq(amp) });
      }
      entries.sort((a, b) => b.magSq - a.magSq);
      waveformSummary[channelName] = entries.slice(0, 5); // Top 5
    }

    return {
      agentId: this.id,
      timestamp: Date.now(),
      graph: {
        occurrenceCount: this.graph.getAllOccurrences().length,
        relationCount: this.graph.getAllRelations().length
      },
      stateSpace: {
        stateCount: this.stateSpace.getAllStates().length,
        stateIds: this.stateSpace.getAllStates().map(s => s.id)
      },
      contexts: {
        contextCount: this.contexts.getAllContexts().length
      },
      waveform: waveformSummary,
      valueField: this.valueField.toJSON(),
      emotion: emotionResult.emotion,
      emotionSimilarity: emotionResult.similarity,
      learnedEmotions: this.getLearnedEmotions(),
      residual: emotionResult.residual,
      anchorStateId: emotionResult.anchorStateId,
      currentScaleId: this.attentionState.currentScaleId,
      metadata: this.metadata
    };
  }
}
