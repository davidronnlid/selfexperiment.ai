import { useEffect } from "react";
import { Container, Typography, Box } from "@mui/material";
import { useUser } from "../_app";
import { useRouter } from "next/router";
import RoutineManager from "@/components/RoutineManager";

export default function RoutinesPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/auth");
    }
  }, [user, userLoading, router]);

  if (userLoading) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  if (!user) {
    return null; // Will redirect to auth
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4, minHeight: "100vh" }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Daily Routines
        </Typography>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Automate your daily logging with custom routines
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Set up routines to automatically log values for your tracked variables
          every day. You can always manually override any auto-logged value when
          needed.
        </Typography>
      </Box>

      <RoutineManager />
    </Container>
  );
}
