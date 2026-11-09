"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Plus,
  Package,
  ArrowUpRight,
  Trash2,
  X,
  Save,
  Loader2,
  Cloud,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { AuthRequired } from "@/components/auth/auth-required";
import { AccountMenu } from "@/components/account/account-menu";
import { createShipmentService } from "@/infrastructure/firebase/repositories";
import {
  clearPendingShipmentBundle,
  readPendingShipmentBundle,
} from "@/lib/auth/pending-shipment";
import { FirebaseFileStorage } from "@/infrastructure/firebase/firebase-file-storage";
import { readShipments, writeShipments } from "@/lib/shipments/storage";
import type { Shipment, ShipmentStatus } from "@/core/entities/shipment";

const statuses: ShipmentStatus[] = [
  "Draft",
  "Processing",
  "Validated",
  "Completed",
];
const statusStyle: Record<ShipmentStatus, string> = {
  Draft: "bg-slate-100 text-slate-700",
  Processing: "bg-sky-100 text-sky-700",
  Validated: "bg-emerald-100 text-emerald-700",
  Completed: "bg-violet-100 text-violet-700",
};

export default function ShipmentsPage() {
  const { user, loading: authLoading, configured } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [queryText, setQueryText] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [reference, setReference] = useState("");
  const [shipper, setShipper] = useState("");
  const [consignee, setConsignee] = useState("");
  const [destination, setDestination] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [legacyCount, setLegacyCount] = useState(0);
  const pendingImportPromise = useRef<Promise<string | null> | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    const result = await createShipmentService().list(user.uid, 100);
    setShipments(result.items);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setBusy(true);
      setError("");
      try {
        const service = createShipmentService();
        let importPromise = pendingImportPromise.current;
        if (!importPromise) {
          importPromise = (async () => {
            const pending = await readPendingShipmentBundle();
            if (!pending) return null;
            const { id: _guestId, ...input } = pending.record;
            const saved = await service.create(
              user.uid,
              input,
              pending.record.id,
            );
            const fileStorage = new FirebaseFileStorage();
            const documentsWithFiles: Shipment["documents"] = [];
            for (let index = 0; index < saved.documents.length; index += 1) {
              const document = saved.documents[index];
              const file = pending.files[index];
              if (!file) {
                documentsWithFiles.push(document);
                continue;
              }
              const stored = await fileStorage.uploadUserFile({
                ownerId: user.uid,
                shipmentId: saved.id,
                file,
              });
              documentsWithFiles.push({
                ...document,
                storagePath: stored.path,
              });
            }
            if (
              documentsWithFiles.some(
                (document, index) =>
                  document.storagePath !== saved.documents[index]?.storagePath,
              )
            ) {
              await service.update(user.uid, saved.id, {
                documents: documentsWithFiles,
              });
            }
            await clearPendingShipmentBundle();
            return saved.reference;
          })();
          pendingImportPromise.current = importPromise;
        }
        const importedReference = await importPromise;
        if (importedReference && !cancelled)
          setNotice(
            `Your guest work was saved as ${importedReference}, including its original files when available.`,
          );
        const result = await service.list(user.uid, 100);
        if (!cancelled) setShipments(result.items);
        if (!cancelled) setLegacyCount(readShipments().length);
      } catch (err) {
        pendingImportPromise.current = null;
        if (!cancelled)
          setError(
            err instanceof Error
              ? err.message
              : "Could not load your shipments.",
          );
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const filtered = useMemo(() => {
    const q = queryText.toLowerCase().trim();
    return shipments.filter(
      (s) =>
        !q ||
        [s.title, s.reference, s.shipper, s.consignee, s.destination].some(
          (v) => v.toLowerCase().includes(q),
        ),
    );
  }, [shipments, queryText]);

  async function createShipment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setBusy(true);
    setError("");
    const now = new Date().toISOString();
    try {
      const record = await createShipmentService().create(user.uid, {
        reference:
          reference.trim() ||
          `FF-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 5).toUpperCase()}`,
        title: title.trim() || "New shipment",
        shipper: shipper.trim(),
        consignee: consignee.trim(),
        destination: destination.trim(),
        status: "Draft",
        createdAt: now,
        updatedAt: now,
        documents: [],
      });
      setShipments((current) => [record, ...current]);
      setShowCreate(false);
      setTitle("");
      setReference("");
      setShipper("");
      setConsignee("");
      setDestination("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create shipment.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(id: string, status: ShipmentStatus) {
    if (!user) return;
    try {
      const updated = await createShipmentService().update(user.uid, id, {
        status,
      });
      setShipments((current) =>
        current.map((s) => (s.id === id ? updated : s)),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update shipment.",
      );
    }
  }

  async function removeShipment(id: string) {
    if (!user || !window.confirm("Delete this shipment record?")) return;
    try {
      const record = shipments.find((shipment) => shipment.id === id);
      const fileStorage = new FirebaseFileStorage();
      await Promise.all(
        (record?.documents ?? []).flatMap((document) =>
          document.storagePath
            ? [fileStorage.deleteFile(document.storagePath)]
            : [],
        ),
      );
      await createShipmentService().delete(user.uid, id);
      setShipments((current) => current.filter((s) => s.id !== id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not delete shipment.",
      );
    }
  }

  async function importLegacyShipments() {
    if (!user) return;
    const localRecords = readShipments();
    if (!localRecords.length) return;
    setBusy(true);
    setError("");
    try {
      const service = createShipmentService();
      const existingRefs = new Set(shipments.map((s) => s.reference));
      let imported = 0;
      for (const old of localRecords) {
        if (existingRefs.has(old.reference)) continue;
        const { id: _oldId, ...input } = old;
        await service.create(user.uid, input);
        imported += 1;
      }
      const result = await service.list(user.uid, 100);
      setShipments(result.items);
      setLegacyCount(0);
      writeShipments([]);
      setNotice(
        `${imported} local shipment record(s) imported into your account.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not import local shipments.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (authLoading)
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="size-6 animate-spin text-cyan-700" />
      </main>
    );
  if (!configured)
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-xl rounded-2xl border bg-white p-7">
          <h1 className="text-xl font-bold">Firebase setup required</h1>
          <p className="mt-2 text-sm text-slate-600">
            Guest document tools are available now. To save shipments, configure
            Firebase using the variables in <code>.env.example</code> and enable
            Email/Password authentication.
          </p>
          <Link
            href="/workspace"
            className="mt-5 inline-block text-sm font-semibold text-cyan-700"
          >
            Continue as guest
          </Link>
        </div>
      </main>
    );
  if (!user) return <AuthRequired />;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white px-5 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link
            href="/workspace"
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="size-4" /> Workspace
          </Link>
          <div className="flex items-center gap-5">
            <span className="font-semibold">
              FreightFlow{" "}
              <span className="font-normal text-slate-400">/ Shipments</span>
            </span>
            <AccountMenu />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl space-y-6 px-5 py-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold tracking-wide text-cyan-700">
              CLOUD OPERATIONS
            </p>
            <h1 className="mt-2 text-3xl font-bold">Shipment management</h1>
            <p className="mt-2 text-slate-600">
              Your saved shipment records, available across devices when you
              sign in.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800"
          >
            <Plus className="size-4" /> New shipment
          </button>
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
          >
            {notice}
          </p>
        )}
        {legacyCount > 0 && (
          <div className="flex flex-col justify-between gap-3 rounded-xl border border-cyan-200 bg-cyan-50 p-4 sm:flex-row sm:items-center">
            <div>
              <p className="font-semibold text-cyan-950">
                Local shipment drafts found
              </p>
              <p className="mt-1 text-sm text-cyan-800">
                Import {legacyCount} shipment record(s) from this browser into
                your account.
              </p>
            </div>
            <button
              disabled={busy}
              onClick={importLegacyShipments}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Cloud className="size-4" /> Import to cloud
            </button>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-4">
          <Metric label="Total shipments" value={shipments.length} />
          <Metric
            label="Draft"
            value={shipments.filter((s) => s.status === "Draft").length}
          />
          <Metric
            label="Validated"
            value={shipments.filter((s) => s.status === "Validated").length}
          />
          <Metric
            label="Completed"
            value={shipments.filter((s) => s.status === "Completed").length}
          />
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Search by shipment, reference, shipper or consignee…"
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-cyan-600"
          />
        </div>
        {busy && shipments.length === 0 ? (
          <div className="rounded-xl border bg-white p-10 text-center text-sm text-slate-500">
            <Loader2 className="mx-auto mb-2 size-5 animate-spin" />
            Loading your shipments…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-white px-6 py-16 text-center">
            <Package className="mx-auto size-10 text-slate-300" />
            <h2 className="mt-3 font-semibold">
              {shipments.length
                ? "No matching shipments"
                : "No saved shipments yet"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Create a shipment record or save a comparison to your account.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-5 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white"
            >
              Create shipment
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-212.5 text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Shipment</th>
                    <th className="px-5 py-3">Route / parties</th>
                    <th className="px-5 py-3">Documents</th>
                    <th className="px-5 py-3">Validation</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Updated</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id} className="border-t hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <Link
                          href={`/workspace/shipments/${s.id}`}
                          className="font-semibold text-slate-900 hover:text-cyan-700"
                        >
                          {s.title}
                        </Link>
                        <p className="mt-1 text-xs text-slate-500">
                          {s.reference}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p>
                          {s.shipper || "Shipper not set"} →{" "}
                          {s.consignee || "Consignee not set"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {s.destination || "Destination not set"}
                        </p>
                      </td>
                      <td className="px-5 py-4">{s.documents.length} files</td>
                      <td className="px-5 py-4">
                        <span className="text-red-700">
                          {s.issueCounts?.error ?? 0} errors
                        </span>
                        <span className="text-slate-400"> · </span>
                        <span className="text-amber-700">
                          {s.issueCounts?.warning ?? 0} warnings
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <select
                          aria-label={`Status for ${s.reference}`}
                          value={s.status}
                          onChange={(e) =>
                            updateStatus(s.id, e.target.value as ShipmentStatus)
                          }
                          className={`rounded-full border-0 px-2.5 py-1 text-xs font-semibold ${statusStyle[s.status]}`}
                        >
                          {statuses.map((st) => (
                            <option key={st}>{st}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500">
                        {new Date(s.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Link
                            aria-label="Open shipment"
                            href={`/workspace/shipments/${s.id}`}
                            className="text-cyan-700 hover:text-cyan-900"
                          >
                            <ArrowUpRight className="size-4" />
                          </Link>
                          <button
                            aria-label="Delete shipment"
                            onClick={() => removeShipment(s.id)}
                            className="text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <button
          onClick={refresh}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-cyan-700"
        >
          <RefreshCw className="size-4" /> Refresh list
        </button>
      </div>
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <form
            onSubmit={createShipment}
            className="w-full max-w-xl space-y-4 rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Create shipment</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Start a record for a new freight movement.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                aria-label="Close"
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Shipment name"
                value={title}
                setValue={setTitle}
                placeholder="Nordics electronics shipment"
              />
              <Field
                label="Reference number"
                value={reference}
                setValue={setReference}
                placeholder="Auto-generated if empty"
              />
              <Field label="Shipper" value={shipper} setValue={setShipper} />
              <Field
                label="Consignee"
                value={consignee}
                setValue={setConsignee}
              />
              <div className="sm:col-span-2">
                <Field
                  label="Destination"
                  value={destination}
                  setValue={setDestination}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-lg border px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Save className="size-4" /> Create record
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
function Field({
  label,
  value,
  setValue,
  placeholder,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-cyan-600"
      />
    </label>
  );
}
