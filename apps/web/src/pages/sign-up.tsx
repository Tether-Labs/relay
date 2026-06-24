import { useSearchParams } from "react-router-dom";
import { ClerkAuthPage } from "@/components/auth/clerk-auth-page";
import { safeNextPath } from "@/lib/redirect";

export function SignUpPage() {
  const [searchParams] = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));

  return (
    <ClerkAuthPage next={next} loadingLabel="Loading sign up…" mode="sign-up" />
  );
}
