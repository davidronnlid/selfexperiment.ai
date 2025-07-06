# Time Series Analysis for Causal Inference in N=1 Experiments

## Overview

Time series data is the cornerstone of causal inference in n=1 experiments. Unlike cross-sectional data, time series provides the temporal dimension necessary to establish causality through temporal precedence, intervention timing, and longitudinal pattern analysis. This document explores how time series analysis enables robust causal inference in self-experiments.

## Why Time Series is Essential for Causality

### 1. **Temporal Precedence**
The fundamental principle that causes must precede effects in time.

```typescript
interface TemporalPrecedence {
  intervention: {
    timestamp: Date;
    type: string;
    value: number;
  };
  outcome: {
    timestamp: Date;
    variable: string;
    value: number;
    lag: number; // Time since intervention
  };
}

// Example: Sleep intervention affects next-day mood
function analyzeTemporal(interventions: Intervention[], outcomes: Outcome[]): CausalEvidence {
  const causalRelationships: CausalRelationship[] = [];
  
  for (const intervention of interventions) {
    const subsequentOutcomes = outcomes.filter(outcome => 
      outcome.timestamp > intervention.timestamp &&
      outcome.timestamp < new Date(intervention.timestamp.getTime() + 24 * 60 * 60 * 1000) // Next 24 hours
    );
    
    // Analyze if outcomes show consistent patterns after interventions
    const effectSize = calculateEffectSize(intervention, subsequentOutcomes);
    const confidence = calculateConfidence(effectSize);
    
    if (confidence > 0.8) {
      causalRelationships.push({
        intervention: intervention.type,
        outcome: subsequentOutcomes[0].variable,
        effectSize,
        confidence,
        lag: calculateOptimalLag(intervention, subsequentOutcomes)
      });
    }
  }
  
  return { relationships: causalRelationships };
}
```

### 2. **Intervention Timing Analysis**
Identifying when changes occur relative to interventions.

```typescript
interface InterventionAnalysis {
  changepoints: ChangePoint[];
  interventionTiming: InterventionEvent[];
  causalityScore: number;
}

function detectInterventionEffects(
  timeSeries: TimeSeriesData[],
  interventions: InterventionEvent[]
): InterventionAnalysis {
  // Detect changepoints in the time series
  const changepoints = detectChangepoints(timeSeries);
  
  // Match changepoints with interventions
  const matchedEvents = matchChangepointsToInterventions(changepoints, interventions);
  
  // Calculate causality score based on temporal alignment
  const causalityScore = calculateCausalityScore(matchedEvents);
  
  return {
    changepoints,
    interventionTiming: interventions,
    causalityScore
  };
}
```

## Key Time Series Methods for Causal Inference

### 1. **Changepoint Detection**
Identifying when the statistical properties of a time series change.

```typescript
interface ChangePoint {
  timestamp: Date;
  confidence: number;
  changeType: 'mean' | 'variance' | 'trend' | 'regime';
  beforeStats: TimeSeriesStatistics;
  afterStats: TimeSeriesStatistics;
  potentialCauses: string[];
}

class ChangepointDetector {
  // PELT (Pruned Exact Linear Time) algorithm
  static detectChangepoints(data: TimeSeriesPoint[]): ChangePoint[] {
    const changepoints: ChangePoint[] = [];
    const windowSize = 14; // 2 weeks
    
    for (let i = windowSize; i < data.length - windowSize; i++) {
      const before = data.slice(i - windowSize, i);
      const after = data.slice(i, i + windowSize);
      
      // Calculate statistics for before and after windows
      const beforeStats = this.calculateStatistics(before);
      const afterStats = this.calculateStatistics(after);
      
      // Test for significant change
      const changeScore = this.calculateChangeScore(beforeStats, afterStats);
      
      if (changeScore > 0.8) { // Threshold for significant change
        changepoints.push({
          timestamp: data[i].timestamp,
          confidence: changeScore,
          changeType: this.determineChangeType(beforeStats, afterStats),
          beforeStats,
          afterStats,
          potentialCauses: [] // To be filled by intervention matching
        });
      }
    }
    
    return changepoints;
  }
  
  private static calculateChangeScore(before: TimeSeriesStatistics, after: TimeSeriesStatistics): number {
    // Use multiple statistical tests
    const meanChange = Math.abs(before.mean - after.mean) / before.standardDeviation;
    const varianceChange = Math.abs(before.variance - after.variance) / before.variance;
    const trendChange = Math.abs(before.trend - after.trend);
    
    // Combine into single score
    return (meanChange + varianceChange + trendChange) / 3;
  }
}
```

