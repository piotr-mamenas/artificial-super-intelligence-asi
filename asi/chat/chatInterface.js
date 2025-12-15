// Chat: Chat Interface for ASI Agent Learning

import { Occurrence } from '../core/occurrences.js';
import { detectEmotionTeaching, emotionDetector } from '../cognitive/emergentEmotion.js';
import { inferTransformationType } from '../cognitive/emergentConnector.js';
import { segmentIntoForms } from '../language/linguisticOccurrence.js';

// ============================================================
// ChatInterface - Connects chat UI to ASI agent learning
// ============================================================

/**
 * ChatInterface: manages chat UI and agent learning from conversations.
 */
export class ChatInterface {
  /**
   * @param {object} config
   * @param {HTMLElement} config.messagesContainer
   * @param {HTMLInputElement} config.input
   * @param {HTMLButtonElement} config.sendButton
   * @param {object} config.agent - The ASI agent
   * @param {object} [config.symmetryDetector] - Optional symmetry detector
   * @param {function} [config.onLearn] - Callback when agent learns something
   */
  constructor(config) {
    this.messagesContainer = config.messagesContainer;
    this.input = config.input;
    this.sendButton = config.sendButton;
    this.agent = config.agent;
    this.symmetryDetector = config.symmetryDetector;
    this.onLearn = config.onLearn || (() => {});
    
    this.conversationHistory = [];
    this.learnedConcepts = new Map(); // concept -> occurrence IDs
    
    // Proactive questioning state
    this.messageCount = 0;
    this.lastQuestionTime = 0;
    this.questionCooldown = 3; // Messages between questions
    this.autoQuestionEnabled = true;
    
    this._bindEvents();
  }

