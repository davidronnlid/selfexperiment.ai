import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Container,
  Typography,
  Box,
  Button,
  Alert,
  Card,
  CardContent,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from "@mui/material";
import { useUser } from "./_app";

export default function WithingsDebug() {
  const { user, loading } = useUser();
  const [activeStep, setActiveStep] = useState(0);
  const [testResults, setTestResults] = useState<any>({});
  const [testing, setTesting] = useState(false);

  const steps = [
    {
      label: "Check Authentication",
      description: "Verify user is logged in and authenticated",
      test: async () => {
        const response = await fetch("/api/test-auth");
        return await response.json();
      },
    },
    {
      label: "Test Withings Auth Endpoint",
      description: "Test the Withings authentication endpoint",
      test: async () => {
        const response = await fetch("/api/withings/auth");
        if (response.redirected) {
          return { success: true, redirected: true, url: response.url };
        } else {
          return await response.json();
        }
      },
    },
    {
      label: "Check Environment Variables",
      description: "Verify Withings credentials are configured",
      test: async () => {
        const response = await fetch("/api/test-auth");
        const authResult = await response.json();
        if (!authResult.authenticated) {
          return { error: "Not authenticated" };
        }

        // Test if we can access the auth endpoint without redirect
        const withingsResponse = await fetch("/api/withings/auth", {
          method: "HEAD",
        });

        return {
          authenticated: authResult.authenticated,
          withingsEndpoint:
            withingsResponse.status === 200 || withingsResponse.status === 302,
          status: withingsResponse.status,
        };
      },
    },
  ];

  const runTest = async (stepIndex: number) => {
    setTesting(true);
    try {
      const result = await steps[stepIndex].test();
      setTestResults((prev: any) => ({ ...prev, [stepIndex]: result }));

      if (result.success || result.authenticated) {
        setActiveStep(stepIndex + 1);
      }
    } catch (error) {
      setTestResults((prev: any) => ({
        ...prev,
        [stepIndex]: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      }));
    } finally {
      setTesting(false);
    }
  };

  const runAllTests = async () => {
    setTesting(true);
    const results: any = {};

    for (let i = 0; i < steps.length; i++) {
      try {
        const result = await steps[i].test();
        results[i] = result;
        setTestResults(results);

        if (result.error || (!result.success && !result.authenticated)) {
          break;
        }
      } catch (error) {
        results[i] = {
          error: error instanceof Error ? error.message : "Unknown error",
        };
        setTestResults(results);
        break;
      }
    }

    setTesting(false);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="200px"
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom align="center">
        🔧 Withings Integration Debug
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body1">
          <strong>Debug Instructions:</strong>
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          This page will help you test the Withings integration step by step.
          <br />
          User ID: {user?.id || "Not logged in"}
          <br />
          Email: {user?.email || "Not logged in"}
        </Typography>
      </Alert>

      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          onClick={runAllTests}
          disabled={testing}
          sx={{ mr: 2 }}
        >
          {testing ? <CircularProgress size={20} /> : "Run All Tests"}
        </Button>
        <Button
          variant="outlined"
          onClick={() => (window.location.href = "/api/withings/auth")}
        >
          Try Withings Auth Directly
        </Button>
      </Box>

      <Stepper activeStep={activeStep} orientation="vertical">
        {steps.map((step, index) => (
          <Step key={step.label}>
            <StepLabel>{step.label}</StepLabel>
            <StepContent>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                {step.description}
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => runTest(index)}
                  disabled={testing}
                  sx={{ mr: 1 }}
                >
                  {testing ? <CircularProgress size={16} /> : "Test"}
                </Button>
              </Box>

              {testResults[index] && (
                <Alert
                  severity={
                    testResults[index].error
                      ? "error"
                      : testResults[index].success ||
                        testResults[index].authenticated
                      ? "success"
                      : "warning"
                  }
                  sx={{ mt: 2 }}
                >
                  <Typography variant="body2">
                    <strong>Result:</strong>
                  </Typography>
                  <pre
                    style={{
                      fontSize: "12px",
                      marginTop: "8px",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {JSON.stringify(testResults[index], null, 2)}
                  </pre>
                </Alert>
              )}
            </StepContent>
          </Step>
        ))}
      </Stepper>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Next Steps
          </Typography>
          <Typography variant="body2" color="textSecondary">
            If all tests pass, you should be able to:
            <br />
            1. Go to <Link href="/withings-test">Withings Test Page</Link>
            <br />
            2. Click "Connect Withings"
            <br />
            3. Complete the OAuth flow
            <br />
            4. See your Withings data imported
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
}
