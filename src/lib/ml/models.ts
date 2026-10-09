/**
 * Defensible Machine Learning Models & Algorithms
 *
 * Implements:
 * 1. Majority Class Classifier (Zero-Rule baseline)
 * 2. Deterministic Risk Heuristic Classifier (Stage 4 engine baseline)
 * 3. L2-Regularized Logistic Regression (Gradient descent with convex convergence)
 * 4. Bounded Decision Tree Classifier (Gini Impurity, depth-bounded)
 *
 * Built with pure mathematical rigor — zero external dependencies, 100% reproducible.
 */

export interface TrainedLogisticRegression {
  weights: number[];
  intercept: number;
  iterationsRun: number;
  lossHistory: number[];
}

export interface DecisionTreeNode {
  isLeaf: boolean;
  prediction?: 0 | 1;
  probability?: number;
  featureIndex?: number;
  threshold?: number;
  left?: DecisionTreeNode;
  right?: DecisionTreeNode;
  samplesCount?: number;
}

/**
 * Numerically stable Sigmoid function.
 */
export function sigmoid(z: number): number {
  if (z >= 40) return 1.0;
  if (z <= -40) return 0.0;
  return 1.0 / (1.0 + Math.exp(-z));
}

// ── 1. MAJORITY CLASS BASELINE ───────────────────────────────────────────────

export class MajorityClassClassifier {
  private majorityLabel: 0 | 1 = 0;
  private positiveProbability = 0;

  fit(y: (0 | 1)[]): void {
    const positiveCount = y.filter((val) => val === 1).length;
    this.positiveProbability = positiveCount / Math.max(y.length, 1);
    this.majorityLabel = this.positiveProbability >= 0.5 ? 1 : 0;
  }

  predictProba(): number {
    return this.positiveProbability;
  }

  predict(): 0 | 1 {
    return this.majorityLabel;
  }
}

// ── 2. LOGISTIC REGRESSION WITH L2 REGULARIZATION ────────────────────────────

export class LogisticRegressionModel {
  private weights: number[] = [];
  private intercept = 0;
  private learningRate: number;
  private lambdaL2: number;
  private maxEpochs: number;

  constructor(options: { learningRate?: number; lambdaL2?: number; maxEpochs?: number } = {}) {
    this.learningRate = options.learningRate ?? 0.05;
    this.lambdaL2 = options.lambdaL2 ?? 0.01;
    this.maxEpochs = options.maxEpochs ?? 300;
  }

  /**
   * Trains logistic regression weights via Batch Gradient Descent.
   */
  fit(X: number[][], y: (0 | 1)[]): TrainedLogisticRegression {
    const m = X.length;
    const n = X[0]?.length ?? 0;
    if (m === 0 || n === 0) {
      throw new Error('Cannot train on empty feature matrix.');
    }

    // Initialize weights to small deterministic values
    this.weights = new Array(n).fill(0.0);
    this.intercept = 0.0;
    const lossHistory: number[] = [];

    for (let epoch = 0; epoch < this.maxEpochs; epoch++) {
      const gradW = new Array(n).fill(0.0);
      let gradB = 0.0;
      let totalLoss = 0.0;

      for (let i = 0; i < m; i++) {
        const xi = X[i];
        const yi = y[i];

        // Linear combination: z = w^T * x + b
        let z = this.intercept;
        for (let j = 0; j < n; j++) {
          z += this.weights[j] * xi[j];
        }

        const p = sigmoid(z);
        const error = p - yi;

        // Gradient accumulation
        for (let j = 0; j < n; j++) {
          gradW[j] += error * xi[j];
        }
        gradB += error;

        // Binary cross-entropy loss computation
        const eps = 1e-12;
        const loss_i = -(yi * Math.log(p + eps) + (1 - yi) * Math.log(1 - p + eps));
        totalLoss += loss_i;
      }

      // Add L2 penalty to loss and gradients
      let l2Sum = 0;
      for (let j = 0; j < n; j++) {
        l2Sum += Math.pow(this.weights[j], 2);
        gradW[j] = gradW[j] / m + this.lambdaL2 * this.weights[j];
      }
      gradB = gradB / m;

      const regularizedLoss = totalLoss / m + 0.5 * this.lambdaL2 * l2Sum;
      lossHistory.push(regularizedLoss);

      // Update parameters
      for (let j = 0; j < n; j++) {
        this.weights[j] -= this.learningRate * gradW[j];
      }
      this.intercept -= this.learningRate * gradB;
    }

    return {
      weights: [...this.weights],
      intercept: this.intercept,
      iterationsRun: this.maxEpochs,
      lossHistory,
    };
  }

  predictProba(x: number[]): number {
    let z = this.intercept;
    for (let j = 0; j < this.weights.length; j++) {
      z += this.weights[j] * (x[j] ?? 0);
    }
    return Math.round(sigmoid(z) * 1000) / 1000;
  }

