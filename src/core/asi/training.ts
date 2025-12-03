/**
 * TRAINING PIPELINE
 * 
 * Complete workflow for training the ASI system.
 * No LLMs - uses gradient-free optimization of observer filters.
 * 
 * Training Flow:
 * 1. Load/create training data
 * 2. Encode data into inversion states
 * 3. Create sentences from states
 * 4. Evaluate with observers
 * 5. Compare to ground truth
 * 6. Optimize filters
 * 7. Repeat until convergence
 */

import { createASIObject } from './objects';
import { 
  Sentence, 
  constructSentence, 
  createStandardLexicon, 
  createStandardConnections,
  WordKernel,
  ConnectionKernel
} from './lexicon';
import { 
  ASIObserver, 
  createASIObserver, 
  computeEpistemicTruth,
  ArchetypeType 
} from './observers';
import { 
  LabeledExample, 
  LearningDataset, 
  computeAccuracy,
  optimizeFilterGradientFree 
} from './learning';
import { encode, EncodableData } from './encoders';

// ============================================
// TRAINING EXAMPLE FORMAT
// ============================================

/**
 * Raw training example before encoding.
 */
export interface RawTrainingExample {
  id: string;
  input: EncodableData;
  correctLabel: string;
  incorrectLabel: string;
  category?: string;
}

/**
 * Batch of training examples.
 */
export interface TrainingBatch {
  name: string;
  examples: RawTrainingExample[];
}

// ============================================
// TRAINING SESSION
// ============================================

export interface TrainingSession {
  // Components
  lexicon: Map<string, WordKernel>;
  connections: Map<string, ConnectionKernel>;
  observers: ASIObserver[];
  datasets: Map<string, LearningDataset>;
  
  // State
  epoch: number;
  totalExamples: number;
  currentAccuracy: number;
  
  // Methods
  addObserver(name: string, archetype?: ArchetypeType): ASIObserver;
  loadBatch(batch: TrainingBatch): void;
  train(datasetName: string, epochs?: number): TrainingResult;
  evaluate(datasetName: string): EvaluationResult;
  predict(input: EncodableData): PredictionResult;
}

export interface TrainingResult {
  epochs: number;
  initialAccuracy: number;
  finalAccuracy: number;
  improved: boolean;
  observerResults: Map<string, { accuracy: number; improved: boolean }>;
}

export interface EvaluationResult {
  accuracy: number;
  perObserver: Map<string, number>;
  confusionMatrix: Map<string, Map<string, number>>;
}

export interface PredictionResult {
  predictedLabel: string;
  confidence: number;
  observerVotes: Map<string, string>;
  consensusLevel: number;
}

// ============================================
// CREATE TRAINING SESSION
// ============================================

