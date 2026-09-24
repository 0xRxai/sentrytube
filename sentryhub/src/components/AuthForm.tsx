"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    if (isSignup) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/auth/callback`
              : undefined,
        },
      });
      setLoading(false);
      if (error) return setMsg(error.message);
      setMsg("Check your email to confirm your account, then log in.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) return setMsg(error.message);
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="mx-auto mt-10 max-w-sm">
      <h1 className="mb-1 text-2xl font-bold">
        {isSignup ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mb-6 text-sm text-neutral-400">
        {isSignup ? "Start sharing your Sentry footage." : "Log in to upload and follow tags."}
      </p>

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none focus:border-brand"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Password (min 6 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none focus:border-brand"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-brand py-2 font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {loading ? "..." : isSignup ? "Sign up" : "Log in"}
        </button>
      </form>

      {msg && <p className="mt-3 text-sm text-amber-400">{msg}</p>}

      <p className="mt-6 text-sm text-neutral-400">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-brand hover:underline">
              Log in
            </Link>
          </>
        ) : (
          <>
            No account?{" "}
            <Link href="/signup" className="text-brand hover:underline">
              Sign up
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
