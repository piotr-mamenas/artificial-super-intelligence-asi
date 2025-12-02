/**
 * Planner: Proposes action plans based on goals and world model.
 */

import { v4 as uuidv4 } from 'uuid';
import { SelfWorldFrame } from '../world/self-world-frame';
import { Goal, GoalProgress } from './goals';
import { HorizonWaveEvent, createHorizonEvent } from '../world/horizon';
import { WaveState, superpose, calculateFidelity } from '../core/ontology/wave-state';

export interface CandidatePlan {
  id: string;
  description: string;
  proposedActions: HorizonWaveEvent[];
  expectedValue: number;
  confidence: number;
  rationaleSteps: string[];
  targetGoalIds: string[];
}

export interface Planner {
  proposePlans(frame: SelfWorldFrame, goals: Goal[], progress: GoalProgress[]): Promise<CandidatePlan[]>;
  selectBestPlan(plans: CandidatePlan[]): CandidatePlan | null;
  refinePlan(plan: CandidatePlan, feedback: PlanFeedback): CandidatePlan;
}

export interface PlanFeedback {
  planId: string;
  success: boolean;
  actualValue: number;
  notes: string[];
}

/**
 * Create a planner for generating action plans.
 */
export function createPlanner(): Planner {
  return {
    async proposePlans(
      frame: SelfWorldFrame,
      goals: Goal[],
      progress: GoalProgress[]
    ): Promise<CandidatePlan[]> {
      const plans: CandidatePlan[] = [];
      
      // Generate plans for each active goal
      for (const goal of goals) {
        const goalProgress = progress.find(p => p.goalId === goal.id);
        
        // Plan 1: Direct approach - move toward goal wave
        const directPlan = generateDirectPlan(frame, goal, goalProgress);
        plans.push(directPlan);
        
        // Plan 2: Exploratory approach - disperse to find better path
        const exploratoryPlan = generateExploratoryPlan(frame, goal, goalProgress);
        plans.push(exploratoryPlan);
      }
      
      // Add a null/wait plan
      plans.push({
        id: uuidv4(),
        description: 'Wait and observe',
        proposedActions: [],
        expectedValue: 0.1,
        confidence: 0.9,
        rationaleSteps: ['No immediate action needed', 'Gather more information'],
        targetGoalIds: []
      });
      
      return plans;
    },
    
    selectBestPlan(plans: CandidatePlan[]): CandidatePlan | null {
      if (plans.length === 0) return null;
      
      // Score each plan by expected value * confidence
      let bestPlan = plans[0];
      let bestScore = plans[0].expectedValue * plans[0].confidence;
      
      for (let i = 1; i < plans.length; i++) {
        const score = plans[i].expectedValue * plans[i].confidence;
        if (score > bestScore) {
          bestScore = score;
          bestPlan = plans[i];
        }
      }
      
      return bestPlan;
    },
    
    refinePlan(plan: CandidatePlan, feedback: PlanFeedback): CandidatePlan {
      // Adjust expected value based on feedback
      const adjustment = feedback.success ? 1.1 : 0.9;
      
      return {
        ...plan,
        id: uuidv4(),
        expectedValue: plan.expectedValue * adjustment,
        confidence: Math.min(1, plan.confidence * (feedback.success ? 1.05 : 0.95)),
        rationaleSteps: [...plan.rationaleSteps, ...feedback.notes]
      };
    }
  };
}

/**
 * Generate a direct approach plan.
 */
function generateDirectPlan(
  frame: SelfWorldFrame,
  goal: Goal,
  progress?: GoalProgress
): CandidatePlan {
  const rationale: string[] = [];
  
  // Calculate how to move toward goal
  const currentFidelity = progress?.fidelity ?? calculateFidelity(frame.closureState, goal.goalWave);
  rationale.push(`Current fidelity to goal: ${currentFidelity.toFixed(3)}`);
  
  // Create action that moves toward goal
  const targetWave = superpose(frame.closureState, goal.goalWave, 0.7);
  const action = createHorizonEvent('OUTBOUND', 'motor', targetWave, frame.logicalTime.tick);
  
  rationale.push('Moving directly toward goal wave');
  
  return {
    id: uuidv4(),
    description: `Direct approach to ${goal.name}`,
    proposedActions: [action],
    expectedValue: goal.priority * (1 - currentFidelity) * 0.8,
    confidence: 0.7,
    rationaleSteps: rationale,
    targetGoalIds: [goal.id]
  };
}

/**
 * Generate an exploratory plan.
 */
function generateExploratoryPlan(
  frame: SelfWorldFrame,
  goal: Goal,
  progress?: GoalProgress
): CandidatePlan {
  const rationale: string[] = [];
  
  const improvement = progress?.improvement ?? 0;
  rationale.push(`Recent improvement: ${improvement.toFixed(4)}`);
  
  // If stuck (no improvement), explore more
  const exploreWeight = improvement <= 0 ? 0.8 : 0.3;
  rationale.push(`Exploration weight: ${exploreWeight.toFixed(2)}`);
  
  // Create dispersed action
  const exploratoryWave = superpose(frame.referenceState, goal.goalWave, exploreWeight);
  const action = createHorizonEvent('OUTBOUND', 'motor', exploratoryWave, frame.logicalTime.tick);
  
  return {
    id: uuidv4(),
    description: `Exploratory approach to ${goal.name}`,
    proposedActions: [action],
    expectedValue: goal.priority * 0.5,
    confidence: 0.5,
    rationaleSteps: rationale,
    targetGoalIds: [goal.id]
  };
}

/**
 * Evaluate a plan's expected outcome.
 */
export function evaluatePlan(
  plan: CandidatePlan,
  currentFrame: SelfWorldFrame,
  goals: Goal[]
): number {
  let totalValue = 0;
  
  for (const goalId of plan.targetGoalIds) {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) continue;
    
    // Estimate how much this plan would improve goal progress
    const currentFidelity = calculateFidelity(currentFrame.closureState, goal.goalWave);
    const expectedFidelity = currentFidelity + 0.1 * plan.confidence;
    
    totalValue += (expectedFidelity - currentFidelity) * goal.priority;
  }
  
  return totalValue;
}
