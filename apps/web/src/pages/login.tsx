import { useSearchParams } from "react-router-dom";
import { SignIn } from "@clerk/clerk-react";
import { PageShell } from "@/components/layout/app-header";

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const email = searchParams.get("email") ?? undefined;

  return (
    <PageShell>
      <div className="mx-auto flex max-w-md flex-col items-center px-6 py-16">
        <SignIn
          routing="path"
          path="/login"
          signUpUrl="/sign-up"
          forceRedirectUrl={next}
          initialValues={email ? { emailAddress: email } : undefined}
        />
      </div>
    </PageShell>
  );
}
