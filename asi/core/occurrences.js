// Core: Occurrences

/**
 * Occurrence: an internal event in the ontology.
 * Modes: "U" (Unity), "D" (Duality), "R" (Relation)
 */
export class Occurrence {
  /**
   * @param {object} options
   * @param {string} options.id - Unique identifier
   * @param {string} [options.mode="U"] - One of "U" | "D" | "R"
   * @param {any} [options.payload=null] - Arbitrary content
   * @param {object} [options.metadata={}] - Optional metadata
   */
  constructor({ id, mode = "U", payload = null, metadata = {} }) {
    this.id = id;
    this.mode = mode;
    this.payload = payload;
    this.metadata = metadata;
  }

  /**
   * Clone this occurrence with a new mode.
   * @param {string} newMode - The new mode ("U" | "D" | "R")
   * @returns {Occurrence}
   */
  cloneWithMode(newMode) {
    return new Occurrence({
      id: this.id,
      mode: newMode,
      payload: this.payload,
      metadata: { ...this.metadata }
    });
  }

  /**
   * Serialize to plain object.
   * @returns {object}
   */
  toJSON() {
    return {
      id: this.id,
      mode: this.mode,
      payload: this.payload,
      metadata: this.metadata
    };
  }
}

/**
 * AboutnessRelation: a directed "is-about" relation between occurrences.
 * No direct self-reference allowed (from !== to).
 */
export class AboutnessRelation {
  /**
   * @param {object} options
   * @param {string} options.from - Source occurrence id
   * @param {string} options.to - Target occurrence id
   * @param {number} [options.weight=1] - Relation weight
   * @param {object} [options.metadata={}] - Optional metadata
   * @throws {Error} If from === to (no self-reference)
   */
  constructor({ from, to, weight = 1, metadata = {} }) {
    if (from === to) {
      throw new Error("AboutnessRelation: no direct self-reference allowed (from === to)");
    }
    this.from = from;
    this.to = to;
    this.weight = weight;
    this.metadata = metadata;
  }

  /**
   * Serialize to plain object.
   * @returns {object}
   */
  toJSON() {
    return {
      from: this.from,
      to: this.to,
      weight: this.weight,
      metadata: this.metadata
    };
  }
}

/**
 * Factory: create a triune set of occurrences (Unity, Duality, Relation).
 * @param {string} baseId - Base identifier
 * @param {any} payload - Shared payload
 * @param {object} [baseMetadata={}] - Shared metadata
 * @returns {{ unity: Occurrence, duality: Occurrence, relation: Occurrence }}
 */
export function createTriuneOccurrences(baseId, payload, baseMetadata = {}) {
  return {
    unity: new Occurrence({
      id: `${baseId}:U`,
      mode: "U",
      payload,
      metadata: { ...baseMetadata }
    }),
    duality: new Occurrence({
      id: `${baseId}:D`,
      mode: "D",
      payload,
      metadata: { ...baseMetadata }
    }),
    relation: new Occurrence({
      id: `${baseId}:R`,
      mode: "R",
      payload,
      metadata: { ...baseMetadata }
    })
  };
}
