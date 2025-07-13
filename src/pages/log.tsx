import { useEffect } from "react";
import { useRouter } from "next/router";

export default function LogPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new log page location
    router.replace("/log/now");
  }, [router]);

  return null; // Component will redirect immediately
}
