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
    void syncApiSession().catch((err) => {
      // Avoid toast spam during Clerk hydration; pages call ensureApiAuth when needed.
      console.warn("API session sync failed:", err);
    });
  }, [isSignedIn, getToken]);

  return null;
}
