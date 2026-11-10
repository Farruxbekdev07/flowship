"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  Scale,
  UploadCloud,
  XCircle,
  PackageSearch,
  ShieldCheck,
  Info,
  FileSpreadsheet,
  FileDown,
  Save,
} from "lucide-react";
import { parseFreightDocument } from "@/app/actions/parseDocument";
import type { CargoItem, FreightFormData } from "@/components/logistics/types";
import { validateCrossDocuments } from "@/lib/validation/cross-document-validation";
import {
  exportValidationExcel,
  exportValidationPdf,
  type ValidationExportData,
} from "@/lib/exports/export-validation-report";
import { makeShipmentId } from "@/lib/shipments/storage";
import type { Shipment } from "@/core/entities/shipment";
import { useAuth } from "@/lib/auth/auth-context";
import { savePendingShipmentBundle } from "@/lib/auth/pending-shipment";
import { FirebaseFileStorage } from "@/infrastructure/firebase/firebase-file-storage";
import { createShipmentService } from "@/infrastructure/firebase/repositories";
import { AccountMenu } from "@/components/account/account-menu";

const ACCEPTED = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_SIZE = 20 * 1024 * 1024;

type ParsedFile = {
  id: string;
  name: string;
  file: File;
  data?: FreightFormData;
  error?: string;
};
type ComparisonRow = {
  label: string;
  values: string[];
  result: "match" | "mismatch" | "incomplete";
};
type CargoEntry = { docIndex: number; itemIndex: number; item: CargoItem };
type CargoGroup = { id: string; entries: CargoEntry[] };

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

function normalizeEntityName(value: string): string {
  const parts = value.split(/[\n,]/).map((part) => part.trim()).filter(Boolean);
  if (parts.length > 1 && /^(ltd|limited|inc|incorporated|llc|gmbh|sarl|spa|s\.?p\.?a\.?)\.?$/i.test(parts[1])) return normalize(parts.slice(0, 2).join(" "));
  return normalize(parts[0] ?? value);
}

function normalizeDimensions(value: string): string {
  const source = value.toLowerCase().replace(/[×*]/g, "x").replace(/,/g, ".");
  const match = source.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*(mm|cm|m|in|inch|inches)?/i);
  if (!match) return normalize(source);
  const unit = (match[4] ?? "").toLowerCase();
  const factor = unit === "m" ? 1000 : unit === "cm" ? 10 : unit === "in" || unit === "inch" || unit === "inches" ? 25.4 : 1;
  const dimensions = match.slice(1, 4).map((part) => Math.round(Number(part) * factor * 1000) / 1000);
  return dimensions.join("x") + (unit ? "mm" : "");
}

function compareRow(label: string, values: string[], normalizer = normalize): ComparisonRow {
  const present = values.filter(Boolean);
  if (present.length < 2) return { label, values, result: "incomplete" };
  const hasMismatch = new Set(present.map(normalizer)).size > 1;
  return { label, values, result: hasMismatch ? "mismatch" : present.length < values.length ? "incomplete" : "match" };
}

function descriptionSimilarity(a: string, b: string): number {
  const left = new Set(
    normalize(a)
      .split(" ")
      .filter((x) => x.length > 1),
  );
  const right = new Set(
    normalize(b)
      .split(" ")
      .filter((x) => x.length > 1),
  );
  if (!left.size || !right.size) return 0;
  const intersection = [...left].filter((token) => right.has(token)).length;
  const union = new Set([...left, ...right]).size;
  const jaccard = intersection / union;
  const compactA = [...left].join("");
  const compactB = [...right].join("");
  const containment =
    compactA &&
    compactB &&
    (compactA.includes(compactB) || compactB.includes(compactA))
      ? 0.9
      : 0;
  return Math.max(jaccard, containment);
}

function cargoSimilarity(a: CargoItem, b: CargoItem): number {
  const desc = descriptionSimilarity(a.description, b.description);
  const hsA = normalize(a.hsCode);
  const hsB = normalize(b.hsCode);
  const sameHs = Boolean(hsA && hsB && hsA === hsB);
  // HS code is a strong signal, but descriptions still help avoid merging unrelated lines.
  if (sameHs && desc >= 0.25) return 0.72 + Math.min(desc, 0.28);
  if (sameHs && (!a.description || !b.description)) return 0.72;
  return desc;
}

