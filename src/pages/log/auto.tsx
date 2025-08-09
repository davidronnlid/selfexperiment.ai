import { useEffect } from "react";
import { Container, Typography, Box } from "@mui/material";
import { useUser } from "../_app";
import { useRouter } from "next/router";
import RoutineManager from "@/components/RoutineManager";
import Head from "next/head";

export default function AutoTrackPage() {
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
    <>
      <Head>
        <title>Auto-tracking - Modular Health</title>
        <meta
          name="description"
          content="Set up automated tracking routines for your daily variables"
        />
      </Head>
      <Container maxWidth="lg" sx={{ py: 4, minHeight: "100vh" }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom>
            🤖 Auto-tracking
          </Typography>
          <Typography variant="h6" className="text-gray-300 mb-6">
            Automate your daily tracking with custom routines
          </Typography>
          <Typography variant="body1" className="text-gray-400 mb-8">
            Set up routines to automatically track values for your tracked
            variables every day. You can always manually override any
            auto-tracked value when needed.
          </Typography>
        </Box>

        <RoutineManager />
      </Container>
    </>
  );
}
