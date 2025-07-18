import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Button,
  Alert,
  Card,
  CardContent,
  CircularProgress,
} from "@mui/material";
import { useUser } from "./_app";

export default function DebugAuth() {
  const { user, loading } = useUser();
  const [authTest, setAuthTest] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const testAuth = async () => {
    setTesting(true);
    try {
      const response = await fetch("/api/test-auth");
      const data = await response.json();
      setAuthTest(data);
    } catch (error) {
      setAuthTest({ error: "Failed to test auth" });
    } finally {
      setTesting(false);
    }
  };

  const testWithingsAuth = async () => {
    try {
      const response = await fetch("/api/withings/auth");
      if (response.redirected) {
        window.location.href = response.url;
      } else {
        const data = await response.json();
        setAuthTest({ withingsError: data });
      }
    } catch (error) {
      setAuthTest({ withingsError: "Failed to test Withings auth" });
    }
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
        🔍 Authentication Debug
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            User Context
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            User ID: {user?.id || "Not logged in"}
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Email: {user?.email || "Not logged in"}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Status: {user ? "✅ Logged in" : "❌ Not logged in"}
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            API Tests
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              onClick={testAuth}
              disabled={testing}
              sx={{ mr: 2 }}
            >
              {testing ? <CircularProgress size={20} /> : "Test Auth API"}
            </Button>
            <Button variant="outlined" onClick={testWithingsAuth}>
              Test Withings Auth
            </Button>
          </Box>

          {authTest && (
            <Alert
              severity={authTest.authenticated ? "success" : "error"}
              sx={{ mt: 2 }}
            >
              <Typography variant="body2">
                <strong>Auth Test Result:</strong>
              </Typography>
              <pre style={{ fontSize: "12px", marginTop: "8px" }}>
                {JSON.stringify(authTest, null, 2)}
              </pre>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Alert severity="info">
        <Typography variant="body1">
          <strong>Debug Instructions:</strong>
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          1. Click "Test Auth API" to check if authentication is working
          <br />
          2. Click "Test Withings Auth" to test the Withings integration
          <br />
          3. Check the browser console and network tab for detailed errors
        </Typography>
      </Alert>
    </Container>
  );
}
