// Language: Lexicon
// Manages all learned lexemes, similarity, clustering, and compositional semantics

import { Lexeme } from './lexeme.js';
import { LinguisticOccurrence, segmentIntoForms, signalSimilarity } from './linguisticOccurrence.js';
import { globalTracer, transformationAnalyzer } from './operatorTrace.js';

// ============================================================
// Lexicon - The learned vocabulary
// ============================================================

/**
 * Lexicon: manages the collection of learned lexemes.
 * Handles word learning, similarity detection, and compositional semantics.
 */
export class Lexicon {
  constructor() {
    /** @type {Map<string, Lexeme>} form -> lexeme */
    this.lexemesByForm = new Map();
    
    /** @type {Map<string, Lexeme>} id -> lexeme */
    this.lexemesById = new Map();
    
    /** @type {Array<LinguisticOccurrence>} Recent occurrences for learning */
    this.recentOccurrences = [];
    this.maxRecentOccurrences = 100;
    
    /** Similarity threshold for clustering forms */
    this.formSimilarityThreshold = 0.8;
    
    /** Minimum occurrences before a proto-lexeme is considered */
    this.minOccurrencesForLexeme = 2;
  }

  /**
   * Process a linguistic input and learn from it.
   * @param {string} signal - The input signal (text)
   * @param {object} agent - The agent processing this
   * @returns {Array<LinguisticOccurrence>} Created occurrences
   */
  processInput(signal, agent) {
    const forms = segmentIntoForms(signal);
    const occurrences = [];
    
    for (const form of forms) {
      const occurrence = this._processForm(form, agent, signal);
      if (occurrence) {
        occurrences.push(occurrence);
      }
    }
    
    return occurrences;
  }

  /**
   * Process a single form token.
   */
  _processForm(form, agent, fullSignal) {
    // Record waveform before
    const waveformBefore = agent.attentionState?.waveform 
      ? this._snapshotWaveform(agent.attentionState.waveform)
      : null;
    
    // Start operator trace
    globalTracer.startTrace();
    
    // Apply the form's transformation (if we have a lexeme for it)
    const existingLexeme = this.getLexemeForForm(form);
    if (existingLexeme) {
      this._applyLexemeTransformation(existingLexeme, agent);
    } else {
      // New form - apply default transformation based on form characteristics
      this._applyDefaultTransformation(form, agent);
    }
    
    // End trace and record waveform after
    const operatorTrace = globalTracer.endTrace();
    const waveformAfter = agent.attentionState?.waveform
      ? this._snapshotWaveform(agent.attentionState.waveform)
      : null;
    
    // Create linguistic occurrence
    const occurrence = new LinguisticOccurrence({
      id: `ling:${form}:${Date.now()}`,
      signal: form,
      waveformBefore,
      waveformAfter,
      operatorTrace,
      contextIds: this._getRecentContextIds()
    });
    
    // Store occurrence
    this.recentOccurrences.push(occurrence);
    if (this.recentOccurrences.length > this.maxRecentOccurrences) {
      this.recentOccurrences.shift();
    }
    
    // Update or create lexeme
    this._updateLexeme(form, occurrence);
    
    return occurrence;
  }

  /**
   * Create a waveform snapshot.
   */
  _snapshotWaveform(waveform) {
    if (!waveform || !waveform.channels) return null;
    
    const snapshot = { channels: {}, timestamp: Date.now() };
    
    for (const [name, wf] of Object.entries(waveform.channels)) {
      const entries = [];
      for (const id of wf.keys()) {
        const amp = wf.get(id);
        entries.push({
          id,
          re: amp.re,
          im: amp.im,
          magSq: amp.re * amp.re + amp.im * amp.im
        });
      }
      entries.sort((a, b) => b.magSq - a.magSq);
      
      snapshot.channels[name] = {
        norm: wf.normSquared(),
        topEntries: entries.slice(0, 5)
      };
    }
    
    return snapshot;
  }

  /**
   * Get recent context occurrence IDs.
   */
  _getRecentContextIds() {
    return this.recentOccurrences.slice(-5).map(o => o.id);
  }

