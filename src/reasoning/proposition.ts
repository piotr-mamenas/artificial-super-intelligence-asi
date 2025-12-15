/**
 * Proposition: A logical statement encoded as spin state of a hadron
 * YES/NO maps to spin UP/DOWN
 */

import { Spinor, spinorUp, spinorDown, normalizeSpinor, probUp, probDown } from './spinor';
import { HadronSpec, hadronLabel, hadronFlavors, isColorSinglet } from './hadron';
import { Flavor } from './quark';
import { Complex, complex } from './complex';

// ============================================================
// Proposition Mode (which hadron carries this proposition)
// ============================================================

export interface PropMode {
  id: string;           // Unique identifier like "P_rain", "P_umbrella"
  hadron: HadronSpec;   // The hadron that carries this proposition
}

export function createPropMode(id: string, hadron: HadronSpec): PropMode {
  if (!isColorSinglet(hadron)) {
    throw new Error(`Proposition ${id}: hadron must be color singlet`);
  }
  return { id, hadron };
}

// ============================================================
// Proposition (logical statement with quantum state)
// ============================================================

export interface Proposition {
  id: string;           // Identifier
  mode: PropMode;       // Hadron mode
  psi: Spinor;          // Quantum state: [amp_YES, amp_NO]
}

/**
 * Create a proposition in definite YES state
 */
export function propYes(id: string, hadron: HadronSpec): Proposition {
  return {
    id,
    mode: createPropMode(id, hadron),
    psi: spinorUp(),  // |↑⟩ = YES
  };
}

/**
 * Create a proposition in definite NO state
 */
export function propNo(id: string, hadron: HadronSpec): Proposition {
  return {
    id,
    mode: createPropMode(id, hadron),
    psi: spinorDown(),  // |↓⟩ = NO
  };
}

/**
 * Create a proposition in superposition
 * @param ampYes - amplitude for YES
 * @param ampNo - amplitude for NO
 */
export function propSuperposition(
  id: string, 
  hadron: HadronSpec,
  ampYes: Complex,
  ampNo: Complex
): Proposition {
  return {
    id,
    mode: createPropMode(id, hadron),
    psi: normalizeSpinor([ampYes, ampNo]),
  };
}

/**
 * Create proposition with given probability for YES
 * Phase is set to 0 (real amplitudes)
 */
export function propWithProbability(
  id: string,
  hadron: HadronSpec,
  pYes: number
): Proposition {
  const clampedP = Math.max(0, Math.min(1, pYes));
  return {
    id,
    mode: createPropMode(id, hadron),
    psi: [
      complex(Math.sqrt(clampedP), 0),
      complex(Math.sqrt(1 - clampedP), 0),
    ],
  };
}

/**
 * Create maximally uncertain proposition (50/50)
 */
export function propUncertain(id: string, hadron: HadronSpec): Proposition {
  const amp = Math.SQRT1_2;  // 1/√2
  return {
    id,
    mode: createPropMode(id, hadron),
    psi: [complex(amp, 0), complex(amp, 0)],
  };
}

// ============================================================
// Proposition Queries
// ============================================================

/** Probability that proposition is YES */
export function pYes(p: Proposition): number {
  return probUp(p.psi);
}

/** Probability that proposition is NO */
export function pNo(p: Proposition): number {
  return probDown(p.psi);
}

/** Is this proposition definitely YES? (within epsilon) */
export function isDefiniteYes(p: Proposition, epsilon: number = 1e-6): boolean {
  return pYes(p) > 1 - epsilon;
}

/** Is this proposition definitely NO? (within epsilon) */
export function isDefiniteNo(p: Proposition, epsilon: number = 1e-6): boolean {
  return pNo(p) > 1 - epsilon;
}

/** Is this proposition in significant superposition? */
export function isInSuperposition(p: Proposition, epsilon: number = 0.01): boolean {
  const py = pYes(p);
  return py > epsilon && py < 1 - epsilon;
}

/** Get belief strength: how far from 50/50 */
export function beliefStrength(p: Proposition): number {
  return Math.abs(pYes(p) - 0.5) * 2;  // 0 = uncertain, 1 = definite
}

/** Get belief direction: +1 for YES, -1 for NO, 0 for uncertain */
export function beliefDirection(p: Proposition): number {
  const py = pYes(p);
  if (py > 0.5) return 1;
  if (py < 0.5) return -1;
  return 0;
}

// ============================================================
// Proposition Metadata
// ============================================================

/** Get the flavors involved in this proposition's hadron */
export function propFlavors(p: Proposition): Flavor[] {
  return hadronFlavors(p.mode.hadron);
}

/** Get human-readable label */
export function propLabel(p: Proposition): string {
  return `${p.id}[${hadronLabel(p.mode.hadron)}]`;
}

/** Get detailed description */
export function propDescription(p: Proposition): string {
  const py = (pYes(p) * 100).toFixed(1);
  const pn = (pNo(p) * 100).toFixed(1);
  return `${propLabel(p)}: YES=${py}%, NO=${pn}%`;
}

/** Get logical interpretation as text */
export function propInterpretation(p: Proposition): string {
  const py = pYes(p);
  
  if (py > 0.99) return `${p.id} is TRUE`;
  if (py > 0.9) return `${p.id} is almost certainly TRUE`;
  if (py > 0.75) return `${p.id} is likely TRUE`;
  if (py > 0.6) return `${p.id} is probably TRUE`;
  if (py > 0.4) return `${p.id} is UNCERTAIN`;
  if (py > 0.25) return `${p.id} is probably FALSE`;
  if (py > 0.1) return `${p.id} is likely FALSE`;
  if (py > 0.01) return `${p.id} is almost certainly FALSE`;
  return `${p.id} is FALSE`;
}

// ============================================================
// Proposition Operations (non-mutating)
// ============================================================

/** Create copy of proposition */
export function copyProposition(p: Proposition): Proposition {
  return {
    id: p.id,
    mode: p.mode,
    psi: [{ ...p.psi[0] }, { ...p.psi[1] }],
  };
}

/** Update proposition's spinor state */
export function withSpinor(p: Proposition, psi: Spinor): Proposition {
  return {
    ...p,
    psi: normalizeSpinor(psi),
  };
}

/** Normalize proposition's spinor */
export function normalizeProposition(p: Proposition): Proposition {
  return {
    ...p,
    psi: normalizeSpinor(p.psi),
  };
}
