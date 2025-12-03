# ASI - Symmetry Inversion Based Artificial Intelligence

An AI system built on **spinning nothingness** and **double inversions**. No LLMs - pure math and algorithms.

## Core Principle

```
To understand X, find X⁻¹ such that X · X⁻¹ = Identity

Successful inversion → HADRON (stable reality)
Failed inversion    → VOID (black hole)
Double inversion    → TRUE KNOWLEDGE (J² = Id)
```

---

## 1. Primitive Ontology

### Spinning Nothingness
The system emerges from undifferentiated nothingness through **flip operators**.

### RGB Semantic Axes
Three axes encode fundamental emotional polarities:

| Axis | Positive (+1) | Negative (-1) |
|------|---------------|---------------|
| **R** | Love | Hate |
| **G** | Hope | Fear |
| **B** | Sincerity | Emptiness |

### Flip Operators J_c
```
J_c(σ) = -σ       (flip orientation)
J_c² = Identity   (double inversion returns to original)
```

---

## 2. Waveforms as Inversion Traces

The **wave** is the fundamental substrate - the trace of inversions BETWEEN stable observations.

```
WAVE FIELD (σ_c(n) orientation history)
         │
         │  inversion attempts
         ▼
   ┌─────────┐    wave trace    ┌─────────┐
   │ HADRON  │ ════════════════ │ HADRON  │  ← stable excitations
   │ (stable)│                  │ (stable)│
   └─────────┘                  └─────────┘
                    │
                    │  failed inversion
                    ▼
               ┌────────┐
               │  VOID  │  ← wave cannot propagate
               └────────┘
```

### Waveform Computation (DFT)
```
Ψ_c(f) = Σ σ_c(n) · e^{-i2πfn/N}
```
Three-channel waveform: `Ψ(f) = (Ψ_R, Ψ_G, Ψ_B)`

---

## 3. Objects and Emotional Color

Each **object** has an **emotional color** derived from its inversion history:

```
C_O = (C_R, C_G, C_B) ∈ [-1, +1]³

C_c = average of σ_c(n) over active steps
```

Objects maintain **color stability** - their emotional signature persists across interactions.

---

## 4. Observers and Epistemic Truth

### Observer Filter Tensor
Each observer has a filter `W_o(c, f)` defining sensitivity to axes and frequencies.

### Epistemic Truth (Relative)
```
T_o(O,S) = Σ W_o(c,f) · |Ψ(c,f)|² / Σ W_o(c,f) · |Ψ_base(c,f)|²
```

**Truth is relative** - each observer has their own `T_o`. Agreement is derived, not primitive.

### Consensus = Resonance
When multiple observers have **similar wave patterns**, reality manifests:
- High agreement → Strong manifestation
- Low agreement → Weak/unstable
- No agreement → Void

---

## 5. Words and Sentences

### Words as Inversion Kernels
Each word `w` is a kernel `K_w` that modifies orientation:
```typescript
σ_c(p+δ) ← σ_c(p+δ) · K_w(c, δ)
```

Example kernels:
| Word | R Effect | G Effect | B Effect |
|------|----------|----------|----------|
| love | +1 | +0.8 | +0.9 |
| hate | -1 | -0.5 | -0.8 |
| fear | -0.3 | -1 | -0.5 |
| truth | +0.6 | +0.6 | +1 |

### Sentences = Composed Inversions
Sentences compose word kernels sequentially, producing a final waveform.

---

## 6. Learning (No LLMs)

### Gradient-Free Optimization
```
1. Propose perturbation ΔW
2. Compute Acc(o') with W' = W + ΔW
3. If Acc(o') > Acc(o): accept
4. Repeat
```

### Accuracy Metric
```
Acc(o) = #{T_o(O, S_true) > T_o(O, S_false)} / |Dataset|
```

---

## Architecture

