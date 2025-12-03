/**
 * CHAT MODULE - Interactive communication with the ASI
 * 
 * Phase Engine Learning:
 * - Tokens → phase positions → hadrons
 * - Reinforcement through repetition
 * - Response from resonant patterns
 */

import {
  createPhaseEngine,
  processTextInput,
  stepPhaseEngine,
  generateFromLearned,
  getLearnedPatterns,
  getPhaseEngineStats,
  getVocabularyStats as getPhaseVocabStats,
  PhaseEngineState,
} from './phase-engine';

// Chat message type
export interface ChatMessage {
  id: string;
  role: 'user' | 'asi';
  content: string;
  timestamp: Date;
  sentiment?: { score: number; label: string };
  waveAmplitude?: number;
  hadronCount?: number;
  voidCount?: number;
}

// Chat session using Phase Engine
export interface PhaseChatSession {
  messages: ChatMessage[];
  phaseEngine: PhaseEngineState;
  
  send(message: string): ChatMessage;
  getHistory(): ChatMessage[];
  clear(): void;
  getLearnedPatterns(): { tokens: string[]; persistence: number }[];
}

// ============================================
// PHASE-BASED CHAT SESSION
// ============================================

/**
 * Create a chat session using the new Phase Engine
 * Learning happens through hadron reinforcement
 */