### 2. **Granger Causality**
Testing whether one time series can predict another.

```typescript
interface GrangerCausalityTest {
  cause: string;
  effect: string;
  pValue: number;
  fStatistic: number;
  lag: number;
  causality: 'strong' | 'moderate' | 'weak' | 'none';
}

class GrangerCausality {
  static testCausality(
    cause: TimeSeriesPoint[],
    effect: TimeSeriesPoint[],
    maxLag: number = 7
  ): GrangerCausalityTest[] {
    const results: GrangerCausalityTest[] = [];
    
    for (let lag = 1; lag <= maxLag; lag++) {
      // Create lagged versions
      const laggedCause = this.createLaggedSeries(cause, lag);
      const alignedEffect = effect.slice(lag);
      
      // Test if lagged cause predicts effect
      const model1 = this.fitAutoregressiveModel(alignedEffect); // Effect only
      const model2 = this.fitAutoregressiveModel(alignedEffect, laggedCause); // Effect + lagged cause
      
      // F-test for improvement
      const fStatistic = this.calculateFStatistic(model1, model2);
      const pValue = this.calculatePValue(fStatistic, model1.degreesOfFreedom, model2.degreesOfFreedom);
      
      results.push({
        cause: 'intervention',
        effect: 'outcome',
        pValue,
        fStatistic,
        lag,
        causality: this.interpretCausality(pValue)
      });
    }
    
    return results;
  }
  
  private static interpretCausality(pValue: number): 'strong' | 'moderate' | 'weak' | 'none' {
    if (pValue < 0.01) return 'strong';
    if (pValue < 0.05) return 'moderate';
    if (pValue < 0.1) return 'weak';
    return 'none';
  }
}
```

### 3. **Interrupted Time Series Analysis**
Specifically designed for intervention studies.

```typescript
interface InterruptedTimeSeriesAnalysis {
  baselineTrend: number;
  interventionEffect: number;
  postInterventionTrend: number;
  significanceTests: StatisticalTest[];
  effectSize: number;
}

class InterruptedTimeSeries {
  static analyze(
    timeSeries: TimeSeriesPoint[],
    interventionDate: Date
  ): InterruptedTimeSeriesAnalysis {
    const interventionIndex = timeSeries.findIndex(point => 
      point.timestamp >= interventionDate
    );
    
    const preIntervention = timeSeries.slice(0, interventionIndex);
    const postIntervention = timeSeries.slice(interventionIndex);
    
    // Create time variables
    const timeData = this.createTimeVariables(timeSeries, interventionIndex);
    
    // Fit segmented regression model
    // Y = β₀ + β₁(time) + β₂(intervention) + β₃(time_after_intervention) + ε
    const model = this.fitSegmentedRegression(timeSeries, timeData);
    
    return {
      baselineTrend: model.coefficients.time,
      interventionEffect: model.coefficients.intervention,
      postInterventionTrend: model.coefficients.time_after_intervention,
      significanceTests: model.statisticalTests,
      effectSize: this.calculateEffectSize(model)
    };
  }
  
  private static createTimeVariables(
    timeSeries: TimeSeriesPoint[],
    interventionIndex: number
  ): TimeVariables {
    return timeSeries.map((point, index) => ({
      time: index + 1,
      intervention: index >= interventionIndex ? 1 : 0,
      time_after_intervention: index >= interventionIndex ? index - interventionIndex + 1 : 0
    }));
  }
}
```

### 4. **Cross-Correlation Analysis**
Finding optimal lag relationships between variables.

```typescript
interface CrossCorrelation {
  lag: number;
  correlation: number;
  confidence: number;
  significance: boolean;
}

class CrossCorrelationAnalysis {
  static analyzeCrossCorrelation(
    series1: TimeSeriesPoint[],
    series2: TimeSeriesPoint[],
    maxLag: number = 14
  ): CrossCorrelation[] {
    const results: CrossCorrelation[] = [];
    
    // Ensure series are aligned and same length
    const aligned = this.alignSeries(series1, series2);
    
    for (let lag = -maxLag; lag <= maxLag; lag++) {
      const correlation = this.calculateCorrelation(aligned.series1, aligned.series2, lag);
      const confidence = this.calculateConfidence(correlation, aligned.series1.length);
      
      results.push({
        lag,
        correlation,
        confidence,
        significance: Math.abs(correlation) > this.getCriticalValue(aligned.series1.length)
      });
    }
    
    return results.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }
  
  private static calculateCorrelation(
    series1: number[],
    series2: number[],
    lag: number
  ): number {
    if (lag === 0) {
      return this.pearsonCorrelation(series1, series2);
    }
    
    if (lag > 0) {
      // series1 leads series2
      const lagged1 = series1.slice(0, -lag);
      const lagged2 = series2.slice(lag);
      return this.pearsonCorrelation(lagged1, lagged2);
    } else {
      // series2 leads series1
      const lagged1 = series1.slice(-lag);
      const lagged2 = series2.slice(0, lag);
      return this.pearsonCorrelation(lagged1, lagged2);
    }
  }
}
```