function buildCargoGroups(
  documents: (ParsedFile & { data: FreightFormData })[],
): CargoGroup[] {
  const groups: CargoGroup[] = [];
  documents.forEach((doc, docIndex) => {
    doc.data.cargoItems.forEach((item, itemIndex) => {
      let bestGroup: CargoGroup | undefined;
      let bestScore = 0;
      for (const group of groups) {
        if (group.entries.some((entry) => entry.docIndex === docIndex))
          continue;
        const score = Math.max(
          ...group.entries.map((entry) => cargoSimilarity(item, entry.item)),
        );
        if (score > bestScore) {
          bestScore = score;
          bestGroup = group;
        }
      }
      // Conservative threshold: uncertain lines remain separate instead of being falsely matched.
      if (bestGroup && bestScore >= 0.58) {
        bestGroup.entries.push({ docIndex, itemIndex, item });
      } else {
        groups.push({
          id: `${doc.id}-${itemIndex}`,
          entries: [{ docIndex, itemIndex, item }],
        });
      }
    });
  });
  return groups;
}

function formatNumber(value: number, suffix = "") {
  return value > 0
    ? `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(value)}${suffix}`
    : "";
}

function cargoCell(item?: CargoItem) {
  if (!item) return "";
  const lines = [
    item.description,
    item.hsCode ? `HS: ${item.hsCode}` : "",
    item.quantity > 0
      ? `Qty: ${formatNumber(item.quantity)} ${item.quantityUnit}`.trim()
      : "",
    item.packages > 0 ? `Packages: ${formatNumber(item.packages)}` : "",
    item.netKg > 0 ? `Net: ${formatNumber(item.netKg, " kg")}` : "",
    item.grossKg > 0 ? `Gross: ${formatNumber(item.grossKg, " kg")}` : "",
    item.dimensions ? `Dimensions: ${item.dimensions}` : "",
    item.volumeM3 > 0 ? `Volume: ${formatNumber(item.volumeM3, " m³")}` : "",
    item.unitPrice > 0
      ? `Unit price: ${item.currency} ${formatNumber(item.unitPrice)}`.trim()
      : "",
    item.amount > 0
      ? `Amount: ${item.currency} ${formatNumber(item.amount)}`.trim()
      : "",
  ];
  return lines.filter(Boolean).join("\n");
}

function getCargoGroupStatus(
  group: CargoGroup,
  docCount: number,
): ComparisonRow["result"] {
  const fields: Array<(item: CargoItem) => string> = [
    (x) => normalize(x.hsCode),
    (x) => (x.quantity > 0 ? `${x.quantity} ${normalize(x.quantityUnit)}` : ""),
    (x) => formatNumber(x.packages),
    (x) => formatNumber(x.netKg),
    (x) => formatNumber(x.grossKg),
    (x) => (x.dimensions ? normalizeDimensions(x.dimensions) : ""),
    (x) => formatNumber(x.volumeM3),
    (x) =>
      x.unitPrice > 0 ? `${x.currency.toUpperCase()} ${x.unitPrice}` : "",
    (x) => (x.amount > 0 ? `${x.currency.toUpperCase()} ${x.amount}` : ""),
  ];
  let compared = 0;
  let hasMissingComparableValue = false;
  for (const field of fields) {
    const values = group.entries.map((entry) => field(entry.item));
    const present = values.filter(Boolean);
    if (present.length > 0 && present.length < group.entries.length) hasMissingComparableValue = true;
    if (present.length >= 2) {
      compared += 1;
      if (new Set(present).size > 1) return "mismatch";
    }
  }
  return compared > 0 && group.entries.length === docCount && !hasMissingComparableValue
    ? "match"
    : "incomplete";
}

function Status({ value }: { value: ComparisonRow["result"] }) {
  if (value === "match")
    return (
      <span className="inline-flex items-center gap-1 text-emerald-700">
        <CheckCircle2 className="size-4" /> Match
      </span>
    );
  if (value === "mismatch")
    return (
      <span className="inline-flex items-center gap-1 text-amber-700">
        <AlertTriangle className="size-4" /> Mismatch
      </span>
    );
  return <span className="text-slate-500">Incomplete</span>;
}

