// Math: Gates (Quark-inspired Logical Operators)

import { Waveform, complex, cMul, cAdd, cScale } from './waveforms.js';
import { MultiChannelWaveform, CHANNELS } from './channels.js';

// ============================================================
// Gate Base Class
// ============================================================

/**
 * Gate: an operator that transforms a MultiChannelWaveform.
 */
export class Gate {
  /**
   * @param {string} name
   * @param {object} [metadata={}]
   */
  constructor(name, metadata = {}) {
    this.name = name;
    this.metadata = metadata;
  }

  /**
   * Apply this gate to a MultiChannelWaveform (returns new waveform).
   * @param {MultiChannelWaveform} mcw
   * @returns {MultiChannelWaveform}
   */
  apply(mcw) {
    throw new Error("Gate.apply must be overridden");
  }

  /**
   * Compose with another gate (this applied first, then other).
   * @param {Gate} other
   * @returns {ComposedGate}
   */
  then(other) {
    return new ComposedGate([this, other]);
  }
}

// ============================================================
// Composed Gate
// ============================================================

/**
 * ComposedGate: sequential application of multiple gates.
 */
export class ComposedGate extends Gate {
  /**
   * @param {Gate[]} gates - Applied in order
   */
  constructor(gates) {
    super("Composed", { gates: gates.map(g => g.name) });
    this.gates = gates;
  }

  apply(mcw) {
    let result = mcw.clone();
    for (const gate of this.gates) {
      result = gate.apply(result);
    }
    return result;
  }
}

// ============================================================
// Identity Gate
// ============================================================

/**
 * IdentityGate: does nothing.
 */
export class IdentityGate extends Gate {
  constructor() {
    super("Identity");
  }

  apply(mcw) {
    return mcw.clone();
  }
}

// ============================================================
// Channel Swap Gate (Flavor Mixing)
// ============================================================

/**
 * SwapGate: swaps two channels.
 */
export class SwapGate extends Gate {
  /**
   * @param {string} channel1
   * @param {string} channel2
   */
  constructor(channel1, channel2) {
    super("Swap", { channel1, channel2 });
    this.channel1 = channel1;
    this.channel2 = channel2;
  }

  apply(mcw) {
    const result = mcw.clone();
    const wf1 = result.channels[this.channel1];
    const wf2 = result.channels[this.channel2];
    result.channels[this.channel1] = wf2 || new Waveform();
    result.channels[this.channel2] = wf1 || new Waveform();
    return result;
  }
}

// ============================================================
// Phase Gate
// ============================================================

/**
 * PhaseGate: applies a phase rotation to a channel.
 */
export class PhaseGate extends Gate {
  /**
   * @param {string} channel
   * @param {number} theta - Phase angle in radians
   */
  constructor(channel, theta) {
    super("Phase", { channel, theta });
    this.channel = channel;
    this.theta = theta;
  }

  apply(mcw) {
    const result = mcw.clone();
    const wf = result.getChannel(this.channel);
    const phaseFactor = complex(Math.cos(this.theta), Math.sin(this.theta));

    for (const id of wf.keys()) {
      const amp = wf.get(id);
      wf.set(id, cMul(amp, phaseFactor));
    }
    return result;
  }
}

// ============================================================
// Hadamard-like Superposition Gate
// ============================================================

/**
 * HadamardGate: creates superposition between two channels.
 * |c1⟩ → (|c1⟩ + |c2⟩)/√2
 * |c2⟩ → (|c1⟩ - |c2⟩)/√2
 */
export class HadamardGate extends Gate {
  /**
   * @param {string} channel1
   * @param {string} channel2
   */
  constructor(channel1, channel2) {
    super("Hadamard", { channel1, channel2 });
    this.channel1 = channel1;
    this.channel2 = channel2;
  }

