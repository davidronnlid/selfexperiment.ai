// src/pages/_app.tsx
import "@/styles/globals.css";
import "./log-datepicker.css";
import type { AppProps } from "next/app";
import Header from "@/components/header";
import { useEffect, useState, createContext, useContext } from "react";
import { supabase } from "@/utils/supaBase";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/router";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// User context
export const UserContext = createContext<{
  user: User | null;
  loading: boolean;
  avatarUrl: string | null;
}>({ user: null, loading: true, avatarUrl: null });
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
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user ?? null);
      setLoading(false);
      // Fetch avatar_url from profiles if user exists
      if (data?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", data.user.id)
          .single();
        setAvatarUrl(profile?.avatar_url ?? null);
      } else {
        setAvatarUrl(null);
      }
    };
    getUser();
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("avatar_url")
            .eq("id", session.user.id)
            .single();
          setAvatarUrl(profile?.avatar_url ?? null);
        } else {
          setAvatarUrl(null);
        }
      }
    );
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

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
        .then(({ data }) => {
          if (!data || !data.username || !data.name || !data.date_of_birth) {
            router.push("/complete-profile");
          }
        });
    }
  }, [user, loading, router]);

  return (
    <UserContext.Provider value={{ user, loading, avatarUrl }}>
      <ThemeProvider theme={theme}>
        <Header />
        <main className="p-4">
          <Component {...pageProps} />
        </main>
      </ThemeProvider>
    </UserContext.Provider>
  );
}