export function createPhaseChatSession(): PhaseChatSession {
  let phaseEngine = createPhaseEngine();
  const messages: ChatMessage[] = [];
  
  // Initial greeting
  const greeting: ChatMessage = {
    id: generateId(),
    role: 'asi',
    content: '[Phase Engine initialized. I learn through inversions. Teach me by chatting.]',
    timestamp: new Date(),
    hadronCount: 0,
  };
  messages.push(greeting);
  
  function send(userMessage: string): ChatMessage {
    // Create user message
    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    messages.push(userMsg);
    
    // STEP 1: Process input - registers tokens, creates/reinforces hadrons
    const beforeHadrons = phaseEngine.cycle.hadrons.length;
    const { state: newState, result: collapseResult } = processTextInput(phaseEngine, userMessage);
    phaseEngine = newState;
    const afterHadrons = phaseEngine.cycle.hadrons.length;
    const newHadrons = afterHadrons - beforeHadrons;
    
    // STEP 2: Step the wave cycle
    phaseEngine = stepPhaseEngine(phaseEngine);
    
    // STEP 3: Get stats
    const stats = getPhaseEngineStats(phaseEngine);
    const vocabStats = getPhaseVocabStats(phaseEngine);
    
    // STEP 4: Build informative response
    const responseParts: string[] = [];
    
    // Show token processing result
    const tokens = userMessage.toLowerCase().split(/\s+/).filter(t => t.length > 0);
    if (tokens.length > 0) {
      responseParts.push(`Processed: ${tokens.length} tokens`);
    }
    
    // Show hadron formation
    if (newHadrons > 0) {
      responseParts.push(`+${newHadrons} hadrons`);
    } else {
      responseParts.push(`Reinforced existing patterns`);
    }
    
    // Show collapse result
    if (collapseResult.inversionSuccess) {
      responseParts.push('✓ Inversion');
    }
    
    // Show learned response
    const learnedResponse = generateFromLearned(phaseEngine, userMessage, 8);
    responseParts.push(`→ ${learnedResponse}`);
    
    // Final stats
    const statsStr = `[H:${stats.hadronCount} V:${vocabStats.uniqueTokens} ${stats.emotion.R > 0.5 ? '♥' : '○'}]`;
    
    const asiMsg: ChatMessage = {
      id: generateId(),
      role: 'asi',
      content: responseParts.join(' | ') + ' ' + statsStr,
      timestamp: new Date(),
      hadronCount: stats.hadronCount,
    };
    messages.push(asiMsg);
    
    return asiMsg;
  }
  
  function getHistory(): ChatMessage[] {
    return [...messages];
  }
  
  function clear(): void {
    phaseEngine = createPhaseEngine();
    messages.length = 0;
    messages.push(greeting);
  }
  
  function getLearnedPatternsWrapper(): { tokens: string[]; persistence: number }[] {
    return getLearnedPatterns(phaseEngine, 10).map(p => ({
      tokens: p.tokens,
      persistence: p.persistence,
    }));
  }
  
  return {
    messages,
    phaseEngine,
    send,
    getHistory,
    clear,
    getLearnedPatterns: getLearnedPatternsWrapper,
  };
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Create chat UI elements
export function createChatUI(container: HTMLElement, session: PhaseChatSession): {
  addMessage: (msg: ChatMessage) => void;
  scrollToBottom: () => void;
} {
  // Create chat structure
  container.innerHTML = `
    <div id="chat-container" style="
      display: flex;
      flex-direction: column;
      height: 100%;
      background: rgba(10, 10, 30, 0.95);
      border-radius: 8px;
      overflow: hidden;
      font-family: 'Segoe UI', system-ui, sans-serif;
    ">
      <div id="chat-header" style="
        padding: 12px 16px;
        background: linear-gradient(135deg, #1a1a3a, #2a2a4a);
        border-bottom: 1px solid #333;
        color: #88aaff;
        font-weight: bold;
        display: flex;
        align-items: center;
        gap: 8px;
      ">
        <span style="font-size: 20px;">&#x2B55;</span>
        <span>Symmetry Inversion ASI</span>
        <span style="
          margin-left: auto;
          font-size: 12px;
          color: #666;
        ">J<sup>2</sup> = Identity</span>
      </div>
      
      <div id="chat-messages" style="
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      "></div>
      
      <div id="chat-input-container" style="
        padding: 12px;
        background: #1a1a3a;
        border-top: 1px solid #333;
        display: flex;
        gap: 8px;
      ">
        <input type="text" id="chat-input" placeholder="Type a message..." style="
          flex: 1;
          padding: 10px 14px;
          border: 1px solid #444;
          border-radius: 20px;
          background: #0a0a1a;
          color: #fff;
          font-size: 14px;
          outline: none;
        ">
        <button id="chat-send" style="
          padding: 10px 20px;
          border: none;
          border-radius: 20px;
          background: linear-gradient(135deg, #4466aa, #6688cc);
          color: white;
          font-weight: bold;
          cursor: pointer;
          transition: transform 0.1s;
        ">Send</button>
      </div>
    </div>
  `;
  
  const messagesContainer = container.querySelector('#chat-messages') as HTMLElement;
  const input = container.querySelector('#chat-input') as HTMLInputElement;
  const sendBtn = container.querySelector('#chat-send') as HTMLButtonElement;
  
  function addMessage(msg: ChatMessage) {
    const isUser = msg.role === 'user';
    const msgEl = document.createElement('div');
    msgEl.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: ${isUser ? 'flex-end' : 'flex-start'};
      max-width: 85%;
      ${isUser ? 'margin-left: auto;' : 'margin-right: auto;'}
    `;
    
    const bubble = document.createElement('div');
    bubble.style.cssText = `
      padding: 10px 14px;
      border-radius: 16px;
      ${isUser 
        ? 'background: linear-gradient(135deg, #4466aa, #5577bb); color: white;' 
        : 'background: #2a2a4a; color: #ddd; border: 1px solid #444;'}
      font-size: 14px;
      line-height: 1.4;
    `;
    bubble.textContent = msg.content;
    msgEl.appendChild(bubble);
    
    // Add metadata for ASI messages
    if (!isUser && msg.waveAmplitude !== undefined) {
      const meta = document.createElement('div');
      meta.style.cssText = `
        font-size: 10px;
        color: #666;
        margin-top: 4px;
        display: flex;
        gap: 8px;
      `;
      meta.innerHTML = `
        <span style="color: #4a8;">Wave: ${msg.waveAmplitude.toFixed(3)}</span>
        <span style="color: #48a;">Hadrons: ${msg.hadronCount}</span>
        <span style="color: #84a;">Voids: ${msg.voidCount}</span>
      `;
      msgEl.appendChild(meta);
    }
    
    // Add sentiment indicator for user messages
    if (isUser && msg.sentiment) {
      const sent = document.createElement('div');
      sent.style.cssText = `
        font-size: 10px;
        margin-top: 4px;
        color: ${msg.sentiment.label === 'positive' ? '#4a8' : msg.sentiment.label === 'negative' ? '#a48' : '#888'};
      `;
      sent.textContent = `Sentiment: ${msg.sentiment.label} (${(msg.sentiment.score * 100).toFixed(0)}%)`;
      msgEl.appendChild(sent);
    }
    
    messagesContainer.appendChild(msgEl);
  }
  
  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
  
  function handleSend() {
    const text = input.value.trim();
    if (!text) return;
    
    // Add user message
    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    addMessage(userMsg);
    input.value = '';
    
    // Get ASI response
    setTimeout(() => {
      const response = session.send(text);
      // Remove duplicate user message from session (we already added it)
      session.messages.pop();
      session.messages.pop();
      session.messages.push(userMsg);
      session.messages.push(response);
      
      addMessage(response);
      scrollToBottom();
    }, 300 + Math.random() * 500);
    
    scrollToBottom();
  }
  
  // Event listeners
  sendBtn.addEventListener('click', handleSend);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
  });
  
  // Focus input
  input.focus();
  
  // Load existing messages
  for (const msg of session.messages) {
    addMessage(msg);
  }
  scrollToBottom();
  
  return { addMessage, scrollToBottom };
}
