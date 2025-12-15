// Visualization: Symmetry Tracking and Timeline

// ============================================================
// SymmetryTracker - Tracks symmetry firing events
// ============================================================

/**
 * Symmetry event record.
 * @typedef {object} SymmetryEvent
 * @property {number} timestamp
 * @property {string} type - e.g. 'swap', 'phase', 'hadamard'
 * @property {string[]} involvedIds - occurrence IDs involved
 * @property {object} metadata
 */

/**
 * SymmetryTracker: records and visualizes symmetry firing events.
 */
export class SymmetryTracker {
  constructor() {
    /** @type {SymmetryEvent[]} */
    this.events = [];
    this.listeners = [];
    this.maxEvents = 500;
  }

  /**
   * Record a symmetry firing event.
   * @param {string} type
   * @param {string[]} involvedIds
   * @param {object} [metadata={}]
   * @returns {SymmetryEvent}
   */
  recordEvent(type, involvedIds, metadata = {}) {
    const event = {
      timestamp: Date.now(),
      type,
      involvedIds,
      metadata
    };
    
    this.events.push(event);
    
    // Trim old events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
    
    // Notify listeners
    for (const listener of this.listeners) {
      listener(event);
    }
    
    return event;
  }

  /**
   * Subscribe to new symmetry events.
   * @param {function} callback
   */
  onEvent(callback) {
    this.listeners.push(callback);
  }

  /**
   * Get events in a time range.
   * @param {number} startTime
   * @param {number} [endTime=Date.now()]
   * @returns {SymmetryEvent[]}
   */
  getEventsInRange(startTime, endTime = Date.now()) {
    return this.events.filter(e => e.timestamp >= startTime && e.timestamp <= endTime);
  }

  /**
   * Get event type counts.
   * @returns {object}
   */
  getTypeCounts() {
    const counts = {};
    for (const event of this.events) {
      counts[event.type] = (counts[event.type] || 0) + 1;
    }
    return counts;
  }

  /**
   * Get recent events.
   * @param {number} [count=50]
   * @returns {SymmetryEvent[]}
   */
  getRecentEvents(count = 50) {
    return this.events.slice(-count);
  }

  /**
   * Clear all events.
   */
  clear() {
    this.events = [];
  }
}

// ============================================================
// TimelineRenderer - Renders symmetry events to timeline UI
// ============================================================

/**
 * Color mapping for symmetry types.
 */
const SYMMETRY_COLORS = {
  'swap': '#ff00ff',
  'phase': '#00ffff',
  'hadamard': '#ffff00',
  'transfer': '#00ff88',
  'controlled': '#ff8800',
  'scale': '#8888ff',
  'identity': '#888888',
  'chat': '#00d9ff',
  'learn': '#00ff00',
  'default': '#ff00ff'
};

/**
 * TimelineRenderer: renders symmetry events to the timeline UI element.
 */
export class TimelineRenderer {
  /**
   * @param {HTMLElement} container - The timeline events container
   * @param {SymmetryTracker} tracker
   */
  constructor(container, tracker) {
    this.container = container;
    this.tracker = tracker;
    this.maxVisible = 100;
    
    // Subscribe to new events
    this.tracker.onEvent((event) => this._addEventElement(event));
  }

  /**
   * Add a visual element for a symmetry event.
   * @param {SymmetryEvent} event
   */
  _addEventElement(event) {
    const el = document.createElement('div');
    el.className = 'timeline-event';
    el.style.backgroundColor = SYMMETRY_COLORS[event.type] || SYMMETRY_COLORS.default;
    el.title = `${event.type} @ ${new Date(event.timestamp).toLocaleTimeString()}\n${event.involvedIds.join(', ')}`;
    
    // Intensity based on number of involved IDs
    const intensity = Math.min(1, event.involvedIds.length / 5);
    el.style.opacity = 0.5 + intensity * 0.5;
    
    this.container.appendChild(el);
    
    // Trim old elements
    while (this.container.children.length > this.maxVisible) {
      this.container.removeChild(this.container.firstChild);
    }
    
    // Scroll to end
    this.container.scrollLeft = this.container.scrollWidth;
  }

  /**
   * Render all events from tracker.
   */
  renderAll() {
    this.container.innerHTML = '';
    const events = this.tracker.getRecentEvents(this.maxVisible);
    for (const event of events) {
      this._addEventElement(event);
    }
  }

  /**
   * Clear the timeline display.
   */
  clear() {
    this.container.innerHTML = '';
  }
}

// ============================================================
// SymmetryDetector - Detects symmetry patterns in agent state
// ============================================================

/**
 * SymmetryDetector: analyzes agent state for symmetry patterns.
 */
export class SymmetryDetector {
  /**
   * @param {SymmetryTracker} tracker
   */
  constructor(tracker) {
    this.tracker = tracker;
    this.lastWaveformHash = null;
  }

  /**
   * Analyze a gate application and record symmetry event.
   * @param {string} gateName
   * @param {object} gateMetadata
   * @param {string[]} affectedChannels
   */
  recordGateApplication(gateName, gateMetadata, affectedChannels) {
    const type = gateName.toLowerCase();
    const involvedIds = affectedChannels.map(c => `channel:${c}`);
    
    if (gateMetadata.channel1) involvedIds.push(`channel:${gateMetadata.channel1}`);
    if (gateMetadata.channel2) involvedIds.push(`channel:${gateMetadata.channel2}`);
    if (gateMetadata.channel) involvedIds.push(`channel:${gateMetadata.channel}`);
    
    this.tracker.recordEvent(type, [...new Set(involvedIds)], gateMetadata);
  }

  /**
   * Detect symmetry patterns from waveform changes.
   * @param {object} prevWaveform
   * @param {object} currWaveform
   */
  detectWaveformSymmetries(prevWaveform, currWaveform) {
    if (!prevWaveform || !currWaveform) return;
    
    const changes = [];
    
    // Compare channels
    const allChannels = new Set([
      ...Object.keys(prevWaveform.channels || {}),
      ...Object.keys(currWaveform.channels || {})
    ]);
    
    for (const channel of allChannels) {
      const prev = prevWaveform.channels?.[channel];
      const curr = currWaveform.channels?.[channel];
      
      if (this._channelChanged(prev, curr)) {
        changes.push(channel);
      }
    }
    
    if (changes.length >= 2) {
      // Multi-channel change suggests a symmetry operation
      this.tracker.recordEvent('transform', changes.map(c => `channel:${c}`), {
        channelCount: changes.length
      });
    }
  }

  _channelChanged(prev, curr) {
    if (!prev && !curr) return false;
    if (!prev || !curr) return true;
    // Simple comparison - in practice would compare amplitudes
    return JSON.stringify(prev) !== JSON.stringify(curr);
  }

  /**
   * Record a learning event from chat.
   * @param {string} concept
   * @param {string[]} relatedIds
   */
  recordLearningEvent(concept, relatedIds) {
    this.tracker.recordEvent('learn', relatedIds, { concept });
  }

  /**
   * Record a chat interaction event.
   * @param {string} messageType - 'user' or 'agent'
   * @param {string[]} mentionedConcepts
   */
  recordChatEvent(messageType, mentionedConcepts) {
    this.tracker.recordEvent('chat', mentionedConcepts.map(c => `concept:${c}`), {
      messageType
    });
  }
}

export { SYMMETRY_COLORS };
