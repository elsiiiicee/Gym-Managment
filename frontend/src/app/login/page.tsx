"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Shield } from "lucide-react";
import { api, setAuth, type AuthTokens } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LegionMark } from "@/components/brand/legion-mark";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const tokens = await api.post<AuthTokens>("/api/auth/login", {
        email,
        password,
      });
      setAuth({ ...tokens, email });
      toast.success(`Welcome back, ${email}`);
      // Admins go to the admin panel. Members/trainers go to /me.
      router.replace(tokens.role === "ADMIN" ? "/admin" : "/me");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen w-full flex bg-background">
      {/* Brand panel */}
      <div className="hidden lg:flex relative w-1/2 overflow-hidden text-white">
        <div className="absolute inset-0 conic-mesh" />
        <div className="absolute inset-0 grid-pattern opacity-[0.08]" />
        <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-white/10 blur-3xl animate-float" />
        <div
          className="pointer-events-none absolute -bottom-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-pink-400/30 blur-3xl animate-float"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="pointer-events-none absolute top-1/3 right-10 h-72 w-72 rounded-full bg-orange-300/20 blur-3xl animate-float"
          style={{ animationDelay: "4s" }}
        />

        <div className="relative z-10 flex w-full flex-col items-center justify-center px-12 text-center">
          <div className="flex items-center gap-2.5 animate-fade-in">
            <LegionMark size={48} tone="ghost" />
            <span
              className="text-xl font-extrabold tracking-tight"
              style={{ letterSpacing: "-0.02em" }}
            >
              Legion
            </span>
          </div>

          <h1
            className="mt-10 max-w-md text-4xl font-extrabold tracking-tight leading-[1.05] animate-fade-up md:text-5xl"
            style={
              {
                animationDelay: ".1s",
                textWrap: "balance",
              } as React.CSSProperties
            }
          >
            Own the floor. Run a stronger gym.
          </h1>
          <p
            className="mt-4 max-w-md text-white/80 leading-relaxed animate-fade-up"
            style={
              {
                animationDelay: ".15s",
                textWrap: "pretty",
              } as React.CSSProperties
            }
          >
            Members, classes, trainers, and revenue — in one place, calmly
            arranged. Built for owners who&apos;d rather coach than wrangle
            spreadsheets.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center justify-center gap-2.5 lg:hidden">
            <LegionMark size={40} />
            <span
              className="text-xl font-extrabold tracking-tight"
              style={{ letterSpacing: "-0.02em" }}
            >
              Legion
            </span>
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              Welcome back
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to manage your gym.
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
              <Shield className="h-3 w-3" />
              Accounts are created by your gym admin
            </div>
          </div>

          <form className="mt-8 flex flex-col gap-4" onSubmit={onSubmit}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@gym.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password">Password</Label>
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:underline"
                  onClick={() =>
                    toast.message("Contact your admin to reset your password.")
                  }
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                  aria-label="Toggle password visibility"
                >
                  {showPw ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={submitting}
              className="mt-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              By signing in you agree to Legion&apos;s{" "}
              <a href="#" className="text-foreground hover:underline">
                Terms
              </a>{" "}
              and{" "}
              <a href="#" className="text-foreground hover:underline">
                Privacy
              </a>
              .
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