  /**
   * Apply a lexeme's learned transformation to the agent's waveform.
   */
  _applyLexemeTransformation(lexeme, agent) {
    const pattern = lexeme.operatorPattern;
    const waveform = agent.attentionState?.waveform;
    if (!waveform) return;
    
    // Apply transformation based on operator weights
    // This is where the learned pattern modifies the waveform
    
    // Up: boost amplitude in 'u' channel
    if (pattern.weights.up > 0.1) {
      this._boostChannel(waveform, 'u', pattern.weights.up);
      globalTracer.record('up', { weight: pattern.weights.up });
    }
    
    // Down: reduce amplitude in 'd' channel or opposing
    if (pattern.weights.down > 0.1) {
      this._boostChannel(waveform, 'd', pattern.weights.down);
      globalTracer.record('down', { weight: pattern.weights.down });
    }
    
    // Strange: shift between contexts
    if (pattern.weights.strange > 0.1) {
      this._shiftContext(waveform, pattern.weights.strange);
      globalTracer.record('strange', { weight: pattern.weights.strange });
    }
    
    // Charm: compress/abstract
    if (pattern.weights.charm > 0.1) {
      this._boostChannel(waveform, 'c', pattern.weights.charm);
      globalTracer.record('charm', { weight: pattern.weights.charm });
    }
    
    // Top: structural constraints
    if (pattern.weights.top > 0.1) {
      this._boostChannel(waveform, 't', pattern.weights.top);
      globalTracer.record('top', { weight: pattern.weights.top });
    }
    
    // Bottom: grounding
    if (pattern.weights.bottom > 0.1) {
      this._boostChannel(waveform, 'b', pattern.weights.bottom);
      globalTracer.record('bottom', { weight: pattern.weights.bottom });
    }
    
    waveform.normalizeAll();
  }

  /**
   * Apply default transformation for unknown forms.
   */
  _applyDefaultTransformation(form, agent) {
    const waveform = agent.attentionState?.waveform;
    if (!waveform) return;
    
    // Heuristics based on form characteristics
    const isShort = form.length <= 3;
    const isCapitalized = form[0] === form[0].toUpperCase();
    
    if (isShort) {
      // Short words tend to be structural (articles, prepositions)
      this._boostChannel(waveform, 't', 0.3);
      globalTracer.record('top', { reason: 'short-form' });
    }
    
    if (isCapitalized) {
      // Capitalized words tend to be grounding (proper nouns)
      this._boostChannel(waveform, 'b', 0.3);
      globalTracer.record('bottom', { reason: 'capitalized' });
    }
    
    // Default: slight up boost (assertion)
    this._boostChannel(waveform, 'u', 0.2);
    globalTracer.record('up', { reason: 'default' });
    
    waveform.normalizeAll();
  }

  /**
   * Boost amplitude in a channel.
   */
  _boostChannel(waveform, channelName, factor) {
    const channel = waveform.getChannel(channelName);
    if (!channel) return;
    
    for (const id of channel.keys()) {
      const amp = channel.get(id);
      channel.set(id, {
        re: amp.re * (1 + factor),
        im: amp.im * (1 + factor)
      });
    }
  }

  /**
   * Shift context (strange operator effect).
   */
  _shiftContext(waveform, factor) {
    // Move amplitude from one channel to another
    const sChannel = waveform.getChannel('s');
    const cChannel = waveform.getChannel('c');
    
    if (!sChannel || !cChannel) return;
    
    // Transfer some amplitude
    for (const id of sChannel.keys()) {
      const amp = sChannel.get(id);
      const transfer = {
        re: amp.re * factor * 0.5,
        im: amp.im * factor * 0.5
      };
      
      const existing = cChannel.get(id) || { re: 0, im: 0 };
      cChannel.set(id, {
        re: existing.re + transfer.re,
        im: existing.im + transfer.im
      });
    }
  }

  /**
   * Update or create a lexeme for a form.
   */
  _updateLexeme(form, occurrence) {
    let lexeme = this.getLexemeForForm(form);
    
    if (!lexeme) {
      // Check if there's a similar form we should cluster with
      lexeme = this._findSimilarLexeme(form);
      
      if (!lexeme) {
        // Create new lexeme
        lexeme = new Lexeme(form);
        this.lexemesById.set(lexeme.id, lexeme);
      }
      
      // Map this form to the lexeme
      this.lexemesByForm.set(form.toLowerCase(), lexeme);
    }
    
    // Update lexeme from occurrence
    lexeme.updateFromOccurrence(occurrence);
  }

  /**
   * Find a similar existing lexeme for clustering.
   */
  _findSimilarLexeme(form) {
    for (const [existingForm, lexeme] of this.lexemesByForm) {
      if (signalSimilarity(form, existingForm) >= this.formSimilarityThreshold) {
        return lexeme;
      }
    }
    return null;
  }

  /**
   * Get lexeme for a form.
   * @param {string} form
   * @returns {Lexeme|null}
   */
  getLexemeForForm(form) {
    return this.lexemesByForm.get(form.toLowerCase()) || null;
  }

  /**
   * Get all lexemes.
   * @returns {Lexeme[]}
   */
  getAllLexemes() {
    return [...this.lexemesById.values()];
  }

  /**
   * Get grounded lexemes only.
   * @returns {Lexeme[]}
   */
  getGroundedLexemes() {
    return this.getAllLexemes().filter(l => l.isGrounded);
  }

