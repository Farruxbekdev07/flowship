"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Download, FileCheck2, Save, Cloud, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseFreightDocument } from "@/app/actions/parseDocument";
import { CargoItemsEditor } from "@/components/logistics/cargo-items-editor";
import {
  shipmentFields,
  transportFields,
  initialFormData,
} from "@/components/logistics/constants";
import { DocumentPreview } from "@/components/logistics/document-preview";
import { Field } from "@/components/logistics/field";
import { Section } from "@/components/logistics/section";
import type {
  FreightFormData,
  TextFieldKey,
} from "@/components/logistics/types";
import { exportShipmentExcel } from "@/lib/exports/export-shipment-excel";
import { useAuth } from "@/lib/auth/auth-context";
import { savePendingShipmentBundle } from "@/lib/auth/pending-shipment";
import { createShipmentService } from "@/infrastructure/firebase/repositories";
import { FirebaseFileStorage } from "@/infrastructure/firebase/firebase-file-storage";
import { makeShipmentId } from "@/lib/shipments/storage";
import type { Shipment } from "@/core/entities/shipment";

const DRAFT_STORAGE_KEY = "freightflow-shipment-draft-v2";
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function hasShipmentData(data: FreightFormData): boolean {
  return Boolean(
    data.documentType ||
    data.shipperName ||
    data.consigneeName ||
    data.address ||
    data.deliveryDestination ||
    data.cargoItems.length ||
    data.additionalFields.length ||
    Object.values(data.invoiceTotals).some((value) =>
      typeof value === "string" ? value.trim() : value > 0,
    ),
  );
}

function isFreightFormData(value: unknown): value is FreightFormData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<FreightFormData>;
  return (
    typeof candidate.documentType === "string" &&
    typeof candidate.shipperName === "string" &&
    typeof candidate.address === "string" &&
    typeof candidate.consigneeName === "string" &&
    typeof candidate.deliveryDestination === "string" &&
    typeof candidate.truckLicensePlate === "string" &&
    typeof candidate.trailerNumber === "string" &&
    typeof candidate.carrierName === "string" &&
    typeof candidate.driverId === "string" &&
    typeof candidate.confidenceScore === "number" &&
    (candidate.invoiceTotals === undefined ||
      (typeof candidate.invoiceTotals === "object" &&
        candidate.invoiceTotals !== null)) &&
    Array.isArray(candidate.cargoItems) &&
    candidate.cargoItems.every(
      (item) =>
        item &&
        typeof item.description === "string" &&
        typeof item.hsCode === "string" &&
        typeof item.packages === "number" &&
        typeof item.quantity === "number" &&
        typeof item.quantityUnit === "string" &&
        typeof item.netKg === "number" &&
        typeof item.grossKg === "number" &&
        typeof item.dimensions === "string" &&
        typeof item.volumeM3 === "number" &&
        typeof item.unitPrice === "number" &&
        typeof item.currency === "string" &&
        typeof item.amount === "number",
    ) &&
    Array.isArray(candidate.additionalFields) &&
    candidate.additionalFields.every(
      (field) =>
        field &&
        typeof field.label === "string" &&
        typeof field.value === "string",
    )
  );
}

