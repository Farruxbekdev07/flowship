"use client";

import Link from "next/link";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { getFirebaseAuth } from "@/infrastructure/firebase/client";

export function AccountMenu() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) return <span className="text-xs text-slate-400">Checking account…</span>;
  if (!user) return <Link href="/auth/login" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-cyan-700"><LogIn className="size-4"/> Sign in</Link>;

  async function handleSignOut() {
    await signOut(getFirebaseAuth());
    router.push("/workspace");
  }

  return <div className="flex items-center gap-3 text-sm"><Link href="/workspace/shipments" className="inline-flex items-center gap-1.5 text-slate-600 hover:text-cyan-700"><UserRound className="size-4"/> {user.displayName || user.email || "Account"}</Link><button onClick={handleSignOut} className="inline-flex items-center gap-1 text-slate-500 hover:text-red-600"><LogOut className="size-4"/><span className="hidden sm:inline">Sign out</span></button></div>;
}