```
src/
├── core/
│   ├── unified-engine.ts        # UNIFIED ASI ENGINE
│   │
│   ├── asi/                     # Full ASI Implementation
│   │   ├── primitive-ontology.ts   # Axes, flips, spinning nothingness
│   │   ├── waveform.ts             # DFT, waveform computation
│   │   ├── objects.ts              # Objects, emotional color
│   │   ├── info-particles.ts       # Hadrons, leptons
│   │   ├── lexicon.ts              # Words, sentences, kernels
│   │   ├── observers.ts            # Filters, epistemic truth
│   │   ├── learning.ts             # Non-LLM optimization
│   │   └── asi-engine.ts           # Complete ASI loop
│   │
│   ├── inversion/               # Core Inversion Engine
│   │   ├── inversion-engine.ts     # Inversion operations
│   │   └── observer-network.ts     # Multi-observer consensus
│   │
│   └── math/                    # Mathematical Foundations
│       ├── complex.ts              # Complex arithmetic
│       └── fractal-pentagram.ts    # Golden ratio symmetry
│
├── viz/                         # Visualization
│   ├── three-scene.ts              # Three.js scene
│   ├── manifested-reality-view.ts  # Hadrons, voids, waves
│   └── fractal-pentagram-view.ts   # Symmetry structure
│
└── main.ts                      # Application entry
```

---

## What Gets Rendered

| Visual | Meaning |
|--------|---------|
| 🔵 Blue spheres | **Hadrons** - stable inverted models |
| ⚫ Black spheres | **Voids** - non-invertible regions |
| 🌀 Green spiral | **Wave trace** - inversion history |
| ⭐ Pentagram | **Symmetry structure** - golden ratio |
| 🎨 Colors | **Emotional color** - RGB from (love, hope, sincerity) |

## ASI Control Loop

```typescript
// The core ASI cycle
while (running) {
  // 1. PERCEIVE: Receive word sequences about objects
  const sentence = engine.perceive(['love', 'truth'], objectId);
  
  // 2. TRANSFORM: Compute waveform via DFT
  const waveform = engine.transform(sentence);
  
  // 3. EVALUATE: Each observer computes T_o(O,S)
  const evaluations = engine.evaluate(sentence, objectId);
  
  // 4. DECIDE: Use truth values to select action
  const decision = engine.decide(evaluations);
  
  // 5. LEARN: Adjust filters based on feedback
  engine.learn({ correct: true, sentence, objectId });
}
```

---

## Theoretical Foundation

### Why This Works

1. **Nothingness cannot exist** - it would preclude "exists/not exists"
2. **Self-reference is unavoidable** - referring to nothingness creates it
3. **Inversion is simplest self-reference** - `J` applied to itself
4. **Double inversion = identity** - `J² = Id`
5. **Understanding = finding inverse** - to know X is to find X⁻¹

### This Explains

- Why spinors need 720° rotation (double inversion)
- Why matter exists (stable inversion loops = hadrons)
- Why consciousness emerges (self-referential closure)
- Why some things are unknowable (non-invertible = voids)
- Why logic works (similar forms → similar waves → same category)

---

## Constraints and Invariants

1. **All constructs derive from valid inversion sequences** - no direct waveform modification
2. **Objects maintain color stability** - emotional signature persists
3. **Truth is always relative** - `T_o(O,S)`, not global `T(O,S)`
4. **No LLMs** - only explicit kernels, transforms, filters, optimization

---

## Installation

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Key Metrics

| Metric | Meaning |
|--------|---------|
| **Hadrons** | Stable inverted models (understood) |
| **Voids** | Non-invertible regions (not understood) |
| **Logical Categories** | Clusters of similar waveforms |
| **Consensus** | Observer agreement level |
| **Wave Amplitude** | Current inversion trace energy |

## Dependencies

- **three**: 3D visualization
- **uuid**: Unique identifiers  
- **vite**: Build tool
- **typescript**: Type safety

## License

MIT