export function LogisticsDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState<FreightFormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);

  useEffect(() => {
    try {
      const storedDraft = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (storedDraft) {
        const parsed: unknown = JSON.parse(storedDraft);
        if (isFreightFormData(parsed)) {
          setFormData({
            ...initialFormData,
            ...parsed,
            invoiceTotals:
              parsed.invoiceTotals ?? initialFormData.invoiceTotals,
          });
          setSaved(true);
          setHasRestoredDraft(true);
        }
      }
    } catch (restoreError) {
      console.warn("Could not restore FreightFlow draft:", restoreError);
    }
  }, []);

  function markAsEdited() {
    setSaved(false);
    setHasRestoredDraft(false);
    setError(null);
  }

  function updateField(key: TextFieldKey | "documentType", value: string) {
    setFormData((current) => ({ ...current, [key]: value }));
    markAsEdited();
  }

  function updateInvoiceTotal(
    key: keyof FreightFormData["invoiceTotals"],
    value: string,
  ) {
    setFormData((current) => ({
      ...current,

      invoiceTotals: {
        ...current.invoiceTotals,
        [key]:
          key === "currency"
            ? value
            : value === ""
              ? 0
              : Math.max(0, Number(value) || 0),
      },
    }));
    markAsEdited();
  }

  function updateCargoItems(items: FreightFormData["cargoItems"]) {
    setFormData((current) => ({ ...current, cargoItems: items }));
    markAsEdited();
  }

  function updateAdditionalField(index: number, value: string) {
    setFormData((current) => ({
      ...current,
      currency: "",
      additionalFields: current.additionalFields.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, value } : field,
      ),
    }));
    markAsEdited();
  }

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Reset the input so selecting the same file again triggers onChange.
    event.target.value = "";

    if (!ALLOWED_MIME_TYPES.has(selectedFile.type)) {
      setError("Faqat PDF, JPG, PNG yoki WEBP fayllari qo‘llab-quvvatlanadi.");
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setError("Fayl hajmi 20 MB dan oshmasligi kerak.");
      return;
    }

    setFile(selectedFile);
    setHasRestoredDraft(false);
    setFormData(initialFormData);
    setSaved(false);
    setLoading(true);
    setError(null);

    try {
      const payload = new FormData();
      payload.append("document", selectedFile);
      const result = await parseFreightDocument(payload);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setFormData({ ...result.data, currency: "" });
    } catch (uploadError) {
      console.error("FreightFlow upload failed:", uploadError);
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Hujjatni qayta ishlashda xatolik yuz berdi.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSaveDraft() {
    if (!hasShipmentData(formData)) {
      setError(
        "Saqlashdan oldin hujjat yuklang yoki shipment ma’lumotlarini kiriting.",
      );
      return;
    }

    try {
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
      setSaved(true);
      setError(null);
    } catch (saveError) {
      console.error("Could not save FreightFlow draft:", saveError);
      setError(
        "Draft brauzerda saqlanmadi. Brauzer xotirasida joy yetarli ekanini tekshiring.",
      );
    }
  }

  type DocumentRecord = {
    name: string;
    type: string;
    parsed: boolean;
    parsedData: Record<string, unknown>;
    storagePath?: string;
  };

  async function handleSaveToAccount() {
    if (!hasShipmentData(formData)) {
      setError("Save qilishdan oldin hujjat ma’lumotlarini kiriting.");
      return;
    }
    const now = new Date().toISOString();
    const id = makeShipmentId();
    const documentName =
      file?.name || `${formData.documentType || "freight-document"}-data`;
    const documentRecord: DocumentRecord = {
      name: documentName,
      type: formData.documentType || "Freight document",
      parsed: true,
      parsedData: formData as unknown as Record<string, unknown>,
    };
    const record: Omit<Shipment, "ownerId"> = {
      id,
      reference: `FF-${new Date().getFullYear()}-${id.slice(-5).toUpperCase()}`,
      title: `${formData.shipperName || "Shipment"}${formData.consigneeName ? ` → ${formData.consigneeName}` : ""}`,
      shipper: formData.shipperName,
      consignee: formData.consigneeName,
      destination: formData.deliveryDestination,
      status: "Draft",
      createdAt: now,
      updatedAt: now,
      documents: [documentRecord],
    };

    setSavingAccount(true);
    setError(null);
    try {
      if (user) {
        let savedDocument = documentRecord;
        if (file) {
          const stored = await new FirebaseFileStorage().uploadUserFile({
            ownerId: user.uid,
            shipmentId: id,
            file,
          });

          savedDocument = {
            ...documentRecord,
            storagePath: stored.path,
          };
        }
        const { id: _temporaryId, ...input } = {
          ...record,
          documents: [savedDocument],
        };
        const savedShipment = await createShipmentService().create(
          user.uid,
          input,
          id,
        );
        router.push(`/workspace/shipments/${savedShipment.id}`);
      } else {
        await savePendingShipmentBundle({ record, files: file ? [file] : [] });
        router.push(
          `/auth/login?returnTo=${encodeURIComponent("/workspace/shipments")}`,
        );
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Shipment history'ga saqlab bo‘lmadi.",
      );
    } finally {
      setSavingAccount(false);
    }
  }

  async function handleExportExcel() {
    if (!hasShipmentData(formData)) {
      setError("Excel eksport qilishdan oldin hujjat ma’lumotlarini kiriting.");
      return;
    }

    setExporting(true);
    setError(null);
    try {
      await exportShipmentExcel(formData);
    } catch (exportError) {
      console.error("FreightFlow Excel export failed:", exportError);
      setError(
        "Excel faylini yaratib bo‘lmadi. Iltimos, qayta urinib ko‘ring.",
      );
    } finally {
      setExporting(false);
    }
  }

  const hasData = hasShipmentData(formData);
  const statusLabel = loading
    ? "Processing"
    : error
      ? "Failed"
      : hasData
        ? "Review required"
        : "Waiting for document";

  return (
    <main className="flex h-screen min-h-155 flex-col overflow-hidden bg-slate-50 text-slate-900">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-sky-600 text-white">
            <FileCheck2 className="size-4" />
          </div>
          <div>
            <h1 className="text-[14px] font-bold">
              FreightFlow
              <span className="font-normal text-slate-400">
                {" "}
                / Document review
              </span>
            </h1>
            <p className="font-mono text-[10px] text-slate-400">
              AI DOCUMENT EXTRACTION
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/workspace/compare"
            className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-800 hover:bg-cyan-100"
          >
            Compare documents
          </Link>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Gemini AI
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-h-95 w-full min-w-0 flex-col border-r border-slate-200 lg:w-[45%]">
          <DocumentPreview
            file={file}
            onUpload={handleFileUpload}
            loading={loading}
          />
        </div>

        <div className="flex min-h-0 w-full min-w-0 flex-col bg-slate-50 lg:w-[55%]">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <h2 className="text-[14px] font-semibold">
                  Parsed shipment data
                </h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${error ? "bg-red-50 text-red-700" : loading ? "bg-yellow-50 text-yellow-700" : hasData ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}
                >
                  {statusLabel}
                </span>
              </div>
              <p className="font-mono text-[10px] text-slate-400">
                REVIEW EXTRACTED DATA
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                disabled={loading || exporting || !hasData}
              >
                <Download className="mr-1 size-3.5" />
                {exporting ? "Exporting..." : "Export Excel"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveDraft}
                disabled={loading || !hasData}
              >
                <Save className="mr-1 size-3.5" />
                {saved ? "Draft saved" : "Save draft"}
              </Button>
              <Button
                size="sm"
                onClick={handleSaveToAccount}
                disabled={loading || authLoading || savingAccount || !hasData}
              >
                {savingAccount ? (
                  <Loader2 className="mr-1 size-3.5 animate-spin" />
                ) : (
                  <Cloud className="mr-1 size-3.5" />
                )}
                {savingAccount ? "Saving…" : "Save to history"}
              </Button>
            </div>
          </div>

          {loading && (
            <div
              role="status"
              className="border-b border-yellow-200 bg-yellow-50 px-5 py-3"
            >
              <p className="animate-pulse text-sm text-yellow-700">
                Gemini AI is analyzing your document...
              </p>
            </div>
          )}
          {error && (
            <div
              role="alert"
              className="border-b border-red-200 bg-red-50 px-5 py-3"
            >
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          {hasRestoredDraft && (
            <div className="border-b border-sky-200 bg-sky-50 px-5 py-2 text-xs text-sky-700">
              Previous draft restored from this browser.
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-2">
              <span className="text-[11px] font-medium text-slate-500">
                Review extracted fields
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                CONFIDENCE{" "}
                <b className="text-emerald-600">
                  {formData.confidenceScore.toFixed(1)}%
                </b>
              </span>
            </div>

            {shipmentFields.some((field) => formData[field.key].trim()) && (
              <Section title="Shipper & consignee info" eyebrow="01">
                <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                  {shipmentFields
                    .filter((field) => formData[field.key].trim())
                    .map((field) => (
                      <Field
                        key={field.key}
                        label={field.label}
                        value={formData[field.key]}
                        onChange={(value) => updateField(field.key, value)}
                      />
                    ))}
                </div>
              </Section>
            )}

            {transportFields.some((field) => formData[field.key].trim()) && (
              <Section title="Transport & vehicle details" eyebrow="02">
                <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                  {transportFields
                    .filter((field) => formData[field.key].trim())
                    .map((field) => (
                      <Field
                        key={field.key}
                        label={field.label}
                        value={formData[field.key]}
                        onChange={(value) => updateField(field.key, value)}
                      />
                    ))}
                </div>
              </Section>
            )}

            {formData.cargoItems.length > 0 && (
              <Section title="Cargo & items" eyebrow="03">
                <CargoItemsEditor
                  items={formData.cargoItems}
                  onChange={updateCargoItems}
                />
              </Section>
            )}

            {Object.values(formData.invoiceTotals).some((value) =>
              typeof value === "string" ? value.trim() : value > 0,
            ) && (
              <Section title="Invoice totals" eyebrow="04">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(
                    [
                      "subtotal",
                      "tax",
                      "freight",
                      "insurance",
                      "otherCharges",
                      "totalAmount",
                      "currency",
                    ] as const
                  )
                    .filter((key) =>
                      key === "currency"
                        ? formData.invoiceTotals.currency.trim()
                        : formData.invoiceTotals[key] > 0,
                    )
                    .map((key) => {
                      const labels = {
                        subtotal: "Subtotal",
                        tax: "Tax",
                        freight: "Freight",
                        insurance: "Insurance",
                        otherCharges: "Other charges",
                        totalAmount: "Invoice total",
                        currency: "Currency",
                      };
                      return (
                        <Field
                          key={key}
                          label={labels[key]}
                          value={String(formData.invoiceTotals[key] || "")}
                          onChange={(value) => updateInvoiceTotal(key, value)}
                        />
                      );
                    })}
                </div>
                <p className="mt-2 text-[10px] text-slate-400">
                  Values are extracted from the document; missing totals are not
                  calculated automatically.
                </p>
              </Section>
            )}

            {(formData.documentType.trim() ||
              formData.additionalFields.some(
                (field) => field.label.trim() && field.value.trim(),
              )) && (
              <Section
                title="Additional document metadata"
                eyebrow="05"
                defaultOpen={false}
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {formData.documentType.trim() && (
                    <Field
                      label="Document type"
                      value={formData.documentType}
                      onChange={(value) => updateField("documentType", value)}
                    />
                  )}
                  {formData.additionalFields
                    .filter((field) => field.label.trim() && field.value.trim())
                    .map((field, index) => (
                      <Field
                        key={`${field.label}-${index}`}
                        label={field.label}
                        value={field.value}
                        onChange={(value) =>
                          updateAdditionalField(
                            formData.additionalFields.indexOf(field),
                            value,
                          )
                        }
                      />
                    ))}
                </div>
              </Section>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2 border-t border-slate-200 bg-white px-5 py-2 text-[10px] text-slate-400">
            <span>
              {saved ? "Draft saved in this browser" : "Unsaved changes"}
            </span>
            <span className="ml-auto">
              Draft is stored locally, not in a cloud database.
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
