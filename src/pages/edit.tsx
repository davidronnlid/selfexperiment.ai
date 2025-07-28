import { useEffect } from "react";
import { useRouter } from "next/router";
import { useUser } from "./_app";
import {
  Container,
  Typography,
  Box,
  Alert,
  CircularProgress,
} from "@mui/material";

export default function EditPage() {
  const router = useRouter();
  const { user, loading: userLoading, username } = useUser();

  useEffect(() => {
    if (!userLoading) {
      if (username === "davidronnlidmh") {
        // Redirect admin user to the variable editor
        router.replace("/variable/edit-any");
      } else {
        // Keep non-admin users on this page to show access denied
      }
    }
  }, [userLoading, username, router]);

  if (userLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="50vh"
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (username !== "davidronnlidmh") {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          Access denied. This page is only available to authorized administrators.
        </Alert>
        <Typography variant="body1">
          If you believe you should have access to this page, please contact the administrator.
        </Typography>
      </Container>
    );
  }

  // This should not render as the user will be redirected
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="50vh"
      >
        <CircularProgress />
      </Box>
    </Container>
  );
} 