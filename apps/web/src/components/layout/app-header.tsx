import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/api";
import type { User } from "@/lib/api";

export function AppHeader({ user }: { user?: User | null }) {
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="text-[15px] font-semibold tracking-tight text-foreground">
          Relay
        </Link>
        <nav className="flex items-center gap-1">
          {user ? (
            <>
              <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
                <Link to="/dashboard">Dashboard</Link>
              </Button>
              <Button variant="outline" size="sm" className="bg-card" onClick={handleLogout}>
                Sign out
              </Button>
            </>
          ) : (
            <Button size="sm" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}

export function PageShell({
  children,
  user,
  className,
}: {
  children: React.ReactNode;
  user?: User | null;
  className?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader user={user} />
      <main className={className ?? "flex-1"}>{children}</main>
    </div>
  );
}
