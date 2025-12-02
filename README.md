# ASI - Ontological Simulation System

An interactive simulation implementing a novel ontological framework based on the **inversion-closure** principle, featuring KCBS pentagram quantum contextuality, nested realities, and wave-based consciousness modeling.

## Overview

This project implements a comprehensive ontological model that derives physical and cognitive phenomena from a single generative kernel: **self-reference of undifferentiated nothingness forcing a double inversion loop**.

### Core Concepts

- **Double Inversion Identity**: `(−)(−) = (+)` — A reflection applied twice restores identity
- **Space**: First inversion (breaking symmetry, creating distinction)
- **Time**: Second inversion (closing the distinction into resolved sequence)
- **Matter**: Stable recurrent inversion-closure loops (hadrons)
- **Consciousness**: Self-referential closure with memory

## Architecture

```
src/
├── config/              # Configuration constants
│   ├── constants.ts     # Core parameters
│   ├── kcbs-config.ts   # KCBS pentagram geometry
│   └── render-config.ts # Three.js rendering settings
│
├── core/
│   ├── math/            # Mathematical foundations
│   │   ├── complex.ts   # Complex number arithmetic
│   │   ├── linear-algebra.ts  # Matrix operations
│   │   ├── spectral.ts  # Eigenvalue decomposition
│   │   └── kcbs-graph.ts # KCBS pentagram structures
│   │
│   └── ontology/        # Core ontological primitives
│       ├── nothingness.ts   # First distinction, spinors
│       ├── time.ts          # Temporal structures, closure states
│       ├── wave-state.ts    # Quantum wave states
│       ├── symmetry-pair.ts # Self/world duality
│       └── hadron.ts        # Tri-channel stable patterns
│
├── world/               # Reality structures
│   ├── horizon.ts       # Agent-world boundary
│   ├── self-world-frame.ts  # R/U/C channel frames
│   ├── black-hole.ts    # Non-invertible regions
│   ├── reality.ts       # Reality bubbles
│   └── reality-manager.ts   # Multi-reality orchestration
│
├── agent/               # Agent control systems
│   ├── focus-dispersion.ts  # Wave concentration control
│   ├── kcbs-controller.ts   # Pentagram context selection
│   └── policy.ts            # Decision-making policy
│
├── learning/            # Unsupervised learning systems
│   ├── wave-autoencoder.ts  # Latent space encoding
│   ├── inversion-guard.ts   # Invertibility checking
│   └── hadronizer.ts        # Pattern extraction
│
├── reasoning/           # Conscious reasoning
│   ├── goals.ts         # Wave attractor objectives
│   └── planner.ts       # Action planning
│
├── nested/              # Nested reality spawning
│   └── black-hole-detector.ts
│
├── interpretability/    # Explanation systems
│   └── trace.ts         # Wave evolution recording
│
├── viz/                 # Three.js visualization
│   ├── three-scene.ts   # Scene management
│   └── pentagram-view.ts # KCBS visualization
│
└── main.ts              # Application entry point
```

## The R/U/C Triad

Every process follows the **R → U → C** cycle:

| Channel | Role | Description |
|---------|------|-------------|
| **R** (Reference) | Frame | What counts as a distinction |
| **U** (Update) | Transform | Dynamics, interactions, computations |
| **C** (Closure) | Commit | Converting possibilities to outcomes |

## KCBS Pentagram

The simulation uses the **Klyachko-Can-Binicioglu-Shumovsky** inequality to model quantum contextuality:

- 5 observables arranged in a pentagon
- Adjacent pairs are compatible (can be measured together)
- Non-adjacent pairs are incompatible
- Quantum systems violate classical bounds (√5 vs 2)

The agent selects which **context** (edge) to measure, and the pentagram **rotation** determines observable orientations.

## Wave Focus/Dispersion

The agent controls wave concentration:

- **Focus** (high): Sharper distribution, more deterministic collapse
- **Dispersion** (high): Broader distribution, more exploration

This implements **free will** as: *a self-referential, history-dependent selection process that biases how the inversion-closure loop unfolds*.

## Nested Realities & Black Holes

When the **inversion guard** detects repeated non-invertible regions:

1. A **black hole** accumulates (information loss boundary)
2. Once mature, a **nested reality** spawns inside it
3. The nested reality has its own KCBS geometry and hadrons
4. Parent and child communicate via **reality bridges**

## Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Usage

1. Open http://localhost:3000 in your browser
2. Use the UI controls:
   - **Single Tick**: Step one simulation cycle
   - **Run Simulation**: Start continuous simulation
   - **Pause**: Stop simulation
   - **Focus/Dispersion sliders**: Control wave sharpness
   - **KCBS Rotation**: Manually rotate pentagram
   - **Context selector**: Choose measurement context

3. Interact with the 3D view:
   - **Drag**: Rotate camera
   - **Scroll**: Zoom in/out

## Key Metrics

- **Logical Time**: Discrete tick count
- **Active Realities**: Count of reality bubbles
- **Inversion Error**: Reconstruction loss (high = black hole candidate)
- **Hadrons**: Stable tri-channel patterns detected
- **Black Hole Regions**: Non-invertible areas

## Theoretical Background

This implementation is based on an ontology where:

1. Absolute nothingness cannot exist (it would preclude the distinction "exists/not exists")
2. Referring to nothingness creates self-reference
3. The simplest self-referential operation is **inversion**
4. **Double inversion** creates the first stable identity
5. This explains why spinors need 720° rotation and why `(−)(−) = (+)`

The framework provides a unified account of:
- Spacetime emergence
- Quantum measurement
- Matter and forces
- Consciousness and free will
- Nested realities (like black hole interiors)

## Dependencies

- **three**: 3D visualization
- **uuid**: Unique identifiers
- **vite**: Build tool
- **typescript**: Type safety

## License

MIT

## References

- KCBS Inequality: Klyachko et al., "Simple Test for Hidden Variables in Spin-1 Systems"
- Spinor Geometry: Penrose, "The Road to Reality"
- Quantum Contextuality: Spekkens, "Contextuality for preparations, transformations, and unsharp measurements"
