import { useEffect } from "react";
import { useRouter } from "next/router";

export default function RoutinesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new routines page location
    router.replace("/log/routines");
  }, [router]);

  return null; // Component will redirect immediately
}
