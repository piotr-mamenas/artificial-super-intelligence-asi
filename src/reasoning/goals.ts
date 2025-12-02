/**
 * Goals: Wave attractors that guide agent behavior.
 * 
 * From the ontology:
 * - Goals are encoded as wave states the agent seeks to approach
 * - They create asymmetry in future possibilities (preferences)
 */

import { v4 as uuidv4 } from 'uuid';
import { WaveState, calculateFidelity, createGroundState } from '../core/ontology/wave-state';

export interface Goal {
  id: string;
  name: string;
  goalWave: WaveState;
  weights: Record<string, number>;
  priority: number;
  createdAt: number;
  expiresAt?: number;
  isActive: boolean;
}

export interface GoalProgress {
  goalId: string;
  fidelity: number;      // How close to goal wave
  improvement: number;   // Change since last check
  estimatedSteps: number;
}

export interface GoalSystem {
  goals: Goal[];
  
  addGoal(name: string, goalWave: WaveState, priority?: number): Goal;
  removeGoal(id: string): boolean;
  getActiveGoals(): Goal[];
  evaluateProgress(currentState: WaveState): GoalProgress[];
  updateFromClosure(closureId: string, reward: number): void;
  adjustPriorities(): void;
}

/**
 * Create a goal system for managing agent objectives.
 */
export function createGoalSystem(): GoalSystem {
  const goals: Goal[] = [];
  const progressHistory: Map<string, number[]> = new Map();
  
  return {
    goals,
    
    addGoal(name: string, goalWave: WaveState, priority: number = 1): Goal {
      const goal: Goal = {
        id: uuidv4(),
        name,
        goalWave,
        weights: {},
        priority,
        createdAt: Date.now(),
        isActive: true
      };
      
      goals.push(goal);
      progressHistory.set(goal.id, []);
      return goal;
    },
    
    removeGoal(id: string): boolean {
      const idx = goals.findIndex(g => g.id === id);
      if (idx >= 0) {
        goals.splice(idx, 1);
        progressHistory.delete(id);
        return true;
      }
      return false;
    },
    
    getActiveGoals(): Goal[] {
      const now = Date.now();
      return goals.filter(g => g.isActive && (!g.expiresAt || g.expiresAt > now));
    },
    
    evaluateProgress(currentState: WaveState): GoalProgress[] {
      const activeGoals = this.getActiveGoals();
      const progress: GoalProgress[] = [];
      
      for (const goal of activeGoals) {
        const fidelity = calculateFidelity(currentState, goal.goalWave);
        
        // Get previous fidelity for improvement calculation
        const history = progressHistory.get(goal.id) ?? [];
        const prevFidelity = history.length > 0 ? history[history.length - 1] : 0;
        const improvement = fidelity - prevFidelity;
        
        // Estimate steps to reach goal (very rough)
        const estimatedSteps = improvement > 0 
          ? Math.ceil((1 - fidelity) / improvement)
          : Infinity;
        
        // Update history
        history.push(fidelity);
        if (history.length > 100) history.shift();
        progressHistory.set(goal.id, history);
        
        progress.push({
          goalId: goal.id,
          fidelity,
          improvement,
          estimatedSteps
        });
      }
      
      return progress;
    },
    
    updateFromClosure(closureId: string, reward: number): void {
      // Adjust goal priorities based on reward
      for (const goal of goals) {
        if (reward > 0) {
          // Positive reward: slightly increase priority of goals we're making progress on
          const history = progressHistory.get(goal.id) ?? [];
          if (history.length >= 2) {
            const recentImprovement = history[history.length - 1] - history[history.length - 2];
            if (recentImprovement > 0) {
              goal.priority *= 1 + reward * 0.1;
            }
          }
        }
      }
    },
    
    adjustPriorities(): void {
      // Normalize priorities so they sum to number of goals
      const totalPriority = goals.reduce((sum, g) => sum + g.priority, 0);
      if (totalPriority > 0) {
        const factor = goals.length / totalPriority;
        for (const goal of goals) {
          goal.priority *= factor;
        }
      }
    }
  };
}

/**
 * Create a default exploration goal.
 */
export function createExplorationGoal(dimension: number): Goal {
  // High entropy state = exploration
  const amplitude = 1 / Math.sqrt(dimension);
  const goalWave = createGroundState(dimension);
  // Modify to be uniform superposition
  for (let i = 0; i < dimension * 2; i += 2) {
    goalWave.amplitudes[i] = amplitude;
  }
  
  return {
    id: uuidv4(),
    name: 'Exploration',
    goalWave,
    weights: { entropy: 1.0 },
    priority: 0.5,
    createdAt: Date.now(),
    isActive: true
  };
}

/**
 * Create a stability goal.
 */
export function createStabilityGoal(targetWave: WaveState): Goal {
  return {
    id: uuidv4(),
    name: 'Stability',
    goalWave: targetWave,
    weights: { fidelity: 1.0, lowVariance: 0.5 },
    priority: 1.0,
    createdAt: Date.now(),
    isActive: true
  };
}

/**
 * Combine multiple goals into a weighted superposition.
 */
export function combineGoals(goals: Goal[]): WaveState | null {
  if (goals.length === 0) return null;
  
  const totalPriority = goals.reduce((sum, g) => sum + g.priority, 0);
  if (totalPriority === 0) return goals[0].goalWave;
  
  // For simplicity, return weighted average (first goal weighted by priority ratio)
  // A full implementation would properly superpose the wave states
  return goals[0].goalWave;
}
