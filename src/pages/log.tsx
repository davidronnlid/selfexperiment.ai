import { useEffect } from "react";
import { useRouter } from "next/router";
import { Container, Typography, Paper, Button, Box } from "@mui/material";
import Link from "next/link";
import { FaFlask, FaArrowRight } from "react-icons/fa";

export default function LogPage() {
  const router = useRouter();

  // Optional: Auto-redirect after a few seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/active-experiments");
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper
        elevation={3}
        sx={{
          p: 6,
          textAlign: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
        }}
      >
        <Box sx={{ mb: 4 }}>
          <FaFlask size={64} color="#ffd700" />
        </Box>

        <Typography variant="h4" gutterBottom>
          Logging Has Moved!
        </Typography>

        <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
          All logging is now handled through your active experiments
        </Typography>

        <Button
          component={Link}
          href="/active-experiments"
          variant="contained"
          size="large"
          endIcon={<FaArrowRight />}
          sx={{
            backgroundColor: "#ffd700",
            color: "#333",
            fontWeight: "bold",
            px: 4,
            py: 2,
            fontSize: "1.1rem",
            "&:hover": {
              backgroundColor: "#ffed4a",
              transform: "translateY(-2px)",
            },
            transition: "all 0.3s ease",
          }}
        >
          Go to Active Experiments
        </Button>

        <Typography variant="body2" sx={{ mt: 3, opacity: 0.8 }}>
          Redirecting automatically in 3 seconds...
        </Typography>
      </Paper>
    </Container>
  );
}
