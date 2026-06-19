import { Link, useLocation } from "react-router-dom";
import { SquaresFour, Plus } from "@phosphor-icons/react";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";

export function AppHeader() {
  const { pathname } = useLocation();
  const isDashboard = pathname === "/dashboard";

  return (
    <header className="sticky top-0 z-50 bg-transparent">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="font-heading text-[15px] font-semibold tracking-tight text-foreground">
          Relay
        </Link>
        <nav className="flex items-center gap-2">
          <SignedIn>
            {!isDashboard && (
              <>
                <Button variant="ghost" size="sm" className="hidden text-muted-foreground sm:inline-flex" asChild>
                  <Link to="/dashboard">
                    <SquaresFour />
                    Dashboard
                  </Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/publish">
                    <Plus />
                    New
                  </Link>
                </Button>
              </>
            )}
            <UserButton afterSignOutUrl="/" userProfileMode="modal" />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button size="sm">Get started</Button>
            </SignUpButton>
          </SignedOut>
        </nav>
      </div>
    </header>
  );
}

export function PageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className={className ?? "flex-1"}>{children}</main>
    </div>
  );
}
