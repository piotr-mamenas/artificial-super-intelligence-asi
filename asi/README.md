# ASI Framework

A browser-runnable JavaScript library implementing an "aboutness-first" ASI (Artificial Super Intelligence) architecture with **emergent language, emotions, and symmetry-based reasoning**. No npm or bundler required — just ES modules loaded via `<script type="module">`.

---

## Quick Start

### 1. Start a Local Server

```bash
# Using Python
python -m http.server 3000

# Using Node.js
npx http-server -p 3000

# Using PHP
php -S localhost:3000
```

### 2. Open in Browser

Navigate to `http://localhost:3000` (or `http://127.0.0.1:3000`)

### 3. Interact

- **Left panel**: Three.js visualization of agent state
- **Right panel**: Chat interface for teaching the agent
- **Stats**: Live metrics (occurrences, relations, symmetries, emotion)

---

## How Everything Works Together

### The Big Picture

```
User Input (chat)
      ↓
┌─────────────────────────────────────────────────────────────┐
│                     LANGUAGE LAYER                           │
│  Words → Operator Patterns → Waveform Transformations       │
│  (Lexicon learns from usage, no hardcoded vocabulary)       │
└─────────────────────────────────────────────────────────────┘
      ↓
┌─────────────────────────────────────────────────────────────┐
│                   WAVEFORM DYNAMICS                          │
│  6-Channel MultiChannelWaveform (u,d,s,c,t,b)               │
│  Each word applies quark operators to transform waveform    │
└─────────────────────────────────────────────────────────────┘
      ↓
┌─────────────────────────────────────────────────────────────┐
│                  EMERGENT STRUCTURES                         │
│  • Emotions: learned from waveform signatures               │
│  • Connectors: learned from transformation patterns         │
│  • Symmetries: recorded for later querying                  │
└─────────────────────────────────────────────────────────────┘
      ↓
┌─────────────────────────────────────────────────────────────┐
│                   ABOUTNESS GRAPH                            │
│  Occurrences + Relations form knowledge structure           │
│  Concepts grounded in graph topology                        │
└─────────────────────────────────────────────────────────────┘
```

### The Quark Operator Model

Language and cognition are built from **six quark-inspired operators**:

| Operator | Symbol | Role | Linguistic Effect |
|----------|--------|------|-------------------|
| **Up** | U_u | Assertion | Affirms, names things (nouns, adjectives) |
| **Down** | U_d | Negation | Denies, excludes ("not", "no") |
| **Strange** | U_s | Context Switch | Changes interpretation frame (polysemy) |
| **Charm** | U_c | Abstraction | Generalizes, forms categories ("animal", "all") |
| **Top** | U_t | Structure | Enforces grammar/consistency ("the", "is") |
| **Bottom** | U_b | Grounding | Anchors to experience ("this", "here") |

### Data Flow Example

```
"cats are animals"
      ↓
1. Segment: ["cats", "are", "animals"]
      ↓
2. For each word, apply operator transformation to waveform
   - "cats": U_u (assert) + U_b (ground)
   - "are": U_t (structure) + U_c (abstract link)
   - "animals": U_u (assert) + U_c (category)
      ↓
3. Record transformation in symmetry space
   - Path: cats → animals
   - Operators: up → charm
      ↓
4. Store in aboutness graph
   - Occurrence: "cats" (id: occ_cats_123)
   - Occurrence: "animals" (id: occ_animals_456)
   - Relation: cats → animals (connector: "are")
      ↓
5. Update lexicon with word patterns
   - Lexeme "cats" gains more U_u/U_b weight
   - Lexeme "animals" gains more U_c weight
```

---

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
| **Lexeme** | Learned word with operator pattern and grounding |
| **Symmetry Path** | Recorded transformation sequence between concepts |

---

## Project Structure

