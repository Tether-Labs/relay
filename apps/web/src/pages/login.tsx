import { useSearchParams } from "react-router-dom";
import { SignIn } from "@clerk/clerk-react";
import { PageShell } from "@/components/layout/app-header";
import { safeNextPath } from "@/lib/redirect";

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const email = searchParams.get("email") ?? undefined;

  return (
    <PageShell>
      <div className="mx-auto flex max-w-md flex-col items-center px-6 py-16">
        <SignIn
          routing="path"
          path="/login"
          signUpUrl={`/sign-up?next=${encodeURIComponent(next)}`}
          forceRedirectUrl={next}
          initialValues={email ? { emailAddress: email } : undefined}
        />
      </div>
    </PageShell>
  );
}
