"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { ArrowLeft, Loader2, UserPlus } from "lucide-react";
import { getFirebaseAuth } from "@/infrastructure/firebase/client";
import { useAuth } from "@/lib/auth/auth-context";

function getReturnTo() {
  if (typeof window === "undefined") return "/workspace/shipments";
  const value = new URLSearchParams(window.location.search).get("returnTo");
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/workspace/shipments";
}

export default function RegisterPage() {
  const router = useRouter();
  const { configured, user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (user) router.replace(getReturnTo()); }, [user, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
      if (name.trim()) await updateProfile(credential.user, { displayName: name.trim() });
      router.replace(getReturnTo());
    } catch (err) {
      const code = typeof err === "object" && err && "code" in err ? String(err.code) : "";
      setError(code.includes("email-already-in-use") ? "An account with this email already exists. Sign in instead." : code.includes("weak-password") ? "Choose a stronger password (at least 6 characters)." : err instanceof Error ? err.message : "Could not create your account.");
    } finally { setBusy(false); }
  }

  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12 text-slate-900"><div className="w-full max-w-md"><Link href="/workspace" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-cyan-700"><ArrowLeft className="size-4"/> Continue as guest</Link><section className="rounded-2xl border bg-white p-7 shadow-sm"><div className="flex size-11 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700"><UserPlus className="size-5"/></div><h1 className="mt-5 text-2xl font-bold">Create your FreightFlow account</h1><p className="mt-2 text-sm leading-6 text-slate-600">Save shipments and access your history from any device. Registration is optional; document conversion remains available to guests.</p>
    {!configured ? <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Firebase is not configured yet. Add the Firebase environment variables from <code>.env.example</code> to <code>.env.local</code>, then restart the development server.</div> : <form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-sm font-medium">Name <span className="font-normal text-slate-400">(optional)</span><input value={name} onChange={e=>setName(e.target.value)} autoComplete="name" className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-normal outline-none focus:border-cyan-600" placeholder="Your name"/></label><label className="block text-sm font-medium">Email<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-normal outline-none focus:border-cyan-600" placeholder="you@company.com"/></label><label className="block text-sm font-medium">Password<input type="password" required minLength={6} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-normal outline-none focus:border-cyan-600" placeholder="At least 6 characters"/></label>{error && <p role="alert" className="text-sm text-red-600">{error}</p>}<button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{busy && <Loader2 className="size-4 animate-spin"/>}Create account</button></form>}
    <p className="mt-6 border-t pt-5 text-center text-sm text-slate-600">Already have an account? <Link href={`/auth/login?returnTo=${encodeURIComponent(getReturnTo())}`} className="font-semibold text-cyan-700 hover:text-cyan-900">Sign in</Link></p></section></div></main>;
}
