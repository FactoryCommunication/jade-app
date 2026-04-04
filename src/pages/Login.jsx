import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("login"); // "login" | "reset"
  const [resetSent, setResetSent] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await login(email, password);
    if (error) {
      setError("Email o password non corretti. Riprova.");
    }
    setLoading(false);
  }

  async function handleReset(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setError("Errore nell'invio email. Controlla l'indirizzo.");
    } else {
      setResetSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / Titolo */}
        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-primary">J</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">JADE</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {mode === "login" ? "Accedi al tuo account" : "Recupera password"}
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@esempio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Accesso in corso..." : "Accedi"}
              </Button>

              <button
                type="button"
                onClick={() => { setMode("reset"); setError(""); }}
                className="text-sm text-muted-foreground hover:text-foreground w-full text-center transition-colors"
              >
                Password dimenticata?
              </button>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              {resetSent ? (
                <div className="text-center py-4 space-y-3">
                  <div className="text-4xl">📧</div>
                  <p className="font-medium text-foreground">Email inviata!</p>
                  <p className="text-sm text-muted-foreground">
                    Controlla la tua casella e segui le istruzioni per reimpostare la password.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => { setMode("login"); setResetSent(false); }}
                  >
                    Torna al login
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="tu@esempio.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                      {error}
                    </p>
                  )}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Invio in corso..." : "Invia email di recupero"}
                  </Button>

                  <button
                    type="button"
                    onClick={() => { setMode("login"); setError(""); }}
                    className="text-sm text-muted-foreground hover:text-foreground w-full text-center transition-colors"
                  >
                    Torna al login
                  </button>
                </>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