export function createTrainingSession(): TrainingSession {
  const lexicon = createStandardLexicon();
  const connections = createStandardConnections();
  const observers: ASIObserver[] = [];
  const datasets = new Map<string, LearningDataset>();
  
  let epoch = 0;
  let totalExamples = 0;
  let currentAccuracy = 0.5;
  
  /**
   * Add an observer to the training session.
   */
  function addObserver(name: string, archetype: ArchetypeType = 'neutral'): ASIObserver {
    const observer = createASIObserver(name, archetype);
    observers.push(observer);
    return observer;
  }
  
  /**
   * Load a batch of raw training examples.
   */
  function loadBatch(batch: TrainingBatch): void {
    const examples: LabeledExample[] = [];
    
    for (const raw of batch.examples) {
      // Encode input
      const inputState = encode(raw.input, lexicon);
      
      // Create object from input state
      const inputObject = createASIObject(`input-${raw.id}`, inputState);
      
      // Create sentences for correct and incorrect labels
      const correctSentence = constructSentence(
        [raw.correctLabel],
        lexicon,
        connections,
        inputObject
      );
      
      const incorrectSentence = constructSentence(
        [raw.incorrectLabel],
        lexicon,
        connections,
        inputObject
      );
      
      examples.push({
        object: inputObject,
        trueSentence: correctSentence,
        falseSentence: incorrectSentence,
        label: raw.correctLabel
      });
    }
    
    datasets.set(batch.name, {
      name: batch.name,
      examples
    });
    
    totalExamples += examples.length;
  }
  
  /**
   * Train all observers on a dataset.
   */
  function train(datasetName: string, epochs: number = 100): TrainingResult {
    const dataset = datasets.get(datasetName);
    if (!dataset) {
      return {
        epochs: 0,
        initialAccuracy: 0,
        finalAccuracy: 0,
        improved: false,
        observerResults: new Map()
      };
    }
    
    const observerResults = new Map<string, { accuracy: number; improved: boolean }>();
    let totalInitial = 0;
    let totalFinal = 0;
    
    for (const observer of observers) {
      const initialAcc = computeAccuracy(observer, dataset);
      
      const result = optimizeFilterGradientFree(observer, dataset, {
        maxIterations: epochs,
        perturbationMagnitude: 0.05,
        targetAccuracy: 0.95
      });
      
      observerResults.set(observer.id, {
        accuracy: result.finalAccuracy,
        improved: result.improved
      });
      
      totalInitial += initialAcc;
      totalFinal += result.finalAccuracy;
    }
    
    const avgInitial = observers.length > 0 ? totalInitial / observers.length : 0;
    const avgFinal = observers.length > 0 ? totalFinal / observers.length : 0;
    
    epoch += epochs;
    currentAccuracy = avgFinal;
    
    return {
      epochs,
      initialAccuracy: avgInitial,
      finalAccuracy: avgFinal,
      improved: avgFinal > avgInitial,
      observerResults
    };
  }
  
  /**
   * Evaluate observers on a dataset without training.
   */
  function evaluate(datasetName: string): EvaluationResult {
    const dataset = datasets.get(datasetName);
    if (!dataset) {
      return {
        accuracy: 0,
        perObserver: new Map(),
        confusionMatrix: new Map()
      };
    }
    
    const perObserver = new Map<string, number>();
    let totalAcc = 0;
    
    for (const observer of observers) {
      const acc = computeAccuracy(observer, dataset);
      perObserver.set(observer.id, acc);
      totalAcc += acc;
    }
    
    // Build confusion matrix
    const confusionMatrix = new Map<string, Map<string, number>>();
    
    for (const example of dataset.examples) {
      const actual = example.label;
      
      // Get majority vote
      let trueVotes = 0;
      let falseVotes = 0;
      
      for (const observer of observers) {
        const truthTrue = computeEpistemicTruth(observer, example.object, example.trueSentence);
        const truthFalse = computeEpistemicTruth(observer, example.object, example.falseSentence);
        
        if (truthTrue > truthFalse) {
          trueVotes++;
        } else {
          falseVotes++;
        }
      }
      
      const predicted = trueVotes > falseVotes ? example.label : 'incorrect';
      
      if (!confusionMatrix.has(actual)) {
        confusionMatrix.set(actual, new Map());
      }
      const row = confusionMatrix.get(actual)!;
      row.set(predicted, (row.get(predicted) ?? 0) + 1);
    }
    
    return {
      accuracy: observers.length > 0 ? totalAcc / observers.length : 0,
      perObserver,
      confusionMatrix
    };
  }
  
  /**
   * Make a prediction on new input.
   */
  function predict(input: EncodableData): PredictionResult {
    // Encode input
    const inputState = encode(input, lexicon);
    const inputObject = createASIObject('prediction-input', inputState);
    
    // Create sentences for possible labels
    const labels = ['positive', 'negative', 'safe', 'dangerous', 'true', 'false'];
    const sentences = new Map<string, Sentence>();
    
    for (const label of labels) {
      if (lexicon.has(label)) {
        sentences.set(label, constructSentence([label], lexicon, connections, inputObject));
      }
    }
    
    // Each observer votes
    const observerVotes = new Map<string, string>();
    const labelScores = new Map<string, number>();
    
    for (const observer of observers) {
      let bestLabel = '';
      let bestScore = -Infinity;
      
      for (const [label, sentence] of sentences) {
        const truth = computeEpistemicTruth(observer, inputObject, sentence);
        
        if (truth > bestScore) {
          bestScore = truth;
          bestLabel = label;
        }
        
        labelScores.set(label, (labelScores.get(label) ?? 0) + truth);
      }
      
      observerVotes.set(observer.id, bestLabel);
    }
    
    // Find winner
    let predictedLabel = '';
    let maxScore = -Infinity;
    
    for (const [label, score] of labelScores) {
      if (score > maxScore) {
        maxScore = score;
        predictedLabel = label;
      }
    }
    
    // Compute consensus
    const votes = Array.from(observerVotes.values());
    const majorityCount = votes.filter(v => v === predictedLabel).length;
    const consensusLevel = observers.length > 0 ? majorityCount / observers.length : 0;
    
    // Confidence based on score margin
    const sortedScores = Array.from(labelScores.values()).sort((a, b) => b - a);
    const confidence = sortedScores.length > 1 
      ? (sortedScores[0] - sortedScores[1]) / (sortedScores[0] + 0.001)
      : 1;
    
    return {
      predictedLabel,
      confidence: Math.min(1, Math.max(0, confidence)),
      observerVotes,
      consensusLevel
    };
  }
  
  return {
    lexicon,
    connections,
    observers,
    datasets,
    
    get epoch() { return epoch; },
    get totalExamples() { return totalExamples; },
    get currentAccuracy() { return currentAccuracy; },
    
    addObserver,
    loadBatch,
    train,
    evaluate,
    predict
  };
}

