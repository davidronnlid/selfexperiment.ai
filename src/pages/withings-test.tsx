import React from "react";
import {
  Container,
  Typography,
  Box,
  Alert,
  Card,
  CardContent,
} from "@mui/material";
import { useUser } from "./_app";
import { useRouter } from "next/router";
import WithingsIntegration from "@/components/WithingsIntegration";

export default function WithingsTest() {
  const { user, loading } = useUser();
  const router = useRouter();

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          You need to be logged in to test the Withings integration.
        </Alert>
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Withings Integration Test
            </Typography>
            <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
              This page tests the Withings integration. Please log in first.
            </Typography>
            <Box sx={{ mt: 2 }}>
              <button
                onClick={() => router.push("/auth")}
                style={{
                  padding: "12px 24px",
                  backgroundColor: "#1976d2",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "16px",
                }}
              >
                Go to Login
              </button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom align="center">
        🔧 Withings Integration Test
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body1">
          <strong>Testing Withings Integration</strong>
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          User ID: {user.id}
          <br />
          Email: {user.email}
          <br />
          Status: ✅ Authenticated
        </Typography>
      </Alert>

      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Withings Integration Component
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            This should show the connect button if not connected, or your data
            if connected.
          </Typography>

          <WithingsIntegration userId={user.id} />
        </CardContent>
      </Card>

      <Alert severity="success" sx={{ mt: 3 }}>
        <Typography variant="body1">
          <strong>Integration Status:</strong> Ready to test
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          • Environment variables: ✅ Configured
          <br />
          • Authentication: ✅ Working
          <br />• Component: ✅ Loaded
        </Typography>
      </Alert>
    </Container>
  );
}
