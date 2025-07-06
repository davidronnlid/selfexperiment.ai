export interface DataPoint {
  date: string;
  value1: number;
  value2: number;
}

export interface CorrelationResult {
  correlation: number;
  pValue?: number;
  strength: 'strong' | 'moderate' | 'weak' | 'none';
  direction: 'positive' | 'negative';
  dataPoints: number;
  confidence95?: [number, number];
}

/**
 * Calculate Pearson correlation coefficient
 */
export function calculatePearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;

  const n = x.length;
  const sumX = x.reduce((sum, val) => sum + val, 0);
  const sumY = y.reduce((sum, val) => sum + val, 0);
  const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
  const sumXX = x.reduce((sum, val) => sum + val * val, 0);
  const sumYY = y.reduce((sum, val) => sum + val * val, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY)
  );

  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Calculate correlation with additional statistics
 */
export function calculateCorrelationWithStats(
  data: DataPoint[]
): CorrelationResult {
  if (data.length < 3) {
    return {
      correlation: 0,
      strength: 'none',
      direction: 'positive',
      dataPoints: data.length,
    };
  }

  const x = data.map(d => d.value1);
  const y = data.map(d => d.value2);
  const correlation = calculatePearsonCorrelation(x, y);

  return {
    correlation: Math.round(correlation * 1000) / 1000,
    strength: getCorrelationStrength(correlation),
    direction: correlation >= 0 ? 'positive' : 'negative',
    dataPoints: data.length,
    confidence95: calculateConfidenceInterval(correlation, data.length),
  };
}

/**
 * Determine correlation strength based on absolute value
 */
export function getCorrelationStrength(
  correlation: number
): 'strong' | 'moderate' | 'weak' | 'none' {
  const abs = Math.abs(correlation);
  if (abs >= 0.7) return 'strong';
  if (abs >= 0.3) return 'moderate';
  if (abs >= 0.1) return 'weak';
  return 'none';
}

/**
 * Calculate 95% confidence interval for correlation
 */
export function calculateConfidenceInterval(
  r: number,
  n: number
): [number, number] {
  if (n < 4) return [0, 0];
  
  // Fisher's z-transformation
  const z = 0.5 * Math.log((1 + r) / (1 - r));
  const se = 1 / Math.sqrt(n - 3);
  const zCritical = 1.96; // 95% confidence level
  
  const zLower = z - zCritical * se;
  const zUpper = z + zCritical * se;
  
  // Transform back to correlation scale
  const rLower = (Math.exp(2 * zLower) - 1) / (Math.exp(2 * zLower) + 1);
  const rUpper = (Math.exp(2 * zUpper) - 1) / (Math.exp(2 * zUpper) + 1);
  
  return [
    Math.max(-1, Math.min(1, rLower)),
    Math.max(-1, Math.min(1, rUpper))
  ];
}

/**
 * Get color for correlation visualization
 */
export function getCorrelationColor(correlation: number): string {
  const abs = Math.abs(correlation);
  if (abs >= 0.7) return correlation > 0 ? '#4caf50' : '#f44336';
  if (abs >= 0.3) return correlation > 0 ? '#8bc34a' : '#ff9800';
  if (abs >= 0.1) return correlation > 0 ? '#cddc39' : '#ffeb3b';
  return '#9e9e9e';
}

/**
 * Check for potential confounding variables
 */
export function identifyPotentialConfounders(
  correlations: CorrelationResult[],
  threshold: number = 0.3
): string[] {
  // This would be enhanced with domain knowledge
  // For now, return variables that correlate with multiple others
  const warnings: string[] = [];
  
  // Add basic warnings for strong correlations
  const strongCorrelations = correlations.filter(
    corr => Math.abs(corr.correlation) >= 0.7
  );
  
  if (strongCorrelations.length > 0) {
    warnings.push(
      'Strong correlations detected - consider external factors that might influence both variables'
    );
  }
  
  return warnings;
}

/**
 * Generate interpretation text for correlation
 */
export function interpretCorrelation(result: CorrelationResult): string {
  const { correlation, strength, direction, dataPoints } = result;
  
  if (strength === 'none') {
    return `No meaningful correlation found (r = ${correlation}) with ${dataPoints} data points.`;
  }
  
  const strengthText = strength === 'strong' ? 'strong' : 
                      strength === 'moderate' ? 'moderate' : 'weak';
  
  return `${strengthText.charAt(0).toUpperCase() + strengthText.slice(1)} ${direction} correlation (r = ${correlation}) found with ${dataPoints} data points.`;
}

/**
 * Calculate lag correlation to check for temporal relationships
 */
export function calculateLagCorrelation(
  data: DataPoint[],
  maxLag: number = 7
): Array<{ lag: number; correlation: number }> {
  const results: Array<{ lag: number; correlation: number }> = [];
  
  for (let lag = 0; lag <= maxLag; lag++) {
    if (data.length <= lag) break;
    
    const x = data.slice(0, data.length - lag).map(d => d.value1);
    const y = data.slice(lag).map(d => d.value2);
    
    if (x.length > 2) {
      const correlation = calculatePearsonCorrelation(x, y);
      results.push({ lag, correlation });
    }
  }
  
  return results;
}