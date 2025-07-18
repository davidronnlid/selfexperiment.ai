import { useEffect } from "react";
import { useRouter } from "next/router";
import { Container, Typography, CircularProgress } from "@mui/material";

export default function LegacyAutoPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new auto tracking page
    router.replace("/track/auto");
  }, [router]);

  return (
    <Container sx={{ py: 4, textAlign: "center" }}>
      <CircularProgress sx={{ mb: 2 }} />
      <Typography variant="h6">Redirecting to Auto Tracking...</Typography>
    </Container>
  );
}
