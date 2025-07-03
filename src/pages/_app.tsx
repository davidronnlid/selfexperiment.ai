// src/pages/_app.tsx
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Header from "@/components/header";
import { useEffect, useState, createContext, useContext } from "react";
import { supabase } from "@/utils/supaBase";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/router";

// User context
export const UserContext = createContext<{
  user: User | null;
  loading: boolean;
}>({ user: null, loading: true });
export const useUser = () => useContext(UserContext);

export default function App({ Component, pageProps }: AppProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user ?? null);
      setLoading(false);
    };
    getUser();
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
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
    <UserContext.Provider value={{ user, loading }}>
      <Header />
      <main className="p-4">
        <Component {...pageProps} />
      </main>
    </UserContext.Provider>
  );
}
