// Strong typing for API responses and common data structures

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  code?: string;
  details?: unknown;
}

export interface DatabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

export interface OuraData {
  metric: string;
  date: string;
  value: number;
  user_id: string;
}

export interface ManualLog {
  id: number;
  date: string;
  variable: string;
  value: string;
  notes?: string;
  created_at: string;
  user_id: string;
}

export interface WithingsWeight {
  id: number;
  user_id: string;
  date: string;
  weight_kg: number;
  fat_free_mass_kg?: number;
  fat_ratio?: number;
  fat_mass_weight_kg?: number;
  muscle_mass_kg?: number;
  hydration_kg?: number;
  bone_mass_kg?: number;
  raw_data: unknown;
}

export interface ExperimentData {
  id: string;
  user_id: string;
  variable: string;
  start_date: string;
  end_date: string;
  frequency: number;
  effect: string;
  dependent_variable: string;
  time_intervals: Array<{ start: string; end: string; label?: string }>;
  missing_data_strategy: string;
  created_at: string;
  updated_at: string;
}

export interface ChartDataPoint {
  x: string | number;
  y: number;
  label?: string;
}

export interface ChartConfiguration {
  type: "line" | "bar" | "scatter" | "pie";
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
      fill?: boolean;
      tension?: number;
    }>;
  };
  options: {
    responsive: boolean;
    plugins: {
      legend: {
        display: boolean;
      };
      title: {
        display: boolean;
        text: string;
      };
    };
    scales?: {
      x: {
        display: boolean;
        title: {
          display: boolean;
          text: string;
        };
      };
      y: {
        display: boolean;
        title: {
          display: boolean;
          text: string;
        };
      };
    };
  };
}

// Replace usage in analytics.tsx
export interface AnalyticsState {
  userLogs: ManualLog[];
  ouraData: OuraData[];
  withingsWeights: WithingsWeight[];
  logsLoading: boolean;
  ouraLoading: boolean;
  withingsSyncing: boolean;
  withingsSyncProgress: number;
  tabValue: number;
}
