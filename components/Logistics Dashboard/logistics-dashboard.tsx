"use client";

import { useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import ExcelJS from "exceljs";

import {
  BadgeCheck,
  ChevronDown,
  Download,
  FileCheck2,
  FileText,
  GripVertical,
  Plus,
  Save,
  ScanLine,
  Trash2,
  Upload,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { parseFreightDocument } from "@/app/actions/parseDocument";

// ======================================================
// TYPES — parseFreightDocument schema bilan mos
// ======================================================

type CargoItem = {
  description: string;
  hsCode: string;
  packages: number;
  grossKg: number;
  volumeM3: number;
};

type FreightFormData = {
  shipperName: string;
  address: string;
  consigneeName: string;
  deliveryDestination: string;
  truckLicensePlate: string;
  trailerNumber: string;
  carrierName: string;
  driverId: string;
  cargoItems: CargoItem[];
  confidenceScore: number;
};

type TextFieldKey =
  | "shipperName"
  | "address"
  | "consigneeName"
  | "deliveryDestination"
  | "truckLicensePlate"
  | "trailerNumber"
  | "carrierName"
  | "driverId";

// ======================================================
// INITIAL STATE
// ======================================================

const initialFormData: FreightFormData = {
  shipperName: "Nordic Components GmbH",
  address: "Hafenstrasse 16, 20457 Hamburg, DE",
  consigneeName: "Atlas Retail Distribution",
  deliveryDestination: "Via Roma 42, 20121 Milano, IT",
  truckLicensePlate: "HH - NR 4821",
  trailerNumber: "TR - 9084 - KL",
  carrierName: "EuroTrans Logistics S.p.A.",
  driverId: "DRV-20841",

  cargoItems: [
    {
      description: "Electronic control units",
      hsCode: "8537 10 99",
      packages: 24,
      grossKg: 8420,
      volumeM3: 12,
    },
  ],

  confidenceScore: 94.6,
};

// ======================================================
// FIELD CONFIG
// ======================================================

const shipmentFields: {
  label: string;
  key: TextFieldKey;
}[] = [
  { label: "Shipper name", key: "shipperName" },
  { label: "Address", key: "address" },
  { label: "Consignee name", key: "consigneeName" },
  { label: "Delivery destination", key: "deliveryDestination" },
];

const transportFields: {
  label: string;
  key: TextFieldKey;
}[] = [
  { label: "Truck license plate", key: "truckLicensePlate" },
  { label: "Trailer number", key: "trailerNumber" },
  { label: "Carrier name", key: "carrierName" },
  { label: "Driver ID", key: "driverId" },
];

// ======================================================
// SECTION COMPONENT
// ======================================================

function Section({
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
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-slate-50"
      >
        <span className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">
            {eyebrow}
          </span>

          <span className="text-[13px] font-semibold text-slate-800">
            {title}
          </span>
        </span>

        <ChevronDown
          className={`size-4 text-slate-400 transition-transform ${
            open ? "" : "-rotate-90"
          }`}
        />
      </button>

      {open && <div className="px-5 pb-4">{children}</div>}
    </section>
  );
}

// ======================================================
// CONTROLLED FIELD
// ======================================================

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </span>

      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-full rounded-md border border-slate-200 bg-slate-50/70 px-2.5 text-[12px] text-slate-700 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100"
      />
    </label>
  );
}

// ======================================================
// DOCUMENT PREVIEW
// ======================================================

