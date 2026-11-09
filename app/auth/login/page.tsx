"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { ArrowLeft, Loader2, LockKeyhole } from "lucide-react";
import { getFirebaseAuth } from "@/infrastructure/firebase/client";
import { useAuth } from "@/lib/auth/auth-context";

function getReturnTo() {
  if (typeof window === "undefined") return "/workspace/shipments";
  const value = new URLSearchParams(window.location.search).get("returnTo");
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/workspace/shipments";
}

function readableError(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) return "Email or password is incorrect.";
  if (code.includes("too-many-requests")) return "Too many attempts. Please wait and try again.";
  return error instanceof Error ? error.message : "Could not sign in. Please try again.";
}

export default function LoginPage() {
  const router = useRouter();
  const { configured, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => { if (user) router.replace(getReturnTo()); }, [user, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
      router.replace(getReturnTo());
    } catch (err) { setError(readableError(err)); }
    finally { setBusy(false); }
  }

  async function resetPassword() {
    if (!email.trim()) { setError("Enter your email first, then choose reset password."); return; }
    setError(""); setMessage("");
    try { await sendPasswordResetEmail(getFirebaseAuth(), email.trim()); setMessage("Password reset email sent. Check your inbox."); }
    catch (err) { setError(readableError(err)); }
  }

  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12 text-slate-900"><div className="w-full max-w-md"><Link href="/workspace" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-cyan-700"><ArrowLeft className="size-4"/> Continue as guest</Link><section className="rounded-2xl border bg-white p-7 shadow-sm"><div className="flex size-11 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700"><LockKeyhole className="size-5"/></div><h1 className="mt-5 text-2xl font-bold">Sign in to FreightFlow</h1><p className="mt-2 text-sm leading-6 text-slate-600">An account is only needed to save shipment history and access your cloud workspace. You can use document tools without signing in.</p>
    {!configured ? <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Firebase is not configured yet. Add the Firebase environment variables from <code>.env.example</code> to <code>.env.local</code>, then restart the development server.</div> : <form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-sm font-medium">Email<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-normal outline-none focus:border-cyan-600" placeholder="you@company.com"/></label><label className="block text-sm font-medium">Password<input type="password" required minLength={6} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-normal outline-none focus:border-cyan-600" placeholder="Your password"/></label>{error && <p role="alert" className="text-sm text-red-600">{error}</p>}{message && <p role="status" className="text-sm text-emerald-700">{message}</p>}<button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{busy && <Loader2 className="size-4 animate-spin"/>}Sign in</button><button type="button" onClick={resetPassword} className="w-full text-sm text-slate-500 hover:text-cyan-700">Forgot password?</button></form>}
    <p className="mt-6 border-t pt-5 text-center text-sm text-slate-600">New to FreightFlow? <Link href={`/auth/register?returnTo=${encodeURIComponent(getReturnTo())}`} className="font-semibold text-cyan-700 hover:text-cyan-900">Create an account</Link></p></section></div></main>;
}
