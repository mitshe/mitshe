"use client";

import { useEffect, useState } from "react";
import { selfhostedAuth } from "@/lib/auth/selfhosted-auth";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Selfhosted auth page - shows setup form (first user) or login form.
 * Like Jenkins: first visit = create admin account, then only login.
 */
export function SelfhostedAuthPage() {
  const [isSetUp, setIsSetUp] = useState<boolean | null>(null);

  useEffect(() => {
    selfhostedAuth.getSetupStatus().then(({ isSetUp }) => setIsSetUp(isSetUp));
  }, []);

  if (isSetUp === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return isSetUp ? <LoginForm /> : <SetupForm />;
}

function SetupForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
  });

  const passwordValid = form.password.length >= 8;
  const passwordHasLetter = /[a-zA-Z]/.test(form.password);
  const passwordHasNumber = /[0-9]/.test(form.password);
  const passwordsMatch = form.password === form.confirmPassword;
  const canSubmit =
    form.email &&
    passwordValid &&
    passwordHasLetter &&
    passwordHasNumber &&
    passwordsMatch &&
    !isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await selfhostedAuth.register({
        email: form.email,
        password: form.password,
        firstName: form.firstName || undefined,
        lastName: form.lastName || undefined,
      });
      window.location.href = "/chat";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden">
      <span className="absolute bottom-0 left-0 right-0 text-center text-[28vw] font-brand font-bold text-foreground/[0.04] select-none pointer-events-none tracking-tighter leading-[0.7] translate-y-[25%]">
        mitshe
      </span>
      <div className="w-full max-w-sm relative">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome to <span className="font-brand">mitshe</span></h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Create your admin account to get started
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                value={form.firstName}
                onChange={(e) =>
                  setForm({ ...form, firstName: e.target.value })
                }
                placeholder="John"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                value={form.lastName}
                onChange={(e) =>
                  setForm({ ...form, lastName: e.target.value })
                }
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Min. 8 characters"
            />
            {form.password && (
              <div className="space-y-1 text-xs">
                <p className={passwordValid ? "text-green-600" : "text-muted-foreground"}>
                  {passwordValid ? "\u2713" : "\u2022"} At least 8 characters
                </p>
                <p className={passwordHasLetter ? "text-green-600" : "text-muted-foreground"}>
                  {passwordHasLetter ? "\u2713" : "\u2022"} Contains a letter
                </p>
                <p className={passwordHasNumber ? "text-green-600" : "text-muted-foreground"}>
                  {passwordHasNumber ? "\u2713" : "\u2022"} Contains a number
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              required
              value={form.confirmPassword}
              onChange={(e) =>
                setForm({ ...form, confirmPassword: e.target.value })
              }
            />
            {form.confirmPassword && !passwordsMatch && (
              <p className="text-xs text-destructive">
                Passwords do not match
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Create account"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await selfhostedAuth.login({
        email: form.email,
        password: form.password,
      });
      window.location.href = "/chat";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden">
      <span className="absolute bottom-0 left-0 right-0 text-center text-[28vw] font-brand font-bold text-foreground/[0.04] select-none pointer-events-none tracking-tighter leading-[0.7] translate-y-[25%]">
        mitshe
      </span>
      <div className="w-full max-w-sm relative">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Enter your credentials to continue
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Sign in"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