  _bindEvents() {
    this.sendButton.addEventListener('click', () => this._handleSend());
    this.input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this._handleSend();
    });
    
    // Bind command buttons
    const buttons = document.querySelectorAll('.chat-btn[data-cmd]');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const cmd = btn.getAttribute('data-cmd');
        this.input.value = cmd;
        this._handleSend();
      });
    });
  }

  _handleSend() {
    const text = this.input.value.trim();
    if (!text) return;
    
    this.input.value = '';
    this.messageCount++;
    
    // Add user message
    this._addMessage(text, 'user');
    this.conversationHistory.push({ role: 'user', text, timestamp: Date.now() });
    
    // Process and respond
    const response = this._processUserMessage(text);
    
    // Add agent response after short delay
    setTimeout(() => {
      this._addMessage(response, 'agent');
      this.conversationHistory.push({ role: 'agent', text: response, timestamp: Date.now() });
      
      // Check if agent should ask a follow-up question
      this._maybeAskQuestion();
    }, 300 + Math.random() * 200);
  }

  /**
   * Check conditions and possibly ask a proactive question.
   */
  _maybeAskQuestion() {
    if (!this.autoQuestionEnabled) return;
    if (this.messageCount - this.lastQuestionTime < this.questionCooldown) return;
    
    const question = this._generateQuestion();
    if (question) {
      this.lastQuestionTime = this.messageCount;
      
      setTimeout(() => {
        this._addMessage(question, 'agent');
        this.conversationHistory.push({ role: 'agent', text: question, timestamp: Date.now() });
      }, 800 + Math.random() * 400);
    }
  }

  /**
   * Generate a proactive question based on agent state.
   * Uses curiosity, uncertainty, and knowledge gaps.
   * @returns {string|null}
   */
  _generateQuestion() {
    const emotion = this.agent.evaluateEmotion();
    const conceptCount = this.learnedConcepts.size;
    
    // Strategy 1: Curiosity-driven (when emotion is curiosity)
    if (emotion.emotion === 'curiosity') {
      const question = this._generateCuriosityQuestion();
      if (question) return question;
    }
    
    // Strategy 2: Uncertainty-driven (high residual = poor self-model)
    if (emotion.residual > 0.5) {
      const question = this._generateUncertaintyQuestion();
      if (question) return question;
    }
    
    // Strategy 3: Knowledge gap detection
    if (conceptCount >= 2) {
      const question = this._generateKnowledgeGapQuestion();
      if (question) return question;
    }
    
    // Strategy 4: Bootstrapping (very few concepts)
    if (conceptCount < 3 && this.messageCount > 2) {
      return this._generateBootstrapQuestion();
    }
    
    return null;
  }

  /**
   * Generate a question driven by curiosity emotion.
   */
  _generateCuriosityQuestion() {
    // Find the most recently learned concept
    const concepts = [...this.learnedConcepts.keys()];
    if (concepts.length === 0) return null;
    
    const recent = concepts[concepts.length - 1];
    const related = this._getRelatedConcepts(recent);
    
    const questions = [
      `I'm curious about "${recent}". Can you tell me more?`,
      `What else is connected to "${recent}"?`,
      `How did you learn about "${recent}"?`,
      `Are there different kinds of "${recent}"?`
    ];
    
    if (related.length > 0) {
      questions.push(`How exactly does "${recent}" relate to "${related[0]}"?`);
    }
    
    return questions[Math.floor(Math.random() * questions.length)];
  }

  /**
   * Generate a question when uncertainty is high.
   */
  _generateUncertaintyQuestion() {
    const concepts = [...this.learnedConcepts.keys()];
    
    // Find concepts with conflicting or sparse relations
    const sparse = concepts.filter(c => this._getRelatedConcepts(c).length < 2);
    
    if (sparse.length > 0) {
      const concept = sparse[Math.floor(Math.random() * sparse.length)];
      return `I'm uncertain about "${concept}". Could you clarify what it means?`;
    }
    
    const questions = [
      "I'm not sure I understand the connections. Can you explain differently?",
      "Something doesn't quite fit in my understanding. Can you help clarify?",
      "I feel like I'm missing something important. What should I know?"
    ];
    
    return questions[Math.floor(Math.random() * questions.length)];
  }

  /**
   * Generate a question to fill knowledge gaps.
   */
  _generateKnowledgeGapQuestion() {
    const concepts = [...this.learnedConcepts.keys()];
    
    // Find isolated concepts (no relations)
    const isolated = concepts.filter(c => this._getRelatedConcepts(c).length === 0);
    
    if (isolated.length >= 2) {
      const c1 = isolated[0];
      const c2 = isolated[1];
      return `Is there any connection between "${c1}" and "${c2}"?`;
    }
    
    if (isolated.length === 1) {
      return `How does "${isolated[0]}" fit with the other things I've learned?`;
    }
    
    // Find concepts that could form new connections
    const pairs = [];
    for (let i = 0; i < concepts.length; i++) {
      for (let j = i + 1; j < concepts.length; j++) {
        const related = this._getRelatedConcepts(concepts[i]);
        if (!related.includes(concepts[j])) {
          pairs.push([concepts[i], concepts[j]]);
        }
      }
    }
    
    if (pairs.length > 0) {
      const [c1, c2] = pairs[Math.floor(Math.random() * pairs.length)];
      return `Do "${c1}" and "${c2}" have anything in common?`;
    }
    
    return null;
  }

  /**
   * Generate a bootstrap question when knowledge is sparse.
   */
  _generateBootstrapQuestion() {
    const questions = [
      "What would you like to teach me about?",
      "I'm ready to learn. What's something important I should know?",
      "Tell me about something you find interesting.",
      "What concepts should I understand first?",
      "Can you give me an example of something to learn?"
    ];
    
    return questions[Math.floor(Math.random() * questions.length)];
  }

  /**
   * Manually trigger a question (for external calls).
   * @returns {string|null} The question asked, or null if none
   */
  askQuestion() {
    const question = this._generateQuestion();
    if (question) {
      this._addMessage(question, 'agent');
      this.conversationHistory.push({ role: 'agent', text: question, timestamp: Date.now() });
      return question;
    }
    return null;
  }

  /**
   * Enable or disable auto-questioning.
   * @param {boolean} enabled
   */
  setAutoQuestion(enabled) {
    this.autoQuestionEnabled = enabled;
  }

  /**
   * Add a message to the chat display.
   * @param {string} text
   * @param {string} type - 'user', 'agent', or 'system'
   */
  _addMessage(text, type) {
    const msg = document.createElement('div');
    msg.className = `chat-msg ${type}`;
    msg.textContent = text;
    this.messagesContainer.appendChild(msg);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  /**
   * Process user message and generate agent response.
   * @param {string} text
   * @returns {string}
   */
  _processUserMessage(text) {
    const lowerText = text.toLowerCase();
    
    // Extract concepts from the message
    const concepts = this._extractConcepts(text);
    
    // Record chat event for symmetry tracking
    if (this.symmetryDetector) {
      this.symmetryDetector.recordChatEvent('user', concepts);
    }
    
    // === Control Commands ===
    if (lowerText === '/show' || lowerText === '/graph') {
      return this._handleShowGraph();
    }
    
    if (lowerText === '/forget all') {
      return this._handleForgetAll();
    }
    
    if (lowerText.startsWith('/forget ')) {
      const concept = text.slice(8).trim();
      return this._handleForget(concept);
    }
    
    if (lowerText === '/understood' || lowerText === '/status') {
      return this._handleShowUnderstanding();
    }
    
    if (lowerText === '/help') {
      return this._handleHelp();
    }
    
    if (lowerText === '/ask') {
      return this._generateQuestion() || "I don't have any questions right now.";
    }
    
    if (lowerText === '/emotions') {
      return this._handleShowEmotions();
    }
    
    if (lowerText === '/connectors' || lowerText === '/links') {
      return this._handleShowConnectors();
    }
    
    if (lowerText === '/lexicon' || lowerText === '/words') {
      return this._handleShowLexicon();
    }
    
    if (lowerText.startsWith('/similar ')) {
      const word = text.slice(9).trim();
      return this._handleFindSimilar(word);
    }
    
    if (lowerText.startsWith('/word ')) {
      const word = text.slice(6).trim();
      return this._handleShowWord(word);
    }
    
    if (lowerText === '/restructure') {
      return this._handleRestructure();
    }
    
    if (lowerText.startsWith('/trace ')) {
      const concept = text.slice(7).trim();
      return this._handleTrace(concept);
    }
    
    if (lowerText.startsWith('/path ')) {
      const parts = text.slice(6).trim().split(/\s+to\s+/i);
      if (parts.length === 2) {
        return this._handleFindPath(parts[0].trim(), parts[1].trim());
      }
      return "Usage: /path <concept1> to <concept2>";
    }
    
    if (lowerText === '/symmetry') {
      return this._handleSymmetryStats();
    }
    
    // === Emotion Teaching (check before other patterns) ===
    // Pass known emotions so detector can recognize them
    const knownEmotions = new Set(this.agent.getLearnedEmotions());
    const emotionWord = detectEmotionTeaching(text, knownEmotions);
    if (emotionWord) {
      return this._handleEmotionTeaching(emotionWord, text);
    }
    
    // === Teaching patterns ===
    if (lowerText.includes(' is ') || lowerText.includes(' are ')) {
      return this._handleTeaching(text, concepts);
    }
    
    if (lowerText.includes(' means ') || lowerText.includes(' represents ')) {
      return this._handleDefinition(text, concepts);
    }
    
    if (lowerText.startsWith('what is ') || lowerText.startsWith('what are ')) {
      return this._handleQuery(text, concepts);
    }
    
    if (lowerText.includes(' relates to ') || lowerText.includes(' connected to ')) {
      return this._handleRelation(text, concepts);
    }
    
    if (lowerText.includes('remember ') || lowerText.includes('learn ')) {
      return this._handleExplicitLearn(text, concepts);
    }
    
    // Check if this is a question BEFORE processing
    if (lowerText.includes('what is ') || lowerText.includes('who is ') || 
        lowerText.includes('what are ') || lowerText.endsWith('?')) {
      return this._handleQuestion(text, concepts);
    }
    
    // Process all text through language system (builds lexicon)
    this.agent.processLanguage(text);
    
    // Default: acknowledge and create occurrence
    return this._handleGeneral(text, concepts);
  }

  /**
   * Handle questions - use waveform resonance to find understanding.
   * Concepts ARE waveforms - we find answers by resonance, not lookup.
   */
  _handleQuestion(text, concepts) {
    const askedConcept = concepts.length > 0 ? concepts[concepts.length - 1] : null;
    
    if (!askedConcept) {
      return "What would you like to know about?";
    }
    
    // Query by waveform resonance - this is how we "understand"
    const resonant = this.agent.queryByResonance(askedConcept);
    
    // Check if we have the concept as a waveform
    const conceptWaveform = this.agent.conceptSpace.concepts.get(askedConcept.toLowerCase());
    
    if (!conceptWaveform) {
      return `I don't know about "${askedConcept}" yet.\n` +
             `Teach me by saying "${askedConcept} is..." or "${askedConcept} means..."`;
    }
    
    // Build response from waveform analysis
    const lines = [`About "${askedConcept}":`];
    
    // Show the concept's spin signature (derived from waveform)
    const signature = conceptWaveform.getSpinSignature();
    lines.push(`  Spin signature: ${signature.getPatternString()}`);
    lines.push(`  Coherence: ${(conceptWaveform.coherence * 100).toFixed(0)}%`);
    
    // Show resonant concepts (related by waveform similarity)
    if (resonant.length > 1) {
      const related = resonant
        .filter(r => r.label !== askedConcept.toLowerCase())
        .slice(0, 5);
      
      if (related.length > 0) {
        lines.push(`  Resonates with:`);
        for (const r of related) {
          lines.push(`    • ${r.label} (${(r.resonance * 100).toFixed(0)}% resonance)`);
        }
      }
    }
    
    // Show transformation history
    if (conceptWaveform.transformationHistory.length > 0) {
      const lastTrans = conceptWaveform.transformationHistory.slice(-3);
      lines.push(`  Recent transformations:`);
      for (const t of lastTrans) {
        lines.push(`    • ${t.pattern}${t.label ? ` (${t.label})` : ''}`);
      }
    }
    
    // Attempt inversion to show understanding depth
    const inversion = this.agent.attemptConceptInversion(askedConcept);
    lines.push(`  Understanding: ${inversion.success ? '✓ Can invert' : '○ Partial'} (error: ${(inversion.error * 100).toFixed(0)}%)`);
    
    return lines.join('\n');
  }

  // === Control Command Handlers ===

  /**
   * Show current understanding (all learned concepts and relations).
   */
  _handleShowUnderstanding() {
    const concepts = [...this.learnedConcepts.keys()];
    if (concepts.length === 0) {
      return "I haven't learned anything yet. Teach me something!";
    }
    
    const lines = ["Here's what I understand:\n"];
    
    for (const concept of concepts) {
      const related = this._getRelatedConcepts(concept);
      if (related.length > 0) {
        lines.push(`• "${concept}" → ${related.map(r => `"${r}"`).join(', ')}`);
      } else {
        lines.push(`• "${concept}" (isolated)`);
      }
    }
    
    const emotion = this.agent.evaluateEmotion();
    lines.push(`\nEmotion: ${emotion.emotion} | Certainty: ${(1 - emotion.residual).toFixed(0)}%`);
    
    return lines.join('\n');
  }

  /**
   * Show graph structure.
   */
  _handleShowGraph() {
    const occCount = this.agent.graph.getAllOccurrences().length;
    const relCount = this.agent.graph.getAllRelations().length;
    const concepts = [...this.learnedConcepts.keys()];
    
    return `Graph Structure:\n• ${occCount} occurrences\n• ${relCount} relations\n• ${concepts.length} named concepts: ${concepts.slice(0, 10).join(', ')}${concepts.length > 10 ? '...' : ''}`;
  }

  /**
   * Forget a specific concept.
   */
  _handleForget(concept) {
    const lowerConcept = concept.toLowerCase();
    
    if (!this.learnedConcepts.has(lowerConcept)) {
      return `I don't know about "${concept}".`;
    }
    
    // Remove from learned concepts (occurrences remain in graph but untracked)
    this.learnedConcepts.delete(lowerConcept);
    
    return `I've forgotten about "${concept}". It's still in my deep memory but I won't actively use it.`;
  }

  /**
   * Forget all learned concepts.
   */
  _handleForgetAll() {
    const count = this.learnedConcepts.size;
    this.learnedConcepts.clear();
    return `I've forgotten all ${count} named concepts. My graph structure remains but concepts are unmarked.`;
  }

  /**
   * Show help for commands.
   */
  _handleHelp() {
    return `Commands:
/trace <X> - Walk back symmetry paths
/path <X> to <Y> - Find transformation path
/symmetry - Symmetry space stats
/similar <X> - Find similar words
/word <X> - Word operator pattern
/lexicon - All learned words
/emotions - Learned emotions
/restructure - Reorganize patterns
/help - This help

Query examples:
• /trace cat - How was "cat" learned?
• /path cat to animal - What transforms cat→animal?

Teaching: "X is Y", "X means Y"
Emotions: "I feel X"`;
  }

  /**
   * Handle emotion teaching.
   * @param {string} emotionWord
   * @param {string} originalText - Original message for pattern reinforcement
   */
  _handleEmotionTeaching(emotionWord, originalText = '') {
    // Learn the emotion from current state
    this.agent.learnEmotion(emotionWord);
    
    // Reinforce the detection pattern
    if (originalText) {
      emotionDetector.reinforce(originalText, emotionWord);
    }
    
    // Record as symmetry event
    if (this.symmetryDetector) {
      this.symmetryDetector.recordLearningEvent('emotion', [`emotion:${emotionWord}`]);
    }
    
    const learnedCount = this.agent.getLearnedEmotions().length;
    const evalResult = this.agent.evaluateEmotion();
    
    // Show channel ratios (first 6 values are channel activations)
    const channelRatios = evalResult.signature.slice(0, 6);
    const channels = ['u', 'd', 's', 'c', 't', 'b'];
    const channelStr = channels.map((c, i) => `${c}:${(channelRatios[i] * 100).toFixed(0)}%`).join(' ');
    
    return `Learned "${emotionWord}" from waveform pattern.\nChannels: ${channelStr}\nKnown emotions: ${this.agent.getLearnedEmotions().join(', ')}`;
  }

  /**
   * Show learned emotions.
   */
  _handleShowEmotions() {
    const emotions = this.agent.getLearnedEmotions();
    
    if (emotions.length === 0) {
      return "I haven't learned any emotions yet.\nTeach me by saying things like:\n• \"I feel happy\"\n• \"this is excitement\"\n• \"feeling curious\"";
    }
    
    const current = this.agent.evaluateEmotion();
    const lines = ["Learned emotions:"];
    
    for (const emotion of emotions) {
      const isCurrent = current.emotion === emotion;
      lines.push(`• ${emotion}${isCurrent ? ' ← (current, similarity: ' + current.similarity.toFixed(2) + ')' : ''}`);
    }
    
    if (!current.emotion) {
      lines.push("\nCurrent state doesn't match any learned emotion.");
    }
    
    return lines.join('\n');
  }

  /**
   * Show learned connectors with their operator patterns.
   */
  _handleShowConnectors() {
    const connectors = this.agent.connectorField.getLearnedConnectors();
    
    if (connectors.length === 0) {
      return "I haven't learned any connector types yet.\nConnectors emerge when you teach me relations like:\n• \"cats are animals\"\n• \"love means caring\"";
    }
    
    const lines = ["Learned connector types (operator patterns):"];
    
    for (const label of connectors) {
      const pattern = this.agent.connectorField.getConnector(label);
      if (pattern) {
        const spinStr = pattern.getSpinString ? pattern.getSpinString() : '------';
        const role = pattern.getSemanticRole();
        const count = pattern.count;
        lines.push(`• ${label}: ${spinStr} (${role}, ${count}x)`);
        
        // Show active spins
        const ops = pattern.toOperatorSequence();
        if (ops.length > 0) {
          lines.push(`    Active: ${ops.join(', ')}`);
        }
      }
    }
    
    lines.push(`\nTotal: ${connectors.length} connector type(s)`);
    
    return lines.join('\n');
  }

  /**
   * Show lexicon statistics.
   */
  _handleShowLexicon() {
    const stats = this.agent.getLexiconStats();
    
    if (stats.totalLexemes === 0) {
      return "I haven't learned any words yet.\nWords emerge as operator patterns when you chat with me.";
    }
    
    const lines = [
      `Lexicon: ${stats.totalLexemes} words (${stats.groundedLexemes} grounded)`,
      "",
      "By semantic role:"
    ];
    
    for (const [role, count] of Object.entries(stats.bySemanticRole)) {
      lines.push(`  • ${role}: ${count}`);
    }
    
    if (stats.topLexemes.length > 0) {
      lines.push("", "Top words:");
      for (const { form, count, role } of stats.topLexemes.slice(0, 5)) {
        lines.push(`  • "${form}" (${count}x, ${role})`);
      }
    }
    
    return lines.join('\n');
  }

  /**
   * Find words similar to a given word.
   */
  _handleFindSimilar(word) {
    const similar = this.agent.findSimilarWords(word);
    
    if (similar.length === 0) {
      const lexeme = this.agent.getLexeme(word);
      if (!lexeme) {
        return `I don't know the word "${word}" yet.`;
      }
      return `No similar words found for "${word}".`;
    }
    
    const lines = [`Words similar to "${word}":`];
    
    for (const { word: w, similarity, operatorSimilarity } of similar.slice(0, 5)) {
      const pct = (similarity * 100).toFixed(0);
      const opPct = (operatorSimilarity * 100).toFixed(0);
      lines.push(`  • "${w}" (${pct}% total, ${opPct}% operator)`);
    }
    
    return lines.join('\n');
  }

  /**
   * Trace back symmetry paths for a concept.
   */
  _handleTrace(concept) {
    const walkback = this.agent.walkBackSymmetry(concept);
    
    if (!walkback.canReproduce) {
      // Also try to find similar concepts
      const similar = this.agent.findSimilarBySymmetry(concept);
      
      if (similar.length === 0) {
        return `No symmetry path found for "${concept}".\nTry teaching more relationships involving this concept.`;
      }
      
      const lines = [`No direct path for "${concept}", but found similar patterns:`];
      for (const s of similar.slice(0, 3)) {
        lines.push(`  • "${s.concept}" via ${s.matchingPath} (${(s.similarity * 100).toFixed(0)}%)`);
      }
      return lines.join('\n');
    }
    
    const lines = [
      `Symmetry trace for "${concept}":`,
      `  Depth: ${walkback.depth} transformation(s)`,
      ""
    ];
    
    for (let i = 0; i < walkback.chain.length; i++) {
      const step = walkback.chain[i];
      lines.push(`  ${i + 1}. ${step.from} → ${step.to}`);
      lines.push(`     Operators: ${step.operators}`);
      lines.push(`     Inverse: ${step.inverse}`);
    }
    
    return lines.join('\n');
  }

  /**
   * Find transformation path between two concepts.
   */
  _handleFindPath(from, to) {
    const path = this.agent.findSymmetryPath(from, to);
    
    if (!path) {
      return `No transformation path found from "${from}" to "${to}".\nThey may not be connected in the symmetry space yet.`;
    }
    
    const lines = [
      `Path: "${from}" → "${to}"`,
      `  Sequence: ${path.sequence}`,
      `  Steps: ${path.steps.length}`
    ];
    
    // Show each step
    for (let i = 0; i < Math.min(path.steps.length, 5); i++) {
      lines.push(`    ${i + 1}. ${path.steps[i].operator}`);
    }
    
    if (path.steps.length > 5) {
      lines.push(`    ... and ${path.steps.length - 5} more`);
    }
    
    return lines.join('\n');
  }

  /**
   * Show symmetry space statistics.
   */
  _handleSymmetryStats() {
    const stats = this.agent.getSymmetryStats();
    
    if (stats.totalPaths === 0) {
      return "No symmetry paths recorded yet.\nTeach me relationships to build the symmetry space.";
    }
    
    const lines = [
      "Symmetry Space:",
      `  Paths: ${stats.totalPaths}`,
      `  Total steps: ${stats.totalSteps}`,
      `  History: ${stats.historyLength} transformations`,
      "",
      "Operator distribution:"
    ];
    
    for (const [op, count] of Object.entries(stats.operatorDistribution)) {
      const bar = '█'.repeat(Math.min(10, Math.round(count / stats.totalSteps * 20)));
      lines.push(`  ${op}: ${bar} ${count}`);
    }
    
    return lines.join('\n');
  }

  /**
   * Handle restructuring of learned patterns.
   */
  _handleRestructure() {
    // Restructure emotions
    const emotionResult = this.agent.emotionField.restructure();
    
    // Restructure lexicon (if available)
    let lexiconResult = { restructured: false };
    if (this.agent.lexicon && this.agent.lexicon.restructure) {
      lexiconResult = this.agent.lexicon.restructure();
    }
    
    const lines = ["Restructuring learned patterns..."];
    
    if (emotionResult.restructured) {
      lines.push(`✓ Emotions: ${emotionResult.patternCount} pattern(s) after restructure`);
    } else {
      lines.push(`○ Emotions: ${emotionResult.reason || 'no change needed'}`);
    }
    
    if (lexiconResult.restructured) {
      lines.push(`✓ Lexicon: restructured`);
    }
    
    lines.push("", "Symmetries reorganized based on current understanding.");
    
    return lines.join('\n');
  }

  /**
   * Show details about a specific word.
   */
  _handleShowWord(word) {
    const lexeme = this.agent.getLexeme(word);
    
    if (!lexeme) {
      return `I don't know the word "${word}" yet. Use it in a sentence to teach me.`;
    }
    
    const lines = [
      `Word: "${lexeme.canonicalForm}"`,
      `  Role: ${lexeme.semanticRole}`,
      `  Occurrences: ${lexeme.occurrenceCount}`,
      `  Grounded: ${lexeme.isGrounded ? 'yes' : 'no'} (${(lexeme.groundingConfidence * 100).toFixed(0)}%)`,
      "",
      "Operator pattern:"
    ];
    
    const weights = lexeme.operatorPattern.weights;
    const sortedOps = Object.entries(weights)
      .filter(([_, w]) => w > 0.05)
      .sort((a, b) => b[1] - a[1]);
    
    for (const [op, weight] of sortedOps) {
      const bar = '█'.repeat(Math.round(weight * 10));
      lines.push(`  ${op}: ${bar} ${(weight * 100).toFixed(0)}%`);
    }
    
    return lines.join('\n');
  }

  /**
   * Extract concepts from text.
   * Uses learned coherence to filter out low-content words.
   * @param {string} text
   * @returns {string[]}
   */
  _extractConcepts(text) {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 1);
    
    // Filter based on learned semantic content
    const concepts = [];
    for (const word of words) {
      // Check if word has learned semantic content
      const conceptWf = this.agent.conceptSpace?.concepts.get(word);
      
      if (conceptWf) {
        // Include if it has sufficient coherence (learned content)
        if (conceptWf.coherence > 0.1) {
          concepts.push(word);
        }
      } else {
        // New word - include if it's not too short (emergent filter)
        if (word.length > 2) {
          concepts.push(word);
        }
      }
    }
    
    return [...new Set(concepts)];
  }

  /**
   * Handle teaching statements (X is Y).
   * Concepts ARE waveforms - relations are symmetry transformations.
   */
  _handleTeaching(text, concepts) {
    // Learn each concept as a waveform pattern
    const conceptWaveforms = [];
    for (const concept of concepts) {
      const wf = this.agent.learnConceptWaveform(concept);
      conceptWaveforms.push(wf);
    }
    
    // Learn transformations between consecutive concepts
    const transformations = [];
    if (concepts.length >= 2) {
      for (let i = 0; i < concepts.length - 1; i++) {
        const result = this.agent.learnTransformation(concepts[i], concepts[i + 1], 'is-a');
        transformations.push(result);
      }
    }
    
    // Also create occurrences in graph (for compatibility)
    this._createOccurrencesForConcepts(concepts, 'teaching');
    
    // Create relations with connector patterns
    const connectorResults = [];
    if (concepts.length >= 2) {
      for (let i = 0; i < concepts.length - 1; i++) {
        const result = this._createRelation(concepts[i], concepts[i + 1], text);
        if (result) {
          connectorResults.push(result);
          this._recordSymmetryTransformation(concepts[i], concepts[i + 1], result);
        }
      }
    }
    
    this._notifyLearning(concepts, 'teaching');
    
    // Build response showing waveform-based learning
    const lines = [`Learned: ${concepts.join(' → ')}`];
    
    // Show transformation info
    if (transformations.length > 0) {
      const t = transformations[0];
      lines.push(`  Transformation: ${t.transformation}`);
    }
    
    // Show concept coherence
    if (conceptWaveforms.length > 0) {
      const avgCoherence = conceptWaveforms.reduce((sum, c) => sum + c.coherence, 0) / conceptWaveforms.length;
      lines.push(`  Coherence: ${(avgCoherence * 100).toFixed(0)}%`);
    }
    
    return lines.join('\n');
  }
  
  /**
   * Record a transformation in the symmetry query engine.
   * Uses the actual operator pattern from the connector.
   */
  _recordSymmetryTransformation(from, to, connectorResult) {
    if (!this.agent.symmetryQuery) return;
    
    // Get operator sequence directly from the connector pattern
    const operators = connectorResult.operators || ['up'];
    
    // Build operator trace from the pattern
    const operatorTrace = operators.map(op => ({ type: op }));
    
    this.agent.symmetryQuery.recordTransformation(from, to, operatorTrace);
  }

  /**
   * Handle definition statements.
   */
  _handleDefinition(text, concepts) {
    const occIds = this._createOccurrencesForConcepts(concepts, 'definition');
    
    let connectorResult = null;
    if (concepts.length >= 2) {
      connectorResult = this._createRelation(concepts[0], concepts[concepts.length - 1], text);
      
      // Record transformation
      if (connectorResult) {
        this._recordSymmetryTransformation(concepts[0], concepts[concepts.length - 1], connectorResult);
      }
    }
    
    this._notifyLearning(concepts, 'definition');
    
    const connectorInfo = connectorResult 
      ? ` [${connectorResult.label}]`
      : '';
    
    return `Definition recorded. "${concepts[0]}"${connectorInfo} → "${concepts.slice(1).join(', ')}".`;
  }

  /**
   * Handle queries.
   */
  _handleQuery(text, concepts) {
    const results = [];
    
    for (const concept of concepts) {
      if (this.learnedConcepts.has(concept)) {
        const relatedIds = this.learnedConcepts.get(concept);
        const related = this._getRelatedConcepts(concept);
        if (related.length > 0) {
          results.push(`${concept} relates to: ${related.join(', ')}`);
        } else {
          results.push(`I know about "${concept}" but haven't learned its relations yet.`);
        }
      }
    }
    
    if (results.length === 0) {
      return `I don't have information about "${concepts.join(', ')}" yet. Could you teach me?`;
    }
    
    return results.join('\n');
  }

  /**
   * Handle explicit relation statements.
   */
  _handleRelation(text, concepts) {
    if (concepts.length < 2) {
      return "I need at least two concepts to create a relation.";
    }
    
    this._createOccurrencesForConcepts(concepts, 'relation');
    
    const connectorResults = [];
    for (let i = 0; i < concepts.length - 1; i++) {
      const result = this._createRelation(concepts[i], concepts[i + 1], text);
      if (result) {
        connectorResults.push(result);
        // Record transformation
        this._recordSymmetryTransformation(concepts[i], concepts[i + 1], result);
      }
    }
    
    this._notifyLearning(concepts, 'relation');
    
    const connectorInfo = connectorResults.length > 0
      ? ` via "${connectorResults[0].label}"`
      : '';
    
    return `Relation established: ${concepts.join(' ↔ ')}${connectorInfo}. Graph has ${this.agent.graph.getAllRelations().length} connections.`;
  }

  /**
   * Handle explicit learn commands.
   */
  _handleExplicitLearn(text, concepts) {
    const occIds = this._createOccurrencesForConcepts(concepts, 'explicit');
    
    this._notifyLearning(concepts, 'explicit');
    
    return `Learned ${concepts.length} new concept(s): ${concepts.join(', ')}. Total occurrences: ${this.agent.graph.getAllOccurrences().length}`;
  }

  /**
   * Handle general messages.
   */
  _handleGeneral(text, concepts) {
    if (concepts.length > 0) {
      this._createOccurrencesForConcepts(concepts, 'observation');
      
      const emotion = this.agent.evaluateEmotion();
      return `Noted. I'm feeling ${emotion.emotion} about this. I've recorded ${concepts.length} concept(s).`;
    }
    
    return "I see. Could you tell me more or teach me something specific?";
  }

  /**
   * Create occurrences for a list of concepts.
   * @param {string[]} concepts
   * @param {string} context
   * @returns {string[]} Created occurrence IDs
   */
  _createOccurrencesForConcepts(concepts, context) {
    const occIds = [];
    
    for (const concept of concepts) {
      const occId = `concept:${concept}:${Date.now()}`;
      
      const occ = new Occurrence({
        id: occId,
        mode: 'U',
        payload: { concept, context },
        metadata: { source: 'chat', timestamp: Date.now() }
      });
      
      this.agent.graph.addOccurrence(occ);
      occIds.push(occId);
      
      // Track learned concepts
      if (!this.learnedConcepts.has(concept)) {
        this.learnedConcepts.set(concept, []);
      }
      this.learnedConcepts.get(concept).push(occId);
    }
    
    return occIds;
  }

  /**
   * Create a relation between two concepts using emergent connector system.
   * Connectors are now operator patterns, not just labels.
   * @param {string} from
   * @param {string} to
   * @param {string} sentence - Original sentence for context
   */
  _createRelation(from, to, sentence = '') {
    const fromIds = this.learnedConcepts.get(from);
    const toIds = this.learnedConcepts.get(to);
    
    if (fromIds && toIds && fromIds.length > 0 && toIds.length > 0) {
      const fromId = fromIds[fromIds.length - 1];
      const toId = toIds[toIds.length - 1];
      
      // Learn connector as operator pattern from the sentence
      const connectorResult = this.agent.connectorField.learnFromSentence(sentence, from, to);
      
      // Get the operator sequence for this connector
      const operatorSequence = connectorResult.pattern.toOperatorSequence();
      
      try {
        this.agent.graph.addRelation(fromId, toId, 1.0, { 
          connector: connectorResult.label,
          operators: operatorSequence,
          role: connectorResult.pattern.getSemanticRole(),
          isNew: connectorResult.isNew
        });
      } catch (e) {
        // Ignore duplicate or self-reference errors
      }
      
      return {
        label: connectorResult.label,
        isNew: connectorResult.isNew,
        operators: operatorSequence,
        role: connectorResult.pattern.getSemanticRole(),
        pattern: connectorResult.pattern
      };
    }
    return null;
  }

  /**
   * Get concepts related to a given concept.
   * @param {string} concept
   * @returns {string[]}
   */
  _getRelatedConcepts(concept) {
    const related = new Set();
    const conceptIds = this.learnedConcepts.get(concept) || [];
    
    for (const occId of conceptIds) {
      // Use getOutgoing (correct API method)
      const relations = this.agent.graph.getOutgoing(occId);
      for (const rel of relations) {
        // Extract concept from occurrence ID (rel.to is the target)
        const match = rel.to.match(/^concept:([^:]+):/);
        if (match && match[1] !== concept) {
          related.add(match[1]);
        }
      }
    }
    
    return [...related];
  }

  /**
   * Notify about learning event.
   */
  _notifyLearning(concepts, type) {
    if (this.symmetryDetector) {
      this.symmetryDetector.recordLearningEvent(type, concepts.map(c => `concept:${c}`));
    }
    
    this.onLearn({
      concepts,
      type,
      timestamp: Date.now(),
      totalOccurrences: this.agent.graph.getAllOccurrences().length,
      totalRelations: this.agent.graph.getAllRelations().length
    });
  }

  /**
   * Add a system message.
   * @param {string} text
   */
  addSystemMessage(text) {
    this._addMessage(text, 'system');
  }

  /**
   * Get conversation history.
   * @returns {object[]}
   */
  getHistory() {
    return this.conversationHistory;
  }

  /**
   * Clear conversation.
   */
  clear() {
    this.messagesContainer.innerHTML = '';
    this.conversationHistory = [];
    this._addMessage('Chat cleared. Ready to learn...', 'system');
  }
}
