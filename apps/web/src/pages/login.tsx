import { useSearchParams } from "react-router-dom";
import { ClerkAuthPage } from "@/components/auth/clerk-auth-page";
import { safeNextPath } from "@/lib/redirect";

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const email = searchParams.get("email") ?? undefined;

  return (
    <ClerkAuthPage
      next={next}
      loadingLabel="Loading sign in…"
      mode="sign-in"
      email={email}
    />
  );
}
