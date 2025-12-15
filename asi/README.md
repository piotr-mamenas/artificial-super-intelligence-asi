# ASI Framework

A browser-runnable JavaScript library implementing an "aboutness-first" ASI (Artificial Super Intelligence) architecture. No npm or bundler required — just ES modules loaded via `<script type="module">`.

## Quick Start

Open `index.html` in a browser and check the console for demo output.

```html
<script type="module" src="./main.js"></script>
```

## Architecture Overview

The framework is built around the concept of **aboutness** — internal events (occurrences) that are "about" other occurrences, forming a directed graph of meaning and reference.

### Core Concepts

| Concept | Description |
|---------|-------------|
| **Occurrence** | Internal event with mode (Unity/Duality/Relation), payload, and metadata |
| **Aboutness Graph** | Directed graph where edges represent "is-about" relations |
| **State** | Equivalence class of occurrences playing the same role |
| **Context** | Set of states that can be jointly reasoned about without contradiction |
| **Scale** | Level of abstraction in a multi-scale/fractal structure |
| **Waveform** | Complex amplitude assignment over paths/states (quantum-inspired) |
| **X/Y/Z Bubbles** | Potential space (X), Attention state (Y), Consensus world (Z) |

## Project Structure

```
/asi/
├── index.html              # Entry point
├── main.js                 # Demo bootstrap
│
├── core/                   # Ontological foundations
│   ├── occurrences.js      # Occurrence, AboutnessRelation, createTriuneOccurrences
│   ├── aboutnessGraph.js   # AboutnessGraph (nodes + edges)
│   ├── states.js           # Paths, State, StateSpace, equivalence
│   ├── contexts.js         # Context, ContextSystem
│   ├── scales.js           # ScaleLevel, ScaleSystem (fractal structure)
│   └── geometry.js         # Distances, loops, curvature
│
├── math/                   # Quantum-inspired mathematics
│   ├── waveforms.js        # Complex numbers, Waveform class
│   ├── channels.js         # MultiChannelWaveform, CHANNELS (u,d,s,c,t,b)
│   └── gates.js            # Gate operators (Swap, Phase, Hadamard, etc.)
│
├── cognitive/              # Higher-level cognitive structures
│   ├── xyzBubbles.js       # PotentialSpace, AttentionState, ConsensusWorld
│   ├── valueEmotion.js     # ValueField, EmotionEstimator
│   ├── selfModel.js        # SelfModel, qualia residual
│   ├── blackHoles.js       # BlackHoleDetector (symmetry collapse)
│   └── universes.js        # UniverseModel, UniverseGraph, nested universes
│
├── agent/                  # Agent implementations
│   ├── agent.js            # Agent class (single ASI agent)
│   ├── multiAgent.js       # MultiAgentSystem, consensus building
│   └── training.js         # TrainingLoop scaffold
│
├── env/                    # Environments
│   └── contextGridworld.js # Simple gridworld with hidden context rules
│
└── viz/                    # Visualization helpers
    └── snapshots.js        # Snapshot builders for three.js integration
```

## Module Reference

### Core (`/core/`)

#### `occurrences.js`
- `Occurrence` — Internal event with id, mode (U/D/R), payload, metadata
- `AboutnessRelation` — Directed edge (no self-loops)
- `createTriuneOccurrences(baseId, payload, metadata)` — Creates unity/duality/relation triple

#### `aboutnessGraph.js`
- `AboutnessGraph` — Directed graph with occurrence nodes and aboutness edges

#### `states.js`
- `generatePathId(nodeIds)` — Deterministic path ID
- `findAllSimplePaths(graph, startId, maxDepth)` — Depth-limited DFS
- `isReachable(graph, fromId, toId, maxDepth)` — BFS reachability
- `getCausalOrder(graph, rootId, maxDepth)` — BFS ordering
- `State` — Equivalence class of occurrences
- `StateSpace` — Manages states and occurrence mappings
- `buildStateSpaceFromGraph(graph, modeSensitive)` — Auto-group by payload

#### `contexts.js`
- `Context` — Set of compatible states
- `ContextSystem` — Manages contexts and state-to-context mappings
- `buildDefaultContexts(stateSpace)` — Creates global context

#### `scales.js`
- `ScaleLevel` — State space at a particular scale
- `ScaleSystem` — Multi-scale hierarchy with refinement/abstraction
- `buildSingleScaleSystem(stateSpace)` — Single-scale setup

#### `geometry.js`
- `computeShortestPathLength(graph, startId, endId, maxDepth)` — BFS distance
- `buildStateDistanceMatrix(graph, stateSpace, maxDepth)` — Pairwise distances
- `findStateLoops(graph, stateSpace, maxDepth)` — Simple cycle detection
- `estimateCurvature(stateId, loops)` — Curvature heuristic
- `buildCurvatureMap(graph, stateSpace, maxDepth)` — Full curvature map

### Math (`/math/`)

