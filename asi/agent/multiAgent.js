// Agent: Multi-Agent

import { Agent } from './agent.js';
import { ConsensusWorld } from '../cognitive/xyzBubbles.js';
import { StateSpace } from '../core/states.js';
import { ContextSystem } from '../core/contexts.js';

// ============================================================
// MultiAgentSystem - Manages multiple agents and consensus
// ============================================================

/**
 * MultiAgentSystem: manages multiple ASI agents and builds
 * shared consensus from their stable patterns.
 */
export class MultiAgentSystem {
  constructor() {
    /** @type {Map<string, Agent>} */
    this.agents = new Map();
  }

  /**
   * Add an agent to the system.
   * @param {Agent} agent
   */
  addAgent(agent) {
    this.agents.set(agent.id, agent);
  }

  /**
   * Get an agent by id.
   * @param {string} id
   * @returns {Agent | undefined}
   */
  getAgent(id) {
    return this.agents.get(id);
  }

  /**
   * Get all agents.
   * @returns {Agent[]}
   */
  getAllAgents() {
    return Array.from(this.agents.values());
  }

  /**
   * Step all agents with a shared context.
   * @param {object} [sharedContext={}]
   */
  stepAll(sharedContext = {}) {
    for (const agent of this.agents.values()) {
      agent.step(sharedContext);
    }
  }

  /**
   * Build a global consensus world from all agents.
   * Collects states that appear in most agents' consensus worlds.
   * @param {number} [threshold=0.5] - Fraction of agents that must have a state
   * @returns {ConsensusWorld}
   */
  buildGlobalConsensusWorld(threshold = 0.5) {
    const agentList = this.getAllAgents();
    const agentCount = agentList.length;

    if (agentCount === 0) {
      return new ConsensusWorld(
        new StateSpace(),
        new ContextSystem(),
        { global: true, agentCount: 0 }
      );
    }

    // Count state occurrences across agents
    const stateCount = new Map();
    const stateData = new Map(); // Store state data for reconstruction

    for (const agent of agentList) {
      const states = agent.consensusWorld.stateSpace.getAllStates();
      for (const state of states) {
        const count = stateCount.get(state.id) || 0;
        stateCount.set(state.id, count + 1);
        if (!stateData.has(state.id)) {
          stateData.set(state.id, {
            occurrenceIds: [...state.occurrenceIds],
            metadata: { ...state.metadata }
          });
        }
      }
    }

    // Build consensus state space with states appearing in enough agents
    const minCount = Math.ceil(agentCount * threshold);
    const consensusStateSpace = new StateSpace();
    const consensusStateIds = [];

    for (const [stateId, count] of stateCount) {
      if (count >= minCount) {
        const data = stateData.get(stateId);
        consensusStateSpace.createState(
          stateId,
          data.occurrenceIds,
          { ...data.metadata, consensusCount: count }
        );
        consensusStateIds.push(stateId);
      }
    }

    // Build consensus context system with global context
    const consensusContexts = new ContextSystem();
    consensusContexts.createContext(
      "global-consensus",
      consensusStateIds,
      { description: "Global consensus context from all agents" }
    );

    return new ConsensusWorld(
      consensusStateSpace,
      consensusContexts,
      {
        global: true,
        agentCount,
        threshold,
        consensusStateCount: consensusStateIds.length
      }
    );
  }

  /**
   * Create a combined snapshot of all agents and global consensus.
   * @returns {object}
   */
  toSnapshot() {
    const agentSnapshots = {};
    for (const [id, agent] of this.agents) {
      agentSnapshots[id] = agent.toSnapshot();
    }

    const globalConsensus = this.buildGlobalConsensusWorld();

    return {
      timestamp: Date.now(),
      agentCount: this.agents.size,
      agents: agentSnapshots,
      globalConsensus: {
        stateCount: globalConsensus.stateSpace.getAllStates().length,
        stateIds: globalConsensus.stateSpace.getAllStates().map(s => s.id),
        contextCount: globalConsensus.contexts.getAllContexts().length,
        metadata: globalConsensus.metadata
      }
    };
  }
}