```
/asi/
├── index.html              # Entry point with Three.js + Chat UI
├── main.js                 # Application bootstrap
│
├── core/                   # Ontological foundations
│   ├── occurrences.js      # Occurrence, AboutnessRelation
│   ├── aboutnessGraph.js   # AboutnessGraph (nodes + edges)
│   ├── states.js           # State, StateSpace, path utilities
│   ├── contexts.js         # Context, ContextSystem
│   ├── scales.js           # ScaleLevel, ScaleSystem
│   └── geometry.js         # Distances, loops, curvature
│
├── math/                   # Quantum-inspired mathematics
│   ├── waveforms.js        # Complex numbers, Waveform class
│   ├── channels.js         # MultiChannelWaveform, CHANNELS
│   └── gates.js            # Gate operators (Swap, Phase, etc.)
│
├── cognitive/              # Higher-level cognitive structures
│   ├── xyzBubbles.js       # PotentialSpace, AttentionState, ConsensusWorld
│   ├── valueEmotion.js     # ValueField, value statistics
│   ├── selfModel.js        # SelfModel, qualia residual
│   ├── emergentEmotion.js  # EmergentEmotionField (learned, not hardcoded)
│   ├── emergentConnector.js# EmergentConnectorField (learned relations)
│   ├── blackHoles.js       # BlackHoleDetector
│   └── universes.js        # UniverseModel, UniverseGraph
│
├── language/               # Emergent language system
│   ├── linguisticOccurrence.js  # LinguisticOccurrence with waveform traces
│   ├── lexeme.js           # Lexeme, OperatorPattern, GroundingRegion
│   ├── operatorTrace.js    # OperatorTracer, TransformationAnalyzer
│   ├── lexicon.js          # Lexicon (vocabulary management)
│   └── symmetryQuery.js    # SymmetryPath, SymmetryQueryEngine
│
├── agent/                  # Agent implementations
│   ├── agent.js            # Agent class (full ASI agent)
│   ├── multiAgent.js       # MultiAgentSystem
│   └── training.js         # TrainingLoop
│
├── chat/                   # Chat interface
│   └── chatInterface.js    # ChatInterface class
│
├── viz/                    # Visualization
│   ├── renderer.js         # ASIRenderer (Three.js)
│   ├── symmetryViz.js      # SymmetryTracker, TimelineRenderer
│   └── snapshots.js        # Snapshot builders
│
└── env/                    # Environments
    └── contextGridworld.js # Gridworld environment
```

---

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

---

## Chat Interface

The agent includes an interactive chat for teaching, querying, and introspection.

### UI Elements

| Element | Description |
|---------|-------------|
| **Left Panel** | Three.js 3D visualization |
| **Right Panel** | Chat + Stats + System Log |
| **Stats Bar** | Occurrences, Relations, Symmetries, Emotion |
| **Timeline** | Symmetry events visualization |

### Buttons

| Button | Command | Action |
|--------|---------|--------|
| 🤔 Ask | `/ask` | Trigger agent to ask a question |
| � Words | `/lexicon` | Show learned words and operator patterns |
| � Feels | `/emotions` | Show learned emotions |
| 📋 Graph | `/understood` | Show learned concepts and relations |
| ❓ | `/help` | Show all commands |

### Commands Reference

#### Symmetry & Query Commands
```
/trace <concept>      - Walk back symmetry inversion paths
/path <X> to <Y>      - Find transformation path between concepts
/symmetry             - Show symmetry space statistics
/similar <word>       - Find words with similar operator patterns
```

#### Language Commands
```
/lexicon              - Show all learned words
/word <word>          - Show word's operator pattern (bar chart)
/connectors           - Show learned connector types
```

#### Emotion Commands
```
/emotions             - Show learned emotion patterns
/restructure          - Reorganize learned patterns (merge similar)
```

#### Knowledge Commands
```
/understood           - Show all learned concepts and relations
/show                 - Show graph structure
/forget <word>        - Forget a specific concept
/forget all           - Forget everything
/ask                  - Make agent ask a question
/help                 - Show help
```

### Teaching Patterns

#### Teaching Relationships
```
"cats are animals"      → Creates relation: cats → animals
                          Connector: "are" (learned)
                          Operators: up → charm
```

#### Teaching Definitions
```
"love means caring"     → Defines: love → caring
                          Connector: "means" (learned)
```

#### Teaching Emotions
```
"I feel happy"          → Learns "happy" as emotion
                          Associates with current waveform signature
                          
"this is excitement"    → Learns "excitement" as emotion
"feeling curious"       → Learns "curious" as emotion
```

#### Querying Knowledge
```
"what is love"          → Returns what agent knows about "love"
```

### Example Session

```
User: cats are animals
Agent: I understand. I've learned that cats → animals.
       Connector: "are" (new)

User: dogs are animals  
Agent: I understand. I've learned that dogs → animals.
       Connector: "are" (known)

User: /trace animals
Agent: Symmetry trace for "animals":
         Depth: 2 transformation(s)
         1. cats → animals
            Operators: up → charm
         2. dogs → animals
            Operators: up → charm

User: /similar cats
Agent: Words similar to "cats":
         • "dogs" (85% total, 90% operator)

User: I feel happy
Agent: Learned "happy" from waveform pattern.
       Channels: u:25% d:10% s:15% c:20% t:15% b:15%
       Known emotions: happy

User: /emotions
Agent: Learned emotions:
         • happy ← (current, similarity: 95%)
```

---

## Emergent Systems (No Hardcoding)

### Emergent Language

Words are **not predefined**. Each word becomes a `Lexeme` with:

1. **Form Cluster** — Signal variants (spelling/pronunciation)
2. **Operator Pattern** — Weighted combination of quark operators
3. **Grounding Region** — States/occurrences this word refers to