## Advanced Causal Inference Techniques

### 1. **Synthetic Control Method**
Creating a synthetic control from multiple baseline periods.

```typescript
interface SyntheticControl {
  syntheticSeries: TimeSeriesPoint[];
  weights: number[];
  treatmentEffect: number[];
  significance: boolean;
}

class SyntheticControlMethod {
  static createSyntheticControl(
    treatedSeries: TimeSeriesPoint[],
    controlPeriods: TimeSeriesPoint[][],
    interventionDate: Date
  ): SyntheticControl {
    const interventionIndex = treatedSeries.findIndex(point => 
      point.timestamp >= interventionDate
    );
    
    const preIntervention = treatedSeries.slice(0, interventionIndex);
    const postIntervention = treatedSeries.slice(interventionIndex);
    
    // Find optimal weights to match pre-intervention period
    const weights = this.optimizeWeights(preIntervention, controlPeriods);
    
    // Create synthetic control series
    const syntheticSeries = this.createSyntheticSeries(controlPeriods, weights);
    
    // Calculate treatment effects
    const treatmentEffect = this.calculateTreatmentEffect(
      postIntervention,
      syntheticSeries.slice(interventionIndex)
    );
    
    return {
      syntheticSeries,
      weights,
      treatmentEffect,
      significance: this.testSignificance(treatmentEffect)
    };
  }
}
```

### 2. **Bayesian Structural Time Series**
Incorporating prior knowledge and uncertainty.

```typescript
interface BayesianStructuralTimeSeries {
  posteriorMean: number[];
  credibleIntervals: CredibleInterval[];
  causalImpact: CausalImpact;
  probabilityOfCausation: number;
}

class BayesianStructuralTimeSeriesAnalysis {
  static analyze(
    timeSeries: TimeSeriesPoint[],
    interventionDate: Date,
    priorBelief: PriorBelief
  ): BayesianStructuralTimeSeries {
    // Decompose time series into components
    const components = this.decompose(timeSeries);
    
    // Fit Bayesian structural model
    const model = this.fitBayesianModel(components, priorBelief);
    
    // Predict counterfactual (what would have happened without intervention)
    const counterfactual = this.predictCounterfactual(model, interventionDate);
    
    // Calculate causal impact
    const causalImpact = this.calculateCausalImpact(timeSeries, counterfactual, interventionDate);
    
    return {
      posteriorMean: model.posteriorMean,
      credibleIntervals: model.credibleIntervals,
      causalImpact,
      probabilityOfCausation: causalImpact.probability
    };
  }
}
```

## Practical Implementation for SelfExperiment.AI

### 1. **Time Series Data Structure**

```typescript
interface TimeSeriesAnalysisEngine {
  // Core time series data structure
  timeSeries: Map<string, TimeSeriesPoint[]>;
  
  // Analysis methods
  detectChangepoints(variable: string): ChangePoint[];
  testGrangerCausality(cause: string, effect: string): GrangerCausalityTest[];
  analyzeInterruption(variable: string, intervention: InterventionEvent): InterruptedTimeSeriesAnalysis;
  calculateCrossCorrelation(var1: string, var2: string): CrossCorrelation[];
  
  // Causal inference
  identifyPotentialCauses(outcome: string, timeWindow: number): CausalHypothesis[];
  rankCausalEvidence(hypotheses: CausalHypothesis[]): CausalRanking[];
  generateCausalReport(experiment: Experiment): CausalReport;
}

// Implementation example
class TimeSeriesAnalysisEngineImpl implements TimeSeriesAnalysisEngine {
  private timeSeries: Map<string, TimeSeriesPoint[]> = new Map();
  
  async detectChangepoints(variable: string): Promise<ChangePoint[]> {
    const data = this.timeSeries.get(variable);
    if (!data) return [];
    
    const changepoints = ChangepointDetector.detectChangepoints(data);
    
    // Match with interventions
    const interventions = await this.getInterventions(variable);
    const matchedChangepoints = this.matchWithInterventions(changepoints, interventions);
    
    return matchedChangepoints;
  }
  
  async identifyPotentialCauses(outcome: string, timeWindow: number): Promise<CausalHypothesis[]> {
    const outcomeData = this.timeSeries.get(outcome);
    if (!outcomeData) return [];
    
    const hypotheses: CausalHypothesis[] = [];
    
    // Test all other variables as potential causes
    for (const [variableName, variableData] of this.timeSeries.entries()) {
      if (variableName === outcome) continue;
      
      // Test Granger causality
      const grangerTest = GrangerCausality.testCausality(variableData, outcomeData);
      
      // Test cross-correlation
      const crossCorr = CrossCorrelationAnalysis.analyzeCrossCorrelation(
        variableData, outcomeData, timeWindow
      );
      
      const hypothesis: CausalHypothesis = {
        cause: variableName,
        effect: outcome,
        evidence: {
          granger: grangerTest,
          crossCorrelation: crossCorr,
          temporalAlignment: this.analyzeTemporalAlignment(variableData, outcomeData)
        },
        strength: this.calculateCausalStrength(grangerTest, crossCorr)
      };
      
      hypotheses.push(hypothesis);
    }
    
    return hypotheses.sort((a, b) => b.strength - a.strength);
  }
}
```

