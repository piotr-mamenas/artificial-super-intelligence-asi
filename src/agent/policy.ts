/**
 * Policy: Agent's decision-making process combining KCBS and wave control.
 * 
 * From the ontology:
 * - Policy modulates the first inversion before closure
 * - Uses internal history and preferences to bias closure paths
 * - This is the operational definition of free will
 */

import { v4 as uuidv4 } from 'uuid';
import { SelfWorldFrame, calculateFrameStability } from '../world/self-world-frame';
import { KCBSController, MeasurementResult, createKCBSController } from './kcbs-controller';
import { WaveLens, FocusDispersionParams, createWaveLens, calculateLensEffect } from './focus-dispersion';
import { KCBSPentagram, KCBSPentagramRotation, KCBSContext } from '../core/math/kcbs-graph';
import { WaveState } from '../core/ontology/wave-state';
import { HorizonWaveEvent, createHorizonEvent } from '../world/horizon';

export interface PolicyDecision {
  id: string;
  rotation: KCBSPentagramRotation;
  context: KCBSContext;
  focusParams: FocusDispersionParams;
  proposedActions: HorizonWaveEvent[];
  confidence: number;
  reasoning: string[];
}

export interface Policy {
  kcbsController: KCBSController;
  waveLens: WaveLens;
  decisionHistory: PolicyDecision[];
  
  decide(frame: SelfWorldFrame): PolicyDecision;
  execute(decision: PolicyDecision, frame: SelfWorldFrame): MeasurementResult;
  learn(result: MeasurementResult, reward: number): void;
  getHistory(): PolicyDecision[];
}

export interface PolicyConfig {
  explorationRate: number;    // 0-1, higher = more exploration
  focusBias: number;          // Bias toward focus vs dispersion
  learningRate: number;       // How fast policy adapts
  historyLength: number;      // How many decisions to remember
}

const DEFAULT_CONFIG: PolicyConfig = {
  explorationRate: 0.3,
  focusBias: 0.0,
  learningRate: 0.1,
  historyLength: 100
};

/**
 * Create a policy for an agent.
 */
