// Math: Waveforms

// ============================================================
// Complex Number Utilities
// Complex = { re: number, im: number }
// ============================================================

/**
 * Create a complex number.
 * @param {number} re
 * @param {number} im
 * @returns {{ re: number, im: number }}
 */
export function complex(re, im = 0) {
  return { re, im };
}

/**
 * Add two complex numbers.
 * @param {{ re: number, im: number }} a
 * @param {{ re: number, im: number }} b
 * @returns {{ re: number, im: number }}
 */
export function cAdd(a, b) {
  return { re: a.re + b.re, im: a.im + b.im };
}

/**
 * Subtract two complex numbers.
 * @param {{ re: number, im: number }} a
 * @param {{ re: number, im: number }} b
 * @returns {{ re: number, im: number }}
 */
export function cSub(a, b) {
  return { re: a.re - b.re, im: a.im - b.im };
}

/**
 * Multiply two complex numbers.
 * @param {{ re: number, im: number }} a
 * @param {{ re: number, im: number }} b
 * @returns {{ re: number, im: number }}
 */
export function cMul(a, b) {
  return {
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re
  };
}

/**
 * Complex conjugate.
 * @param {{ re: number, im: number }} a
 * @returns {{ re: number, im: number }}
 */
export function cConj(a) {
  return { re: a.re, im: -a.im };
}

/**
 * Absolute value squared of a complex number.
 * @param {{ re: number, im: number }} a
 * @returns {number}
 */
export function cAbsSq(a) {
  return a.re * a.re + a.im * a.im;
}

/**
 * Scale a complex number by a real factor.
 * @param {{ re: number, im: number }} a
 * @param {number} factor
 * @returns {{ re: number, im: number }}
 */
export function cScale(a, factor) {
  return { re: a.re * factor, im: a.im * factor };
}

// ============================================================
// Waveform Class
// ============================================================

/**
 * Waveform: assignment of complex amplitudes to path/state IDs.
 */
export class Waveform {
  /**
   * @param {object} [initialAmplitudes={}] - { [id]: { re, im } }
   */
  constructor(initialAmplitudes = {}) {
    /** @type {Map<string, { re: number, im: number }>} */
    this.amplitudes = new Map();

    for (const [id, amp] of Object.entries(initialAmplitudes)) {
      this.amplitudes.set(id, { re: amp.re, im: amp.im });
    }
  }

  /**
   * Set amplitude for an id.
   * @param {string} id
   * @param {{ re: number, im: number }} complexValue
   */
  set(id, complexValue) {
    this.amplitudes.set(id, { re: complexValue.re, im: complexValue.im });
  }

  /**
   * Get amplitude for an id (returns zero if not present).
   * @param {string} id
   * @returns {{ re: number, im: number }}
   */
  get(id) {
    return this.amplitudes.get(id) || { re: 0, im: 0 };
  }

  /**
   * Get all ids with amplitudes.
   * @returns {string[]}
   */
  keys() {
    return Array.from(this.amplitudes.keys());
  }

  /**
   * Create a deep copy.
   * @returns {Waveform}
   */
  clone() {
    const copy = new Waveform();
    for (const [id, amp] of this.amplitudes) {
      copy.amplitudes.set(id, { re: amp.re, im: amp.im });
    }
    return copy;
  }

  /**
   * Compute the squared norm (sum of |amplitude|^2).
   * @returns {number}
   */
  normSquared() {
    let sum = 0;
    for (const amp of this.amplitudes.values()) {
      sum += cAbsSq(amp);
    }
    return sum;
  }

  /**
   * Normalize the waveform to unit norm.
   * @param {number} [epsilon=1e-12]
   */
  normalize(epsilon = 1e-12) {
    const normSq = this.normSquared();
    if (normSq > epsilon) {
      const norm = Math.sqrt(normSq);
      for (const [id, amp] of this.amplitudes) {
        this.amplitudes.set(id, { re: amp.re / norm, im: amp.im / norm });
      }
    }
  }

  /**
   * Scale all amplitudes by a real factor.
   * @param {number} realFactor
   */
  scale(realFactor) {
    for (const [id, amp] of this.amplitudes) {
      this.amplitudes.set(id, { re: amp.re * realFactor, im: amp.im * realFactor });
    }
  }

  /**
   * Add another waveform in-place.
   * @param {Waveform} other
   */
  add(other) {
    for (const [id, otherAmp] of other.amplitudes) {
      const thisAmp = this.get(id);
      this.amplitudes.set(id, cAdd(thisAmp, otherAmp));
    }
  }

  /**
   * Compute inner product: sum of conj(this[id]) * other[id].
   * @param {Waveform} other
   * @returns {{ re: number, im: number }}
   */
  innerProduct(other) {
    let result = { re: 0, im: 0 };

    // Union of keys from both waveforms
    const allKeys = new Set([...this.keys(), ...other.keys()]);

    for (const id of allKeys) {
      const thisAmp = this.get(id);
      const otherAmp = other.get(id);
      const term = cMul(cConj(thisAmp), otherAmp);
      result = cAdd(result, term);
    }

    return result;
  }

  /**
   * Serialize to plain object.
   * @returns {{ [id: string]: { re: number, im: number } }}
   */
  toJSON() {
    const obj = {};
    for (const [id, amp] of this.amplitudes) {
      obj[id] = { re: amp.re, im: amp.im };
    }
    return obj;
  }
}
