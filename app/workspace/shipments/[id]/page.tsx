"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FileText, MapPin, Package, CalendarDays, Pencil, Save, Loader2, Download } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { AuthRequired } from "@/components/auth/auth-required";
import { AccountMenu } from "@/components/account/account-menu";
import { createShipmentService } from "@/infrastructure/firebase/repositories";
import { FirebaseFileStorage } from "@/infrastructure/firebase/firebase-file-storage";
import type { Shipment, ShipmentStatus } from "@/core/entities/shipment";

const statuses: ShipmentStatus[] = ["Draft", "Processing", "Validated", "Completed"];
export default function ShipmentDetailPage() {
  const params = useParams<{ id: string }>();
  const { user, loading: authLoading, configured } = useAuth();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openingFile, setOpeningFile] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title: "", reference: "", shipper: "", consignee: "", destination: "", status: "Draft" as ShipmentStatus });

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError("");
    try {
      const found = await createShipmentService().get(user.uid, params.id);
      setShipment(found);
      if (found) setForm({ title: found.title, reference: found.reference, shipper: found.shipper, consignee: found.consignee, destination: found.destination, status: found.status });
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load shipment."); }
    finally { setLoading(false); }
  }, [user, params.id]);

  useEffect(() => { if (user) void load(); }, [user, load]);

  async function openOriginalFile(path: string, name: string) {
    setOpeningFile(path); setError("");
    try {
      const url = await new FirebaseFileStorage().getDownloadUrl(path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) { setError(err instanceof Error ? err.message : `Could not open ${name}.`); }
    finally { setOpeningFile(null); }
  }

  async function save() {
    if (!user || !shipment) return;
    setSaving(true); setError("");
    try {
      const next = await createShipmentService().update(user.uid, shipment.id, form);
      setShipment(next); setEditing(false);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save shipment."); }
    finally { setSaving(false); }
  }

  if (authLoading) return <main className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="size-6 animate-spin text-cyan-700"/></main>;
  if (!configured) return <main className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-xl rounded-2xl border bg-white p-7"><h1 className="text-xl font-bold">Firebase setup required</h1><p className="mt-2 text-sm text-slate-600">Configure Firebase to access cloud shipment records.</p><Link href="/workspace" className="mt-5 inline-block text-sm font-semibold text-cyan-700">Continue as guest</Link></div></main>;
  if (!user) return <AuthRequired/>;
  if (loading) return <main className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="size-6 animate-spin text-cyan-700"/></main>;
  if (!shipment) return <main className="min-h-screen bg-slate-50 p-8"><div className="mx-auto max-w-3xl rounded-xl border bg-white p-8"><p className="font-semibold">Shipment not found</p>{error && <p className="mt-2 text-sm text-red-600">{error}</p>}<Link className="mt-3 inline-block text-sm text-cyan-700" href="/workspace/shipments">Back to shipments</Link></div></main>;

  return <main className="min-h-screen bg-slate-50 text-slate-900"><header className="border-b bg-white px-5 py-4"><div className="mx-auto flex max-w-5xl items-center justify-between"><Link href="/workspace/shipments" className="flex items-center gap-2 text-sm text-slate-600"><ArrowLeft className="size-4"/> All shipments</Link><div className="flex items-center gap-5"><span className="font-semibold">FreightFlow <span className="font-normal text-slate-400">/ Shipment detail</span></span><AccountMenu/></div></div></header><div className="mx-auto max-w-5xl space-y-6 px-5 py-8"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold text-cyan-700">CLOUD SHIPMENT RECORD</p><h1 className="mt-2 text-3xl font-bold">{shipment.title}</h1><p className="mt-1 text-sm text-slate-500">{shipment.reference}</p></div><button disabled={saving} onClick={()=>editing ? save() : setEditing(true)} className="inline-flex items-center gap-2 rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? <Loader2 className="size-4 animate-spin"/> : editing ? <Save className="size-4"/> : <Pencil className="size-4"/>}{editing ? "Save changes" : "Edit shipment"}</button></div>
  {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  <section className="rounded-2xl border bg-white p-5"><div className="mb-4 flex items-center gap-2"><Package className="size-5 text-cyan-700"/><h2 className="font-semibold">Shipment information</h2></div>{editing ? <div className="grid gap-4 sm:grid-cols-2">{([ ["title","Shipment name"],["reference","Reference"],["shipper","Shipper"],["consignee","Consignee"],["destination","Destination"] ] as const).map(([key,label])=><label key={key} className="text-xs font-semibold text-slate-600">{label}<input value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm font-normal"/></label>)}<label className="text-xs font-semibold text-slate-600">Status<select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value as ShipmentStatus}))} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm">{statuses.map(s=><option key={s}>{s}</option>)}</select></label></div> : <div className="grid gap-5 sm:grid-cols-2"><Info label="Shipper" value={shipment.shipper}/><Info label="Consignee" value={shipment.consignee}/><Info label="Destination" value={shipment.destination} icon={<MapPin className="size-4"/>}/><Info label="Status" value={shipment.status}/><Info label="Created" value={new Date(shipment.createdAt).toLocaleString()} icon={<CalendarDays className="size-4"/>}/><Info label="Last updated" value={new Date(shipment.updatedAt).toLocaleString()}/></div>}</section>
  <section className="rounded-2xl border bg-white p-5"><div className="flex items-center gap-2"><FileText className="size-5 text-cyan-700"/><h2 className="font-semibold">Documents</h2><span className="text-xs text-slate-400">({shipment.documents.length})</span></div>{shipment.documents.length ? <div className="mt-4 divide-y">{shipment.documents.map((doc,i)=><div key={`${doc.id ?? doc.name}-${i}`} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium">{doc.name}</p><p className="text-xs text-slate-500">{doc.type}{doc.parsedData ? " · extracted data saved" : ""}</p></div><div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs ${doc.parsed ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{doc.parsed ? "Parsed" : "Parse failed"}</span>{doc.storagePath && <button onClick={()=>openOriginalFile(doc.storagePath!,doc.name)} disabled={openingFile===doc.storagePath} className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-cyan-500 hover:text-cyan-700 disabled:opacity-50">{openingFile===doc.storagePath ? <Loader2 className="size-3 animate-spin"/> : <Download className="size-3"/>} Original</button>}</div></div>)}</div> : <p className="mt-3 text-sm text-slate-500">No documents are attached to this saved record yet. Guest uploads are temporary; save the shipment after comparison to keep its document summary.</p>}</section>
  <section className="rounded-2xl border bg-white p-5"><h2 className="font-semibold">Validation snapshot</h2>{shipment.checkedRules === undefined ? <p className="mt-2 text-sm text-slate-500">No validation report has been saved for this shipment yet.</p> : <><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><Info label="Rules checked" value={String(shipment.checkedRules)}/><Info label="Errors" value={String(shipment.issueCounts?.error ?? 0)}/><Info label="Warnings" value={String(shipment.issueCounts?.warning ?? 0)}/><Info label="Incomplete / info" value={String(shipment.issueCounts?.info ?? 0)}/></div>{shipment.validationSnapshot?.issues?.length ? <div className="mt-5 divide-y">{shipment.validationSnapshot.issues.map((issue)=><div key={issue.id} className="py-3"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${issue.severity === "error" ? "bg-red-50 text-red-700" : issue.severity === "warning" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{issue.severity}</span><p className="text-sm font-semibold">{issue.title}</p></div><p className="mt-1 text-sm text-slate-600">{issue.detail}</p>{issue.field && <p className="mt-1 text-xs text-slate-400">Field: {issue.field}</p>}</div>)}</div> : null}</>}</section>
  <div className="flex flex-wrap gap-3"><Link href="/workspace/compare" className="rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white">Compare documents</Link><Link href="/workspace/shipments" className="rounded-lg border bg-white px-4 py-2.5 text-sm font-semibold">Back to shipment list</Link></div></div></main>;
}
function Info({label,value,icon}:{label:string;value:string;icon?:React.ReactNode}) { return <div><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 flex items-center gap-2 text-sm font-medium">{icon}{value || "Not set"}</p></div>; }
