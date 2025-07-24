import Link from "next/link";
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Container,
} from "@mui/material";
import { useUser } from "./_app";
import { useRouter } from "next/router";
import { useEffect } from "react";
import LandingPage from "./landing-page";

export default function Home() {
  const { user, loading } = useUser();
  const router = useRouter();

  // If user is authenticated, redirect to log/now page
  useEffect(() => {
    if (!loading && user) {
      router.push("/track/manual");
    }
  }, [user, loading, router]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <Container
        maxWidth="sm"
        className="flex items-center justify-center min-h-screen px-4"
      >
        <Card className="w-full shadow-2xl border border-border bg-surface/95 backdrop-blur-sm">
          <CardContent className="flex flex-col items-center p-6 lg:p-8">
            <Box className="animate-pulse">
              <Typography
                variant="h5"
                className="font-bold text-white mb-4 tracking-tight text-center"
              >
                Loading...
              </Typography>
              <Box className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto"></Box>
            </Box>
          </CardContent>
        </Card>
      </Container>
    );
  }

  // Show landing page for unauthenticated users
  if (!user) {
    return <LandingPage />;
  }

  // This shouldn't be reached due to the redirect above, but just in case
  return (
    <Container
      maxWidth="md"
      className="flex items-center justify-center min-h-screen px-4"
    >
      <Card className="w-full shadow-2xl border border-border bg-surface/95 backdrop-blur-sm">
        <CardContent className="flex flex-col items-center p-6 lg:p-8">
          <Typography
            variant="h3"
            className="font-bold text-white mb-4 tracking-tight text-center bg-gradient-to-r from-gold to-gold-light bg-clip-text text-transparent text-2xl lg:text-3xl"
            component="h1"
          >
            Modular Health
          </Typography>
          <Typography
            variant="h6"
            className="mb-8 text-gold text-center font-medium text-lg lg:text-xl"
          >
            Welcome back! What would you like to do today?
          </Typography>
          <Box className="flex flex-col gap-4 w-full max-w-sm">
            <Link href="/track/manual" passHref>
              <Button
                variant="contained"
                className="w-full text-lg py-3 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl"
                size="large"
                fullWidth
              >
                Track Now
              </Button>
            </Link>
            <Link href="/analyze" passHref>
              <Button
                variant="outlined"
                className="w-full text-lg py-3 rounded-lg transition-all duration-200"
                size="large"
                fullWidth
              >
                Analyze
              </Button>
            </Link>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
