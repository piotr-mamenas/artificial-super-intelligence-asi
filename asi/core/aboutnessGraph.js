// Core: Aboutness Graph

import { Occurrence, AboutnessRelation } from './occurrences.js';

/**
 * AboutnessGraph: a directed graph of occurrences connected by aboutness relations.
 * Nodes = Occurrences, Edges = AboutnessRelations (directed, no self-loops).
 */
export class AboutnessGraph {
  constructor() {
    /** @type {Map<string, Occurrence>} */
    this.occurrences = new Map();
    /** @type {Map<string, AboutnessRelation[]>} */
    this.outgoing = new Map();
    /** @type {Map<string, AboutnessRelation[]>} */
    this.incoming = new Map();
  }

  /**
   * Add an occurrence to the graph.
   * @param {Occurrence} occurrence
   */
  addOccurrence(occurrence) {
    this.occurrences.set(occurrence.id, occurrence);
    if (!this.outgoing.has(occurrence.id)) {
      this.outgoing.set(occurrence.id, []);
    }
    if (!this.incoming.has(occurrence.id)) {
      this.incoming.set(occurrence.id, []);
    }
  }

  /**
   * Get an occurrence by id.
   * @param {string} id
   * @returns {Occurrence | undefined}
   */
  getOccurrence(id) {
    return this.occurrences.get(id);
  }

  /**
   * Add an aboutness relation between two occurrences.
   * @param {string} fromId
   * @param {string} toId
   * @param {number} [weight=1]
   * @param {object} [metadata={}]
   * @throws {Error} If fromId or toId not in graph, or if self-reference
   */
  addRelation(fromId, toId, weight = 1, metadata = {}) {
    if (!this.occurrences.has(fromId)) {
      throw new Error(`AboutnessGraph: occurrence '${fromId}' not found`);
    }
    if (!this.occurrences.has(toId)) {
      throw new Error(`AboutnessGraph: occurrence '${toId}' not found`);
    }
    // AboutnessRelation constructor enforces no self-reference
    const relation = new AboutnessRelation({ from: fromId, to: toId, weight, metadata });
    this.outgoing.get(fromId).push(relation);
    this.incoming.get(toId).push(relation);
  }

  /**
   * Get all outgoing relations from an occurrence.
   * @param {string} fromId
   * @returns {AboutnessRelation[]}
   */
  getOutgoing(fromId) {
    return this.outgoing.get(fromId) || [];
  }

  /**
   * Get all incoming relations to an occurrence.
   * @param {string} toId
   * @returns {AboutnessRelation[]}
   */
  getIncoming(toId) {
    return this.incoming.get(toId) || [];
  }

  /**
   * Remove an occurrence and all relations involving it.
   * @param {string} id
   */
  removeOccurrence(id) {
    if (!this.occurrences.has(id)) return;

    // Remove all outgoing relations from this node
    const outRels = this.outgoing.get(id) || [];
    for (const rel of outRels) {
      const inList = this.incoming.get(rel.to);
      if (inList) {
        const idx = inList.indexOf(rel);
        if (idx !== -1) inList.splice(idx, 1);
      }
    }

    // Remove all incoming relations to this node
    const inRels = this.incoming.get(id) || [];
    for (const rel of inRels) {
      const outList = this.outgoing.get(rel.from);
      if (outList) {
        const idx = outList.indexOf(rel);
        if (idx !== -1) outList.splice(idx, 1);
      }
    }

    // Remove the node itself
    this.occurrences.delete(id);
    this.outgoing.delete(id);
    this.incoming.delete(id);
  }

  /**
   * Remove all relations from fromId to toId.
   * @param {string} fromId
   * @param {string} toId
   */
  removeRelation(fromId, toId) {
    const outList = this.outgoing.get(fromId);
    if (outList) {
      for (let i = outList.length - 1; i >= 0; i--) {
        if (outList[i].to === toId) {
          outList.splice(i, 1);
        }
      }
    }

    const inList = this.incoming.get(toId);
    if (inList) {
      for (let i = inList.length - 1; i >= 0; i--) {
        if (inList[i].from === fromId) {
          inList.splice(i, 1);
        }
      }
    }
  }

  /**
   * Get all occurrences in the graph.
   * @returns {Occurrence[]}
   */
  getAllOccurrences() {
    return Array.from(this.occurrences.values());
  }

  /**
   * Get all relations in the graph.
   * @returns {AboutnessRelation[]}
   */
  getAllRelations() {
    const relations = [];
    for (const rels of this.outgoing.values()) {
      relations.push(...rels);
    }
    return relations;
  }

  /**
   * Serialize the graph to a plain object.
   * @returns {{ occurrences: object[], relations: object[] }}
   */
  toJSON() {
    return {
      occurrences: this.getAllOccurrences().map(o => o.toJSON()),
      relations: this.getAllRelations().map(r => r.toJSON())
    };
  }
}
