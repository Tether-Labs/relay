import { useEffect } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { setAuthTokenGetter, setRelayEmailGetter, syncApiSession } from "@/lib/api";

export function AuthSetup() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    if (!isLoaded) return;
    setAuthTokenGetter(() => getToken());
  }, [isLoaded, getToken]);

  useEffect(() => {
    if (!isLoaded) return;
    setRelayEmailGetter(() => user?.primaryEmailAddress?.emailAddress ?? null);
  }, [isLoaded, user?.primaryEmailAddress?.emailAddress]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    void syncApiSession().catch((err) => {
      console.warn("API session sync failed:", err);
    });
  }, [isLoaded, isSignedIn, getToken, user?.primaryEmailAddress?.emailAddress]);

  return null;
}
