import React, {
  memo,
  useMemo,
  useCallback,
  lazy,
  Suspense,
  useState,
  useEffect,
} from "react";
import {
  Box,
  CircularProgress,
  Typography,
  Skeleton,
  Alert,
} from "@mui/material";
import { QueryOptimizer, PerformanceMonitor } from "../utils/queryOptimization";
import { useUser } from "../pages/_app";

// Lazy load heavy components
const LazyVariableManager = lazy(() => import("./VariableManager"));
const LazyAnalyze = lazy(() => import("../pages/analyze"));
const LazyVariableDisplay = lazy(() => import("./VariableDisplay"));
const LazyVariableInput = lazy(() => import("./VariableInput"));

// Loading skeleton components
const VariableDisplaySkeleton = memo(() => (
  <Box sx={{ p: 2, width: "100%" }}>
    <Skeleton variant="rectangular" width="100%" height={60} />
    <Box sx={{ mt: 2 }}>
      <Skeleton variant="text" width="60%" />
      <Skeleton variant="text" width="80%" />
    </Box>
  </Box>
));

const VariableListSkeleton = memo(() => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
    {Array.from({ length: 5 }, (_, i) => (
      <VariableDisplaySkeleton key={i} />
    ))}
  </Box>
));

// Optimized loading wrapper
const LoadingWrapper = memo<{
  loading: boolean;
  error: string | null;
  children: React.ReactNode;
  skeleton?: React.ReactNode;
}>(({ loading, error, children, skeleton }) => {
  if (loading) {
    return skeleton ? (
      <Box>{skeleton}</Box>
    ) : (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return <>{children}</>;
});

// Optimized variable list with virtualization for large lists
const OptimizedVariableList = memo<{
  variables: any[];
  onVariableClick?: (variable: any) => void;
  loading?: boolean;
  error?: string | null;
}>(({ variables, onVariableClick, loading = false, error = null }) => {
  const handleClick = useCallback(
    (variable: any) => {
      onVariableClick?.(variable);
    },
    [onVariableClick]
  );

  const sortedVariables = useMemo(() => {
    return [...variables].sort((a, b) => a.label.localeCompare(b.label));
  }, [variables]);

  return (
    <LoadingWrapper
      loading={loading}
      error={error}
      skeleton={<VariableListSkeleton />}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {sortedVariables.map((variable) => (
          <Suspense key={variable.id} fallback={<VariableDisplaySkeleton />}>
            <Box
              onClick={() => handleClick(variable)}
              sx={{ cursor: "pointer" }}
            >
              <LazyVariableDisplay
                variable={variable}
                value={variable.lastValue || ""}
                size="small"
                variant="compact"
              />
            </Box>
          </Suspense>
        ))}
      </Box>
    </LoadingWrapper>
  );
});

// Optimized user variables hook
const useUserVariables = (userId: string) => {
  const [variables, setVariables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchVariables = async () => {
      try {
        setLoading(true);
        setError(null);

        const userVariables = await PerformanceMonitor.measureQuery(
          "user_variables",
          () => QueryOptimizer.getUserVariables(userId)
        );

        if (isMounted) {
          setVariables(userVariables);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : "Failed to load variables"
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (userId) {
      fetchVariables();
    }

    return () => {
      isMounted = false;
    };
  }, [userId]);

  return { variables, loading, error };
};

// Optimized variable manager wrapper
const OptimizedVariableManager = memo<{
  onVariableCreated?: (variable: any) => void;
  onVariableUpdated?: (variable: any) => void;
}>(({ onVariableCreated, onVariableUpdated }) => {
  const { user } = useUser();
  const { variables, loading, error } = useUserVariables(user?.id || "");

  const handleVariableCreated = useCallback(
    (variable: any) => {
      // Invalidate cache when variable is created
      if (user?.id) {
        QueryOptimizer.invalidateCache(`user_variables_${user.id}`);
        QueryOptimizer.invalidateCache(`dashboard_${user.id}`);
      }
      onVariableCreated?.(variable);
    },
    [user?.id, onVariableCreated]
  );

  const handleVariableUpdated = useCallback(
    (variable: any) => {
      // Invalidate cache when variable is updated
      if (user?.id) {
        QueryOptimizer.invalidateCache(`user_variables_${user.id}`);
        QueryOptimizer.invalidateCache(`dashboard_${user.id}`);
      }
      onVariableUpdated?.(variable);
    },
    [user?.id, onVariableUpdated]
  );

  if (!user) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <Typography>Please sign in to manage variables</Typography>
      </Box>
    );
  }

  return (
    <LoadingWrapper
      loading={loading}
      error={error}
      skeleton={<VariableListSkeleton />}
    >
      <Typography variant="h6" gutterBottom>
        Variables ({variables.length})
      </Typography>
      <OptimizedVariableList
        variables={variables}
        onVariableClick={handleVariableCreated}
        loading={loading}
        error={error}
      />
    </LoadingWrapper>
  );
});

// Performance monitoring component
const PerformanceMonitorDisplay = memo(() => {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      PerformanceMonitor.logCacheStats();
    }, 30000); // Log every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 16,
        right: 16,
        bgcolor: "background.paper",
        p: 2,
        borderRadius: 1,
        boxShadow: 3,
      }}
    >
      <Typography variant="caption">Performance Monitor Active</Typography>
    </Box>
  );
});

// Export optimized components
export {
  OptimizedVariableList,
  OptimizedVariableManager,
  PerformanceMonitorDisplay,
  LoadingWrapper,
  VariableDisplaySkeleton,
  VariableListSkeleton,
  useUserVariables,
};

// Export lazy-loaded components for external use
export const LazyComponents = {
  VariableManager: LazyVariableManager,
  Analyze: LazyAnalyze,
  VariableDisplay: LazyVariableDisplay,
  VariableInput: LazyVariableInput,
};
