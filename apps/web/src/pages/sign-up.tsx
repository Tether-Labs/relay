import { useSearchParams } from "react-router-dom";
import { SignUp } from "@clerk/clerk-react";
import { PageShell } from "@/components/layout/app-header";
import { safeNextPath } from "@/lib/redirect";

export function SignUpPage() {
  const [searchParams] = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));

  return (
    <PageShell>
      <div className="mx-auto flex max-w-md flex-col items-center px-6 py-16">
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl={`/login?next=${encodeURIComponent(next)}`}
          forceRedirectUrl={next}
        />
      </div>
    </PageShell>
  );
}
