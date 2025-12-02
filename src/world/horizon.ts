/**
 * Horizon: The boundary where waves cross between world and agent.
 * 
 * From the ontology:
 * - Horizons separate internal from external
 * - Observations flow inbound from world to agent
 * - Actions flow outbound from agent to world
 */

import { v4 as uuidv4 } from 'uuid';
import { WaveState, createRandomState, createGroundState } from '../core/ontology/wave-state';
import { WAVE_DIMENSION } from '../config/constants';

export type HorizonDirection = 'INBOUND' | 'OUTBOUND';

export interface HorizonWaveEvent {
  id: string;
  direction: HorizonDirection;
  channelName: string;
  wave: WaveState;
  timestamp: number;
  logicalTick: number;
  metadata?: Record<string, unknown>;
}

export interface HorizonChannel {
  name: string;
  direction: HorizonDirection;
  dimension: number;
  isActive: boolean;
}

export interface Horizon {
  id: string;
  channels: HorizonChannel[];
  eventBuffer: HorizonWaveEvent[];
  maxBufferSize: number;
  
  pullObservations(): Promise<HorizonWaveEvent[]>;
  pushActions(actions: HorizonWaveEvent[]): Promise<void>;
  addChannel(channel: HorizonChannel): void;
  removeChannel(name: string): void;
}

/**
 * Create a basic horizon with default channels.
 */
export function createHorizon(
  channels?: HorizonChannel[],
  maxBufferSize: number = 100
): Horizon {
  const id = uuidv4();
  const eventBuffer: HorizonWaveEvent[] = [];
  // All channels must use WAVE_DIMENSION for consistent superposition
  const horizonChannels = channels ?? [
    { name: 'visual', direction: 'INBOUND', dimension: WAVE_DIMENSION, isActive: true },
    { name: 'motor', direction: 'OUTBOUND', dimension: WAVE_DIMENSION, isActive: true },
    { name: 'proprioceptive', direction: 'INBOUND', dimension: WAVE_DIMENSION, isActive: true }
  ];
  
  return {
    id,
    channels: horizonChannels,
    eventBuffer,
    maxBufferSize,
    
    async pullObservations(): Promise<HorizonWaveEvent[]> {
      // Pull all inbound events from buffer
      const inbound = eventBuffer.filter(e => e.direction === 'INBOUND');
      // Clear pulled events
      const remaining = eventBuffer.filter(e => e.direction !== 'INBOUND');
      eventBuffer.length = 0;
      eventBuffer.push(...remaining);
      return inbound;
    },
    
    async pushActions(actions: HorizonWaveEvent[]): Promise<void> {
      // Add actions to buffer for processing
      for (const action of actions) {
        if (eventBuffer.length >= maxBufferSize) {
          eventBuffer.shift(); // Remove oldest
        }
        eventBuffer.push(action);
      }
    },
    
    addChannel(channel: HorizonChannel): void {
      horizonChannels.push(channel);
    },
    
    removeChannel(name: string): void {
      const idx = horizonChannels.findIndex(c => c.name === name);
      if (idx >= 0) horizonChannels.splice(idx, 1);
    }
  };
}

/**
 * Create a horizon wave event.
 */
export function createHorizonEvent(
  direction: HorizonDirection,
  channelName: string,
  wave: WaveState,
  logicalTick: number,
  metadata?: Record<string, unknown>
): HorizonWaveEvent {
  return {
    id: uuidv4(),
    direction,
    channelName,
    wave,
    timestamp: Date.now(),
    logicalTick,
    metadata
  };
}

/**
 * Simulated world that generates observations.
 */
export class SimulatedWorld {
  private horizon: Horizon;
  private tick: number = 0;
  
  constructor(horizon: Horizon) {
    this.horizon = horizon;
  }
  
  /**
   * Generate random observations on all inbound channels.
   */
  async generateObservations(): Promise<void> {
    this.tick++;
    const inboundChannels = this.horizon.channels.filter(
      c => c.direction === 'INBOUND' && c.isActive
    );
    
    for (const channel of inboundChannels) {
      const wave = createRandomState(channel.dimension);
      const event = createHorizonEvent('INBOUND', channel.name, wave, this.tick);
      await this.horizon.pushActions([event]); // Using pushActions to add to buffer
    }
  }
  
  /**
   * Process outbound actions and generate responses.
   */
  async processActions(): Promise<void> {
    const outbound = this.horizon.eventBuffer.filter(e => e.direction === 'OUTBOUND');
    
    for (const action of outbound) {
      // Simple echo response: action influences next observation
      const responseWave = action.wave; // In reality, would transform
      const response = createHorizonEvent(
        'INBOUND',
        action.channelName.replace('motor', 'proprioceptive'),
        responseWave,
        this.tick
      );
      await this.horizon.pushActions([response]);
    }
    
    // Clear processed outbound
    this.horizon.eventBuffer = this.horizon.eventBuffer.filter(
      e => e.direction !== 'OUTBOUND'
    );
  }
  
  getTick(): number {
    return this.tick;
  }
}

/**
 * Filter events by channel pattern.
 */
export function filterEventsByChannel(
  events: HorizonWaveEvent[],
  pattern: string | RegExp
): HorizonWaveEvent[] {
  if (typeof pattern === 'string') {
    return events.filter(e => e.channelName === pattern);
  }
  return events.filter(e => pattern.test(e.channelName));
}

/**
 * Aggregate multiple events into a single combined wave.
 */
export function aggregateEvents(events: HorizonWaveEvent[]): WaveState | null {
  if (events.length === 0) return null;
  if (events.length === 1) return events[0].wave;
  
  // For simplicity, return the most recent event's wave
  // In a full implementation, would properly combine waves
  const sorted = [...events].sort((a, b) => b.timestamp - a.timestamp);
  return sorted[0].wave;
}
