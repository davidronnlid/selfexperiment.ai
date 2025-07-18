import { useEffect, useState } from "react";
import { useUser } from "./_app";
import { supabase } from "@/utils/supaBase";
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
} from "@mui/material";

interface TestResult {
  name: string;
  status: "loading" | "success" | "error";
  message?: string;
  data?: any;
}

export default function DebugProductionPage() {
  const { user, loading: userLoading } = useUser();
  const [tests, setTests] = useState<TestResult[]>([]);

  const updateTest = (
    name: string,
    status: TestResult["status"],
    message?: string,
    data?: any
  ) => {
    setTests((prev) => {
      const existing = prev.find((t) => t.name === name);
      if (existing) {
        return prev.map((t) =>
          t.name === name ? { ...t, status, message, data } : t
        );
      }
      return [...prev, { name, status, message, data }];
    });
  };

  const runTest = async (name: string, testFn: () => Promise<any>) => {
    updateTest(name, "loading");
    try {
      const result = await testFn();
      updateTest(name, "success", "OK", result);
    } catch (error: any) {
      updateTest(name, "error", error.message || "Unknown error", error);
    }
  };

  useEffect(() => {
    if (userLoading || !user) return;

    const runAllTests = async () => {
      // Test 1: Basic database connection
      await runTest("Database Connection", async () => {
        const { data, error } = await supabase
          .from("variables")
          .select("count")
          .limit(1);
        if (error) throw error;
        return data;
      });

      // Test 2: Variables table access
      await runTest("Variables Table", async () => {
        const { data, error } = await supabase
          .from("variables")
          .select("id, label, is_active")
          .eq("is_active", true)
          .limit(5);
        if (error) throw error;
        return data;
      });

      // Test 3: User routines function
      await runTest("Get User Routines Function", async () => {
        const { data, error } = await supabase.rpc("get_user_routines", {
          p_user_id: user.id,
        });
        if (error) throw error;
        return data;
      });

      // Test 4: User variable preferences
      await runTest("User Variable Preferences", async () => {
        const { data, error } = await supabase
          .from("user_variable_preferences")
          .select("*")
          .eq("user_id", user.id)
          .limit(10);
        if (error) throw error;
        return data;
      });

      // Test 5: Variable logs
      await runTest("Variable Logs", async () => {
        const { data, error } = await supabase
          .from("variable_data_points")
          .select("*")
          .eq("user_id", user.id)
          .limit(10);
        if (error) throw error;
        return data;
      });

      // Test 6: Profile data
      await runTest("Profile Data", async () => {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (error) throw error;
        return data;
      });

      // Test 7: Daily routines table
      await runTest("Daily Routines Table", async () => {
        const { data, error } = await supabase
          .from("routines")
          .select("*")
          .eq("user_id", user.id)
          .limit(5);
        if (error) throw error;
        return data;
      });
    };

    runAllTests();
  }, [user, userLoading]);

  if (userLoading) {
    return (
      <Container sx={{ py: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!user) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography variant="h4">Please sign in to run diagnostics</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Production Debug Console
      </Typography>

      <Typography variant="h6" color="text.secondary" gutterBottom>
        User: {user.email}
      </Typography>

      <Box sx={{ mt: 4 }}>
        {tests.map((test) => (
          <Card key={test.name} sx={{ mb: 2 }}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 2,
                }}
              >
                <Typography variant="h6">{test.name}</Typography>
                <Chip
                  label={test.status}
                  color={
                    test.status === "success"
                      ? "success"
                      : test.status === "error"
                      ? "error"
                      : "default"
                  }
                  variant={test.status === "loading" ? "outlined" : "filled"}
                />
              </Box>

              {test.message && (
                <Typography
                  variant="body2"
                  color={test.status === "error" ? "error" : "text.secondary"}
                >
                  {test.message}
                </Typography>
              )}

              {test.data && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption">Data:</Typography>
                  <Box
                    component="pre"
                    sx={{
                      backgroundColor: "#f5f5f5",
                      padding: 1,
                      borderRadius: 1,
                      overflow: "auto",
                      fontSize: "0.8rem",
                    }}
                  >
                    {JSON.stringify(test.data, null, 2)}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>
    </Container>
  );
}
