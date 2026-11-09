"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export function Section({
  title,
  eyebrow,
  children,
  defaultOpen = true,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="border-b border-slate-200 bg-white">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-slate-50"
      >
        <span className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">{eyebrow}</span>
          <span className="text-[13px] font-semibold text-slate-800">{title}</span>
        </span>
        <ChevronDown className={`size-4 text-slate-400 transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && <div className="px-5 pb-4">{children}</div>}
    </section>
  );
}
