import type { CargoItem, FreightFormData } from "@/components/logistics/types";

export type ValidationDocument = {
  id: string;
  name: string;
  data: FreightFormData;
};

export type ValidationSeverity = "error" | "warning" | "info";
export type ValidationIssue = {
  id: string;
  severity: ValidationSeverity;
  category: "shipment" | "cargo" | "invoice" | "document";
  title: string;
  detail: string;
  documents: string[];
  field?: string;
};

export type ValidationReport = {
  issues: ValidationIssue[];
  counts: { error: number; warning: number; info: number };
  checkedRules: number;
  status: "clear" | "review" | "attention";
};

const normalize = (value: string) => value.toLowerCase().normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

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
const present = (value: string | number | undefined) => value !== undefined && value !== null && String(value).trim() !== "";
const numericTolerance = (a: number, b: number) => Math.max(0.02, Math.max(Math.abs(a), Math.abs(b)) * 0.01);
const format = (value: number, suffix = "") => `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(value)}${suffix}`;

function addIssue(
  issues: ValidationIssue[],
  severity: ValidationSeverity,
  category: ValidationIssue["category"],
  title: string,
  detail: string,
  documents: string[],
  field?: string,
) {
  issues.push({
    id: `${category}-${field ?? title}-${issues.length}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
    severity, category, title, detail, documents, field,
  });
}

function compareSharedField(
  documents: ValidationDocument[],
  field: keyof FreightFormData,
  label: string,
  severity: ValidationSeverity,
  issues: ValidationIssue[],
) {
  const values = documents.flatMap((doc) => {
    const value = doc.data[field];
    return typeof value === "string" && value.trim() ? [{ doc, value: value.trim() }] : [];
  });
  if (values.length === 0) return;
  const missing = documents.filter((doc) => !values.some((entry) => entry.doc.id === doc.id)).map((doc) => doc.name);
  if (values.length >= 2) {
    const normalizer = field === "shipperName" || field === "consigneeName" ? normalizeEntityName : normalize;
    const unique = new Set(values.map(({ value }) => normalizer(value)));
    if (unique.size > 1) addIssue(issues, severity, "shipment", `${label} differs between documents`, values.map(({ doc, value }) => `${doc.name}: ${value}`).join(" · "), values.map(({ doc }) => doc.name), String(field));
  }
  if (missing.length > 0) addIssue(issues, "info", "document", `${label} is missing from some documents`, `Found in ${values.length} of ${documents.length} documents. Missing: ${missing.join(", ")}.`, missing, String(field));
}

function compareCargoField(
  groupLabel: string,
  entries: Array<{ doc: ValidationDocument; item: CargoItem }>,
  field: keyof CargoItem,
  label: string,
  issues: ValidationIssue[],
  options: { numeric?: boolean; suffix?: string; severity?: ValidationSeverity } = {},
) {
  const values = entries.flatMap(({ doc, item }) => {
    const raw = item[field];
    const isKnown = typeof raw === "number" ? raw > 0 : typeof raw === "string" && raw.trim().length > 0;
    return isKnown ? [{ doc, value: raw as string | number }] : [];
  });
  if (values.length === 0) return;
  const missing = entries.filter(({ item }) => { const raw = item[field]; return !(typeof raw === "number" ? raw > 0 : typeof raw === "string" && raw.trim().length > 0); }).map(({ doc }) => doc.name);
  if (missing.length > 0) addIssue(issues, "info", "document", `${groupLabel}: ${label} is missing from some matched cargo lines`, `Found in ${values.length} of ${entries.length} matched cargo lines. Missing: ${missing.join(", ")}.`, missing, String(field));
  if (values.length < 2) return;
  const differs = options.numeric
    ? values.some(({ value }) => Math.abs(Number(value) - Number(values[0].value)) > numericTolerance(Number(value), Number(values[0].value)))
    : new Set(values.map(({ value }) => normalize(String(value))).filter(Boolean)).size > 1;
  if (differs) {
    const rendered = values.map(({ doc, value }) => `${doc.name}: ${options.numeric ? format(Number(value), options.suffix) : value}`).join(" · ");
    addIssue(issues, options.severity ?? "warning", "cargo", `${groupLabel}: ${label} differs`, rendered,
      values.map(({ doc }) => doc.name), String(field));
  }
}

function compareAggregateMetric(
  documents: ValidationDocument[],
  label: string,
  metric: (document: ValidationDocument) => number,
  suffix: string,
  issues: ValidationIssue[],
) {
  const values = documents.map((doc) => ({ doc, value: metric(doc) })).filter(({ value }) => value > 0);
  if (values.length === 0) return;
  if (values.length < documents.length) {
    const missing = documents.filter((doc) => !values.some((entry) => entry.doc.id === doc.id)).map((doc) => doc.name);
    addIssue(issues, "info", "document", `Shipment ${label.toLowerCase()} is missing from some documents`, `Found in ${values.length} of ${documents.length} documents. Missing: ${missing.join(", ")}.`, missing, label);
  }
  if (values.length < 2) return;
  const baseline = values[0].value;
  if (values.some(({ value }) => Math.abs(value - baseline) > numericTolerance(value, baseline))) {
    addIssue(issues, "warning", "shipment", `Shipment ${label.toLowerCase()} differs between documents`,
      values.map(({ doc, value }) => `${doc.name}: ${format(value, suffix)}`).join(" · "),
      values.map(({ doc }) => doc.name), label);
  }
}
function validateInvoice(document: ValidationDocument, issues: ValidationIssue[]) {
  const { invoiceTotals: totals, cargoItems } = document.data;
  const hasInvoiceData = totals.totalAmount > 0 || totals.subtotal > 0 || cargoItems.some((item) => item.amount > 0);
  if (!hasInvoiceData) return;

  const lineAmounts = cargoItems.map((item) => item.amount).filter((amount) => amount > 0);
  const lineSum = lineAmounts.reduce((sum, amount) => sum + amount, 0);
  if (totals.subtotal > 0 && lineSum > 0 && Math.abs(lineSum - totals.subtotal) > numericTolerance(lineSum, totals.subtotal)) {
    addIssue(issues, "warning", "invoice", "Invoice subtotal does not equal line-item total",
      `Line items total ${totals.currency} ${format(lineSum)}; extracted subtotal is ${totals.currency} ${format(totals.subtotal)}.`, [document.name], "subtotal");
  }

  const components = totals.subtotal + totals.tax + totals.freight + totals.insurance + totals.otherCharges;
  if (totals.totalAmount > 0 && components > 0 && Math.abs(components - totals.totalAmount) > numericTolerance(components, totals.totalAmount)) {
    addIssue(issues, "warning", "invoice", "Invoice total does not reconcile",
      `Subtotal + tax + freight + insurance + other charges = ${totals.currency} ${format(components)}; extracted total is ${totals.currency} ${format(totals.totalAmount)}.`, [document.name], "totalAmount");
  }

  cargoItems.forEach((item, index) => {
    if (item.quantity > 0 && item.unitPrice > 0 && item.amount > 0) {
      const calculated = item.quantity * item.unitPrice;
      if (Math.abs(calculated - item.amount) > numericTolerance(calculated, item.amount)) {
        addIssue(issues, "warning", "invoice", `Line ${index + 1}: amount does not equal quantity × unit price`,
          `${format(item.quantity)} × ${format(item.unitPrice)} = ${format(calculated)}, but extracted amount is ${format(item.amount)}.`, [document.name], `cargoItems.${index}.amount`);
      }
    }
    if (item.netKg > 0 && item.grossKg > 0 && item.grossKg < item.netKg - numericTolerance(item.grossKg, item.netKg)) {
      addIssue(issues, "error", "cargo", `Line ${index + 1}: gross weight is below net weight`,
        `Net weight is ${format(item.netKg, " kg")} while gross weight is ${format(item.grossKg, " kg")} in ${document.name}.`, [document.name], `cargoItems.${index}.grossKg`);
    }
  });
}

export function validateCrossDocuments(
  documents: ValidationDocument[],
  cargoGroups: Array<{ entries: Array<{ docIndex: number; item: CargoItem }> }>,
): ValidationReport {
  const issues: ValidationIssue[] = [];
  let checkedRules = 0;

  const sharedFields: Array<[keyof FreightFormData, string, ValidationSeverity]> = [
    ["shipperName", "Shipper", "error"],
    ["consigneeName", "Consignee", "error"],
    ["deliveryDestination", "Delivery destination", "error"],
    ["carrierName", "Carrier", "warning"],
    ["truckLicensePlate", "Truck license plate", "warning"],
    ["trailerNumber", "Trailer number", "warning"],
  ];
  sharedFields.forEach(([field, label, severity]) => {
    checkedRules += 1;
    compareSharedField(documents, field, label, severity, issues);
  });

  const aggregateChecks: Array<{ label: string; metric: (document: ValidationDocument) => number; suffix: string }> = [
    { label: "total packages", metric: (doc) => doc.data.cargoItems.reduce((sum, item) => sum + item.packages, 0), suffix: "" },
    { label: "total gross weight", metric: (doc) => doc.data.cargoItems.reduce((sum, item) => sum + item.grossKg, 0), suffix: " kg" },
    { label: "total net weight", metric: (doc) => doc.data.cargoItems.reduce((sum, item) => sum + item.netKg, 0), suffix: " kg" },
  ];
  aggregateChecks.forEach(({ label, metric, suffix }) => {
    checkedRules += 1;
    compareAggregateMetric(documents, label, metric, suffix, issues);
  });

  const invoiceCurrencies = documents.flatMap((doc) => doc.data.invoiceTotals.totalAmount > 0 && doc.data.invoiceTotals.currency.trim()
    ? [{ doc, currency: normalize(doc.data.invoiceTotals.currency) }]
    : []);
  if (invoiceCurrencies.length > 1 && new Set(invoiceCurrencies.map((entry) => entry.currency)).size > 1) {
    addIssue(issues, "error", "invoice", "Invoice currencies do not match",
      invoiceCurrencies.map(({ doc }) => `${doc.name}: ${doc.data.invoiceTotals.currency}`).join(" · "),
      invoiceCurrencies.map(({ doc }) => doc.name), "invoiceTotals.currency");
  }
  checkedRules += 1;

  cargoGroups.forEach((group, index) => {
    const entries = group.entries.map((entry) => ({ doc: documents[entry.docIndex], item: entry.item }));
    const description = entries.find(({ item }) => item.description)?.item.description || `Cargo item ${index + 1}`;
    const groupLabel = description.length > 48 ? `${description.slice(0, 45)}…` : description;
    const checks: Array<[keyof CargoItem, string, boolean, string?]> = [
      ["hsCode", "HS code", false], ["quantity", "quantity", true], ["packages", "package count", true],
      ["netKg", "net weight", true, " kg"], ["grossKg", "gross weight", true, " kg"],
      ["volumeM3", "volume", true, " m³"], ["unitPrice", "unit price", true], ["amount", "line amount", true],
      ["dimensions", "dimensions", false],
    ];
    checks.forEach(([field, label, numeric, suffix]) => {
      checkedRules += 1;
      compareCargoField(groupLabel, entries, field, label, issues, { numeric, suffix, severity: field === "hsCode" ? "error" : "warning" });
    });
    if (entries.length < documents.length && entries.length > 0) {
      checkedRules += 1;
      const missing = documents.filter((doc) => !entries.some((entry) => entry.doc.id === doc.id)).map((doc) => doc.name);
      addIssue(issues, "info", "document", `${groupLabel}: item not found in every document`,
        `Matched in ${entries.length} of ${documents.length} documents. Not found in: ${missing.join(", ")}.`, missing, "cargoItems");
    }
  });

  documents.forEach((document) => {
    checkedRules += 3;
    validateInvoice(document, issues);
  });

  const counts = {
    error: issues.filter((issue) => issue.severity === "error").length,
    warning: issues.filter((issue) => issue.severity === "warning").length,
    info: issues.filter((issue) => issue.severity === "info").length,
  };
  return {
    issues,
    counts,
    checkedRules,
    status: counts.error > 0 ? "attention" : counts.warning > 0 || counts.info > 0 ? "review" : "clear",
  };
}
