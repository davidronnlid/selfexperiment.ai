import React, { useState } from "react";
import {
  Container,
  Typography,
  Box,
  Button,
  Alert,
  Card,
  CardContent,
} from "@mui/material";
import { useUser } from "./_app";

export default function WithingsTestSimple() {
  const { user, loading } = useUser();
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const testAuth = async () => {
    setTesting(true);
    try {
      const response = await fetch("/api/test-auth", {
        headers: {
          "x-user-id": user?.id || "",
          "x-user-email": user?.email || "",
        },
      });
      const data = await response.json();
      setTestResult({ type: "auth", data });
    } catch (error) {
      setTestResult({
        type: "auth",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setTesting(false);
    }
  };

  const testWithingsAuth = async () => {
    setTesting(true);
    try {
      // Instead of fetch, use window.location to avoid CORS issues
      const authUrl = `/api/withings/auth?user_id=${
        user?.id
      }&user_email=${encodeURIComponent(user?.email || "")}`;
      window.location.href = authUrl;
    } catch (error) {
      setTestResult({
        type: "withings",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom align="center">
        🔧 Simple Withings Test
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body1">
          <strong>User Status:</strong>
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          User ID: {user?.id || "Not logged in"}
          <br />
          Email: {user?.email || "Not logged in"}
          <br />
          Status: {user ? "✅ Logged in" : "❌ Not logged in"}
        </Typography>
      </Alert>

      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          onClick={testAuth}
          disabled={testing}
          sx={{ mr: 2 }}
        >
          Test Auth API
        </Button>
        <Button
          variant="outlined"
          onClick={testWithingsAuth}
          disabled={testing}
        >
          Test Withings Auth
        </Button>
      </Box>

      {testResult && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Test Result ({testResult.type})
            </Typography>
            <Alert
              severity={
                testResult.error
                  ? "error"
                  : testResult.success
                  ? "success"
                  : "warning"
              }
            >
              <pre style={{ fontSize: "12px", whiteSpace: "pre-wrap" }}>
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </Alert>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Next Steps
          </Typography>
          <Typography variant="body2" color="textSecondary">
            If the auth test passes but Withings fails:
            <br />
            1. Check that you're logged in
            <br />
            2. Try refreshing the page
            <br />
            3. Check the browser console for errors
            <br />
            4. Make sure the Withings environment variables are set
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
}