export default function CompareWorkspacePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [documents, setDocuments] = useState<ParsedFile[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [savingShipment, setSavingShipment] = useState(false);

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    if (files.length + documents.length > 8) {
      setError("Bir shipment uchun maksimum 8 ta fayl yuklash mumkin.");
      return;
    }
    const invalid = files.find(
      (f) => !ACCEPTED.has(f.type) || f.size > MAX_SIZE || f.size === 0,
    );
    if (invalid) {
      setError(`${invalid.name}: PDF, JPG, PNG yoki WEBP; maksimal 20 MB.`);
      return;
    }
    setError("");
    setProcessing(true);
    const parsed: ParsedFile[] = [];
    try {
      // Sequential processing avoids a burst of Gemini requests and reduces 503 errors.
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress(`Processing ${i + 1} of ${files.length}: ${file.name}`);
        const payload = new FormData();
        payload.append("document", file);
        const result = await parseFreightDocument(payload);
        parsed.push(
          result.success
            ? {
                id: `${file.name}-${file.lastModified}-${i}`,
                name: file.name,
                file,
                data: {
                  ...result.data,
                  currency: "",
                },
              }
            : {
                id: `${file.name}-${file.lastModified}-${i}`,
                name: file.name,
                file,
                error: result.error,
              },
        );
      }
      setDocuments((current) => [...current, ...parsed]);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Hujjatlarni qayta ishlashda xatolik.",
      );
    } finally {
      setProcessing(false);
      setProgress("");
    }
  }

  const successful = documents.filter(
    (d): d is ParsedFile & { data: FreightFormData } => Boolean(d.data),
  );
  const rows = useMemo(() => {
    if (successful.length < 2) return [];
    const result: ComparisonRow[] = [
      compareRow(
        "Shipper",
        successful.map((d) => d.data.shipperName.trim()),
        normalizeEntityName,
      ),
      compareRow(
        "Consignee",
        successful.map((d) => d.data.consigneeName.trim()),
        normalizeEntityName,
      ),
      compareRow(
        "Delivery destination",
        successful.map((d) => d.data.deliveryDestination.trim()),
      ),
      compareRow(
        "Carrier",
        successful.map((d) => d.data.carrierName.trim()),
      ),
      compareRow(
        "Truck license plate",
        successful.map((d) => d.data.truckLicensePlate.trim()),
      ),
      compareRow(
        "Trailer number",
        successful.map((d) => d.data.trailerNumber.trim()),
      ),
      compareRow(
        "Cargo item count",
        successful.map((d) =>
          d.data.cargoItems.length ? String(d.data.cargoItems.length) : "",
        ),
      ),
      compareRow(
        "Total packages",
        successful.map((d) => {
          const n = d.data.cargoItems.reduce(
            (sum, item) => sum + item.packages,
            0,
          );
          return n > 0 ? String(n) : "";
        }),
      ),
      compareRow(
        "Total gross weight (kg)",
        successful.map((d) => {
          const n = d.data.cargoItems.reduce(
            (sum, item) => sum + item.grossKg,
            0,
          );
          return n > 0 ? String(n) : "";
        }),
      ),
      compareRow(
        "Total net weight (kg)",
        successful.map((d) => {
          const n = d.data.cargoItems.reduce(
            (sum, item) => sum + item.netKg,
            0,
          );
          return n > 0 ? String(n) : "";
        }),
      ),
    ];
    return result.filter((row) => row.values.some(Boolean));
  }, [documents]);

  const cargoGroups = useMemo(() => buildCargoGroups(successful), [documents]);
  const matchedGroups = cargoGroups.filter((group) => group.entries.length > 1);
  const unmatchedCount = cargoGroups.filter(
    (group) => group.entries.length === 1,
  ).length;
  const validationReport = useMemo(
    () => validateCrossDocuments(successful, cargoGroups),
    [documents, cargoGroups],
  );

  const reportExportData: ValidationExportData = {
    documents: successful,
    rows,
    cargoGroups,
    validation: validationReport,
    matchedGroups: matchedGroups.length,
    unmatchedLines: unmatchedCount,
  };

  async function handleExcelExport() {
    setExporting(true);
    setError("");
    try {
      await exportValidationExcel(reportExportData);
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : "Excel report could not be generated.",
      );
    } finally {
      setExporting(false);
    }
  }

  async function handleSaveShipment() {
    if (successful.length < 2 || savingShipment) return;
    const now = new Date().toISOString();
    const shipper =
      successful
        .find((d) => d.data.shipperName.trim())
        ?.data.shipperName.trim() ?? "";
    const consignee =
      successful
        .find((d) => d.data.consigneeName.trim())
        ?.data.consigneeName.trim() ?? "";
    const destination =
      successful
        .find((d) => d.data.deliveryDestination.trim())
        ?.data.deliveryDestination.trim() ?? "";
    const id = makeShipmentId();
    const record: Omit<Shipment, "ownerId"> = {
      id,
      reference: `FF-${new Date().getFullYear()}-${id.slice(-5).toUpperCase()}`,
      title: `${shipper || "Shipment"}${consignee ? ` → ${consignee}` : ""}`,
      shipper,
      consignee,
      destination,
      status:
        validationReport.counts.error > 0 || validationReport.counts.warning > 0
          ? "Processing"
          : "Validated",
      createdAt: now,
      updatedAt: now,
      documents: documents.map((doc) => ({
        name: doc.name,
        type: doc.data?.documentType || "Unknown type",
        parsed: Boolean(doc.data),
        ...(doc.error ? { error: doc.error } : {}),
        ...(doc.data
          ? { parsedData: doc.data as unknown as Record<string, unknown> }
          : {}),
      })),
      issueCounts: validationReport.counts,
      checkedRules: validationReport.checkedRules,
      validationSnapshot: validationReport,
    };

    setSavingShipment(true);
    try {
      if (user) {
        const fileStorage = new FirebaseFileStorage();
        const documentsWithFiles: Shipment["documents"] = [];
        for (let index = 0; index < record.documents.length; index += 1) {
          const document = record.documents[index];
          const sourceFile = documents[index]?.file;
          if (!sourceFile) {
            documentsWithFiles.push(document);
            continue;
          }
          const stored = await fileStorage.uploadUserFile({
            ownerId: user.uid,
            shipmentId: record.id,
            file: sourceFile,
          });
          documentsWithFiles.push({ ...document, storagePath: stored.path });
        }
        const { id: _temporaryId, ...input } = {
          ...record,
          documents: documentsWithFiles,
        };
        const saved = await createShipmentService().create(
          user.uid,
          input,
          record.id,
        );
        router.push(`/workspace/shipments/${saved.id}`);
      } else {
        // Preserve file bytes in this browser's IndexedDB while the guest signs in or registers.
        await savePendingShipmentBundle({
          record,
          files: documents.map((document) => document.file),
        });
        router.push(
          `/auth/login?returnTo=${encodeURIComponent("/workspace/shipments")}`,
        );
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save shipment.",
      );
    } finally {
      setSavingShipment(false);
    }
  }

  function handlePdfExport() {
    setError("");
    try {
      exportValidationPdf(reportExportData);
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : "PDF report could not be opened.",
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white px-5 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link
            href="/workspace"
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="size-4" /> Back to document review
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/workspace/shipments"
              className="text-sm text-slate-600 hover:text-cyan-700"
            >
              Shipments
            </Link>
            <span className="font-semibold">
              FreightFlow{" "}
              <span className="font-normal text-slate-400">
                / Compare documents
              </span>
            </span>
            <AccountMenu />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl space-y-6 px-5 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-sm font-semibold text-cyan-700">
              <Scale className="size-4" /> MULTI-DOCUMENT VALIDATION
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Compare documents within one shipment
            </h1>
            <p className="mt-3 text-slate-600">
              Upload Invoice, Packing List, CMR or other supported freight
              documents. FreightFlow extracts data and highlights fields that
              agree, differ or are missing.
            </p>
          </div>
          {successful.length >= 2 && (
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSaveShipment}
                disabled={savingShipment || authLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingShipment ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}{" "}
                {savingShipment ? "Saving…" : "Save shipment"}
              </button>
              <button
                type="button"
                onClick={handlePdfExport}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <FileDown className="size-4" /> Export PDF
              </button>
              <button
                type="button"
                onClick={handleExcelExport}
                disabled={exporting}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exporting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="size-4" />
                )}{" "}
                {exporting ? "Preparing…" : "Export Excel"}
              </button>
            </div>
          )}
        </div>

        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white px-6 py-12 text-center transition hover:border-cyan-500 hover:bg-cyan-50/30">
          {processing ? (
            <Loader2 className="size-8 animate-spin text-cyan-600" />
          ) : (
            <UploadCloud className="size-9 text-cyan-600" />
          )}
          <span className="mt-3 font-semibold">
            {processing
              ? "AI is processing documents…"
              : "Upload multiple documents"}
          </span>
          <span className="mt-1 text-sm text-slate-500">
            PDF, JPG, PNG, WEBP · up to 20 MB each · maximum 8 files
          </span>
          {progress && (
            <span className="mt-3 text-sm text-cyan-700">{progress}</span>
          )}
          <input
            className="sr-only"
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            multiple
            disabled={processing || documents.length >= 8}
            onChange={handleFiles}
          />
        </label>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {documents.length > 0 && (
          <section className="rounded-2xl border bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Shipment documents{" "}
                <span className="text-sm font-normal text-slate-500">
                  ({documents.length})
                </span>
              </h2>
              <button
                onClick={() => setDocuments([])}
                className="text-sm text-slate-500 hover:text-red-600"
              >
                Clear all
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {documents.map((doc) => (
                <div key={doc.id} className="rounded-xl border p-3">
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 size-5 shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <p className="wrap-break-word text-sm font-medium">
                        {doc.name}
                      </p>
                      {doc.data ? (
                        <p className="mt-1 text-xs text-slate-500">
                          {doc.data.documentType ||
                            "Document type not identified"}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-red-600">{doc.error}</p>
                      )}
                    </div>
                    <button
                      onClick={() =>
                        setDocuments((current) =>
                          current.filter((x) => x.id !== doc.id),
                        )
                      }
                      aria-label="Remove document"
                      className="text-slate-400 hover:text-red-600"
                    >
                      <XCircle className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {successful.length >= 2 && (
          <>
            <section className="overflow-hidden rounded-2xl border bg-white">
              <div className="border-b px-5 py-4">
                <div className="flex items-center gap-2">
                  <Scale className="size-5 text-cyan-700" />
                  <h2 className="text-lg font-semibold">
                    Shipment-level comparison
                  </h2>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Compare shared shipment details and aggregate cargo totals
                  across documents.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-175 text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Field</th>
                      {successful.map((doc) => (
                        <th
                          key={doc.id}
                          className="max-w-55 px-4 py-3 font-semibold"
                        >
                          <span className="block truncate">{doc.name}</span>
                          <span className="text-xs font-normal text-slate-500">
                            {doc.data.documentType || "Unknown type"}
                          </span>
                        </th>
                      ))}
                      <th className="px-4 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.label} className="border-t">
                        <td className="px-4 py-3 font-medium">{row.label}</td>
                        {row.values.map((value, i) => (
                          <td
                            key={successful[i]?.id}
                            className="px-4 py-3 text-slate-700"
                          >
                            {value || (
                              <span className="text-slate-300">Not found</span>
                            )}
                          </td>
                        ))}
                        <td className="px-4 py-3">
                          <Status value={row.result} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
                <div className="flex items-center gap-2">
                  <PackageSearch className="size-5 text-cyan-700" />
                  <div>
                    <h2 className="text-lg font-semibold">
                      Cargo line-item matching
                    </h2>
                    <p className="text-sm text-slate-500">
                      Products are matched using descriptions and HS codes, then
                      their values are compared.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 text-xs text-slate-500">
                  <span>{matchedGroups.length} matched groups</span>
                  <span>{unmatchedCount} unmatched lines</span>
                </div>
              </div>
              {cargoGroups.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  No cargo line items were extracted from these documents.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-225 text-left text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="w-44 px-4 py-3 font-semibold">
                          Cargo item
                        </th>
                        {successful.map((doc) => (
                          <th
                            key={doc.id}
                            className="max-w-65 px-4 py-3 font-semibold"
                          >
                            <span className="block truncate">{doc.name}</span>
                            <span className="text-xs font-normal text-slate-500">
                              {doc.data.documentType || "Unknown type"}
                            </span>
                          </th>
                        ))}
                        <th className="px-4 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cargoGroups.map((group, groupIndex) => {
                        const byDocument = successful.map(
                          (_, docIndex) =>
                            group.entries.find(
                              (entry) => entry.docIndex === docIndex,
                            )?.item,
                        );
                        const representative =
                          group.entries.find((entry) => entry.item.description)
                            ?.item ?? group.entries[0].item;
                        return (
                          <tr key={group.id} className="border-t align-top">
                            <td className="px-4 py-3">
                              <p className="font-medium">
                                {representative.description ||
                                  `Cargo group ${groupIndex + 1}`}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {representative.hsCode
                                  ? `HS ${representative.hsCode}`
                                  : "HS code not found"}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                {group.entries.length} of {successful.length}{" "}
                                documents
                              </p>
                            </td>
                            {byDocument.map((item, docIndex) => (
                              <td
                                key={successful[docIndex].id}
                                className="whitespace-pre-line px-4 py-3 text-xs leading-5 text-slate-600"
                              >
                                {item ? (
                                  cargoCell(item)
                                ) : (
                                  <span className="text-slate-300">
                                    No matching line
                                  </span>
                                )}
                              </td>
                            ))}
                            <td className="whitespace-nowrap px-4 py-3">
                              <Status
                                value={getCargoGroupStatus(
                                  group,
                                  successful.length,
                                )}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="border-t bg-amber-50 px-5 py-3 text-xs text-amber-800">
                Matching is a conservative, local heuristic based on extracted
                descriptions and HS codes. Similar names can still refer to
                different goods; always verify against the source documents. A
                line shown as unmatched may be absent from the other documents
                or described differently.
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-5 text-cyan-700" />
                  <div>
                    <h2 className="text-lg font-semibold">
                      Cross-document validation
                    </h2>
                    <p className="text-sm text-slate-500">
                      Automated consistency checks across shipment details,
                      cargo lines and invoice calculations.
                    </p>
                  </div>
                </div>
                <span className="text-xs text-slate-500">
                  {validationReport.checkedRules} checks evaluated
                </span>
              </div>

              <div className="grid gap-3 border-b p-5 sm:grid-cols-3">
                <div className="rounded-xl border border-red-100 bg-red-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-red-700">
                    Errors
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-red-800">
                    {validationReport.counts.error}
                  </p>
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
                    Warnings
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-amber-800">
                    {validationReport.counts.warning}
                  </p>
                </div>
                <div className="rounded-xl border border-sky-100 bg-sky-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
                    Incomplete / info
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-sky-800">
                    {validationReport.counts.info}
                  </p>
                </div>
              </div>

              {validationReport.issues.length === 0 ? (
                <div className="flex items-start gap-3 p-5">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                  <div>
                    <p className="font-medium text-emerald-800">
                      No inconsistencies found in the available data
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      The checks that had enough extracted information passed.
                      This is not a guarantee that every source document is
                      correct.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="divide-y">
                  {validationReport.issues.map((issue) => {
                    const severityClass =
                      issue.severity === "error"
                        ? "border-red-200 bg-red-50 text-red-800"
                        : issue.severity === "warning"
                          ? "border-amber-200 bg-amber-50 text-amber-800"
                          : "border-sky-200 bg-sky-50 text-sky-800";
                    const severityLabel =
                      issue.severity === "error"
                        ? "Error"
                        : issue.severity === "warning"
                          ? "Review"
                          : "Incomplete";
                    return (
                      <article key={issue.id} className="flex gap-3 p-4">
                        <div
                          className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border ${severityClass}`}
                        >
                          {issue.severity === "info" ? (
                            <Info className="size-4" />
                          ) : (
                            <AlertTriangle className="size-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold">
                              {issue.title}
                            </h3>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${severityClass}`}
                            >
                              {severityLabel}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                              {issue.category}
                            </span>
                          </div>
                          <p className="mt-1 wrap-break-word text-sm text-slate-600">
                            {issue.detail}
                          </p>
                          {issue.documents.length > 0 && (
                            <p className="mt-2 text-xs text-slate-400">
                              Affected: {issue.documents.join(", ")}
                            </p>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
              <div className="border-t bg-slate-50 px-5 py-3 text-xs text-slate-500">
                Validation uses extracted values and deterministic rules with a
                1% numeric tolerance (minimum 0.02). Missing fields are reported
                as incomplete, not automatically treated as errors. Review every
                flagged item against the original document before making
                shipment or payment decisions.
              </div>
            </section>
          </>
        )}

        {successful.length < 2 && documents.length > 0 && (
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
            Upload at least two successfully parsed documents to generate a
            comparison report.
          </div>
        )}
        <p className="text-xs text-slate-500">
          Files are processed by the existing parser. Avoid uploading
          confidential customer documents unless you have permission and an
          appropriate data-handling arrangement.
        </p>
      </div>
    </main>
  );
}
