// Cognitive: Self Model

import { AttentionState } from './xyzBubbles.js';
import { MultiChannelWaveform } from '../math/channels.js';
import { Waveform, cAbsSq, cSub } from '../math/waveforms.js';

// ============================================================
// SelfModel - Agent's self-description and qualia residual
// ============================================================

/**
 * SelfModel: produces coarse descriptions of attention state
 * and computes the residual (qualia-like leftover).
 */
export class SelfModel {
  /**
   * @param {object} [options={}]
   * @param {number} [options.topK=3] - Keep top K amplitudes per channel
   * @param {number} [options.threshold=0.01] - Minimum amplitude squared to keep
   */
  constructor(options = {}) {
    this.topK = options.topK || 3;
    this.threshold = options.threshold || 0.01;
  }

  /**
   * Produce a coarse description of the attention state.
   * Keeps only the largest amplitudes per channel (lossy summary).
   * @param {AttentionState} attentionState
   * @returns {MultiChannelWaveform}
   */
  describeAttentionState(attentionState) {
    const description = new MultiChannelWaveform();
    const srcWaveform = attentionState.waveform;

    for (const [channelName, wf] of Object.entries(srcWaveform.channels)) {
      const descWf = new Waveform();

      // Get all amplitudes with their magnitudes
      const entries = [];
      for (const id of wf.keys()) {
        const amp = wf.get(id);
        const magSq = cAbsSq(amp);
        if (magSq >= this.threshold) {
          entries.push({ id, amp, magSq });
        }
      }

      // Sort by magnitude descending and keep top K
      entries.sort((a, b) => b.magSq - a.magSq);
      const topEntries = entries.slice(0, this.topK);

      for (const entry of topEntries) {
        descWf.set(entry.id, { re: entry.amp.re, im: entry.amp.im });
      }

      if (topEntries.length > 0) {
        description.setChannel(channelName, descWf);
      }
    }

    return description;
  }

  /**
   * Compute the residual between actual attention and its description.
   * Returns sum of squared magnitude of (Y - description) across all ids/channels.
   * This residual represents the "qualia" - what is lost in self-description.
   * @param {AttentionState} attentionState
   * @param {MultiChannelWaveform} descriptionWaveform
   * @returns {number}
   */
  computeResidual(attentionState, descriptionWaveform) {
    let totalResidual = 0;
    const srcWaveform = attentionState.waveform;

    // Get union of all channel names
    const allChannels = new Set([
      ...Object.keys(srcWaveform.channels),
      ...Object.keys(descriptionWaveform.channels)
    ]);

    for (const channelName of allChannels) {
      const srcWf = srcWaveform.channels[channelName] || new Waveform();
      const descWf = descriptionWaveform.channels[channelName] || new Waveform();

      // Get union of all ids in this channel
      const allIds = new Set([...srcWf.keys(), ...descWf.keys()]);

      for (const id of allIds) {
        const srcAmp = srcWf.get(id);
        const descAmp = descWf.get(id);
        const diff = cSub(srcAmp, descAmp);
        totalResidual += cAbsSq(diff);
      }
    }

    return totalResidual;
  }
}