### 2. **Integration with Existing SelfExperiment.AI Architecture**

```typescript
// Extend existing analytics
interface EnhancedAnalytics extends ExistingAnalytics {
  timeSeriesAnalysis: TimeSeriesAnalysisEngine;
  causalInference: CausalInferenceEngine;
  interventionAnalysis: InterventionAnalysisEngine;
}

// Add to existing dashboard
class CausalityDashboard {
  async renderCausalityInsights(userId: string, experimentId: string): Promise<CausalityInsights> {
    const experiment = await getExperiment(experimentId);
    const timeSeriesData = await this.prepareTimeSeriesData(experiment);
    
    // Detect changepoints
    const changepoints = await this.timeSeriesAnalysis.detectChangepoints(experiment.outcomeVariable);
    
    // Identify potential causes
    const causalHypotheses = await this.timeSeriesAnalysis.identifyPotentialCauses(
      experiment.outcomeVariable, 
      14 // 2 week window
    );
    
    // Generate intervention analysis
    const interventionEffects = await this.analyzeInterventions(experiment);
    
    return {
      changepoints,
      causalHypotheses,
      interventionEffects,
      recommendations: this.generateRecommendations(causalHypotheses, interventionEffects)
    };
  }
}
```

### 3. **Real-World Example: Sleep Quality Analysis**

```typescript
// Example: Analyzing what affects sleep quality
interface SleepQualityAnalysis {
  outcome: 'sleep_quality';
  potentialCauses: string[];
  timeWindow: number;
  analysis: CausalAnalysisResult;
}

async function analyzeSleepQuality(userId: string): Promise<SleepQualityAnalysis> {
  const sleepData = await getUserTimeSeriesData(userId, 'sleep_quality');
  const potentialCauses = [
    'caffeine_intake',
    'exercise_duration',
    'screen_time',
    'stress_level',
    'alcohol_consumption',
    'meal_timing'
  ];
  
  const analysis: CausalAnalysisResult = {
    grangerCausality: {},
    crossCorrelations: {},
    interventionEffects: {},
    changepoints: []
  };
  
  // Test each potential cause
  for (const cause of potentialCauses) {
    const causeData = await getUserTimeSeriesData(userId, cause);
    
    // Granger causality test
    analysis.grangerCausality[cause] = await GrangerCausality.testCausality(
      causeData, sleepData
    );
    
    // Cross-correlation analysis
    analysis.crossCorrelations[cause] = await CrossCorrelationAnalysis.analyzeCrossCorrelation(
      causeData, sleepData, 7 // 1 week lag
    );
    
    // Look for intervention effects
    const interventions = await getUserInterventions(userId, cause);
    if (interventions.length > 0) {
      analysis.interventionEffects[cause] = await InterruptedTimeSeries.analyze(
        sleepData, interventions[0].date
      );
    }
  }
  
  // Detect changepoints in sleep quality
  analysis.changepoints = await ChangepointDetector.detectChangepoints(sleepData);
  
  return {
    outcome: 'sleep_quality',
    potentialCauses,
    timeWindow: 30, // 30 days
    analysis
  };
}
```

## Challenges and Limitations