  /**
   * Find similar lexemes to a given one.
   * @param {Lexeme} lexeme
   * @param {number} threshold
   * @returns {Array<{lexeme: Lexeme, similarity: object}>}
   */
  findSimilarLexemes(lexeme, threshold = 0.5) {
    const results = [];
    
    for (const other of this.getAllLexemes()) {
      if (other.id === lexeme.id) continue;
      
      const sim = lexeme.similarity(other);
      if (sim.total >= threshold) {
        results.push({ lexeme: other, similarity: sim });
      }
    }
    
    results.sort((a, b) => b.similarity.total - a.similarity.total);
    return results;
  }

  /**
   * Find antonyms for a lexeme.
   * @param {Lexeme} lexeme
   * @returns {Lexeme[]}
   */
  findAntonyms(lexeme) {
    return this.getAllLexemes().filter(other => 
      other.id !== lexeme.id && lexeme.isAntonymOf(other)
    );
  }

  /**
   * Apply a sequence of lexemes to transform a waveform (sentence processing).
   * @param {string[]} forms - Sequence of word forms
   * @param {object} agent - The agent
   * @returns {object} Processing result
   */
  applySentence(forms, agent) {
    const results = [];
    const waveformStart = this._snapshotWaveform(agent.attentionState?.waveform);
    
    for (const form of forms) {
      const lexeme = this.getLexemeForForm(form);
      
      if (lexeme) {
        this._applyLexemeTransformation(lexeme, agent);
        results.push({
          form,
          lexeme: lexeme.canonicalForm,
          operator: lexeme.operatorPattern.getDominantOperator()
        });
      } else {
        this._applyDefaultTransformation(form, agent);
        results.push({
          form,
          lexeme: null,
          operator: 'unknown'
        });
      }
    }
    
    const waveformEnd = this._snapshotWaveform(agent.attentionState?.waveform);
    
    // Analyze overall transformation
    const transformation = transformationAnalyzer.analyze(waveformStart, waveformEnd);
    
    return {
      forms,
      results,
      transformation,
      dominantOperator: transformation.dominantOperator
    };
  }

  /**
   * Restructure the lexicon - merge similar lexemes, update patterns.
   * Called when the agent's understanding has significantly changed.
   */
  restructure() {
    const lexemes = this.getAllLexemes();
    if (lexemes.length < 2) {
      return { restructured: false, reason: 'too few lexemes' };
    }
    
    let mergeCount = 0;
    
    // Find and merge very similar lexemes
    for (let i = 0; i < lexemes.length; i++) {
      for (let j = i + 1; j < lexemes.length; j++) {
        const l1 = lexemes[i];
        const l2 = lexemes[j];
        
        // Skip if either was already merged (removed)
        if (!this.lexemesById.has(l1.id) || !this.lexemesById.has(l2.id)) continue;
        
        const sim = l1.similarity(l2);
        
        // Merge if very similar (>0.9 total similarity)
        if (sim.total > 0.9) {
          const keep = l1.occurrenceCount >= l2.occurrenceCount ? l1 : l2;
          const remove = keep === l1 ? l2 : l1;
          
          // Merge form clusters
          for (const form of remove.formCluster) {
            keep.addFormVariant(form);
            this.lexemesByForm.set(form, keep);
          }
          
          // Merge operator patterns (weighted average)
          const totalCount = keep.occurrenceCount + remove.occurrenceCount;
          for (const op of Object.keys(keep.operatorPattern.weights)) {
            keep.operatorPattern.weights[op] = 
              (keep.operatorPattern.weights[op] * keep.occurrenceCount +
               remove.operatorPattern.weights[op] * remove.occurrenceCount) / totalCount;
          }
          
          keep.occurrenceCount = totalCount;
          
          // Remove the merged lexeme
          this.lexemesById.delete(remove.id);
          mergeCount++;
        }
      }
    }
    
    return { 
      restructured: mergeCount > 0, 
      mergeCount,
      lexemeCount: this.lexemesById.size 
    };
  }

  /**
   * Get lexicon statistics.
   */
  getStatistics() {
    const lexemes = this.getAllLexemes();
    const grounded = this.getGroundedLexemes();
    
    const byRole = {};
    for (const lexeme of lexemes) {
      const role = lexeme.getSemanticRole();
      byRole[role] = (byRole[role] || 0) + 1;
    }
    
    return {
      totalLexemes: lexemes.length,
      groundedLexemes: grounded.length,
      recentOccurrences: this.recentOccurrences.length,
      bySemanticRole: byRole,
      topLexemes: lexemes
        .sort((a, b) => b.occurrenceCount - a.occurrenceCount)
        .slice(0, 10)
        .map(l => ({ form: l.canonicalForm, count: l.occurrenceCount, role: l.getSemanticRole() }))
    };
  }

  /**
   * Serialize to JSON.
   */
  toJSON() {
    return {
      statistics: this.getStatistics(),
      lexemes: this.getAllLexemes().map(l => l.toJSON())
    };
  }
}

// ============================================================
// Global lexicon instance
// ============================================================

export const globalLexicon = new Lexicon();
