// Math: Channels

import { Waveform } from './waveforms.js';

/**
 * Quark-inspired channel names.
 */
export const CHANNELS = ["u", "d", "s", "c", "t", "b"];

/**
 * MultiChannelWaveform: a container for multiple logical waveform channels.
 */
export class MultiChannelWaveform {
  /**
   * @param {object} [initialChannels={}] - { [channelName]: Waveform }
   */
  constructor(initialChannels = {}) {
    /** @type {{ [channelName: string]: Waveform }} */
    this.channels = {};

    for (const [name, waveform] of Object.entries(initialChannels)) {
      this.channels[name] = waveform;
    }
  }

  /**
   * Get a channel waveform (creates empty if missing).
   * @param {string} name
   * @returns {Waveform}
   */
  getChannel(name) {
    if (!this.channels[name]) {
      this.channels[name] = new Waveform();
    }
    return this.channels[name];
  }

  /**
   * Set a channel waveform.
   * @param {string} name
   * @param {Waveform} waveform
   */
  setChannel(name, waveform) {
    this.channels[name] = waveform;
  }

  /**
   * Create a deep copy of all channel waveforms.
   * @returns {MultiChannelWaveform}
   */
  clone() {
    const copy = new MultiChannelWaveform();
    for (const [name, waveform] of Object.entries(this.channels)) {
      copy.channels[name] = waveform.clone();
    }
    return copy;
  }

  /**
   * Normalize each channel waveform independently.
   */
  normalizeAll() {
    for (const waveform of Object.values(this.channels)) {
      waveform.normalize();
    }
  }

  /**
   * Apply a callback to each channel.
   * @param {(waveform: Waveform, channelName: string) => void} fn
   */
  applyPerChannel(fn) {
    for (const [name, waveform] of Object.entries(this.channels)) {
      fn(waveform, name);
    }
  }

  /**
   * Serialize to plain object.
   * @returns {{ [channelName: string]: object }}
   */
  toJSON() {
    const obj = {};
    for (const [name, waveform] of Object.entries(this.channels)) {
      obj[name] = waveform.toJSON();
    }
    return obj;
  }
}
