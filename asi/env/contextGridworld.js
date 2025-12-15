// Environment: Context Gridworld

// ============================================================
// ContextGridworld - Simple environment with hidden rules
// ============================================================

/**
 * Available cell colors.
 */
const COLORS = ["green", "red", "blue", "yellow"];

/**
 * Available context rules.
 */
const CONTEXT_RULES = [
  "nearest_green",   // Reward for moving toward nearest green
  "farthest_green",  // Reward for moving toward farthest green
  "nearest_red",     // Reward for moving toward nearest red
  "avoid_blue",      // Penalty for being near blue
  "collect_yellow"   // Reward for stepping on yellow
];

/**
 * ContextGridworld: a simple gridworld with changing hidden rules (contexts).
 */
export class ContextGridworld {
  /**
   * @param {object} [options={}]
   * @param {number} [options.width=5]
   * @param {number} [options.height=5]
   * @param {number} [options.seed=null] - Random seed (uses Math.random if null)
   */
  constructor(options = {}) {
    this.width = options.width || 5;
    this.height = options.height || 5;
    this.seed = options.seed;

    // Initialize RNG state
    this._rngState = this.seed || Math.floor(Math.random() * 1000000);

    // Context definitions
    this.contexts = CONTEXT_RULES;

    // Initialize state
    this.grid = [];
    this.agentPosition = { x: 0, y: 0 };
    this.currentContext = null;
    this.stepCount = 0;
    this.maxSteps = 50;

    this.reset();
  }

  /**
   * Simple PRNG (Linear Congruential Generator).
   * @returns {number} Random number in [0, 1)
   */
  _random() {
    this._rngState = (this._rngState * 1664525 + 1013904223) % 4294967296;
    return this._rngState / 4294967296;
  }

  /**
   * Random integer in [0, max).
   * @param {number} max
   * @returns {number}
   */
  _randomInt(max) {
    return Math.floor(this._random() * max);
  }

  /**
   * Pick random element from array.
   * @param {Array} arr
   * @returns {*}
   */
  _randomChoice(arr) {
    return arr[this._randomInt(arr.length)];
  }

  /**
   * Reset the environment.
   * @returns {{ observation: object, info: object }}
   */
  reset() {
    this.stepCount = 0;

    // Randomize current context
    this.currentContext = this._randomChoice(this.contexts);

    // Randomize grid
    this.grid = [];
    for (let y = 0; y < this.height; y++) {
      const row = [];
      for (let x = 0; x < this.width; x++) {
        row.push({
          color: this._randomChoice(COLORS),
          reward: this._random() * 0.5 - 0.25 // Small random base reward
        });
      }
      this.grid.push(row);
    }

    // Ensure at least one green and one red cell
    this.grid[this._randomInt(this.height)][this._randomInt(this.width)].color = "green";
    this.grid[this._randomInt(this.height)][this._randomInt(this.width)].color = "red";

    // Reset agent position
    this.agentPosition = {
      x: this._randomInt(this.width),
      y: this._randomInt(this.height)
    };

    return {
      observation: this.getObservation(),
      info: { contextId: this.currentContext }
    };
  }

  /**
   * Take a step in the environment.
   * @param {string} action - "up", "down", "left", "right"
   * @returns {{ observation: object, reward: number, done: boolean, info: object }}
   */
  step(action) {
    this.stepCount++;

    // Store old position for reward computation
    const oldPos = { ...this.agentPosition };

    // Update position based on action
    switch (action) {
      case "up":
        this.agentPosition.y = Math.max(0, this.agentPosition.y - 1);
        break;
      case "down":
        this.agentPosition.y = Math.min(this.height - 1, this.agentPosition.y + 1);
        break;
      case "left":
        this.agentPosition.x = Math.max(0, this.agentPosition.x - 1);
        break;
      case "right":
        this.agentPosition.x = Math.min(this.width - 1, this.agentPosition.x + 1);
        break;
    }

    // Compute reward based on current context
    const reward = this._computeReward(oldPos, this.agentPosition);

    // Check if done
    const done = this.stepCount >= this.maxSteps;

    return {
      observation: this.getObservation(),
      reward,
      done,
      info: {
        contextId: this.currentContext,
        stepCount: this.stepCount
      }
    };
  }

