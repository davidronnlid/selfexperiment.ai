// src/pages/_app.tsx
import "@/styles/globals.css";
import "./log-datepicker.css";
import type { AppProps } from "next/app";
import Header from "@/components/header";
import {
  useEffect,
  useState,
  createContext,
  useContext,
  useCallback,
} from "react";
import { supabase } from "@/utils/supaBase";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/router";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// User context
export const UserContext = createContext<{
  user: User | null;
  loading: boolean;
  avatarUrl: string | null;
  refreshUser: () => Promise<void>;
}>({ user: null, loading: true, avatarUrl: null, refreshUser: async () => {} });
export const useUser = () => useContext(UserContext);

const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#111111",
      paper: "#181818",
    },
    text: {
      primary: "#fff",
      secondary: "#FFEA70",
    },
    primary: {
      main: "#FFD700",
      contrastText: "#111111",
    },
    secondary: {
      main: "#FFEA70",
      contrastText: "#111111",
    },
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily: "Inter, Arial, Helvetica, sans-serif",
  },
});

export default function App({ Component, pageProps }: AppProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();

  // Function to fetch user profile
  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", userId)
        .single();
      return profile?.avatar_url ?? null;
    } catch (profileError) {
      console.error("Error fetching profile:", profileError);
      return null;
    }
  }, []);

  // Function to refresh user data
  const refreshUser = useCallback(async () => {
    try {
      console.log("Refreshing user data...");
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        console.error("Auth error during refresh:", error);
        setUser(null);
        setAvatarUrl(null);
        localStorage.removeItem("sb-user-data");
        return;
      }

      console.log("Refresh auth data:", data);
      const currentUser = data?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        // Store user data in localStorage for persistence
        localStorage.setItem("sb-user-data", JSON.stringify(currentUser));

        // Fetch profile
        const avatar = await fetchUserProfile(currentUser.id);
        setAvatarUrl(avatar);
      } else {
        setAvatarUrl(null);
        localStorage.removeItem("sb-user-data");
      }
    } catch (err) {
      console.error("Error refreshing user:", err);
      setUser(null);
      setAvatarUrl(null);
      localStorage.removeItem("sb-user-data");
    }
  }, [fetchUserProfile]);

  // Function to initialize user from localStorage or fresh auth check
  const initializeUser = useCallback(async () => {
    try {
      console.log("Initializing user authentication...");

      // Try to get user from localStorage first (for faster initial load)
      const storedUser = localStorage.getItem("sb-user-data");
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          console.log("Found stored user data:", parsedUser.id);
          setUser(parsedUser);

          // Fetch profile for stored user
          const avatar = await fetchUserProfile(parsedUser.id);
          setAvatarUrl(avatar);
        } catch (parseError) {
          console.error("Error parsing stored user data:", parseError);
          localStorage.removeItem("sb-user-data");
        }
      }

      // Always verify with fresh auth check
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        console.error("Auth error during initialization:", error);
        setUser(null);
        setAvatarUrl(null);
        localStorage.removeItem("sb-user-data");
        return;
      }

      console.log("Fresh auth data:", data);
      const currentUser = data?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        // Update stored user data
        localStorage.setItem("sb-user-data", JSON.stringify(currentUser));

        // Fetch profile
        const avatar = await fetchUserProfile(currentUser.id);
        setAvatarUrl(avatar);
      } else {
        console.log("No user found");
        setAvatarUrl(null);
        localStorage.removeItem("sb-user-data");
      }
    } catch (err) {
      console.error("Error initializing user:", err);
      setUser(null);
      setAvatarUrl(null);
      localStorage.removeItem("sb-user-data");
    } finally {
      console.log("Setting loading to false");
      setLoading(false);
      setInitialized(true);
    }
  }, [fetchUserProfile]);

  // Initialize user on app startup
  useEffect(() => {
    initializeUser();
  }, [initializeUser]);

  // Set up auth state change listener
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event, session?.user?.id);

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          // Update stored user data
          localStorage.setItem("sb-user-data", JSON.stringify(currentUser));

          // Fetch profile
          const avatar = await fetchUserProfile(currentUser.id);
          setAvatarUrl(avatar);
        } else {
          setAvatarUrl(null);
          localStorage.removeItem("sb-user-data");
        }

        // Reset loading state if auth state changes after initialization
        if (initialized) {
          setLoading(false);
        }
      }
    );

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, [initialized, fetchUserProfile]);

  // Auto-refresh user data periodically to prevent stale sessions
  useEffect(() => {
    if (!initialized) return;

    const interval = setInterval(() => {
      if (user) {
        console.log("Periodic user refresh check");
        refreshUser();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, [initialized, user, refreshUser]);

  // Redirect to /complete-profile if profile is incomplete
  useEffect(() => {
    if (!loading && user) {
      // Don't run on /complete-profile or /auth
      if (["/complete-profile", "/auth"].includes(router.pathname)) return;

      supabase
        .from("profiles")
        .select("username, name, date_of_birth")
        .eq("id", user.id)
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.error("Error checking profile completeness:", error);
            return;
          }

          if (!data || !data.username || !data.name || !data.date_of_birth) {
            router.push("/complete-profile");
          }
        });
    }
  }, [user, loading, router]);

  // Redirect to /auth if user is not authenticated (for protected routes)
  useEffect(() => {
    if (!loading && !user) {
      // Define routes that require authentication
      const protectedRoutes = [
        "/log",
        "/experiment/builder",
        "/experiment/active-experiments",
        "/experiment/completed-experiments",
        "/analytics",
        "/profile",
        "/community",
        "/dashboard",
      ];

      // Check if current route is protected
      const isProtectedRoute = protectedRoutes.some((route) =>
        router.pathname.startsWith(route)
      );

      // Don't redirect if already on auth page or landing page
      if (isProtectedRoute && router.pathname !== "/auth") {
        console.log("Redirecting unauthenticated user to auth page");
        router.push("/auth");
      }
    }
  }, [user, loading, router]);

  return (
    <UserContext.Provider value={{ user, loading, avatarUrl, refreshUser }}>
      <ThemeProvider theme={theme}>
        <Header />
        <main className="p-4">
          <Component {...pageProps} />
        </main>
      </ThemeProvider>
    </UserContext.Provider>
  );
}
