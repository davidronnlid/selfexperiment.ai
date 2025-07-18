import { useEffect } from "react";
import { useRouter } from "next/router";

export default function RoutinesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new auto tracking page
    router.replace("/track/auto");
  }, [router]);

  return null; // Component will redirect immediately
}