#### `waveforms.js`
- Complex utilities: `complex`, `cAdd`, `cSub`, `cMul`, `cConj`, `cAbsSq`, `cScale`
- `Waveform` — Complex amplitudes over path/state IDs with normalization, inner product

#### `channels.js`
- `CHANNELS` — `["u", "d", "s", "c", "t", "b"]` (quark-inspired)
- `MultiChannelWaveform` — Six-channel waveform container

#### `gates.js`
- `Gate` — Base class for waveform operators
- `SwapGate`, `PhaseGate`, `HadamardGate`, `ScaleGate`, `ControlledGate`, `TransferGate`
- `ComposedGate` — Sequential gate application
- Factory functions: `swap`, `phase`, `hadamard`, `transfer`, `compose`

### Cognitive (`/cognitive/`)

#### `xyzBubbles.js`
- `PotentialSpace` (X) — Space of possibilities
- `AttentionState` (Y) — Current attention waveform
- `ConsensusWorld` (Z) — Stabilized world model

#### `valueEmotion.js`
- `ValueField` — Numeric value per state
- `estimateLocalValueStats(valueField, stateSpace, anchorStateId, neighbors)`
- `EmotionEstimator` — Infers emotion labels (fear, joy, sadness, anger, curiosity, neutral)

#### `selfModel.js`
- `SelfModel` — Lossy self-description and qualia residual computation

#### `blackHoles.js`
- `BlackHoleDetector` — Identifies high-curvature collapse regions

#### `universes.js`
- `UniverseModel` — Complete universe with state space, contexts, scales
- `UniverseGraph` — Parent-child universe connectivity
- `spawnChildUniverse(parent, signature, newId)` — Spawn from black hole

### Agent (`/agent/`)

#### `agent.js`
- `Agent` — Full ASI agent with graph, waveform, value field, emotions, self-model

#### `multiAgent.js`
- `MultiAgentSystem` — Multiple agents with shared consensus building

#### `training.js`
- `TrainingLoop` — Episode-based training with observation→graph updates

### Environment (`/env/`)

#### `contextGridworld.js`
- `ContextGridworld` — 5×5 grid with hidden context rules (seek/flee/collect)

### Visualization (`/viz/`)

#### `snapshots.js`
- `buildAgentSnapshot(agent)`
- `buildMultiAgentSnapshot(mas)`
- `buildUniverseGraphSnapshot(universeGraph)`

## Usage Example

```javascript
import { Agent } from './agent/agent.js';
import { TrainingLoop } from './agent/training.js';
import { ContextGridworld } from './env/contextGridworld.js';
import { AboutnessGraph } from './core/aboutnessGraph.js';

// Create environment
const env = new ContextGridworld({ width: 5, height: 5 });

// Create agent
const agent = new Agent({
  id: "agent-001",
  graph: new AboutnessGraph()
});

// Initialize waveform
agent.initializeWaveform(["init"], 1.0);

// Train
const loop = new TrainingLoop({
  agent,
  env,
  episodes: 10,
  maxStepsPerEpisode: 50
});

const results = loop.run();
console.log(agent.toSnapshot());
```

## Chat Interface

The agent includes an interactive chat for teaching and querying.

### Buttons
| Button | Action |
|--------|--------|
| 🤔 Ask Me | Trigger agent to ask a question |
| 📋 What I Know | Show learned concepts |
| 📊 Graph | Show graph statistics |
| ❓ Help | Show all commands |
| 🗑️ Clear | Forget all concepts |

### Commands
```
/ask            - Make agent ask a question
/understood     - Show learned concepts and relations
/show           - Show graph structure
/forget <word>  - Forget a specific concept
/forget all     - Forget everything
/help           - Show help
```

### Teaching Patterns
```
"cats are animals"      → Creates relation: cats → animals
"love means caring"     → Defines: love = caring
"music relates to art"  → Connects: music ↔ art
"what is love"          → Queries agent's knowledge
```

### Proactive Questioning
The agent asks questions based on:
- **Curiosity** — When emotion state is curious
- **Uncertainty** — When self-model residual is high
- **Knowledge gaps** — When concepts lack relations

## Key Design Principles

1. **Aboutness-First** — All meaning emerges from "is-about" relations
2. **No Perfect Self-Reference** — No direct self-loops in the aboutness graph
3. **Contextuality** — States exist within compatible contexts
4. **Multi-Scale Structure** — Fractal refinement and abstraction
5. **Quantum-Inspired** — Complex waveforms, superposition, normalization
6. **Quark Channels** — Six logical channels inspired by quark flavors
7. **X/Y/Z Cognitive Model** — Potential, attention, and consensus separation

## Future Integration

- **three.js visualization** — Use snapshot APIs for 3D rendering
- **Advanced RL** — Replace stub training with proper learning algorithms
- **Multi-universe navigation** — Spawn and traverse nested universes via black holes

## License

MIT
