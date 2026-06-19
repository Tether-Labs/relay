import { SignUp } from "@clerk/clerk-react";
import { PageShell } from "@/components/layout/app-header";

export function SignUpPage() {
  return (
    <PageShell>
      <div className="mx-auto flex max-w-md flex-col items-center px-6 py-16">
        <SignUp routing="path" path="/sign-up" signInUrl="/login" forceRedirectUrl="/dashboard" />
      </div>
    </PageShell>
  );
}
