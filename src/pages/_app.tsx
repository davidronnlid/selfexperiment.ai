// src/pages/_app.tsx
import "@/styles/globals.css";
import "./log-datepicker.css";
import type { AppProps } from "next/app";
import Header from "@/components/header";
import InstallPrompt from "@/components/InstallPrompt";
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
import ErrorBoundary from "@/components/ErrorBoundary";
import { CssBaseline, Container, Box, Snackbar, Alert } from "@mui/material";

// User context
export const UserContext = createContext<{
  user: User | null;
  loading: boolean;
  avatarUrl: string | null;
  username: string | null;
  refreshUser: () => Promise<void>;
}>({
  user: null,
  loading: true,
  avatarUrl: null,
  username: null,
  refreshUser: async () => {},
});
export const useUser = () => useContext(UserContext);

const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#0a0a0a",
      paper: "#1a1a1a",
    },
    text: {
      primary: "#ffffff",
      secondary: "#b3b3b3",
    },
    primary: {
      main: "#ffd700",
      contrastText: "#000000",
    },
    secondary: {
      main: "#ffea70",
      contrastText: "#000000",
    },
    error: {
      main: "#ef4444",
    },
    warning: {
      main: "#f59e0b",
    },
    info: {
      main: "#3b82f6",
    },
    success: {
      main: "#10b981",
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily:
      "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    h1: {
      fontWeight: 700,
      fontSize: "2.5rem",
      lineHeight: 1.2,
    },
    h2: {
      fontWeight: 600,
      fontSize: "2rem",
      lineHeight: 1.3,
    },
    h3: {
      fontWeight: 600,
      fontSize: "1.75rem",
      lineHeight: 1.3,
    },
    h4: {
      fontWeight: 600,
      fontSize: "1.5rem",
      lineHeight: 1.4,
    },
    h5: {
      fontWeight: 600,
      fontSize: "1.25rem",
      lineHeight: 1.4,
    },
    h6: {
      fontWeight: 600,
      fontSize: "1.125rem",
      lineHeight: 1.4,
    },
    body1: {
      fontSize: "1rem",
      lineHeight: 1.6,
    },
    body2: {
      fontSize: "0.875rem",
      lineHeight: 1.5,
    },
    button: {
      textTransform: "none",
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: "none",
          fontWeight: 500,
          transition: "all 0.2s ease",
        },
        contained: {
          background: "linear-gradient(135deg, #ffd700 0%, #b8860b 100%)",
          color: "#000",
          boxShadow: "0 4px 12px rgba(255, 215, 0, 0.3)",
          "&:hover": {
            background: "linear-gradient(135deg, #ffea70 0%, #ffd700 100%)",
            boxShadow: "0 6px 16px rgba(255, 215, 0, 0.4)",
            transform: "translateY(-1px)",
          },
        },
        outlined: {
          borderColor: "#ffd700",
          color: "#ffd700",
          "&:hover": {
            background: "rgba(255, 215, 0, 0.1)",
            borderColor: "#ffea70",
            color: "#ffea70",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          background: "#1a1a1a",
          border: "1px solid #333333",
          borderRadius: 12,
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: "#1a1a1a",
          border: "1px solid #333333",
          borderRadius: 12,
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
          transition: "all 0.2s ease",
          "&:hover": {
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)",
            transform: "translateY(-2px)",
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 8,
            background: "#2a2a2a",
            border: "1px solid #333333",
            transition: "all 0.2s ease",
            "&:hover": {
              borderColor: "#ffd700",
            },
            "&.Mui-focused": {
              borderColor: "#ffd700",
              boxShadow: "0 0 0 2px rgba(255, 215, 0, 0.2)",
            },
          },
          "& .MuiInputLabel-root": {
            color: "#b3b3b3",
            "&.Mui-focused": {
              color: "#ffd700",
            },
          },
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          background: "#1a1a1a",
          borderRadius: 8,
          overflow: "hidden",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          background: "#0f0f0f",
          color: "#ffffff",
          fontWeight: 600,
          borderBottom: "2px solid #333333",
        },
        body: {
          color: "#b3b3b3",
          borderBottom: "1px solid #444444",
          padding: "16px",
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:hover": {
            background: "#2a2a2a",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          fontWeight: 500,
          transition: "all 0.2s ease",
          "&:hover": {
            transform: "translateY(-1px)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          border: "1px solid",
        },
        standardSuccess: {
          background: "rgba(16, 185, 129, 0.1)",
          borderColor: "#10b981",
          color: "#10b981",
        },
        standardWarning: {
          background: "rgba(245, 158, 11, 0.1)",
          borderColor: "#f59e0b",
          color: "#f59e0b",
        },
        standardError: {
          background: "rgba(239, 68, 68, 0.1)",
          borderColor: "#ef4444",
          color: "#ef4444",
        },
        standardInfo: {
          background: "rgba(59, 130, 246, 0.1)",
          borderColor: "#3b82f6",
          color: "#3b82f6",
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          transition: "all 0.2s ease",
          "&:hover": {
            background: "rgba(255, 215, 0, 0.1)",
            transform: "scale(1.05)",
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          background: "#0f0f0f",
          color: "#ffffff",
          borderRadius: 6,
          fontSize: "0.875rem",
          padding: "8px 12px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          background: "#1a1a1a",
          border: "1px solid #333333",
          borderRadius: 8,
          boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)",
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          color: "#b3b3b3",
          transition: "all 0.2s ease",
          "&:hover": {
            background: "#2a2a2a",
            color: "#ffd700",
          },
        },
      },
    },
  },
});