function DocumentPreview({
  file,
  onUpload,
  loading,
}: {
  file: File | null;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  loading: boolean;
}) {
  const [zoom, setZoom] = useState(100);
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-100">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-sky-600 text-white">
            <ScanLine className="size-4" />
          </div>

          <div>
            <p className="text-[12px] font-semibold text-slate-800">
              Source document
            </p>

            <p className="max-w-[200px] truncate font-mono text-[10px] text-slate-400">
              {file?.name ?? "No document selected"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-0.5 rounded-md border border-slate-200 p-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setZoom((z) => Math.max(70, z - 10))}
          >
            <ZoomOut className="size-3.5" />
          </Button>

          <span className="w-10 text-center font-mono text-[10px] text-slate-500">
            {zoom}%
          </span>

          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setZoom((z) => Math.min(140, z + 10))}
          >
            <ZoomIn className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-5">
        {previewUrl ? (
          file?.type === "application/pdf" ? (
            <iframe
              src={previewUrl}
              title="Freight document preview"
              className="h-full min-h-[500px] w-full bg-white"
            />
          ) : (
            <img
              src={previewUrl}
              alt="Freight document"
              className="mx-auto max-w-full origin-top shadow-lg"
              style={{ transform: `scale(${zoom / 100})` }}
            />
          )
        ) : (
          <div className="flex min-h-[400px] h-full items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white">
            <div className="text-center">
              <FileText className="mx-auto mb-3 size-10 text-slate-300" />

              <p className="text-sm font-medium text-slate-600">
                Upload a freight document
              </p>

              <p className="mt-1 text-xs text-slate-400">
                PDF, PNG, JPG or JPEG
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3">
        <span className="truncate text-[11px] text-slate-500">
          {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "No file"}
        </span>

        <label
          className={`cursor-pointer ${
            loading ? "pointer-events-none opacity-50" : ""
          }`}
        >
          <span className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs hover:bg-slate-50">
            <Upload className="size-3.5" />
            Upload document
          </span>

          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={onUpload}
            disabled={loading}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
}

// ======================================================
// MAIN DASHBOARD
// ======================================================

export function LogisticsDashboard() {
  const [formData, setFormData] = useState<FreightFormData>(initialFormData);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  // ====================================================
  // UPDATE TEXT FIELD
  // ====================================================

  function updateField(key: TextFieldKey, value: string) {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));

    setSaved(false);
  }

  // ====================================================
  // UPLOAD + AI PARSING
  // ====================================================

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    setFile(selectedFile);
    setLoading(true);
    setError(null);
    setSaved(false);

    try {
      const form = new FormData();

      // Server Action aynan "document" key kutmoqda
      form.append("document", selectedFile);

      // Server Action kodi o'zgartirilmaydi
      const result = await parseFreightDocument(form);

      if (result.success && result.data) {
        // Gemini qaytargan JSON state'ga o'tadi
        setFormData(result.data as FreightFormData);
      } else {
        setError(result.error || "Document parsing failed.");
      }
    } catch (err) {
      console.error("Upload error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unexpected document processing error.",
      );
    } finally {
      setLoading(false);

      // Aynan shu faylni qayta yuklash imkoniyati
      event.target.value = "";
    }
  }

  // ====================================================
  // UPDATE CARGO
  // ====================================================

  function updateCargo(index: number, key: keyof CargoItem, value: string) {
    setFormData((prev) => ({
      ...prev,

      cargoItems: prev.cargoItems.map((item, i) => {
        if (i !== index) return item;

        if (key === "description" || key === "hsCode") {
          return {
            ...item,
            [key]: value,
          };
        }

        return {
          ...item,
          [key]: value === "" ? 0 : Number(value),
        };
      }),
    }));

    setSaved(false);
  }

  // ====================================================
  // ADD CARGO ITEM
  // ====================================================

  function addCargo() {
    setFormData((prev) => ({
      ...prev,

      cargoItems: [
        ...prev.cargoItems,
        {
          description: "",
          hsCode: "",
          packages: 0,
          grossKg: 0,
          volumeM3: 0,
        },
      ],
    }));

    setSaved(false);
  }

  // ====================================================
  // REMOVE CARGO ITEM
  // ====================================================

  function removeCargo(index: number) {
    setFormData((prev) => ({
      ...prev,

      cargoItems: prev.cargoItems.filter((_, i) => i !== index),
    }));

    setSaved(false);
  }

  // ====================================================
  // EXPORT
  // ====================================================

  function handleExport() {
    const blob = new Blob([JSON.stringify(formData, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "freight-document.json";
    link.click();

    URL.revokeObjectURL(url);
  }

  // ====================================================
  // SAVE
  // ====================================================

  function handleSave() {
    // Bu yerda formData database/API'ga yuborilishi mumkin
    console.log("Shipment data:", formData);

    setSaved(true);
  }

  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();

      workbook.creator = "FreightFlow";
      workbook.subject = "International Freight Shipment Report";
      workbook.title = "FreightFlow Shipment Report";
      workbook.created = new Date();

      // Brand colors
      const navy = "172554";
      const blue = "2563EB";
      const lightBlue = "DBEAFE";
      const white = "FFFFFF";
      const gray = "64748B";
      const borderColor = "CBD5E1";

      const border = {
        top: { style: "thin" as const, color: { argb: borderColor } },
        left: { style: "thin" as const, color: { argb: borderColor } },
        bottom: { style: "thin" as const, color: { argb: borderColor } },
        right: { style: "thin" as const, color: { argb: borderColor } },
      };

      // ==========================================
      // SHEET 1: SHIPMENT OVERVIEW
      // ==========================================

      const overview = workbook.addWorksheet("Shipment Overview");

      overview.columns = [
        { width: 25 },
        { width: 32 },
        { width: 25 },
        { width: 32 },
      ];

      // Main title
      overview.mergeCells("A1:D1");

      const title = overview.getCell("A1");
      title.value = "FREIGHTFLOW | SHIPMENT REPORT";
      title.font = {
        name: "Arial",
        size: 18,
        bold: true,
        color: { argb: white },
      };
      title.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: navy },
      };
      title.alignment = {
        vertical: "middle",
        horizontal: "left",
        indent: 1,
      };

      overview.getRow(1).height = 45;

      // Subtitle
      overview.mergeCells("A2:D2");

      const subtitle = overview.getCell("A2");
      subtitle.value = `Generated by FreightFlow | ${new Date().toLocaleString()}`;
      subtitle.font = {
        name: "Arial",
        size: 10,
        italic: true,
        color: { argb: gray },
      };

      overview.getRow(2).height = 25;

      // Section heading
      overview.mergeCells("A4:D4");

      const section = overview.getCell("A4");
      section.value = "SHIPMENT INFORMATION";
      section.font = {
        bold: true,
        size: 11,
        color: { argb: white },
      };
      section.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: blue },
      };
      section.alignment = { vertical: "middle", indent: 1 };

      overview.getRow(4).height = 28;

      // Shipment information
      const shipmentFields = [
        [
          "Shipper Name",
          formData.shipperName,
          "Consignee Name",
          formData.consigneeName,
        ],

        [
          "Shipper Address",
          formData.address,
          "Delivery Destination",
          formData.deliveryDestination,
        ],

        [
          "Truck License Plate",
          formData.truckLicensePlate,
          "Trailer Number",
          formData.trailerNumber,
        ],

        ["Carrier Name", formData.carrierName, "Driver ID", formData.driverId],

        [
          "AI Confidence Score",
          `${formData.confidenceScore}%`,
          "Cargo Items",
          formData.cargoItems.length,
        ],
      ];

      shipmentFields.forEach((fields, index) => {
        const rowNumber = index + 5;

        overview.addRow(fields);

        const row = overview.getRow(rowNumber);

        [1, 3].forEach((column) => {
          const cell = row.getCell(column);
          cell.font = {
            bold: true,
            color: { argb: navy },
            size: 10,
          };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: lightBlue },
          };
        });

        [2, 4].forEach((column) => {
          row.getCell(column).font = {
            color: { argb: "334155" },
            size: 10,
          };
        });

        row.eachCell((cell) => {
          cell.border = border;
          cell.alignment = {
            vertical: "middle",
            wrapText: true,
          };
        });

        row.height = 32;
      });

      // ==========================================
      // SHEET 2: CARGO DETAILS
      // ==========================================

      const cargoSheet = workbook.addWorksheet("Cargo Details");

      cargoSheet.columns = [
        { key: "description", width: 40 },
        { key: "hsCode", width: 18 },
        { key: "packages", width: 15 },
        { key: "grossKg", width: 20 },
        { key: "volumeM3", width: 18 },
      ];

      // Title
      cargoSheet.mergeCells("A1:E1");

      const cargoTitle = cargoSheet.getCell("A1");
      cargoTitle.value = "CARGO MANIFEST";
      cargoTitle.font = {
        name: "Arial",
        size: 18,
        bold: true,
        color: { argb: white },
      };
      cargoTitle.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: navy },
      };
      cargoTitle.alignment = {
        vertical: "middle",
        indent: 1,
      };

      cargoSheet.getRow(1).height = 45;

      // Subtitle
      cargoSheet.mergeCells("A2:E2");

      cargoSheet.getCell("A2").value =
        `Shipper: ${formData.shipperName} | Consignee: ${formData.consigneeName}`;

      cargoSheet.getCell("A2").font = {
        size: 10,
        color: { argb: gray },
        italic: true,
      };

      // Excel Table
      cargoSheet.addTable({
        name: "FreightCargoTable",
        ref: "A4",
        headerRow: true,
        totalsRow: false,

        style: {
          theme: "TableStyleMedium2",
          showRowStripes: true,
          showColumnStripes: false,
        },

        columns: [
          { name: "Cargo Description", filterButton: true },
          { name: "HS Code", filterButton: true },
          { name: "Packages", filterButton: true },
          { name: "Gross Weight (KG)", filterButton: true },
          { name: "Volume (M3)", filterButton: true },
        ],

        rows: formData.cargoItems.map((item) => [
          item.description,
          item.hsCode,
          item.packages,
          item.grossKg,
          item.volumeM3,
        ]),
      });

      // Style table header
      const headerRow = cargoSheet.getRow(4);
      headerRow.height = 35;

      headerRow.eachCell((cell) => {
        cell.font = {
          bold: true,
          color: { argb: white },
          size: 10,
        };

        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: navy },
        };

        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };

        cell.border = border;
      });

      // Style cargo data rows
      for (let rowNumber = 5; rowNumber <= cargoSheet.rowCount; rowNumber++) {
        const row = cargoSheet.getRow(rowNumber);

        row.height = 28;

        row.eachCell((cell) => {
          cell.font = {
            name: "Arial",
            size: 10,
            color: { argb: "334155" },
          };

          cell.border = border;

          cell.alignment = {
            vertical: "middle",
            horizontal: "left",
          };
        });

        // Number formatting
        row.getCell(3).numFmt = "#,##0";
        row.getCell(4).numFmt = "#,##0.00";
        row.getCell(5).numFmt = "#,##0.00";

        [3, 4, 5].forEach((column) => {
          row.getCell(column).alignment = {
            horizontal: "center",
            vertical: "middle",
          };
        });
      }

      // Freeze title and table header
      cargoSheet.views = [
        {
          state: "frozen",
          ySplit: 4,
          activeCell: "A5",
        },
      ];

      // Page settings
      cargoSheet.pageSetup = {
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
      };

      // ==========================================
      // DOWNLOAD EXCEL FILE
      // ==========================================

      const buffer = await workbook.xlsx.writeBuffer();

      const blob = new Blob([buffer as BlobPart], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;
      link.download = `FreightFlow_Shipment_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error("Excel export failed:", error);
      setError("Failed to generate Excel report. Please try again.");
    }
  };

  // ====================================================
  // UI
  // ====================================================

  return (
    <main className="flex h-screen min-h-[620px] flex-col overflow-hidden bg-slate-50 text-slate-900">
      {/* HEADER */}

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

        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Gemini AI
        </div>
      </header>

      {/* MAIN */}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* LEFT */}

        <div className="flex min-h-[380px] w-full min-w-0 flex-col border-r border-slate-200 lg:w-[45%]">
          <DocumentPreview
            file={file}
            onUpload={handleFileUpload}
            loading={loading}
          />
        </div>

        {/* RIGHT */}

        <div className="flex min-h-0 w-full min-w-0 flex-col bg-slate-50 lg:w-[55%]">
          {/* FORM HEADER */}

          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <h2 className="text-[14px] font-semibold">
                  Parsed shipment data
                </h2>

                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    error
                      ? "bg-red-50 text-red-700"
                      : loading
                        ? "bg-yellow-50 text-yellow-700"
                        : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {loading ? "Processing" : error ? "Failed" : "Ready"}
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
                disabled={loading}
              >
                <Download className="mr-1 size-3.5" />
                Export
              </Button>

              <Button size="sm" onClick={handleSave} disabled={loading}>
                <Save className="mr-1 size-3.5" />
                {saved ? "Saved" : "Confirm & save"}
              </Button>
            </div>
          </div>

          {/* LOADING */}

          {loading && (
            <div className="border-b border-yellow-200 bg-yellow-50 px-5 py-3">
              <p className="animate-pulse text-sm text-yellow-700">
                Gemini AI is analyzing your document...
              </p>
            </div>
          )}

          {/* ERROR */}

          {error && (
            <div className="border-b border-red-200 bg-red-50 px-5 py-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* FORM */}

          <div className="flex-1 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-2">
              <span className="text-[11px] font-medium text-slate-500">
                Review extracted fields
              </span>

              <span className="font-mono text-[10px] text-slate-400">
                CONFIDENCE{" "}
                <b className="text-emerald-600">{formData.confidenceScore}%</b>
              </span>
            </div>

            {/* SHIPMENT */}

            <Section title="Shipper & consignee info" eyebrow="01">
              <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                {shipmentFields.map((field) => (
                  <Field
                    key={field.key}
                    label={field.label}
                    value={formData[field.key]}
                    onChange={(value) => updateField(field.key, value)}
                  />
                ))}
              </div>
            </Section>

            {/* TRANSPORT */}

            <Section title="Transport & vehicle details" eyebrow="02">
              <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                {transportFields.map((field) => (
                  <Field
                    key={field.key}
                    label={field.label}
                    value={formData[field.key]}
                    onChange={(value) => updateField(field.key, value)}
                  />
                ))}
              </div>
            </Section>

            {/* CARGO */}

            <Section title="Cargo & items" eyebrow="03">
              <div className="overflow-x-auto rounded-md border border-slate-200">
                <table className="w-full min-w-[650px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[9px] uppercase tracking-wide text-slate-400">
                      <th className="w-8 px-2 py-2"></th>
                      <th className="px-2 py-2">Description</th>
                      <th className="px-2 py-2">HS code</th>
                      <th className="px-2 py-2">Packages</th>
                      <th className="px-2 py-2">Gross kg</th>
                      <th className="px-2 py-2">Volume m³</th>
                      <th className="w-8 px-2 py-2"></th>
                    </tr>
                  </thead>

                  <tbody>
                    {formData.cargoItems.map((item, index) => (
                      <tr
                        key={index}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-2 py-1.5 text-slate-300">
                          <GripVertical className="size-3" />
                        </td>

                        <td className="px-2 py-1.5">
                          <input
                            value={item.description}
                            onChange={(e) =>
                              updateCargo(index, "description", e.target.value)
                            }
                            className="h-7 w-full rounded border border-transparent bg-transparent px-1.5 text-[11px] focus:border-sky-500 focus:bg-white"
                          />
                        </td>

                        <td className="px-2 py-1.5">
                          <input
                            value={item.hsCode}
                            onChange={(e) =>
                              updateCargo(index, "hsCode", e.target.value)
                            }
                            className="h-7 w-full rounded border border-transparent bg-transparent px-1.5 text-[11px] focus:border-sky-500 focus:bg-white"
                          />
                        </td>

                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            value={item.packages}
                            onChange={(e) =>
                              updateCargo(index, "packages", e.target.value)
                            }
                            className="h-7 w-full rounded border border-transparent bg-transparent px-1.5 text-[11px] focus:border-sky-500 focus:bg-white"
                          />
                        </td>

                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            value={item.grossKg}
                            onChange={(e) =>
                              updateCargo(index, "grossKg", e.target.value)
                            }
                            className="h-7 w-full rounded border border-transparent bg-transparent px-1.5 text-[11px] focus:border-sky-500 focus:bg-white"
                          />
                        </td>

                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            step="0.01"
                            value={item.volumeM3}
                            onChange={(e) =>
                              updateCargo(index, "volumeM3", e.target.value)
                            }
                            className="h-7 w-full rounded border border-transparent bg-transparent px-1.5 text-[11px] focus:border-sky-500 focus:bg-white"
                          />
                        </td>

                        <td className="px-2 py-1.5">
                          <button
                            type="button"
                            onClick={() => removeCargo(index)}
                            className="text-red-400 hover:text-red-600"
                            aria-label="Delete cargo item"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={addCargo}
                className="mt-3 flex items-center gap-1 text-[11px] font-medium text-sky-600 hover:text-sky-700"
              >
                <Plus className="size-3.5" />
                Add cargo line
              </button>
            </Section>

            {/* METADATA */}

            <Section
              title="Additional document metadata"
              eyebrow="04"
              defaultOpen={false}
            >
              <Field
                label="Document type"
                value="CMR / Invoice / Bill of Lading"
                onChange={() => {}}
              />
            </Section>
          </div>

          {/* FOOTER */}

          <div className="flex shrink-0 items-center gap-2 border-t border-slate-200 bg-white px-5 py-2 text-[10px] text-slate-400">
            <span>
              {saved ? "Changes saved locally" : "Changes are tracked in state"}
            </span>

            <span className="ml-auto">
              Tab through fields to validate quickly
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
