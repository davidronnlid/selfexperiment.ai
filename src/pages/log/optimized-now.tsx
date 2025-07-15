import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Button,
  Skeleton,
  Alert,
} from "@mui/material";
import { useUser } from "../_app";
import { useRouter } from "next/router";
import {
  QueryOptimizer,
  PerformanceMonitor,
  CacheInvalidation,
} from "../../utils/queryOptimization";
import { supabase } from "../../utils/supaBase";
import {
  OptimizedVariableList,
  LoadingWrapper,
  VariableListSkeleton,
  PerformanceMonitorDisplay,
} from "../../components/OptimizedComponents";

// Types
interface LogPageData {
  variables: any[];
  recentLogs: any[];
  routines: any[];
  experiments: any[];
}

// Optimized Log Now Page
export default function OptimizedLogNow() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();

  // State management
  const [pageData, setPageData] = useState<LogPageData>({
    variables: [],
    recentLogs: [],
    routines: [],
    experiments: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loggingVariable, setLoggingVariable] = useState<string | null>(null);

  // Memoized filtered variables
  const filteredVariables = useMemo(() => {
    return pageData.variables.filter((variable) => variable.is_active);
  }, [pageData.variables]);

  // Memoized today's date
  const todayDate = useMemo(() => {
    const today = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(
      today.getDate()
    )}`;
  }, []);

  // Fetch page data with performance optimization
  const fetchPageData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Use performance monitoring
      const data = await PerformanceMonitor.measureQuery(
        "log_page_load",
        async () => {
          // Parallel queries for better performance
          const [variables, recentLogs, routines, experiments] =
            await Promise.all([
              QueryOptimizer.getUserVariables(user.id),
              QueryOptimizer.getUserLogs(user.id, 10), // Limit to 10 recent logs
              QueryOptimizer.getUserRoutines(user.id),
              QueryOptimizer.cachedQuery(
                `user_experiments_${user.id}`,
                async () => {
                  const { data, error } = await supabase
                    .from("experiments")
                    .select("*")
                    .eq("user_id", user.id)
                    .gte("end_date", todayDate)
                    .limit(5);

                  if (error) throw error;
                  return data || [];
                }
              ),
            ]);

          return {
            variables: variables || [],
            recentLogs: recentLogs || [],
            routines: routines || [],
            experiments: experiments || [],
          };
        }
      );

      setPageData(data);
    } catch (err) {
      console.error("Log page load error:", err);
      setError(err instanceof Error ? err.message : "Failed to load page data");
    } finally {
      setLoading(false);
    }
  }, [user?.id, todayDate]);

  // Log a variable value
  const logVariable = useCallback(
    async (variableId: string, value: string, unit?: string) => {
      if (!user?.id || !variableId) return;

      try {
        setLoggingVariable(variableId);

        // Log the variable
        await PerformanceMonitor.measureQuery("log_variable", async () => {
          const { error } = await supabase.from("variable_logs").insert({
            user_id: user.id,
            variable_id: variableId,
            display_value: value,
            display_unit: unit,
            logged_at: new Date().toISOString(),
            source: "manual",
          });

          if (error) throw error;
        });

        // Invalidate cache and refresh data
        CacheInvalidation.onLogChange(user.id);
        await fetchPageData();
      } catch (err) {
        console.error("Failed to log variable:", err);
        setError(err instanceof Error ? err.message : "Failed to log variable");
      } finally {
        setLoggingVariable(null);
      }
    },
    [user?.id, fetchPageData]
  );

  // Initial data load
  useEffect(() => {
    if (!userLoading && user?.id) {
      fetchPageData();
    }
  }, [userLoading, user?.id, fetchPageData]);

  // Preload data for better UX
  useEffect(() => {
    if (user?.id) {
      QueryOptimizer.preloadUserData(user.id);
    }
  }, [user?.id]);

  // Handle variable click
  const handleVariableClick = useCallback(
    (variable: any) => {
      router.push(
        `/variable/${encodeURIComponent(variable.slug || variable.label)}`
      );
    },
    [router]
  );

  // Handle quick log
  const handleQuickLog = useCallback(
    (variable: any, value: string) => {
      logVariable(variable.id, value, variable.canonical_unit);
    },
    [logVariable]
  );

  // Loading state
  if (userLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Skeleton variant="rectangular" width="100%" height={400} />
      </Container>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: "center" }}>
        <Typography variant="h5" gutterBottom>
          Please sign in to log variables
        </Typography>
        <Button variant="contained" onClick={() => router.push("/auth")}>
          Sign In
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Log Variables
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          {todayDate} • {filteredVariables.length} variables available
        </Typography>
      </Box>

      <LoadingWrapper
        loading={loading}
        error={error}
        skeleton={
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 8 }}>
              <VariableListSkeleton />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Skeleton variant="rectangular" width="100%" height={300} />
            </Grid>
          </Grid>
        }
      >
        <Grid container spacing={3}>
          {/* Variables List */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Variables to Log ({filteredVariables.length})
                </Typography>

                {filteredVariables.length > 0 ? (
                  <OptimizedVariableList
                    variables={filteredVariables}
                    onVariableClick={handleVariableClick}
                    loading={loading}
                    error={error}
                  />
                ) : (
                  <Alert severity="info">
                    No variables available. Create some variables to start
                    logging.
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Sidebar */}
          <Grid size={{ xs: 12, md: 4 }}>
            {/* Recent Logs */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Logs
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {pageData.recentLogs.length > 0 ? (
                    pageData.recentLogs.slice(0, 5).map((log: any) => (
                      <Box
                        key={log.id}
                        sx={{
                          p: 2,
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 1,
                          bgcolor: "background.default",
                        }}
                      >
                        <Typography variant="body2" fontWeight="medium">
                          {log.variable_name || "Unknown"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {log.display_value || log.value}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(log.logged_at).toLocaleTimeString()}
                        </Typography>
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No recent logs
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>

            {/* Active Routines */}
            {pageData.routines.length > 0 && (
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Active Routines
                  </Typography>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    {pageData.routines.slice(0, 3).map((routine: any) => (
                      <Box
                        key={routine.id}
                        sx={{
                          p: 2,
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 1,
                          bgcolor: "background.default",
                        }}
                      >
                        <Typography variant="body2" fontWeight="medium">
                          {routine.routine_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {routine.default_time}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Quick Actions
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Button
                    variant="outlined"
                    onClick={() => router.push("/variable/create")}
                    fullWidth
                  >
                    Create Variable
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => router.push("/log/routines")}
                    fullWidth
                  >
                    Manage Routines
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => router.push("/analytics")}
                    fullWidth
                  >
                    View Analytics
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </LoadingWrapper>

      {/* Performance Monitor */}
      <PerformanceMonitorDisplay />
    </Container>
  );
}
