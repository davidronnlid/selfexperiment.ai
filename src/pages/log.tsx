import { useEffect } from "react";
import { useRouter } from "next/router";

export default function LogPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new manual tracking page
    router.replace("/track/manual");
  }, [router]);

  return null; // Component will redirect immediately
}
