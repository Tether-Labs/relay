import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";

type ClerkSessionState = {
  /** Clerk finished its first auth check. */
  isLoaded: boolean;
  /** Waited for mobile session restoration — safe to branch on hasSession. */
  ready: boolean;
  /** User has a Clerk session (isSignedIn or a valid JWT). */
  hasSession: boolean;
};

/**
 * Mobile browsers (especially Chrome) can report isSignedIn=false briefly after
 * isLoaded=true while the session cookie is still being restored. Wait for a
 * token before treating the user as signed out.
 */
export function useClerkSession(): ClerkSessionState {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    if (!isLoaded) {
      setReady(false);
      setHasSession(false);
      return;
    }

    let cancelled = false;

    async function resolveSession() {
      if (isSignedIn) {
        if (!cancelled) {
          setHasSession(true);
          setReady(true);
        }
        return;
      }

      for (let attempt = 0; attempt < 30; attempt++) {
        const token = await getToken();
        if (token) {
          if (!cancelled) {
            setHasSession(true);
            setReady(true);
          }
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      if (!cancelled) {
        setHasSession(false);
        setReady(true);
      }
    }

    void resolveSession();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken]);

  return { isLoaded, ready, hasSession };
}