  /**
   * Compute reward based on current context.
   * @param {{ x: number, y: number }} oldPos
   * @param {{ x: number, y: number }} newPos
   * @returns {number}
   */
  _computeReward(oldPos, newPos) {
    const currentCell = this.grid[newPos.y][newPos.x];
    let reward = currentCell.reward; // Base cell reward

    switch (this.currentContext) {
      case "nearest_green": {
        const oldDist = this._distanceToNearestColor(oldPos, "green");
        const newDist = this._distanceToNearestColor(newPos, "green");
        reward += (oldDist - newDist) * 0.5; // Reward for getting closer
        if (currentCell.color === "green") reward += 1.0;
        break;
      }
      case "farthest_green": {
        const oldDist = this._distanceToNearestColor(oldPos, "green");
        const newDist = this._distanceToNearestColor(newPos, "green");
        reward += (newDist - oldDist) * 0.5; // Reward for getting farther
        break;
      }
      case "nearest_red": {
        const oldDist = this._distanceToNearestColor(oldPos, "red");
        const newDist = this._distanceToNearestColor(newPos, "red");
        reward += (oldDist - newDist) * 0.5;
        if (currentCell.color === "red") reward += 1.0;
        break;
      }
      case "avoid_blue": {
        const blueDist = this._distanceToNearestColor(newPos, "blue");
        if (blueDist < 2) reward -= 0.5;
        if (currentCell.color === "blue") reward -= 1.0;
        break;
      }
      case "collect_yellow": {
        if (currentCell.color === "yellow") reward += 1.0;
        break;
      }
    }

    return reward;
  }

  /**
   * Calculate Manhattan distance to nearest cell of a given color.
   * @param {{ x: number, y: number }} pos
   * @param {string} color
   * @returns {number}
   */
  _distanceToNearestColor(pos, color) {
    let minDist = Infinity;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x].color === color) {
          const dist = Math.abs(pos.x - x) + Math.abs(pos.y - y);
          if (dist < minDist) minDist = dist;
        }
      }
    }
    return minDist === Infinity ? this.width + this.height : minDist;
  }

  /**
   * Get current observation (local neighborhood + context hint symbol).
   * @returns {object}
   */
  getObservation() {
    const { x, y } = this.agentPosition;

    // Local 3x3 neighborhood
    const neighborhood = [];
    for (let dy = -1; dy <= 1; dy++) {
      const row = [];
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
          row.push(this.grid[ny][nx].color);
        } else {
          row.push("wall");
        }
      }
      neighborhood.push(row);
    }

    // Context hint symbol (shown at episode start, encodes context partially)
    const contextHint = this._getContextHint();

    return {
      position: { x, y },
      neighborhood,
      currentCellColor: this.grid[y][x].color,
      contextHint,
      stepCount: this.stepCount
    };
  }

  /**
   * Get a partial hint about the context (for the agent to decode).
   * @returns {string}
   */
  _getContextHint() {
    // Provide ambiguous hints that require inference
    const hints = {
      "nearest_green": "seek_color",
      "farthest_green": "flee_color",
      "nearest_red": "seek_color",
      "avoid_blue": "flee_color",
      "collect_yellow": "collect"
    };
    return hints[this.currentContext] || "unknown";
  }

  /**
   * Get full grid state (for visualization/debugging).
   * @returns {object}
   */
  toJSON() {
    return {
      width: this.width,
      height: this.height,
      grid: this.grid,
      agentPosition: this.agentPosition,
      currentContext: this.currentContext,
      stepCount: this.stepCount
    };
  }
}