```javascript
// Example learned lexeme for "cat"
{
  canonicalForm: "cat",
  operatorPattern: {
    up: 0.4,      // Assertive (names something)
    bottom: 0.3,  // Grounded (concrete)
    charm: 0.1,   // Some abstraction
    ...
  },
  groundingRegion: {
    stateActivations: { "state_cat_1": 0.8 },
    aboutnessTargets: ["occ_cat_visual", "occ_cat_sound"]
  }
}
```

### Emergent Emotions

Emotions are **not predefined labels**. They are learned patterns:

1. User says "I feel happy"
2. System captures current **state signature** (12-dim vector):
   - Channel ratios (6 values)
   - Graph topology (2 values)
   - Value field stats (2 values)
   - Waveform dynamics (2 values)
3. Pattern stored as "happy"
4. Future states matched by cosine similarity

```javascript
// State signature (all relative, no hardcoded constants)
signature = [
  u_ratio, d_ratio, s_ratio, c_ratio, t_ratio, b_ratio,  // Channel activations
  density, connectivity,                                   // Graph topology
  value_mean, value_spread,                               // Value field
  change_rate, focus_ratio                                // Waveform dynamics
]
```

### Emergent Connectors

Relation types are **not predefined**. Connectors emerge from:

1. Syntactic position of concepts in sentence
2. Words appearing between concepts
3. Agent state context

Similar transformations get grouped into the same connector type.

### Symmetry Restructuring

The system can **reorganize its learned patterns**:

```
/restructure
```

This:
- Merges emotion patterns that became too similar (>95%)
- Merges lexemes with similar operator patterns (>90%)
- Recomputes patterns from history

---

## Symmetry Query System

### Walking Back Inversion Paths

Every relationship is recorded as a **symmetry transformation**:

```
cats → animals  via  [up, charm]
```

You can query these paths:

#### Trace a Concept
```
/trace cat
```
Returns the chain of transformations that led to this concept.

#### Find Path Between Concepts
```
/path cat to mammal
```
Finds the operator sequence that transforms one into the other.

#### Find Similar by Symmetry
Concepts with similar operator sequences are semantically related:
- Same operators = same type of relationship
- Inverse operators = opposite relationship

### SymmetryPath Class

```javascript
class SymmetryPath {
  startId: string;
  endId: string;
  steps: [{ operator, params, deltaSignature }];
  
  inverse()           // Walk the path backwards
  isSimilarTo(other)  // Compare operator sequences
  getOperatorSequence() // "up → charm → bottom"
}
```

### SymmetryQueryEngine

```javascript
engine.walkBack(concept)           // Trace learning history
engine.findPath(from, to)          // Find direct/indirect paths
engine.findSimilarByOperator(concept)  // Similar patterns
engine.reproduce(concept)          // Replay transformation
engine.queryByOperatorSignature(['up', 'charm'])  // Find matching paths
```

---

## Key Design Principles

1. **Aboutness-First** — All meaning emerges from "is-about" relations
2. **No Perfect Self-Reference** — No direct self-loops in the aboutness graph
3. **No Hardcoding** — Language, emotions, connectors all emerge from patterns
4. **Symmetry-Based Reasoning** — Knowledge stored as inversion paths
5. **Quantum-Inspired** — Complex waveforms, superposition, normalization
6. **Quark Operators** — Six logical operators for all cognition
7. **X/Y/Z Cognitive Model** — Potential, attention, and consensus separation
8. **Restructurable** — System can reorganize its own learned patterns

---

## Programmatic Usage

```javascript
import { Agent } from './agent/agent.js';
import { AboutnessGraph } from './core/aboutnessGraph.js';

// Create agent
const agent = new Agent({
  id: "agent-001",
  graph: new AboutnessGraph()
});

// Initialize waveform
agent.initializeWaveform(["init"], 1.0);

// Process language
agent.processLanguage("cats are animals");

// Query symmetry
const trace = agent.walkBackSymmetry("animals");
const path = agent.findSymmetryPath("cats", "animals");
const similar = agent.findSimilarWords("cats");

// Evaluate emotion
const emotion = agent.evaluateEmotion();
// { label: "happy", similarity: 0.85, signature: [...] }

// Learn emotion
agent.learnEmotion("curious");

// Get lexicon stats
const stats = agent.getLexiconStats();
// { totalLexemes: 5, groundedLexemes: 3, bySemanticRole: {...} }

// Restructure patterns
agent.emotionField.restructure();
agent.lexicon.restructure();

// Snapshot for visualization
const snapshot = agent.toSnapshot();
```

---

## Visualization

### Three.js Integration

The `ASIRenderer` class provides 3D visualization:

```javascript
import { ASIRenderer } from './viz/renderer.js';

const renderer = new ASIRenderer(container);
renderer.update(agent.toSnapshot());
```

### Symmetry Timeline

The `TimelineRenderer` shows learning events over time:

```javascript
import { TimelineRenderer } from './viz/symmetryViz.js';

const timeline = new TimelineRenderer(container);
timeline.addEvent({ type: 'learning', concepts: ['cat'] });
```

---

## License

MIT
