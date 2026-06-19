import { useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { setAuthTokenGetter, syncApiSession } from "@/lib/api";

export function AuthSetup() {
  const { isSignedIn, getToken } = useAuth();

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
  }, [getToken]);

  useEffect(() => {
    if (!isSignedIn) return;
    void syncApiSession().catch(() => {
      // Retry on next navigation if API is temporarily unavailable.
    });
  }, [isSignedIn, getToken]);

  return null;
}
