/**
 * Reality: A coherent bubble of spacetime with its own R/U/C structure.
 * 
 * From the ontology:
 * - Reality is a self-consistent triple (R, U, C)
 * - Each reality has its own frame, dynamics, and closure rules
 * - Realities can nest, with boundaries where closure rules differ
 */

import { v4 as uuidv4 } from 'uuid';
import { Horizon, createHorizon, SimulatedWorld } from './horizon';
import { SelfWorldFrame, createSelfWorldFrame, updateFrameWithEvents, closeFrame } from './self-world-frame';
import { Clock, ClosureState } from '../core/ontology/time';
import { WaveState, createGroundState } from '../core/ontology/wave-state';
import { KCBSPentagram, createKCBSPentagram } from '../core/math/kcbs-graph';
import { Hadron } from '../core/ontology/hadron';
import { BlackHoleRegion } from './black-hole';

export interface Reality {
  id: string;
  name: string;
  horizon: Horizon;
  clock: Clock;
  currentFrame: SelfWorldFrame;
  pentagram: KCBSPentagram;
  hadrons: Hadron[];
  blackHoles: BlackHoleRegion[];
  depth: number;                    // 0 = root reality
  parentRealityId?: string;
  childRealityIds: string[];
  isRunning: boolean;
  
  tick(): Promise<void>;
  start(): void;
  stop(): void;
  getState(): RealityState;
}

export interface RealityState {
  id: string;
  name: string;
  tick: number;
  frameId: string;
  hadronCount: number;
  blackHoleCount: number;
  childCount: number;
  isRunning: boolean;
}

export interface RealityConfig {
  name: string;
  dimension?: number;
  parentRealityId?: string;
  depth?: number;
}

/**
 * Create a new reality with default configuration.
 */
export function createReality(config: RealityConfig): Reality {
  const id = uuidv4();
  const dimension = config.dimension ?? 16;
  const depth = config.depth ?? 0;
  
  const horizon = createHorizon();
  const clock = new Clock(id);
  const initialWave = createGroundState(dimension);
  const currentFrame = createSelfWorldFrame(initialWave, [], clock.getCurrentTime());
  const pentagram = createKCBSPentagram(depth);
  
  const reality: Reality = {
    id,
    name: config.name,
    horizon,
    clock,
    currentFrame,
    pentagram,
    hadrons: [],
    blackHoles: [],
    depth,
    parentRealityId: config.parentRealityId,
    childRealityIds: [],
    isRunning: false,
    
    async tick(): Promise<void> {
      // 1. Pull observations from horizon
      const observations = await this.horizon.pullObservations();
      
      // 2. Advance clock
      const newTime = this.clock.advance();
      
      // 3. Update frame with observations
      this.currentFrame = updateFrameWithEvents(this.currentFrame, observations, newTime);
      
      // 4. Record moment
      this.clock.recordMoment(ClosureState.INVERTED, this.currentFrame.id);
      
      // 5. Close frame (apply second inversion)
      this.currentFrame = closeFrame(this.currentFrame);
      
      // 6. Record closure
      this.clock.recordMoment(ClosureState.CLOSED, this.currentFrame.id);
    },
    
    start(): void {
      this.isRunning = true;
    },
    
    stop(): void {
      this.isRunning = false;
    },
    
    getState(): RealityState {
      return {
        id: this.id,
        name: this.name,
        tick: this.clock.getTick(),
        frameId: this.currentFrame.id,
        hadronCount: this.hadrons.length,
        blackHoleCount: this.blackHoles.length,
        childCount: this.childRealityIds.length,
        isRunning: this.isRunning
      };
    }
  };
  
  return reality;
}

/**
 * Run a single tick cycle on a reality.
 */
export async function tickReality(reality: Reality): Promise<void> {
  await reality.tick();
}

/**
 * Run multiple ticks on a reality.
 */
export async function runReality(
  reality: Reality,
  numTicks: number,
  onTick?: (state: RealityState) => void
): Promise<void> {
  reality.start();
  
  for (let i = 0; i < numTicks && reality.isRunning; i++) {
    await reality.tick();
    if (onTick) {
      onTick(reality.getState());
    }
  }
  
  reality.stop();
}

/**
 * Connect a simulated world to a reality.
 */
export function connectSimulatedWorld(reality: Reality): SimulatedWorld {
  return new SimulatedWorld(reality.horizon);
}

/**
 * Add a hadron to reality.
 */
export function addHadron(reality: Reality, hadron: Hadron): void {
  reality.hadrons.push(hadron);
}

/**
 * Add a black hole to reality.
 */
export function addBlackHole(reality: Reality, blackHole: BlackHoleRegion): void {
  reality.blackHoles.push(blackHole);
}

/**
 * Register a child reality.
 */
export function addChildReality(parent: Reality, childId: string): void {
  parent.childRealityIds.push(childId);
}

/**
 * Calculate reality "energy" - total activity level.
 */
export function calculateRealityEnergy(reality: Reality): number {
  const hadronEnergy = reality.hadrons.reduce((sum, h) => sum + h.stabilityScore, 0);
  const blackHoleEnergy = reality.blackHoles.reduce((sum, bh) => sum + bh.inversionErrorSum, 0);
  const tick = reality.clock.getTick();
  
  return (hadronEnergy + blackHoleEnergy) * Math.log(tick + 1);
}

/**
 * Get reality hierarchy as a tree structure.
 */
export function getRealityTree(
  root: Reality,
  allRealities: Map<string, Reality>
): { id: string; name: string; depth: number; children: any[] } {
  const buildTree = (reality: Reality): any => ({
    id: reality.id,
    name: reality.name,
    depth: reality.depth,
    children: reality.childRealityIds
      .map(cid => allRealities.get(cid))
      .filter((r): r is Reality => r !== undefined)
      .map(buildTree)
  });
  
  return buildTree(root);
}
