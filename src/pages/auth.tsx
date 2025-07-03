"use client";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/utils/supaBase";

export default function AuthPage() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }}
        providers={["google"]}
        redirectTo={typeof window !== "undefined" ? window.location.origin : ""}
      />
    </div>
  );
}

export const getServerSideProps = async () => {
  return { props: {} };
};
