# ASI - Artificial Super Intelligence

An emergent AI system built on **quark-inspired spin patterns**, **aboutness graphs**, and **symmetry inversion**. No LLMs - pure emergent structure.

---

## Quick Start

```bash
# Start a local server
cd asi
python -m http.server 3000
# or: npx http-server -p 3000

# Open browser
http://localhost:3000
```

---

## Core Principles

### 1. Aboutness-First Architecture
All meaning emerges from **"is-about"** relations in a directed graph. No hardcoded semantics.

### 2. Quark-Inspired Operators
Six half-spin operators transform waveforms:

| Operator | Spin | Role |
|----------|------|------|
| **Up (u)** | +½ | Assertion, affirms |
| **Down (d)** | -½ | Negation, denies |
| **Strange (s)** | ±½ | Context switch |
| **Charm (c)** | +½ | Abstraction |
| **Top (t)** | +½ | Structure/grammar |
| **Bottom (b)** | +½ | Grounding |

### 3. Everything Emerges
- **Language**: Words are operator patterns, not predefined
- **Emotions**: Learned from waveform signatures
- **Connectors**: Relation types emerge from usage
- **Knowledge**: Stored as symmetry inversion paths

---

## Architecture

```
asi/
├── index.html              # Entry point
├── main.js                 # Application bootstrap
│
├── core/                   # Ontological foundations
│   ├── occurrences.js      # Events in aboutness graph
│   ├── aboutnessGraph.js   # Directed graph of meaning
│   ├── states.js           # State space, paths
│   ├── contexts.js         # Compatible state sets
│   └── scales.js           # Multi-scale structure
│
├── math/                   # Quantum-inspired math
│   ├── waveforms.js        # Complex amplitudes
│   ├── channels.js         # 6-channel waveform (u,d,s,c,t,b)
│   ├── gates.js            # Transformation operators
│   └── quarkSpins.js       # Half-spin patterns (+½, -½, 0)
│
├── cognitive/              # Emergent cognition
│   ├── emergentEmotion.js  # Learned emotion patterns
│   ├── emergentConnector.js# Learned relation types (spin-based)
│   ├── xyzBubbles.js       # Potential/Attention/Consensus
│   ├── valueEmotion.js     # Value field
│   └── selfModel.js        # Self-description + qualia
│
├── language/               # Emergent language
│   ├── lexeme.js           # Word types with operator patterns
│   ├── lexicon.js          # Vocabulary management
│   ├── operatorTrace.js    # Quark operator sequences
│   ├── linguisticOccurrence.js # Words in graph
│   └── symmetryQuery.js    # Inversion path queries
│
├── agent/                  # Agent implementation
│   ├── agent.js            # Main ASI agent
│   ├── multiAgent.js       # Multi-agent consensus
│   └── training.js         # Training loop
│
├── chat/                   # Interface
│   └── chatInterface.js    # Teaching via chat
│
└── viz/                    # Visualization
    ├── renderer.js         # Three.js 3D view
    └── symmetryViz.js      # Timeline visualization
```

---

## The Execution Loop

**Key insight: A concept IS a waveform, not a label with a waveform attached.**

```
User Input: "cats are animals"
              ↓
┌─────────────────────────────────────────┐
│ 1. PROCESS "cats"                        │
│    Apply spin operators to waveform      │
│    Waveform state after = concept "cats" │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 2. LEARN CONCEPT WAVEFORM                │
│    Store waveform interference pattern   │
│    "cats" = the pattern, not a label     │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 3. PROCESS "animals"                     │
│    Apply spin operators to waveform      │
│    Waveform state after = "animals"      │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 4. LEARN TRANSFORMATION                  │
│    Find symmetry operation:              │
│    waveform(cats) → waveform(animals)    │
│    The transformation IS the relation    │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 5. QUERY: "what is cats?"                │
│    Process query → waveform state        │
│    Find RESONANT concepts (not lookup!)  │
│    Attempt INVERSION to test understand  │
└─────────────────────────────────────────┘
```

---

## Chat Commands

### Teaching
```javascript
cats are animals          → Learn relation
love means caring         → Learn definition  
I feel happy              → Learn emotion
```

### Querying
```javascript
what is cats?             → Query from memory
/trace cats               → Walk back symmetry paths
/path cats to mammal      → Find transformation path
/symmetry                 → Show symmetry statistics
```

### Inspection
```javascript
/lexicon                  → All learned words
/word cats                → Word's operator pattern
/similar cats             → Find similar words
/emotions                 → Learned emotions
/connectors               → Learned relation types
/understood               → All concepts
```

---

## Key Concepts

### Spin Patterns (Not Weights)
Operators are discrete half-spins, not continuous weights:
- `+` = spin up (+½) — active, asserting
- `-` = spin down (-½) — active, negating
- `0` = superposition — uncertain

```javascript
Connector "is-a":  +00+00  (u↑ c↑)
Connector "has-a": +0000+  (u↑ b↑)
Connector "not":   -+0000  (u↓ d↑)
```

### Symmetry Inversion
Every relation is stored as an operator path that can be:
- **Walked back** — trace how something was learned
- **Inverted** — find the opposite transformation
- **Compared** — similar paths = similar meaning

### Emergent Reasoning
The agent uses its graph memory to answer questions:
```javascript
agent.reasonAbout("cats")  // → finds all related concepts
agent.activateContext(["cats"])  // → boosts waveform from memory
```

---

## Theoretical Foundation

### Why Spins, Not Weights?
Quarks have spin-½. Combining spins creates patterns:
- Aligned spins = reinforcement
- Anti-aligned = cancellation
- Superposition = uncertainty

### The Aboutness Graph
All meaning is relational. A concept is defined by:
1. What it's **about** (outgoing edges)
2. What's about **it** (incoming edges)
3. Its **operator pattern** (how it transforms waveform)

### No Hardcoding
- Words emerge from operator traces
- Emotions emerge from waveform signatures
- Relations emerge from transformation patterns
- Understanding emerges from successful inversions

---

## Installation

```bash
git clone <repo>
cd artificial-super-intelligence-asi/asi
python -m http.server 3000
```

Open http://localhost:3000

---

## License

MIT