export function createPolicy(
  pentagram: KCBSPentagram,
  config: Partial<PolicyConfig> = {}
): Policy {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const kcbsController = createKCBSController(pentagram);
  const waveLens = createWaveLens({ focus: 0.5 + cfg.focusBias, dispersion: 0.5 - cfg.focusBias });
  const decisionHistory: PolicyDecision[] = [];
  
  // Internal state for learning
  let successRate = 0.5;
  let avgReward = 0;
  
  return {
    kcbsController,
    waveLens,
    decisionHistory,
    
    decide(frame: SelfWorldFrame): PolicyDecision {
      const reasoning: string[] = [];
      
      // 1. Analyze frame stability
      const stability = calculateFrameStability(frame);
      reasoning.push(`Frame stability: ${stability.toFixed(3)}`);
      
      // 2. Decide exploration vs exploitation
      const explore = Math.random() < cfg.explorationRate;
      reasoning.push(explore ? 'Mode: Exploration' : 'Mode: Exploitation');
      
      // 3. Select KCBS rotation
      const rotation = kcbsController.selectRotation(frame);
      reasoning.push(`Rotation: ${(rotation.angle * 180 / Math.PI).toFixed(1)}°`);
      
      // 4. Select context
      let context: KCBSContext;
      if (explore) {
        // Random context for exploration
        const randomIdx = Math.floor(Math.random() * 5);
        context = pentagram.contexts[randomIdx];
        reasoning.push(`Random context: ${randomIdx}`);
      } else {
        // Strategic context selection
        context = kcbsController.selectContext(rotation, frame);
        reasoning.push(`Strategic context: ${context.edgeIndex}`);
      }
      
      // 5. Determine focus/dispersion based on stability and history
      let focusParams: FocusDispersionParams;
      if (stability < 0.3) {
        // Unstable: increase dispersion to explore
        focusParams = { focus: 0.3, dispersion: 0.7 };
        reasoning.push('Low stability: increasing dispersion');
      } else if (stability > 0.7) {
        // Stable: increase focus to commit
        focusParams = { focus: 0.7, dispersion: 0.3 };
        reasoning.push('High stability: increasing focus');
      } else {
        // Moderate: use learned balance
        focusParams = {
          focus: 0.5 + cfg.focusBias + (successRate - 0.5) * 0.2,
          dispersion: 0.5 - cfg.focusBias - (successRate - 0.5) * 0.2
        };
        reasoning.push(`Balanced: focus=${focusParams.focus.toFixed(2)}`);
      }
      
      // 6. Generate proposed actions
      const proposedActions: HorizonWaveEvent[] = [];
      // Create an action based on the decision
      const actionWave = waveLens.apply(frame.closureState, focusParams);
      proposedActions.push(createHorizonEvent(
        'OUTBOUND',
        'motor',
        actionWave,
        frame.logicalTime.tick
      ));
      
      // 7. Calculate confidence
      const confidence = stability * successRate;
      reasoning.push(`Confidence: ${confidence.toFixed(3)}`);
      
      const decision: PolicyDecision = {
        id: uuidv4(),
        rotation,
        context,
        focusParams,
        proposedActions,
        confidence,
        reasoning
      };
      
      // Store in history
      decisionHistory.push(decision);
      if (decisionHistory.length > cfg.historyLength) {
        decisionHistory.shift();
      }
      
      return decision;
    },
    
    execute(decision: PolicyDecision, frame: SelfWorldFrame): MeasurementResult {
      // Apply wave lens to current state
      const focusedState = waveLens.apply(frame.closureState, decision.focusParams);
      
      // Perform KCBS measurement
      const result = kcbsController.measure(focusedState, decision.context);
      
      return result;
    },
    
    learn(result: MeasurementResult, reward: number): void {
      // Update success rate
      const success = reward > 0 ? 1 : 0;
      successRate = successRate * (1 - cfg.learningRate) + success * cfg.learningRate;
      
      // Update average reward
      avgReward = avgReward * (1 - cfg.learningRate) + reward * cfg.learningRate;
      
      // Adjust focus bias based on KCBS value
      // More negative KCBS (more contextual) → slight dispersion preference
      if (result.kcbsValue < -2.2) {
        cfg.focusBias = Math.max(-0.3, cfg.focusBias - 0.01);
      } else if (result.kcbsValue > -1.8) {
        cfg.focusBias = Math.min(0.3, cfg.focusBias + 0.01);
      }
    },
    
    getHistory(): PolicyDecision[] {
      return [...decisionHistory];
    }
  };
}

/**
 * Evaluate a policy over multiple frames.
 */
export function evaluatePolicy(
  policy: Policy,
  frames: SelfWorldFrame[]
): { avgConfidence: number; avgKCBS: number; decisions: PolicyDecision[] } {
  const decisions: PolicyDecision[] = [];
  let totalConfidence = 0;
  let totalKCBS = 0;
  
  for (const frame of frames) {
    const decision = policy.decide(frame);
    decisions.push(decision);
    totalConfidence += decision.confidence;
    
    const result = policy.execute(decision, frame);
    totalKCBS += result.kcbsValue;
  }
  
  return {
    avgConfidence: totalConfidence / frames.length,
    avgKCBS: totalKCBS / frames.length,
    decisions
  };
}

/**
 * Create a reactive policy that responds to immediate frame state.
 */
export function createReactivePolicy(pentagram: KCBSPentagram): Policy {
  return createPolicy(pentagram, {
    explorationRate: 0.5,
    focusBias: 0,
    learningRate: 0.2,
    historyLength: 20
  });
}

/**
 * Create a deliberative policy that uses history more heavily.
 */
export function createDeliberativePolicy(pentagram: KCBSPentagram): Policy {
  return createPolicy(pentagram, {
    explorationRate: 0.1,
    focusBias: 0.1,
    learningRate: 0.05,
    historyLength: 200
  });
}
