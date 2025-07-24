"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/utils/supaBase";
import {
  Container,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  Divider,
  Alert,
  CircularProgress,
} from "@mui/material";
import { FaGoogle, FaEye, FaEyeSlash } from "react-icons/fa";

export default function Auth() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    // Check for mode parameter and set signup as default
    const { mode } = router.query;
    if (mode === 'signup') {
      setIsSignUp(true);
    }

    // Check if user is already authenticated
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        // Check for stored correlation intent and redirect accordingly
        const correlationIntent = localStorage.getItem('correlationIntent');
        if (correlationIntent) {
          try {
            const intent = JSON.parse(correlationIntent);
            // Don't clear localStorage here - let the track/manual page handle it
            // Redirect to track/manual with the stored variables
            router.push(`/track/manual?var1=${encodeURIComponent(intent.variable1)}&var2=${encodeURIComponent(intent.variable2)}`);
          } catch (error) {
            console.error('Error parsing correlation intent:', error);
            localStorage.removeItem('correlationIntent'); // Clear invalid data
            router.push("/track/manual");
          }
        } else {
          router.push("/track/manual");
        }
      }
    };
    checkUser();
  }, [router]);

  const handleGoogleSignIn = async () => {
    console.log("Starting Google OAuth...");
    console.log("Current origin:", window.location.origin);
    console.log("NODE_ENV:", process.env.NODE_ENV);

    // Check if we have correlation intent to preserve
    const correlationIntent = localStorage.getItem('correlationIntent');
    let redirectUrl = `${window.location.origin}/track/manual`;
    
    if (correlationIntent) {
      try {
        const intent = JSON.parse(correlationIntent);
        redirectUrl = `${window.location.origin}/track/manual?var1=${encodeURIComponent(intent.variable1)}&var2=${encodeURIComponent(intent.variable2)}`;
      } catch (error) {
        console.error('Error parsing correlation intent for OAuth:', error);
        localStorage.removeItem('correlationIntent');
      }
    }

    console.log("Redirect URL:", redirectUrl);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    if (error) {
      console.error("Error signing in with Google:", error);
      setError("Failed to sign in with Google. Please try again.");
    } else {
      console.log("OAuth initiated successfully, redirectTo:", redirectUrl);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (isSignUp && password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/track/manual`,
          },
        });
        if (error) {
          setError(error.message);
        } else {
          setSuccess(
            "Check your email for a confirmation link to complete your registration."
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setError(error.message);
        } else {
          router.push("/track/manual");
        }
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    resetForm();
  };

  return (
    <Container
      maxWidth="sm"
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
            className="mb-6 text-gold text-center font-medium text-lg lg:text-xl"
          >
            {isSignUp ? "Create your account" : "Sign in to continue"}
          </Typography>
          <Typography
            variant="body1"
            className="mb-8 text-text-secondary text-center leading-relaxed text-sm lg:text-base"
          >
            {isSignUp
              ? "Join us to start tracking your health and discovering insights about yourself."
              : "Choose your preferred sign-in method to access your personalized health tracking."}
          </Typography>

          <Box className="flex flex-col gap-4 w-full max-w-sm">
            {/* Google Sign In */}
            <Button
              variant="contained"
              onClick={handleGoogleSignIn}
              className="w-full text-lg py-3 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl bg-white text-gray-800 hover:bg-gray-100"
              size="large"
              fullWidth
              startIcon={<FaGoogle className="text-red-500" />}
            >
              Continue with Google
            </Button>

            <Divider className="my-4">
              <Typography variant="body2" className="text-text-muted px-4">
                or
              </Typography>
            </Divider>

            {/* Email/Password Form */}
            <Box
              component="form"
              onSubmit={handleEmailAuth}
              className="flex flex-col gap-4"
            >
              {error && (
                <Alert severity="error" className="mb-4">
                  {error}
                </Alert>
              )}
              {success && (
                <Alert severity="success" className="mb-4">
                  {success}
                </Alert>
              )}

              <TextField
                type="email"
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                fullWidth
                variant="outlined"
                className="bg-surface-light"
                InputProps={{
                  style: { color: "white" },
                }}
                InputLabelProps={{
                  style: { color: "#9CA3AF" },
                }}
              />

              <TextField
                type={showPassword ? "text" : "password"}
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
                variant="outlined"
                className="bg-surface-light"
                InputProps={{
                  style: { color: "white" },
                  endAdornment: (
                    <Button
                      onClick={() => setShowPassword(!showPassword)}
                      className="min-w-0 p-2"
                      style={{ color: "#9CA3AF" }}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </Button>
                  ),
                }}
                InputLabelProps={{
                  style: { color: "#9CA3AF" },
                }}
              />

              {isSignUp && (
                <TextField
                  type={showConfirmPassword ? "text" : "password"}
                  label="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  fullWidth
                  variant="outlined"
                  className="bg-surface-light"
                  InputProps={{
                    style: { color: "white" },
                    endAdornment: (
                      <Button
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="min-w-0 p-2"
                        style={{ color: "#9CA3AF" }}
                      >
                        {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                      </Button>
                    ),
                  }}
                  InputLabelProps={{
                    style: { color: "#9CA3AF" },
                  }}
                />
              )}

              <Button
                type="submit"
                variant="outlined"
                disabled={loading}
                className="w-full text-lg py-3 rounded-lg transition-all duration-200 border-gold text-gold hover:bg-gold hover:text-gray-900"
                size="large"
                fullWidth
              >
                {loading ? (
                  <CircularProgress size={24} className="text-gold" />
                ) : isSignUp ? (
                  "Sign Up"
                ) : (
                  "Sign In"
                )}
              </Button>
            </Box>

            {/* Toggle between Sign In and Sign Up */}
            <Box className="text-center mt-4">
              <Typography variant="body2" className="text-text-muted">
                {isSignUp
                  ? "Already have an account?"
                  : "Don't have an account?"}
              </Typography>
              <Button
                onClick={toggleMode}
                className="text-gold hover:text-gold-light mt-2"
                variant="text"
              >
                {isSignUp ? "Sign In" : "Sign Up"}
              </Button>
            </Box>

            <Typography
              variant="body2"
              className="text-text-muted text-center mt-6 text-xs lg:text-sm"
            >
              By signing in, you agree to our terms of service and privacy
              policy
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
