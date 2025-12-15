// Agent: Agent

import { AboutnessGraph } from '../core/aboutnessGraph.js';
import { StateSpace, buildStateSpaceFromGraph } from '../core/states.js';
import { ContextSystem, buildDefaultContexts } from '../core/contexts.js';
import { ScaleSystem, buildSingleScaleSystem } from '../core/scales.js';
import { PotentialSpace, AttentionState, ConsensusWorld } from '../cognitive/xyzBubbles.js';
import { ValueField, EmotionEstimator, estimateLocalValueStats } from '../cognitive/valueEmotion.js';
import { SelfModel } from '../cognitive/selfModel.js';
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

    // Value and emotion
    this.valueField = new ValueField();
    this.emotionEstimator = new EmotionEstimator();

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
   * @returns {{ emotion: string, residual: number, anchorStateId: string | null }}
   */
  evaluateEmotion() {
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

    if (!anchorStateId) {
      return { emotion: "neutral", residual: 0, anchorStateId: null };
    }

    // Get neighbors (other states in the state space)
    const allStates = this.stateSpace.getAllStates().map(s => s.id);
    const neighbors = allStates.filter(id => id !== anchorStateId).slice(0, 10);

    // Compute local value stats
    const anchorStats = estimateLocalValueStats(
      this.valueField,
      this.stateSpace,
      anchorStateId,
      neighbors
    );

    // Estimate uncertainty from amplitude spread
    let totalAmpSq = 0;
    let ampCount = 0;
    for (const [, wf] of Object.entries(waveform.channels)) {
      for (const id of wf.keys()) {
        totalAmpSq += cAbsSq(wf.get(id));
        ampCount++;
      }
    }
    const avgAmpSq = ampCount > 0 ? totalAmpSq / ampCount : 0;
    const uncertainty = Math.min(1, avgAmpSq * ampCount * 0.1); // Heuristic

    // Estimate reachability (fraction of high-value states reachable)
    const highValueStates = allStates.filter(id => this.valueField.getValue(id) > 0.5);
    const reachability = highValueStates.length > 0
      ? highValueStates.filter(id => neighbors.includes(id) || id === anchorStateId).length / highValueStates.length
      : 0.5;

    // Infer emotion
    const emotion = this.emotionEstimator.inferEmotion({
      anchorStats,
      reachability,
      uncertainty
    });

    // Compute self-model residual
    const description = this.selfModel.describeAttentionState(this.attentionState);
    const residual = this.selfModel.computeResidual(this.attentionState, description);

    return { emotion, residual, anchorStateId };
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
      residual: emotionResult.residual,
      anchorStateId: emotionResult.anchorStateId,
      currentScaleId: this.attentionState.currentScaleId,
      metadata: this.metadata
    };
  }
}
