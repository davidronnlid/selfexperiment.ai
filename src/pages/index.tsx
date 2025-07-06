import Link from "next/link";
import { Card, CardContent, Typography, Button } from "@mui/material";
import { useUser } from "./_app";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function Home() {
  const { user, loading } = useUser();
  const router = useRouter();

  // If user is authenticated, redirect to dashboard or main app
  useEffect(() => {
    if (!loading && user) {
      router.push("/log");
    }
  }, [user, loading, router]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black">
        <Card className="w-full max-w-lg shadow-xl rounded-2xl border border-gray-700 bg-gray-800/90 backdrop-blur-sm">
          <CardContent className="flex flex-col items-center p-8">
            <Typography
              variant="h5"
              className="font-bold text-white mb-2 tracking-tight text-center"
            >
              Loading...
            </Typography>
          </CardContent>
        </Card>
      </main>
    );
  }

  // Show sign-in page for unauthenticated users
  if (!user) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black">
        <Card className="w-full max-w-lg shadow-xl rounded-2xl border border-gray-700 bg-gray-800/90 backdrop-blur-sm">
          <CardContent className="flex flex-col items-center p-8">
            <Typography
              variant="h3"
              className="font-bold text-white mb-2 tracking-tight text-center"
              component="h1"
            >
              SelfExperiment.AI
            </Typography>
            <Typography
              variant="subtitle1"
              className="mb-6 text-gray-200 text-center"
            >
              Understand yourself better with AI
            </Typography>
            <Typography
              variant="body1"
              className="mb-6 text-gray-300 text-center"
            >
              Sign in to start tracking your experiments, logging data, and
              discovering insights about yourself.
            </Typography>
            <div className="flex flex-col gap-4 w-full">
              <Link href="/auth" passHref legacyBehavior>
                <Button
                  variant="contained"
                  className="w-full !bg-blue-600 hover:!bg-blue-700 text-white text-lg py-3 rounded-lg shadow-md transition"
                  size="large"
                  fullWidth
                >
                  Sign In / Sign Up
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  // This shouldn't be reached due to the redirect above, but just in case
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black">
      <Card className="w-full max-w-lg shadow-xl rounded-2xl border border-gray-700 bg-gray-800/90 backdrop-blur-sm">
        <CardContent className="flex flex-col items-center p-8">
          <Typography
            variant="h3"
            className="font-bold text-white mb-2 tracking-tight text-center"
            component="h1"
          >
            SelfExperiment.AI
          </Typography>
          <Typography
            variant="subtitle1"
            className="mb-6 text-gray-200 text-center"
          >
            Understand yourself better with AI
          </Typography>
          <div className="flex flex-col gap-4 w-full">
            <Link href="/experiment/builder" passHref legacyBehavior>
              <Button
                variant="contained"
                className="w-full !bg-blue-600 hover:!bg-blue-700 text-white text-lg py-3 rounded-lg shadow-md transition"
                size="large"
                fullWidth
              >
                Build Experiment
              </Button>
            </Link>
            <Link href="/log" passHref legacyBehavior>
              <Button
                variant="outlined"
                color="secondary"
                className="w-full border-gray-400 text-gray-200 hover:!bg-gray-700 text-lg py-3 rounded-lg transition"
                size="large"
                fullWidth
              >
                Log Now
              </Button>
            </Link>
            <Link href="/analytics" passHref legacyBehavior>
              <Button
                variant="outlined"
                color="secondary"
                className="w-full border-gray-400 text-gray-200 hover:!bg-gray-700 text-lg py-3 rounded-lg transition"
                size="large"
                fullWidth
              >
                Analytics
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