  apply(mcw) {
    const result = new MultiChannelWaveform();
    const sqrt2inv = 1 / Math.sqrt(2);

    // Copy all channels
    for (const [name, wf] of Object.entries(mcw.channels)) {
      result.channels[name] = wf.clone();
    }

    const wf1 = mcw.getChannel(this.channel1).clone();
    const wf2 = mcw.getChannel(this.channel2).clone();

    // New channel1 = (wf1 + wf2) / √2
    const newWf1 = new Waveform();
    const allKeys = new Set([...wf1.keys(), ...wf2.keys()]);
    for (const id of allKeys) {
      const a1 = wf1.get(id);
      const a2 = wf2.get(id);
      const sum = cAdd(a1, a2);
      newWf1.set(id, cScale(sum, sqrt2inv));
    }

    // New channel2 = (wf1 - wf2) / √2
    const newWf2 = new Waveform();
    for (const id of allKeys) {
      const a1 = wf1.get(id);
      const a2 = wf2.get(id);
      const diff = { re: a1.re - a2.re, im: a1.im - a2.im };
      newWf2.set(id, cScale(diff, sqrt2inv));
    }

    result.channels[this.channel1] = newWf1;
    result.channels[this.channel2] = newWf2;

    return result;
  }
}

// ============================================================
// Amplitude Scaling Gate
// ============================================================

/**
 * ScaleGate: scales a channel by a real factor.
 */
export class ScaleGate extends Gate {
  /**
   * @param {string} channel
   * @param {number} factor
   */
  constructor(channel, factor) {
    super("Scale", { channel, factor });
    this.channel = channel;
    this.factor = factor;
  }

  apply(mcw) {
    const result = mcw.clone();
    const wf = result.getChannel(this.channel);
    wf.scale(this.factor);
    return result;
  }
}

// ============================================================
// Controlled Gate (applies inner gate if control channel is non-zero)
// ============================================================

/**
 * ControlledGate: applies a gate conditionally based on control channel norm.
 */
export class ControlledGate extends Gate {
  /**
   * @param {string} controlChannel
   * @param {Gate} targetGate
   * @param {number} [threshold=1e-10]
   */
  constructor(controlChannel, targetGate, threshold = 1e-10) {
    super("Controlled", { controlChannel, targetGate: targetGate.name });
    this.controlChannel = controlChannel;
    this.targetGate = targetGate;
    this.threshold = threshold;
  }

  apply(mcw) {
    const controlWf = mcw.getChannel(this.controlChannel);
    if (controlWf.normSquared() > this.threshold) {
      return this.targetGate.apply(mcw);
    }
    return mcw.clone();
  }
}

// ============================================================
// Channel Transfer Gate
// ============================================================

/**
 * TransferGate: transfers amplitude from one channel to another.
 */
export class TransferGate extends Gate {
  /**
   * @param {string} fromChannel
   * @param {string} toChannel
   * @param {number} [fraction=1.0] - Fraction to transfer (0-1)
   */
  constructor(fromChannel, toChannel, fraction = 1.0) {
    super("Transfer", { fromChannel, toChannel, fraction });
    this.fromChannel = fromChannel;
    this.toChannel = toChannel;
    this.fraction = fraction;
  }

  apply(mcw) {
    const result = mcw.clone();
    const fromWf = result.getChannel(this.fromChannel);
    const toWf = result.getChannel(this.toChannel);

    for (const id of fromWf.keys()) {
      const amp = fromWf.get(id);
      const transferred = cScale(amp, this.fraction);
      const remaining = cScale(amp, 1 - this.fraction);

      fromWf.set(id, remaining);
      toWf.set(id, cAdd(toWf.get(id), transferred));
    }

    return result;
  }
}

// ============================================================
// Factory Functions
// ============================================================

/**
 * Create a swap gate between two channels.
 */
export function swap(c1, c2) {
  return new SwapGate(c1, c2);
}

/**
 * Create a phase gate.
 */
export function phase(channel, theta) {
  return new PhaseGate(channel, theta);
}

/**
 * Create a Hadamard gate.
 */
export function hadamard(c1, c2) {
  return new HadamardGate(c1, c2);
}

/**
 * Create a transfer gate.
 */
export function transfer(from, to, fraction = 1.0) {
  return new TransferGate(from, to, fraction);
}

/**
 * Compose multiple gates.
 */
export function compose(...gates) {
  return new ComposedGate(gates);
}