// ============================================
// EXAMPLE: Sentiment Classification
// ============================================

/**
 * Create a sentiment classification training batch.
 */
export function createSentimentBatch(): TrainingBatch {
  return {
    name: 'sentiment',
    examples: [
      { id: '1', input: { type: 'text', content: 'I love this' }, correctLabel: 'positive', incorrectLabel: 'negative' },
      { id: '2', input: { type: 'text', content: 'This is great' }, correctLabel: 'positive', incorrectLabel: 'negative' },
      { id: '3', input: { type: 'text', content: 'I hate this' }, correctLabel: 'negative', incorrectLabel: 'positive' },
      { id: '4', input: { type: 'text', content: 'This is terrible' }, correctLabel: 'negative', incorrectLabel: 'positive' },
      { id: '5', input: { type: 'text', content: 'I hope for the best' }, correctLabel: 'positive', incorrectLabel: 'negative' },
      { id: '6', input: { type: 'text', content: 'I fear the worst' }, correctLabel: 'negative', incorrectLabel: 'positive' },
      { id: '7', input: { type: 'text', content: 'Trust and peace' }, correctLabel: 'positive', incorrectLabel: 'negative' },
      { id: '8', input: { type: 'text', content: 'Anger and despair' }, correctLabel: 'negative', incorrectLabel: 'positive' }
    ]
  };
}

/**
 * Create a safety classification training batch.
 */
export function createSafetyBatch(): TrainingBatch {
  return {
    name: 'safety',
    examples: [
      { id: '1', input: { type: 'text', content: 'safe and secure' }, correctLabel: 'safe', incorrectLabel: 'dangerous' },
      { id: '2', input: { type: 'text', content: 'protected environment' }, correctLabel: 'safe', incorrectLabel: 'dangerous' },
      { id: '3', input: { type: 'text', content: 'danger ahead' }, correctLabel: 'dangerous', incorrectLabel: 'safe' },
      { id: '4', input: { type: 'text', content: 'risk of harm' }, correctLabel: 'dangerous', incorrectLabel: 'safe' },
      { id: '5', input: { type: 'text', content: 'trust this' }, correctLabel: 'safe', incorrectLabel: 'dangerous' },
      { id: '6', input: { type: 'text', content: 'fear this' }, correctLabel: 'dangerous', incorrectLabel: 'safe' }
    ]
  };
}

// ============================================
// QUICK START
// ============================================

/**
 * Quick start: Create session, add observers, load data, train.
 */
export function quickStartTraining(): {
  session: TrainingSession;
  result: TrainingResult;
} {
  const session = createTrainingSession();
  
  // Add diverse observers
  session.addObserver('Scientist', 'scientist');
  session.addObserver('Romantic', 'romantic');
  session.addObserver('Anxious', 'anxious');
  session.addObserver('Neutral', 'neutral');
  
  // Load sentiment data
  session.loadBatch(createSentimentBatch());
  
  // Train
  const result = session.train('sentiment', 200);
  
  console.log(`Training complete:`);
  console.log(`  Initial accuracy: ${(result.initialAccuracy * 100).toFixed(1)}%`);
  console.log(`  Final accuracy: ${(result.finalAccuracy * 100).toFixed(1)}%`);
  console.log(`  Improved: ${result.improved}`);
  
  return { session, result };
}
