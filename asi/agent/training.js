// Agent: Training

import { Agent } from './agent.js';
import { ContextGridworld } from '../env/contextGridworld.js';
import { ValueField } from '../cognitive/valueEmotion.js';
import { Occurrence } from '../core/occurrences.js';

// ============================================================
// TrainingLoop - Minimal training scaffolding
// ============================================================

/**
 * TrainingLoop: wires agent and environment for training.
 */
export class TrainingLoop {
  /**
   * @param {object} config
   * @param {Agent} config.agent
   * @param {ContextGridworld} config.env
   * @param {number} [config.episodes=10]
   * @param {number} [config.maxStepsPerEpisode=50]
   */
  constructor(config) {
    this.agent = config.agent;
    this.env = config.env;
    this.episodes = config.episodes || 10;
    this.maxStepsPerEpisode = config.maxStepsPerEpisode || 50;
    this.valueField = this.agent.valueField;
    this.history = [];
  }

  /**
   * Run the training loop.
   * @returns {object} Summary of training
   */
  run() {
    for (let episode = 0; episode < this.episodes; episode++) {
      const episodeLog = this._runEpisode(episode);
      this.history.push(episodeLog);
    }

    return this.toJSON();
  }

  /**
   * Run a single episode.
   * @param {number} episodeIndex
   * @returns {object} Episode summary
   */
  _runEpisode(episodeIndex) {
    const { observation, info } = this.env.reset();
    let totalReward = 0;
    let steps = 0;
    const rewards = [];

    for (let step = 0; step < this.maxStepsPerEpisode; step++) {
      // Translate observation to agent graph updates (stub)
      this._updateAgentFromObservation(observation, step);

      // Agent step
      this.agent.step({ observation, episodeIndex, step });

      // Choose action (stub: simple heuristic based on context hint)
      const action = this._chooseAction(observation);

      // Environment step
      const result = this.env.step(action);
      const { reward, done } = result;

      // Update value field for current state (stub)
      this._updateValueField(observation, reward);

      totalReward += reward;
      rewards.push(reward);
      steps++;

      if (done) break;
    }

    // Evaluate agent emotion at end of episode
    const emotionResult = this.agent.evaluateEmotion();

    return {
      episode: episodeIndex,
      steps,
      totalReward,
      avgReward: totalReward / steps,
      contextId: info.contextId,
      finalEmotion: emotionResult.emotion,
      residual: emotionResult.residual
    };
  }

  /**
   * Update agent's aboutness graph from observation (stub).
   * @param {object} observation
   * @param {number} step
   */
  _updateAgentFromObservation(observation, step) {
    // Create occurrence for current observation
    const occId = `obs:${observation.position.x},${observation.position.y}:${step}`;
    
    // Check if occurrence already exists
    if (!this.agent.graph.getOccurrence(occId)) {
      const occ = new Occurrence({
        id: occId,
        mode: "U",
        payload: {
          position: observation.position,
          color: observation.currentCellColor,
          hint: observation.contextHint
        },
        metadata: { step }
      });
      this.agent.graph.addOccurrence(occ);

      // Link to previous observation if exists
      if (step > 0) {
        const prevOccId = `obs:${observation.position.x},${observation.position.y}:${step - 1}`;
        if (this.agent.graph.getOccurrence(prevOccId)) {
          try {
            this.agent.graph.addRelation(prevOccId, occId, 1.0, { type: "temporal" });
          } catch (e) {
            // Ignore self-reference errors
          }
        }
      }
    }
  }

  /**
   * Choose an action based on observation (stub: simple heuristic).
   * @param {object} observation
   * @returns {string}
   */
  _chooseAction(observation) {
    const actions = ["up", "down", "left", "right"];
    const { neighborhood, contextHint } = observation;

    // Simple heuristic based on context hint
    if (contextHint === "seek_color") {
      // Look for green or red in neighborhood and move toward it
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const color = neighborhood[dy + 1]?.[dx + 1];
          if (color === "green" || color === "red") {
            if (dy < 0) return "up";
            if (dy > 0) return "down";
            if (dx < 0) return "left";
            if (dx > 0) return "right";
          }
        }
      }
    } else if (contextHint === "flee_color") {
      // Move away from green/blue
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const color = neighborhood[dy + 1]?.[dx + 1];
          if (color === "green" || color === "blue") {
            // Move opposite direction
            if (dy < 0) return "down";
            if (dy > 0) return "up";
            if (dx < 0) return "right";
            if (dx > 0) return "left";
          }
        }
      }
    } else if (contextHint === "collect") {
      // Look for yellow
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const color = neighborhood[dy + 1]?.[dx + 1];
          if (color === "yellow") {
            if (dy < 0) return "up";
            if (dy > 0) return "down";
            if (dx < 0) return "left";
            if (dx > 0) return "right";
          }
        }
      }
    }

    // Random fallback
    return actions[Math.floor(Math.random() * actions.length)];
  }

  /**
   * Update value field based on observation and reward (stub).
   * @param {object} observation
   * @param {number} reward
   */
  _updateValueField(observation, reward) {
    const stateId = `pos:${observation.position.x},${observation.position.y}`;
    const currentValue = this.valueField.getValue(stateId, 0.5);
    // Simple exponential moving average
    const alpha = 0.1;
    const newValue = currentValue * (1 - alpha) + (reward + 0.5) * alpha;
    this.valueField.setValue(stateId, Math.max(0, Math.min(1, newValue)));
  }

  /**
   * Get training metrics summary.
   * @returns {object}
   */
  toJSON() {
    const totalEpisodes = this.history.length;
    const totalRewards = this.history.map(h => h.totalReward);
    const avgReward = totalRewards.reduce((a, b) => a + b, 0) / totalEpisodes;

    const emotions = {};
    for (const h of this.history) {
      emotions[h.finalEmotion] = (emotions[h.finalEmotion] || 0) + 1;
    }

    return {
      totalEpisodes,
      avgRewardPerEpisode: avgReward,
      minReward: Math.min(...totalRewards),
      maxReward: Math.max(...totalRewards),
      emotionDistribution: emotions,
      history: this.history
    };
  }
}
