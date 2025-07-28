import Link from "next/link";
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Container,
  LinearProgress,
  Alert,
} from "@mui/material";
import { useUser } from "./_app";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import LandingPage from "./landing-page";

export default function Home() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [loadingStep, setLoadingStep] = useState("Initializing...");

  // If user is authenticated, redirect to log/now page
  useEffect(() => {
    if (!loading && user) {
      router.push("/track/manual");
    }
  }, [user, loading, router]);

  // Handle loading timeout
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (loading) {
      // Set timeout for 10 seconds
      timeoutId = setTimeout(() => {
        setLoadingTimeout(true);
      }, 10000);
      
      // Update loading step based on time elapsed
      const stepTimeouts = [
        { time: 2000, step: "Checking authentication..." },
        { time: 4000, step: "Loading profile data..." },
        { time: 6000, step: "Finalizing setup..." },
        { time: 8000, step: "Almost ready..." },
      ];
      
      stepTimeouts.forEach(({ time, step }) => {
        setTimeout(() => {
          if (loading) setLoadingStep(step);
        }, time);
      });
    } else {
      setLoadingTimeout(false);
      setLoadingStep("Initializing...");
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loading]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <Container
        maxWidth="sm"
        className="flex items-center justify-center min-h-screen px-4"
      >
        <Card className="w-full shadow-2xl border border-border bg-surface/95 backdrop-blur-sm">
          <CardContent className="flex flex-col items-center p-6 lg:p-8">
            <Box className="w-full">
              <Typography
                variant="h5"
                className="font-bold text-white mb-4 tracking-tight text-center"
              >
                {loadingTimeout ? "Taking longer than expected..." : "Loading Modular Health"}
              </Typography>
              
              <Typography
                variant="body2"
                color="text.secondary"
                className="text-center mb-4"
              >
                {loadingStep}
              </Typography>
              
              <LinearProgress 
                sx={{ 
                  mb: 3,
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: '#ffd700',
                  },
                }}
              />
              
              {loadingTimeout && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    The app is taking longer than usual to load. This might be due to a slow connection.
                  </Typography>
                </Alert>
              )}
              
              <Box className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto"></Box>
              
              {loadingTimeout && (
                <Box sx={{ mt: 3, textAlign: 'center' }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => window.location.reload()}
                    sx={{ color: '#ffd700', borderColor: '#ffd700' }}
                  >
                    Refresh Page
                  </Button>
                </Box>
              )}
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
