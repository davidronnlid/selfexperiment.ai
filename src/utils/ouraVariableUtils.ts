export interface OuraVariableInfo {
  id: string;
  label: string;
  description: string;
  icon: string;
  unit: string;
  category: string;
  normalRange?: string;
  interpretation: {
    high: string;
    normal: string;
    low: string;
  };
}

export const OURA_VARIABLES: Record<string, OuraVariableInfo> = {
  readiness_score: {
    id: "readiness_score",
    label: "Readiness Score",
    description: "Your body's readiness for physical and mental performance based on sleep, recovery, and activity patterns. A higher score indicates better readiness.",
    icon: "⚡",
    unit: "score",
    category: "Recovery",
    normalRange: "70-100",
    interpretation: {
      high: "Excellent readiness - your body is well-recovered and ready for challenges",
      normal: "Good readiness - you're prepared for normal activities", 
      low: "Poor readiness - consider focusing on rest and recovery"
    }
  },
  sleep_score: {
    id: "sleep_score",
    label: "Sleep Score",
    description: "Overall assessment of your sleep quality based on duration, efficiency, restfulness, and timing. Reflects how well you slept.",
    icon: "😴",
    unit: "score",
    category: "Sleep",
    normalRange: "70-100",
    interpretation: {
      high: "Excellent sleep quality - you got restorative sleep",
      normal: "Good sleep quality - adequate rest achieved",
      low: "Poor sleep quality - consider improving sleep habits"
    }
  },
  total_sleep_duration: {
    id: "total_sleep_duration",
    label: "Total Sleep Duration",
    description: "Total time spent sleeping during your main sleep period. Includes all sleep stages but excludes time awake in bed.",
    icon: "🛌",
    unit: "minutes",
    category: "Sleep",
    normalRange: "7-9 hours",
    interpretation: {
      high: "Long sleep duration - may indicate recovery needs or oversleeping",
      normal: "Optimal sleep duration for most adults",
      low: "Short sleep duration - may need more sleep for optimal health"
    }
  },
  rem_sleep_duration: {
    id: "rem_sleep_duration", 
    label: "REM Sleep Duration",
    description: "Time spent in Rapid Eye Movement (REM) sleep, crucial for memory consolidation, learning, and emotional processing.",
    icon: "💭",
    unit: "minutes",
    category: "Sleep",
    normalRange: "20-25% of total sleep",
    interpretation: {
      high: "High REM sleep - excellent for memory and emotional health",
      normal: "Adequate REM sleep for cognitive recovery",
      low: "Low REM sleep - may affect memory and mood"
    }
  },
  deep_sleep_duration: {
    id: "deep_sleep_duration",
    label: "Deep Sleep Duration", 
    description: "Time spent in deep (N3) sleep, essential for physical recovery, immune function, and memory consolidation.",
    icon: "🌙",
    unit: "minutes",
    category: "Sleep",
    normalRange: "15-20% of total sleep",
    interpretation: {
      high: "Excellent deep sleep - optimal for physical recovery",
      normal: "Good deep sleep for restoration",
      low: "Limited deep sleep - may affect physical recovery"
    }
  },
  efficiency: {
    id: "efficiency",
    label: "Sleep Efficiency",
    description: "Percentage of time actually asleep while in bed. Higher efficiency indicates more consolidated, uninterrupted sleep.",
    icon: "📊",
    unit: "percentage",
    category: "Sleep",
    normalRange: "85-95%",
    interpretation: {
      high: "Excellent sleep efficiency - very consolidated sleep",
      normal: "Good sleep efficiency - minimal sleep disruption",
      low: "Poor sleep efficiency - frequent awakenings or difficulty staying asleep"
    }
  },
  sleep_latency: {
    id: "sleep_latency",
    label: "Sleep Latency",
    description: "Time it takes to fall asleep after getting into bed. Shorter latency usually indicates good sleep readiness.",
    icon: "⏱️",
    unit: "minutes",
    category: "Sleep",
    normalRange: "10-20 minutes",
    interpretation: {
      high: "Long sleep latency - may indicate stress, anxiety, or poor sleep habits",
      normal: "Normal time to fall asleep",
      low: "Very quick sleep onset - good sleep readiness or possible sleep debt"
    }
  },
  temperature_deviation: {
    id: "temperature_deviation",
    label: "Temperature Deviation",
    description: "Deviation of your skin temperature from your personal baseline during sleep. Can indicate illness, stress, or recovery status.",
    icon: "🌡️",
    unit: "°C",
    category: "Recovery",
    normalRange: "±0.5°C from baseline",
    interpretation: {
      high: "Elevated temperature - may indicate illness, stress, or recovery needs",
      normal: "Normal temperature - good recovery status",
      low: "Below normal temperature - possible overcooling or different sleep environment"
    }
  },
  temperature_trend_deviation: {
    id: "temperature_trend_deviation",
    label: "Temperature Trend Deviation", 
    description: "Change in your temperature pattern compared to recent trends. Helps identify developing health or recovery patterns.",
    icon: "📈",
    unit: "°C",
    category: "Recovery",
    normalRange: "±0.3°C from trend",
    interpretation: {
      high: "Rising temperature trend - monitor for illness or increased stress",
      normal: "Stable temperature trend - consistent recovery patterns",
      low: "Decreasing temperature trend - may indicate improved recovery"
    }
  },
  hr_lowest_true: {
    id: "hr_lowest_true",
    label: "Lowest Heart Rate",
    description: "Your lowest heart rate during sleep, typically occurring in deep sleep. Reflects your cardiovascular fitness and recovery state.",
    icon: "❤️",
    unit: "bpm",
    category: "Heart Rate",
    normalRange: "Varies by fitness level",
    interpretation: {
      high: "Higher than usual resting HR - may indicate stress, illness, or incomplete recovery",
      normal: "Normal resting heart rate for your fitness level",
      low: "Very low resting HR - often indicates excellent cardiovascular fitness"
    }
  },
  hr_average_true: {
    id: "hr_average_true",
    label: "Average Heart Rate",
    description: "Your average heart rate during sleep. Provides insight into your overall cardiovascular state and recovery quality.",
    icon: "💓",
    unit: "bpm", 
    category: "Heart Rate",
    normalRange: "Varies by fitness level",
    interpretation: {
      high: "Elevated average HR - may indicate incomplete recovery or stress",
      normal: "Normal sleep heart rate - good recovery status",
      low: "Low average HR - typically indicates good fitness and recovery"
    }
  }
};

