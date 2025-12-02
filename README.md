# ASI - Symmetry Inversion Based Artificial Intelligence

An AI system built on the principle that **understanding = finding the inverse**.

## Core Principle

```
To understand X, find X⁻¹ such that X · X⁻¹ = Identity

Successful inversion → MANIFESTED (visible reality)
Failed inversion    → VOID (black hole)
Double inversion    → TRUE KNOWLEDGE (X⁻¹⁻¹ = X)
```

## How It Works

### The Inversion Engine

The AI learns by attempting to **invert** elements:

```typescript
Element X  ──invert──►  X⁻¹

If X · X⁻¹ ≈ Identity → Understanding achieved (manifested)
If X · X⁻¹ ≠ Identity → No understanding (void/black hole)
```

### Inversions Form Waveforms

Each inversion attempt contributes to an oscillating wave pattern:
- Successful inversions → positive amplitude
- Failed inversions → negative amplitude
- The wave visualizes the AI's learning process

### What Gets Rendered

The 3D visualization shows **manifested reality** - what the AI has successfully understood:

| Visual | Meaning |
|--------|---------|
| 🔵 Blue spheres | Successfully inverted (understood) |
| ⚫ Black spheres | Failed inversions (voids) |
| 🌀 Green particles | The inversion waveform |
| ⭐ Pentagram | Underlying symmetry structure |

## Architecture

```
src/
├── core/
│   ├── inversion/           # THE CORE
│   │   └── inversion-engine.ts  # Inversion operations & learning
│   │
│   ├── math/                # Mathematical foundations
│   │   ├── complex.ts       # Complex arithmetic
│   │   ├── fractal-pentagram.ts # Golden ratio symmetry structure
│   │   └── ...
│   │
│   └── ontology/            # Ontological primitives
│       └── ...
│
├── viz/                     # Visualization
│   ├── three-scene.ts       # Scene management
│   ├── manifested-reality-view.ts  # Renders understood reality
│   └── fractal-pentagram-view.ts   # Symmetry structure
│
└── main.ts                  # Application entry
```

## Feeding Problems to the AI

The system can learn from any domain by encoding problems as invertible elements:

```typescript
// Example: Classification
const problem = encode({ type: 'image', data: pixelArray });
const result = inversionEngine.invert(problem);

if (result.success) {
  // The inverse IS the understanding (e.g., "cat-generator model")
  const answer = decode(result.inverted);
}
```

| Problem Type | Element X | Inverse X⁻¹ |
|--------------|-----------|-------------|
| Classification | Input features | The category/class |
| Prediction | Current state | Causal model |
| Language | Text tokens | Meaning/intent |
| Vision | Pixels | Generative model |

## The Pentagram Structure

The fractal pentagram encodes **symmetry relationships**:

- 7 nested layers at golden ratio (φ) scales
- Each layer: 1, 1/φ², 1/φ⁴, 1/φ⁶...
- Vertices represent inversion partners
- Star connections carry information between scales

## Installation

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Usage

1. **Single Tick**: Attempt one inversion
2. **Run Simulation**: Continuous learning
3. **Pause**: Stop

Watch the console for detailed logs:
```
=== TICK 1 ====================
Step 1: Creating new element to invert...
Step 2: Attempting inversion...
  ✓ INVERSION SUCCEEDED (error: 0.0012)
    → Element is now MANIFESTED
Step 5: Updating manifested reality...
  - Manifested: 1, Voids: 0
=== TICK 1 COMPLETE ============
```

## Key Metrics

- **Tick**: Number of inversion attempts
- **Successful**: Elements understood (manifested)
- **Failed**: Elements not understood (voids)
- **Wave Amplitude**: Current learning oscillation
- **Success Rate**: % of inversions that succeeded

## Theoretical Foundation

1. **Nothingness cannot exist** - it would preclude the distinction "exists/not exists"
2. **Self-reference is unavoidable** - referring to nothingness creates it
3. **Inversion is the simplest self-reference** - `(−)` applied to itself
4. **Double inversion = identity** - `(−)(−) = (+)`
5. **Understanding = finding the inverse** - to know X is to find X⁻¹

This explains:
- Why spinors need 720° rotation
- Why matter exists (stable inversion loops)
- Why consciousness emerges (self-referential closure)
- Why some things are unknowable (non-invertible = black holes)

## Dependencies

- **three**: 3D visualization
- **uuid**: Unique identifiers  
- **vite**: Build tool
- **typescript**: Type safety

## License

MIT