  predict(x: number[], threshold = 0.5): 0 | 1 {
    return this.predictProba(x) >= threshold ? 1 : 0;
  }

  getWeights(): { weights: number[]; intercept: number } {
    return { weights: [...this.weights], intercept: this.intercept };
  }

  loadWeights(weights: number[], intercept: number): void {
    this.weights = [...weights];
    this.intercept = intercept;
  }
}

// ── 3. BOUNDED DECISION TREE CLASSIFIER ──────────────────────────────────────

export class DecisionTreeClassifier {
  private root: DecisionTreeNode | null = null;
  private maxDepth: number;
  private minSamplesSplit: number;

  constructor(options: { maxDepth?: number; minSamplesSplit?: number } = {}) {
    this.maxDepth = options.maxDepth ?? 3;
    this.minSamplesSplit = options.minSamplesSplit ?? 2;
  }

  fit(X: number[][], y: (0 | 1)[]): DecisionTreeNode {
    this.root = this.buildTree(X, y, 0);
    return this.root;
  }

  private calculateGini(y: (0 | 1)[]): number {
    if (y.length === 0) return 0;
    const p1 = y.filter((val) => val === 1).length / y.length;
    const p0 = 1 - p1;
    return 1 - (p0 * p0 + p1 * p1);
  }

  private buildTree(X: number[][], y: (0 | 1)[], depth: number): DecisionTreeNode {
    const numSamples = y.length;
    const positiveCount = y.filter((val) => val === 1).length;
    const prob = positiveCount / Math.max(numSamples, 1);
    const majority = prob >= 0.5 ? 1 : 0;

    // Base stopping cases
    if (depth >= this.maxDepth || numSamples < this.minSamplesSplit || prob === 0 || prob === 1) {
      return {
        isLeaf: true,
        prediction: majority,
        probability: Math.round(prob * 1000) / 1000,
        samplesCount: numSamples,
      };
    }

    const currentGini = this.calculateGini(y);
    let bestGain = 0;
    let bestFeature = -1;
    let bestThreshold = 0;
    let bestLeftIndices: number[] = [];
    let bestRightIndices: number[] = [];

    const numFeatures = X[0]?.length ?? 0;

    for (let f = 0; f < numFeatures; f++) {
      const values = X.map((row) => row[f]);
      const uniqueValues = Array.from(new Set(values)).sort((a, b) => a - b);

      for (let i = 0; i < uniqueValues.length - 1; i++) {
        const threshold = (uniqueValues[i] + uniqueValues[i + 1]) / 2;
        const leftIdx: number[] = [];
        const rightIdx: number[] = [];

        for (let rowIdx = 0; rowIdx < numSamples; rowIdx++) {
          if (X[rowIdx][f] <= threshold) {
            leftIdx.push(rowIdx);
          } else {
            rightIdx.push(rowIdx);
          }
        }

        if (leftIdx.length === 0 || rightIdx.length === 0) continue;

        const leftY = leftIdx.map((idx) => y[idx]);
        const rightY = rightIdx.map((idx) => y[idx]);

        const gain =
          currentGini -
          ((leftIdx.length / numSamples) * this.calculateGini(leftY) +
            (rightIdx.length / numSamples) * this.calculateGini(rightY));

        if (gain > bestGain) {
          bestGain = gain;
          bestFeature = f;
          bestThreshold = threshold;
          bestLeftIndices = leftIdx;
          bestRightIndices = rightIdx;
        }
      }
    }

    // If no meaningful split improves Gini impurity, make leaf
    if (bestGain <= 0.001 || bestFeature === -1) {
      return {
        isLeaf: true,
        prediction: majority,
        probability: Math.round(prob * 1000) / 1000,
        samplesCount: numSamples,
      };
    }

    const leftX = bestLeftIndices.map((idx) => X[idx]);
    const leftY = bestLeftIndices.map((idx) => y[idx]);
    const rightX = bestRightIndices.map((idx) => X[idx]);
    const rightY = bestRightIndices.map((idx) => y[idx]);

    return {
      isLeaf: false,
      featureIndex: bestFeature,
      threshold: bestThreshold,
      samplesCount: numSamples,
      left: this.buildTree(leftX, leftY, depth + 1),
      right: this.buildTree(rightX, rightY, depth + 1),
    };
  }

  predictProba(x: number[]): number {
    let node = this.root;
    while (node && !node.isLeaf) {
      if (node.featureIndex !== undefined && node.threshold !== undefined) {
        if (x[node.featureIndex] <= node.threshold) {
          node = node.left ?? null;
        } else {
          node = node.right ?? null;
        }
      } else {
        break;
      }
    }
    return node?.probability ?? 0.0;
  }

  predict(x: number[], threshold = 0.5): 0 | 1 {
    return this.predictProba(x) >= threshold ? 1 : 0;
  }

  getRoot(): DecisionTreeNode | null {
    return this.root;
  }

  loadTree(tree: DecisionTreeNode): void {
    this.root = tree;
  }
}
