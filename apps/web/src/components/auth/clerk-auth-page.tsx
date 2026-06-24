import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ClerkLoaded, ClerkLoading, SignIn, SignUp } from "@clerk/clerk-react";
import { PageShell } from "@/components/layout/app-header";
import { ClerkFormLoading } from "@/components/auth/clerk-form-loading";
import { useClerkSession } from "@/lib/use-clerk-session";

export function ClerkAuthPage({
  next,
  loadingLabel,
  mode,
  email,
}: {
  next: string;
  loadingLabel: string;
  mode: "sign-in" | "sign-up";
  email?: string;
}) {
  const navigate = useNavigate();
  const { isLoaded, ready, hasSession } = useClerkSession();

  useEffect(() => {
    if (!ready || !hasSession) return;
    const timer = window.setTimeout(() => {
      navigate(next, { replace: true });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [ready, hasSession, navigate, next]);

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-md flex-col items-center px-6 py-10 sm:py-16">
        {!isLoaded || !ready ? (
          <ClerkFormLoading label={loadingLabel} />
        ) : hasSession ? (
          <ClerkFormLoading label="Redirecting…" />
        ) : (
          <>
            <ClerkLoading>
              <ClerkFormLoading label={loadingLabel} />
            </ClerkLoading>
            <ClerkLoaded>
              {mode === "sign-in" ? (
                <SignIn
                  routing="path"
                  path="/login"
                  signUpUrl={`/sign-up?next=${encodeURIComponent(next)}`}
                  forceRedirectUrl={next}
                  initialValues={email ? { emailAddress: email } : undefined}
                />
              ) : (
                <SignUp
                  routing="path"
                  path="/sign-up"
                  signInUrl={`/login?next=${encodeURIComponent(next)}`}
                  forceRedirectUrl={next}
                />
              )}
            </ClerkLoaded>
          </>
        )}
      </div>
    </PageShell>
  );
}
