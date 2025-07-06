"use client";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/utils/supaBase";
import { useUser } from "./_app";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { Typography, Card, CardContent } from "@mui/material";

export default function AuthPage() {
  const { user, loading } = useUser();
  const router = useRouter();

  // Redirect authenticated users to the main app
  useEffect(() => {
    if (!loading && user) {
      router.push("/log");
    }
  }, [user, loading, router]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-8">
            <Typography variant="h6">Loading...</Typography>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show auth form for unauthenticated users
  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md">
          <Card className="mb-4">
            <CardContent className="text-center p-6">
              <Typography variant="h4" gutterBottom>
                Welcome to SelfExperiment.AI
              </Typography>
              <Typography variant="body1" color="textSecondary">
                Sign in to start tracking your experiments and discovering
                insights about yourself.
              </Typography>
            </CardContent>
          </Card>
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            providers={["google"]}
            redirectTo={
              typeof window !== "undefined" ? window.location.origin : ""
            }
          />
        </div>
      </div>
    );
  }

  // This shouldn't be reached due to the redirect above
  return null;
}
