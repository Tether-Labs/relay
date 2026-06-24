import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import { shadcn } from "@clerk/ui/themes";
import { App } from "./App";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthSetup } from "@/components/auth/auth-setup";
import "./index.css";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim();

if (!publishableKey || publishableKey === "pk_test_..." || !/^pk_(test|live)_/.test(publishableKey)) {
  throw new Error(
    "Set a real Clerk publishable key in apps/web/.env as VITE_CLERK_PUBLISHABLE_KEY. " +
      "Get it from https://dashboard.clerk.com (app app_3FLOQzo2rjjCqmgDEJgYVfOK5Tv → API Keys). " +
      "Then restart the dev server.",
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={publishableKey}
      appearance={{ theme: shadcn }}
      signInUrl="/login"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    >
      <AuthSetup />
      <TooltipProvider>
        <App />
      </TooltipProvider>
      <Toaster position="bottom-right" richColors closeButton />
    </ClerkProvider>
  </StrictMode>,
);
