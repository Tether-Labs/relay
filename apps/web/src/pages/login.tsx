import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageShell } from "@/components/layout/app-header";
import { sendMagicLink } from "@/lib/api";

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    const next = searchParams.get("next") ?? undefined;
    try {
      const data = await sendMagicLink(email, next);
      setStatus(data.message);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell>
      <div className="mx-auto flex max-w-md flex-col px-6 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Magic link — no password. Check your email or the server terminal.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : <Mail />}
                Send magic link
              </Button>
            </form>
            {status && (
              <p className="mt-4 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">{status}</p>
            )}
            <Button variant="ghost" className="mt-4 w-full" onClick={() => navigate("/")}>
              Back home
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
