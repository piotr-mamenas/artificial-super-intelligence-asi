// Chat: Chat Interface for ASI Agent Learning

import { Occurrence } from '../core/occurrences.js';

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
    
    // Teaching patterns
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
    
    // Default: acknowledge and create occurrence
    return this._handleGeneral(text, concepts);
  }

  /**
   * Extract concept words from text.
   * @param {string} text
   * @returns {string[]}
   */
  _extractConcepts(text) {
    // Remove common words and extract nouns/concepts
    const stopWords = new Set([
      'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'shall', 'can', 'to', 'of', 'in',
      'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through',
      'during', 'before', 'after', 'above', 'below', 'between', 'under',
      'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where',
      'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some',
      'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
      'too', 'very', 'just', 'and', 'but', 'if', 'or', 'because', 'until',
      'while', 'although', 'though', 'i', 'you', 'he', 'she', 'it', 'we',
      'they', 'what', 'which', 'who', 'whom', 'this', 'that', 'these',
      'those', 'am', 'its', 'my', 'your', 'his', 'her', 'our', 'their',
      'means', 'represents', 'relates', 'connected', 'remember', 'learn'
    ]);
    
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));
    
    return [...new Set(words)];
  }

  /**
   * Handle teaching statements (X is Y).
   */
  _handleTeaching(text, concepts) {
    const occIds = this._createOccurrencesForConcepts(concepts, 'teaching');
    
    // Create relations between concepts
    if (concepts.length >= 2) {
      for (let i = 0; i < concepts.length - 1; i++) {
        this._createRelation(concepts[i], concepts[i + 1], 'is-a');
      }
    }
    
    this._notifyLearning(concepts, 'teaching');
    
    return `I understand. I've learned that ${concepts.join(' relates to ')}. This creates ${occIds.length} new connections in my understanding.`;
  }

  /**
   * Handle definition statements.
   */
  _handleDefinition(text, concepts) {
    const occIds = this._createOccurrencesForConcepts(concepts, 'definition');
    
    if (concepts.length >= 2) {
      this._createRelation(concepts[0], concepts[concepts.length - 1], 'means');
    }
    
    this._notifyLearning(concepts, 'definition');
    
    return `Definition recorded. "${concepts[0]}" is now associated with "${concepts.slice(1).join(', ')}".`;
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
    
    for (let i = 0; i < concepts.length - 1; i++) {
      this._createRelation(concepts[i], concepts[i + 1], 'relates-to');
    }
    
    this._notifyLearning(concepts, 'relation');
    
    return `Relation established: ${concepts.join(' ↔ ')}. My graph now has ${this.agent.graph.getAllRelations().length} connections.`;
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
   * Create a relation between two concepts.
   * @param {string} from
   * @param {string} to
   * @param {string} relationType
   */
  _createRelation(from, to, relationType) {
    const fromIds = this.learnedConcepts.get(from);
    const toIds = this.learnedConcepts.get(to);
    
    if (fromIds && toIds && fromIds.length > 0 && toIds.length > 0) {
      const fromId = fromIds[fromIds.length - 1];
      const toId = toIds[toIds.length - 1];
      
      try {
        this.agent.graph.addRelation(fromId, toId, 1.0, { type: relationType });
      } catch (e) {
        // Ignore duplicate or self-reference errors
      }
    }
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
      const relations = this.agent.graph.getRelationsFrom(occId);
      for (const rel of relations) {
        // Extract concept from occurrence ID
        const match = rel.targetId.match(/^concept:([^:]+):/);
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
