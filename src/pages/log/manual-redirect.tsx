import { useEffect } from "react";
import { useRouter } from "next/router";
import { Container, Typography, CircularProgress } from "@mui/material";

export default function LegacyManualPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new manual tracking page
    router.replace("/track/manual");
  }, [router]);

  return (
    <Container sx={{ py: 4, textAlign: "center" }}>
      <CircularProgress sx={{ mb: 2 }} />
      <Typography variant="h6">Redirecting to Manual Tracking...</Typography>
    </Container>
  );
}