/**
 * Convert an Oura variable ID to a user-friendly display name
 */
export function getOuraVariableLabel(variableId: string): string {
  return OURA_VARIABLES[variableId]?.label || variableId;
}

/**
 * Get detailed information about an Oura variable
 */
export function getOuraVariableInfo(variableId: string): OuraVariableInfo | null {
  return OURA_VARIABLES[variableId] || null;
}

/**
 * Get all available Oura variables
 */
export function getAllOuraVariables(): OuraVariableInfo[] {
  return Object.values(OURA_VARIABLES);
}

/**
 * Check if a variable ID is an Oura variable
 */
export function isOuraVariable(variableId: string): boolean {
  return variableId in OURA_VARIABLES;
}

/**
 * Get variable interpretation based on value
 */
export function getOuraVariableInterpretation(variableId: string, value: number): string {
  const variable = OURA_VARIABLES[variableId];
  if (!variable) return "";

  // Define thresholds for each variable type
  const thresholds: Record<string, { low: number; high: number }> = {
    readiness_score: { low: 70, high: 85 },
    sleep_score: { low: 70, high: 85 },
    total_sleep_duration: { low: 420, high: 540 }, // 7-9 hours in minutes
    rem_sleep_duration: { low: 60, high: 120 }, // Rough estimates in minutes
    deep_sleep_duration: { low: 60, high: 120 }, // Rough estimates in minutes  
    efficiency: { low: 85, high: 95 },
    sleep_latency: { low: 10, high: 20 },
    temperature_deviation: { low: -0.5, high: 0.5 },
    temperature_trend_deviation: { low: -0.3, high: 0.3 },
    hr_lowest_true: { low: 45, high: 65 }, // Very rough estimates
    hr_average_true: { low: 50, high: 70 }, // Very rough estimates
  };

  const threshold = thresholds[variableId];
  if (!threshold) return variable.interpretation.normal;

  if (value < threshold.low) {
    return variable.interpretation.low;
  } else if (value > threshold.high) {
    return variable.interpretation.high;
  } else {
    return variable.interpretation.normal;
  }
}

/**
 * Format an Oura variable value for display
 */
export function formatOuraVariableValue(variableId: string, value: number): string {
  const variable = OURA_VARIABLES[variableId];
  if (!variable) return value.toString();

  switch (variable.unit) {
    case "minutes":
      if (variableId.includes("sleep_duration")) {
        const hours = Math.floor(value / 60);
        const minutes = Math.round(value % 60);
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      }
      return `${value} min`;
    case "percentage":
      return `${value}%`;
    case "°C":
      return `${value.toFixed(2)}°C`;
    case "bpm":
      return `${value} bpm`;
    case "score":
      return value.toString();
    default:
      return value.toString();
  }
} 