### 1. **Small Sample Sizes**
```typescript
interface SmallSampleCorrection {
  bootstrapConfidenceIntervals: ConfidenceInterval[];
  permutationTests: PermutationTestResult[];
  bayesianAnalysis: BayesianResult;
}

// Address small sample issues with robust methods
class SmallSampleMethods {
  static correctForSmallSample(
    analysis: CausalAnalysisResult,
    sampleSize: number
  ): SmallSampleCorrection {
    if (sampleSize < 30) {
      // Use bootstrap for confidence intervals
      const bootstrapCI = this.bootstrapConfidenceIntervals(analysis);
      
      // Use permutation tests for significance
      const permutationTests = this.permutationTests(analysis);
      
      // Use Bayesian methods for uncertainty quantification
      const bayesianResult = this.bayesianAnalysis(analysis);
      
      return { bootstrapCI, permutationTests, bayesianResult };
    }
    
    return this.standardAnalysis(analysis);
  }
}
```

### 2. **Multiple Testing Correction**
```typescript
interface MultipleTestingCorrection {
  bonferroniAdjusted: boolean;
  fdrControlled: boolean;
  adjustedPValues: number[];
}

class MultipleTestingMethods {
  static correctForMultipleTesting(
    pValues: number[],
    method: 'bonferroni' | 'fdr' | 'holm'
  ): MultipleTestingCorrection {
    switch (method) {
      case 'bonferroni':
        return this.bonferroniCorrection(pValues);
      case 'fdr':
        return this.benjaminiHochbergCorrection(pValues);
      case 'holm':
        return this.holmBonferroniCorrection(pValues);
    }
  }
}
```

### 3. **Temporal Confounding**
```typescript
interface TemporalConfounding {
  seasonalEffects: SeasonalComponent[];
  trendEffects: TrendComponent[];
  cyclicalEffects: CyclicalComponent[];
}

class TemporalConfoundingAnalysis {
  static decomposeTemporalEffects(
    timeSeries: TimeSeriesPoint[]
  ): TemporalConfounding {
    // Seasonal decomposition
    const seasonal = this.extractSeasonalComponent(timeSeries);
    
    // Trend extraction
    const trend = this.extractTrendComponent(timeSeries);
    
    // Cyclical pattern detection
    const cyclical = this.extractCyclicalComponent(timeSeries);
    
    return {
      seasonalEffects: seasonal,
      trendEffects: trend,
      cyclicalEffects: cyclical
    };
  }
}
```

## Visualization and User Interface

### 1. **Causal Timeline Visualization**
```typescript
interface CausalTimelineVisualization {
  renderCausalTimeline(
    timeSeries: TimeSeriesPoint[],
    interventions: InterventionEvent[],
    changepoints: ChangePoint[]
  ): React.ReactElement;
  
  renderCausalityNetwork(
    causalHypotheses: CausalHypothesis[]
  ): React.ReactElement;
  
  renderInterventionEffects(
    interventionAnalysis: InterventionAnalysis
  ): React.ReactElement;
}
```

### 2. **Interactive Causal Discovery**
```typescript
interface InteractiveCausalDiscovery {
  exploreTimeSeriesRelationships(
    variables: string[],
    timeRange: DateRange
  ): InteractiveCausalExplorer;
  
  testUserHypotheses(
    userHypothesis: UserCausalHypothesis
  ): HypothesisTestResult;
  
  generateCausalInsights(
    experiment: Experiment
  ): CausalInsightReport;
}
```

## Implementation Roadmap

### Phase 1: Basic Time Series Analysis (Month 1)
- Implement changepoint detection
- Add cross-correlation analysis
- Create basic causal timeline visualization

### Phase 2: Advanced Causal Methods (Month 2)
- Implement Granger causality testing
- Add interrupted time series analysis
- Create causal hypothesis ranking

### Phase 3: Bayesian and Robust Methods (Month 3)
- Implement Bayesian structural time series
- Add small sample corrections
- Create uncertainty quantification

### Phase 4: Interactive Discovery (Month 4)
- Build interactive causal discovery interface
- Add user hypothesis testing
- Create automated insight generation

## Conclusion

Time series analysis is fundamental to establishing causality in n=1 experiments. By leveraging temporal precedence, changepoint detection, Granger causality, and other advanced methods, SelfExperiment.AI can provide users with robust evidence for causal relationships in their self-experiments.

The key is combining multiple approaches:
1. **Temporal precedence** ensures causes precede effects
2. **Changepoint detection** identifies when changes occur
3. **Granger causality** tests predictive relationships
4. **Cross-correlation** finds optimal lag structures
5. **Intervention analysis** quantifies treatment effects
6. **Bayesian methods** handle uncertainty and small samples

This comprehensive approach transforms simple correlations into robust causal inference, enabling users to make evidence-based decisions about their health and lifestyle interventions.