function AppWrapper({ Component, pageProps }: AppProps) {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!user || userLoading) return;
    const checkProfile = async () => {
      if (
        router.pathname === "/complete-profile" ||
        router.pathname.startsWith("/auth")
      )
        return;

      console.log("Checking profile completion for user:", user.id);
      const { data, error } = await supabase
        .from("profiles")
        .select("username, name")
        .eq("id", user.id)
        .single();

      console.log("Profile check result:", { data, error });

      if (!data || !data.username || !data.name) {
        console.log("Profile incomplete, redirecting to complete-profile");
        router.replace("/complete-profile");
      } else {
        console.log("Profile complete:", data);
      }
    };
    checkProfile();
  }, [user, userLoading, router]);

  return <Component {...pageProps} />;
}

export default function App({ Component, pageProps }: AppProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [autoLogNotification, setAutoLogNotification] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "warning" | "info";
  }>({
    open: false,
    message: "",
    severity: "success",
  });
  const router = useRouter();

  // Function to fetch user profile
  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("avatar_url, username")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        return { avatar_url: null, username: null };
      }

      return {
        avatar_url: profile?.avatar_url || null,
        username: profile?.username || null,
      };
    } catch (error) {
      console.error("Error in fetchUserProfile:", error);
      return { avatar_url: null, username: null };
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
        setUsername(null);
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
        const { avatar_url, username } = await fetchUserProfile(currentUser.id);
        setAvatarUrl(avatar_url);
        setUsername(username);
      } else {
        setAvatarUrl(null);
        setUsername(null);
        localStorage.removeItem("sb-user-data");
      }
    } catch (err) {
      console.error("Error refreshing user:", err);
      setUser(null);
      setAvatarUrl(null);
      setUsername(null);
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
          const { avatar_url, username } = await fetchUserProfile(
            parsedUser.id
          );
          setAvatarUrl(avatar_url);
          setUsername(username);
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
        setUsername(null);
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
        const { avatar_url, username } = await fetchUserProfile(currentUser.id);
        setAvatarUrl(avatar_url);
        setUsername(username);
      } else {
        console.log("No user found");
        setAvatarUrl(null);
        setUsername(null);
        localStorage.removeItem("sb-user-data");
      }
    } catch (err) {
      console.error("Error initializing user:", err);
      setUser(null);
      setAvatarUrl(null);
      setUsername(null);
      localStorage.removeItem("sb-user-data");
    } finally {
      console.log("Setting loading to false");
      setLoading(false);
      setInitialized(true);
    }
  }, [fetchUserProfile]);

  // Initialize user on mount
  useEffect(() => {
    if (!initialized) {
      initializeUser();
    }
  }, [initialized, initializeUser]);

  // Listen for auth state changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state change:", event, session?.user?.id);
      if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user);
        const { avatar_url, username } = await fetchUserProfile(
          session.user.id
        );
        setAvatarUrl(avatar_url);
        setUsername(username);
        localStorage.setItem("sb-user-data", JSON.stringify(session.user));
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setAvatarUrl(null);
        setUsername(null);
        localStorage.removeItem("sb-user-data");
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserProfile]);

  // Auto-refresh user data periodically
  useEffect(() => {
    if (user) {
      const interval = setInterval(refreshUser, 5 * 60 * 1000); // Refresh every 5 minutes
      return () => clearInterval(interval);
    }
  }, [user, refreshUser]);

  // Handle closing auto-log notification
  const handleCloseNotification = () => {
    setAutoLogNotification({ ...autoLogNotification, open: false });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <UserContext.Provider
          value={{
            user,
            loading,
            avatarUrl,
            username,
            refreshUser,
          }}
        >
          <InstallPrompt />
          <Box className="min-h-screen bg-background">
            <Header />
            <Box
              component="main"
              className="flex-1"
              sx={{
                minHeight: "calc(100vh - 64px)",
                display: "flex",
                flexDirection: "column",
                background: "var(--background)",
                position: "relative",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "1px",
                  background:
                    "linear-gradient(90deg, transparent, var(--gold), transparent)",
                  opacity: 0.3,
                },
              }}
            >
              <Container
                maxWidth="xl"
                className="flex-1 py-6 px-4 lg:py-8 lg:px-8"
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <AppWrapper Component={Component} pageProps={pageProps} />
              </Container>
            </Box>
          </Box>

          {/* Auto-log notification */}
          <Snackbar
            open={autoLogNotification.open}
            autoHideDuration={6000}
            onClose={handleCloseNotification}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          >
            <Alert
              onClose={handleCloseNotification}
              severity={autoLogNotification.severity}
              sx={{ width: "100%" }}
            >
              {autoLogNotification.message}
            </Alert>
          </Snackbar>
        </UserContext.Provider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
