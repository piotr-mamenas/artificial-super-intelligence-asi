// Agent: Agent

import { AboutnessGraph } from '../core/aboutnessGraph.js';
import { StateSpace, buildStateSpaceFromGraph } from '../core/states.js';
import { ContextSystem, buildDefaultContexts } from '../core/contexts.js';
import { ScaleSystem, buildSingleScaleSystem } from '../core/scales.js';
import { ConceptSpace } from '../core/conceptWaveform.js';
import { PotentialSpace, AttentionState, ConsensusWorld } from '../cognitive/xyzBubbles.js';
import { ValueField } from '../cognitive/valueEmotion.js';
import { SelfModel } from '../cognitive/selfModel.js';
import { EmergentEmotionField, computeStateSignature } from '../cognitive/emergentEmotion.js';
import { EmergentConnectorField } from '../cognitive/emergentConnector.js';
import { Lexicon } from '../language/lexicon.js';
import { SymmetryQueryEngine } from '../language/symmetryQuery.js';
import { detectUncertainty, waveformToSpinPattern, QuarkSpinPattern, SPIN_UP } from '../math/quarkSpins.js';
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
    
    // Concept space - concepts ARE waveforms, not labels
    this.conceptSpace = new ConceptSpace();
    
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
   * The resulting waveform state IS the concept.
   * @param {string} text - Input text
   * @returns {object} Processing result with lexemes and transformation
   */
  processLanguage(text) {
    // Apply gates to evolve waveform before processing
    this.step();
    
    // Process through lexicon - transforms waveform
    const occurrences = this.lexicon.processInput(text, this);
    
    // Apply gates again after processing
    this.step();
    
    return occurrences;
  }

  /**
   * Learn a concept as a waveform pattern.
   * The waveform state after processing IS the concept.
   * @param {string} signal - The concept signal (word/phrase)
   * @returns {object} The learned concept waveform
   */
  learnConceptWaveform(signal) {
    // Process the signal to transform waveform
    this.processLanguage(signal);
    
    // The current waveform state IS the concept
    const concept = this.conceptSpace.learnConcept(signal, this.attentionState.waveform);
    
    return concept;
  }

  /**
   * Learn a relation as a symmetry transformation between concept waveforms.
   * @param {string} from - Source concept
   * @param {string} to - Target concept
   * @param {string} relationType - Type of relation (is-a, has-a, etc)
   */
  learnTransformation(from, to, relationType) {
    // Ensure both concepts exist as waveforms
    const fromConcept = this.conceptSpace.concepts.get(from.toLowerCase()) 
      || this.learnConceptWaveform(from);
    const toConcept = this.conceptSpace.concepts.get(to.toLowerCase())
      || this.learnConceptWaveform(to);
    
    // Find the transformation between them
    const transform = fromConcept.findTransformationTo(toConcept);
    
    // Store the learned transformation
    this.conceptSpace.learnTransformation(from, to, transform);
    
    return {
      from,
      to,
      transformation: transform.getPatternString(),
      spinPattern: transform
    };
  }

  /**
   * Query concepts by waveform resonance.
   * This is how we "understand" - by finding resonant patterns.
   * @param {string} query - Query signal
   * @returns {Array} Resonant concepts sorted by resonance
   */
  queryByResonance(query) {
    // Process query to get waveform state
    this.processLanguage(query);
    
    // Find concepts that resonate with current waveform
    const resonant = this.conceptSpace.findResonant(this.attentionState.waveform, 0.2);
    
    return resonant;
  }

  /**
   * Attempt to invert understanding of a concept.
   * Successful inversion = true understanding.
   * @param {string} conceptLabel
   * @returns {object} Inversion result
   */
  attemptConceptInversion(conceptLabel) {
    const concept = this.conceptSpace.concepts.get(conceptLabel.toLowerCase());
    
    if (!concept) {
      return { success: false, reason: 'concept not learned' };
    }
    
    const result = concept.attemptInversion();
    
    return {
      success: result.success,
      error: result.error,
      inverse: result.inverse,
      interpretation: result.success 
        ? `I understand "${conceptLabel}" - I can construct its inverse`
        : `I don't fully understand "${conceptLabel}" - inversion error: ${result.error.toFixed(2)}`
    };
  }

  /**
   * Reason about a concept using the graph memory.
   * Returns related concepts and their connections.
   * @param {string} concept
   * @returns {object}
   */
  reasonAbout(concept) {
    const result = {
      concept,
      found: false,
      related: [],
      paths: [],
      context: []
    };
    
    // Find occurrences matching this concept
    const lowerConcept = concept.toLowerCase();
    const occurrences = this.graph.getAllOccurrences().filter(o => {
      let payloadStr = '';
      if (typeof o.payload === 'string') {
        payloadStr = o.payload;
      } else if (o.payload) {
        payloadStr = o.payload.concept || o.payload.signal || '';
      }
      return payloadStr.toLowerCase() === lowerConcept;
    });
    
    if (occurrences.length === 0) {
      return result;
    }
    
    result.found = true;
    
    // Get all related concepts through relations
    for (const occ of occurrences) {
      // Outgoing relations
      const outgoing = this.graph.getOutgoing(occ.id);
      for (const rel of outgoing) {
        const targetOcc = this.graph.getOccurrence(rel.to);
        if (targetOcc) {
          const targetConcept = targetOcc.payload?.concept || targetOcc.payload?.signal || rel.to;
          result.related.push({
            concept: targetConcept,
            direction: 'to',
            connector: rel.metadata?.connector || 'relates',
            operators: rel.metadata?.operators || []
          });
        }
      }
      
      // Incoming relations
      const incoming = this.graph.getIncoming(occ.id);
      for (const rel of incoming) {
        const sourceOcc = this.graph.getOccurrence(rel.from);
        if (sourceOcc) {
          const sourceConcept = sourceOcc.payload?.concept || sourceOcc.payload?.signal || rel.from;
          result.related.push({
            concept: sourceConcept,
            direction: 'from',
            connector: rel.metadata?.connector || 'relates',
            operators: rel.metadata?.operators || []
          });
        }
      }
    }
    
    // Get symmetry paths if available
    if (this.symmetryQuery) {
      const walkback = this.symmetryQuery.walkBack(concept);
      if (walkback.canReproduce) {
        result.paths = walkback.chain;
      }
    }
    
    return result;
  }

  /**
   * Get context from surrounding knowledge.
   * Activates related concepts in waveform.
   * @param {string[]} concepts
   */
  activateContext(concepts) {
    const waveform = this.attentionState?.waveform;
    if (!waveform) return;
    
    for (const concept of concepts) {
      const reasoning = this.reasonAbout(concept);
      
      if (reasoning.found) {
        // Boost waveform based on related concepts
        for (const rel of reasoning.related) {
          // Activate the channel based on the connector type
          const ops = rel.operators || [];
          for (const op of ops) {
            const channel = waveform.getChannel(op[0]); // 'u' for 'up', etc
            if (channel) {
              // Add amplitude for this concept
              const id = `concept:${rel.concept}`;
              const existing = channel.get(id) || { re: 0, im: 0 };
              channel.set(id, {
                re: existing.re + 0.1,
                im: existing.im + 0.05
              });
            }
          }
        }
      }
    }
    
    waveform.normalizeAll();
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
   * Detect uncertainty from current waveform state.
   * High uncertainty = ASI doesn't know / can't answer confidently.
   * @returns {object}
   */
  detectUncertainty() {
    return detectUncertainty(this.attentionState?.waveform);
  }

  /**
   * Get current spin pattern from waveform.
   * @returns {object}
   */
  getSpinPattern() {
    const pattern = waveformToSpinPattern(this.attentionState?.waveform);
    return pattern.toJSON();
  }

  /**
   * Check if agent knows about a concept (has it in graph with low uncertainty).
   * @param {string} concept
   * @returns {{ knows: boolean, confidence: number, reason: string }}
   */
  knowsAbout(concept) {
    const lowerConcept = concept.toLowerCase();
    const occurrences = this.graph.getAllOccurrences()
      .filter(o => {
        // Handle various payload formats
        let payloadStr = '';
        if (typeof o.payload === 'string') {
          payloadStr = o.payload;
        } else if (o.payload) {
          payloadStr = o.payload.concept || o.payload.signal || o.payload.text || '';
        }
        return payloadStr.toLowerCase() === lowerConcept;
      });
    
    if (occurrences.length === 0) {
      return { 
        knows: false, 
        confidence: 0, 
        reason: 'never encountered' 
      };
    }
    
    // Check relations
    const relations = [];
    for (const occ of occurrences) {
      const outgoing = this.graph.getOutgoing(occ.id);
      const incoming = this.graph.getIncoming(occ.id);
      relations.push(...outgoing, ...incoming);
    }
    
    if (relations.length === 0) {
      return { 
        knows: false, 
        confidence: 0.2, 
        reason: 'encountered but no relations' 
      };
    }
    
    // Check waveform uncertainty
    const uncertainty = this.detectUncertainty();
    
    // High confidence if we have relations AND low uncertainty
    const relationConfidence = Math.min(1, relations.length / 3);
    const waveformConfidence = 1 - uncertainty.uncertainty;
    const confidence = (relationConfidence + waveformConfidence) / 2;
    
    return {
      knows: confidence > 0.4,
      confidence,
      reason: confidence > 0.4 ? 'has relations and stable waveform' : 'uncertain'
    };
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
