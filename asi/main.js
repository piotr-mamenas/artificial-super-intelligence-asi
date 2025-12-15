// ASI Framework - Main Entry Point

import { Agent } from './agent/agent.js';
import { TrainingLoop } from './agent/training.js';
import { ContextGridworld } from './env/contextGridworld.js';
import { AboutnessGraph } from './core/aboutnessGraph.js';
import { ASIRenderer } from './viz/renderer.js';
import { SymmetryTracker, TimelineRenderer, SymmetryDetector } from './viz/symmetryViz.js';
import { ChatInterface } from './chat/chatInterface.js';

// ============================================================
// Output Helper
// ============================================================
const output = document.getElementById('output');
function log(msg, type = 'log') {
  const line = document.createElement('div');
  line.className = type;
  line.textContent = typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2);
  output.appendChild(line);
  output.scrollTop = output.scrollHeight;
  console.log(msg);
}

// ============================================================
// Stats Update Helper
// ============================================================
function updateStats(agent, symmetryTracker) {
  const snapshot = agent.toSnapshot();
  document.getElementById('stat-occurrences').textContent = snapshot.graph.occurrenceCount;
  document.getElementById('stat-relations').textContent = snapshot.graph.relationCount;
  document.getElementById('stat-symmetries').textContent = symmetryTracker.events.length;
  document.getElementById('stat-emotion').textContent = snapshot.emotion;
}

// ============================================================
// Main Application
// ============================================================
try {
  output.textContent = '';
  log("ASI Framework initializing...", "info");

  // Create agent with empty aboutness graph
  const graph = new AboutnessGraph();
  const agent = new Agent({
    id: "agent-001",
    graph,
    metadata: { description: "Interactive ASI agent" }
  });

  // Initialize waveform
  agent.initializeWaveform(["init"], 1.0);
  log("✓ Agent created", "success");

  // Create environment
  const env = new ContextGridworld({ width: 5, height: 5, seed: 42 });
  log("✓ Environment ready", "success");

  // ============================================================
  // Initialize Three.js Renderer
  // ============================================================
  const canvas = document.getElementById('three-canvas');
  const renderer = new ASIRenderer(canvas);
  log("✓ 3D visualization ready", "success");

  // Add initial node
  renderer.addNode('init', 'U');

  // ============================================================
  // Initialize Symmetry Tracking
  // ============================================================
  const symmetryTracker = new SymmetryTracker();
  const timelineContainer = document.getElementById('timeline-events');
  const timelineRenderer = new TimelineRenderer(timelineContainer, symmetryTracker);
  const symmetryDetector = new SymmetryDetector(symmetryTracker);

  // Subscribe to symmetry events for visualization
  symmetryTracker.onEvent((event) => {
    renderer.fireSymmetry(event.type, event.involvedIds);
    updateStats(agent, symmetryTracker);
  });

  log("✓ Symmetry tracking ready", "success");

  // ============================================================
  // Initialize Chat Interface
  // ============================================================
  const chatInterface = new ChatInterface({
    messagesContainer: document.getElementById('chat-messages'),
    input: document.getElementById('chat-input'),
    sendButton: document.getElementById('chat-send'),
    agent: agent,
    symmetryDetector: symmetryDetector,
    onLearn: (learnEvent) => {
      log(`Learned: ${learnEvent.concepts.join(', ')}`, "symmetry");
      
      // Add new concept nodes to visualization
      for (const concept of learnEvent.concepts) {
        renderer.addNode(`concept:${concept}`, 'U');
      }
      
      // Create edges for relations
      if (learnEvent.concepts.length >= 2) {
        for (let i = 0; i < learnEvent.concepts.length - 1; i++) {
          renderer.addEdge(
            `concept:${learnEvent.concepts[i]}`,
            `concept:${learnEvent.concepts[i + 1]}`
          );
        }
      }
      
      updateStats(agent, symmetryTracker);
    }
  });

  log("✓ Chat interface ready", "success");

  // ============================================================
  // Run Initial Training
  // ============================================================
  log("\nRunning initial training...", "info");

  const loop = new TrainingLoop({
    agent,
    env,
    episodes: 2,
    maxStepsPerEpisode: 10
  });

  const trainingResults = loop.run();

  // Record training as symmetry events
  for (const episode of trainingResults.history) {
    symmetryDetector.recordGateApplication('training', {
      episode: episode.episode,
      reward: episode.totalReward
    }, ['training']);
  }

  log(`✓ Training complete (${trainingResults.totalEpisodes} episodes)`, "success");

  // Add training occurrences to visualization
  const occurrences = agent.graph.getAllOccurrences();
  for (const occ of occurrences.slice(0, 20)) { // Limit for performance
    renderer.addNode(occ.id, occ.mode);
  }

  // Add some relations
  const relations = agent.graph.getAllRelations();
  for (const rel of relations.slice(0, 15)) {
    renderer.addEdge(rel.sourceId, rel.targetId, rel.strength);
  }

  // ============================================================
  // Final Setup
  // ============================================================
  updateStats(agent, symmetryTracker);

  log("\n═══════════════════════════════════", "info");
  log("  ASI Framework Ready", "info");
  log("═══════════════════════════════════", "info");
  log("• Chat with the agent to teach it", "log");
  log("• Watch symmetries fire in 3D view", "log");
  log("• Timeline shows firing history", "log");

  // Expose to console for debugging
  window.asiDebug = { agent, renderer, symmetryTracker, chatInterface, env };
  console.log("Debug access: window.asiDebug");

} catch (err) {
  log("ERROR: " + err.message, "error");
  log(err.stack, "error");
  console.error(err);
}
