import ExcelJS from "exceljs";
import type { CargoItem, FreightFormData } from "@/components/logistics/types";
import type { ValidationReport } from "@/lib/validation/cross-document-validation";

type ReportDocument = { id: string; name: string; data: FreightFormData };
type ReportComparisonRow = { label: string; values: string[]; result: "match" | "mismatch" | "incomplete" };
type ReportCargoGroup = { entries: Array<{ docIndex: number; itemIndex: number; item: CargoItem }> };

export type ValidationExportData = {
  documents: ReportDocument[];
  rows: ReportComparisonRow[];
  cargoGroups: ReportCargoGroup[];
  validation: ValidationReport;
  matchedGroups: number;
  unmatchedLines: number;
};

const palette = {
  navy: "172554", blue: "0E7490", pale: "E0F2FE", white: "FFFFFF",
  text: "334155", muted: "64748B", border: "CBD5E1", red: "FEE2E2",
  amber: "FEF3C7", sky: "E0F2FE", green: "DCFCE7",
};
const border = {
  top: { style: "thin" as const, color: { argb: palette.border } },
  left: { style: "thin" as const, color: { argb: palette.border } },
  bottom: { style: "thin" as const, color: { argb: palette.border } },
  right: { style: "thin" as const, color: { argb: palette.border } },
};
const statusLabel = (status: ValidationReport["status"]) => status === "attention" ? "ACTION REQUIRED" : status === "review" ? "REVIEW RECOMMENDED" : "NO ISSUES FOUND";
const severityLabel = (severity: "error" | "warning" | "info") => severity === "error" ? "ERROR" : severity === "warning" ? "WARNING" : "INCOMPLETE";
const safeFileName = (value: string) => value.replace(/[^a-z0-9-_]+/gi, "_").replace(/^_+|_+$/g, "").slice(0, 48) || "Shipment";

function styleHeader(sheet: ExcelJS.Worksheet, rowNumber: number, start: number, end: number) {
  for (let column = start; column <= end; column += 1) {
    const cell = sheet.getCell(rowNumber, column);
    cell.font = { bold: true, color: { argb: palette.white }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: palette.navy } };
    cell.alignment = { vertical: "middle", wrapText: true };
    cell.border = border;
  }
  sheet.getRow(rowNumber).height = 30;
}

function styleBody(sheet: ExcelJS.Worksheet, from: number, to: number, columns: number) {
  for (let rowIndex = from; rowIndex <= to; rowIndex += 1) {
    const row = sheet.getRow(rowIndex);
    row.eachCell({ includeEmpty: true }, (cell, column) => {
      if (column <= columns) {
        cell.font = { name: "Arial", size: 10, color: { argb: palette.text } };
        cell.alignment = { vertical: "top", wrapText: true };
        cell.border = border;
      }
    });
    row.height = 30;
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function exportValidationExcel(data: ValidationExportData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "FreightFlow";
  workbook.title = "FreightFlow Cross-Document Validation";
  workbook.subject = "Shipment document consistency report";
  workbook.created = new Date();

  const overview = workbook.addWorksheet("Report Overview");
  overview.columns = [{ width: 30 }, { width: 28 }, { width: 30 }, { width: 28 }];
  overview.mergeCells("A1:D1");
  overview.getCell("A1").value = "FREIGHTFLOW | VALIDATION REPORT";
  overview.getCell("A1").font = { bold: true, size: 18, color: { argb: palette.white } };
  overview.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: palette.navy } };
  overview.getCell("A1").alignment = { vertical: "middle", indent: 1 };
  overview.getRow(1).height = 44;
  overview.mergeCells("A2:D2");
  overview.getCell("A2").value = `Generated ${new Date().toLocaleString()} · ${data.documents.length} successfully parsed documents`;
  overview.getCell("A2").font = { italic: true, color: { argb: palette.muted }, size: 10 };
  overview.addRow([]);
  overview.addRow(["Overall result", statusLabel(data.validation.status), "Rules evaluated", data.validation.checkedRules]);
  overview.addRow(["Errors", data.validation.counts.error, "Warnings", data.validation.counts.warning]);
  overview.addRow(["Incomplete / info", data.validation.counts.info, "Matched cargo groups", data.matchedGroups]);
  overview.addRow(["Unmatched cargo lines", data.unmatchedLines, "Documents included", data.documents.length]);
  styleBody(overview, 4, 7, 4);
  [4, 5, 6, 7].forEach((r) => {
    [1, 3].forEach((c) => {
      overview.getCell(r, c).font = { bold: true, color: { argb: palette.navy } };
      overview.getCell(r, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: palette.pale } };
    });
  });
  overview.addRow([]);
  overview.addRow(["SOURCE DOCUMENTS"]);
  overview.mergeCells("A9:D9");
  overview.getCell("A9").font = { bold: true, color: { argb: palette.white } };
  overview.getCell("A9").fill = { type: "pattern", pattern: "solid", fgColor: { argb: palette.blue } };
  overview.addRow(["File name", "Document type", "AI confidence", "Cargo lines"]);
  styleHeader(overview, 10, 1, 4);
  data.documents.forEach((doc) => overview.addRow([doc.name, doc.data.documentType || "Unknown", `${doc.data.confidenceScore}%`, doc.data.cargoItems.length]));
  styleBody(overview, 11, overview.rowCount, 4);
  overview.views = [{ state: "frozen", ySplit: 10 }];

  const comparison = workbook.addWorksheet("Document Comparison");
  comparison.columns = [{ header: "Field", key: "field", width: 28 }, ...data.documents.map((doc, index) => ({ header: doc.name, key: `doc${index}`, width: 28 })), { header: "Result", key: "result", width: 18 }];
  styleHeader(comparison, 1, 1, comparison.columnCount);
  data.rows.forEach((row) => comparison.addRow([row.label, ...row.values, row.result.toUpperCase()]));
  styleBody(comparison, 2, comparison.rowCount, comparison.columnCount);
  comparison.views = [{ state: "frozen", ySplit: 1, xSplit: 1 }];
  comparison.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, comparison.rowCount), column: comparison.columnCount } };

  const cargo = workbook.addWorksheet("Cargo Matching");
  cargo.columns = [
    { header: "Cargo group", key: "group", width: 34 }, { header: "Document", key: "document", width: 30 },
    { header: "Line #", key: "line", width: 10 }, { header: "Description", key: "description", width: 38 },
    { header: "HS Code", key: "hs", width: 16 }, { header: "Quantity", key: "quantity", width: 14 },
    { header: "Packages", key: "packages", width: 14 }, { header: "Net kg", key: "net", width: 14 },
    { header: "Gross kg", key: "gross", width: 14 }, { header: "Volume m³", key: "volume", width: 14 },
    { header: "Unit price", key: "price", width: 14 }, { header: "Currency", key: "currency", width: 12 },
    { header: "Amount", key: "amount", width: 16 },
  ];
  styleHeader(cargo, 1, 1, cargo.columnCount);
  data.cargoGroups.forEach((group, index) => {
    const label = group.entries.find((entry) => entry.item.description)?.item.description || `Cargo group ${index + 1}`;
    group.entries.forEach((entry) => cargo.addRow([
      label, data.documents[entry.docIndex]?.name ?? "Unknown", entry.itemIndex + 1,
      entry.item.description, entry.item.hsCode, entry.item.quantity || "", entry.item.packages || "",
      entry.item.netKg || "", entry.item.grossKg || "", entry.item.volumeM3 || "",
      entry.item.unitPrice || "", entry.item.currency, entry.item.amount || "",
    ]));
  });
  styleBody(cargo, 2, cargo.rowCount, cargo.columnCount);
  cargo.views = [{ state: "frozen", ySplit: 1 }];
  if (cargo.rowCount > 1) cargo.autoFilter = { from: { row: 1, column: 1 }, to: { row: cargo.rowCount, column: cargo.columnCount } };

  const issues = workbook.addWorksheet("Validation Issues");
  issues.columns = [
    { header: "Severity", key: "severity", width: 16 }, { header: "Category", key: "category", width: 16 },
    { header: "Issue", key: "title", width: 48 }, { header: "Details", key: "detail", width: 76 },
    { header: "Affected documents", key: "documents", width: 48 }, { header: "Field", key: "field", width: 24 },
  ];
  styleHeader(issues, 1, 1, issues.columnCount);
  data.validation.issues.forEach((issue) => issues.addRow([
    severityLabel(issue.severity), issue.category, issue.title, issue.detail, issue.documents.join("; "), issue.field ?? "",
  ]));
  styleBody(issues, 2, issues.rowCount, issues.columnCount);
  for (let row = 2; row <= issues.rowCount; row += 1) {
    const severity = String(issues.getCell(row, 1).value);
    const fill = severity === "ERROR" ? palette.red : severity === "WARNING" ? palette.amber : palette.sky;
    issues.getCell(row, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
    issues.getCell(row, 1).font = { bold: true, color: { argb: palette.text } };
    issues.getRow(row).height = 42;
  }
  issues.views = [{ state: "frozen", ySplit: 1 }];
  if (issues.rowCount > 1) issues.autoFilter = { from: { row: 1, column: 1 }, to: { row: issues.rowCount, column: issues.columnCount } };

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(new Blob([buffer as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `FreightFlow_Validation_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

export function exportValidationPdf(data: ValidationExportData) {
  // Open synchronously from the click handler so popup blockers do not suppress the report.
  const popup = window.open("", "_blank", "width=1100,height=800");
  if (!popup) throw new Error("The report window was blocked. Allow pop-ups for this site and try again.");

  const issueRows = data.validation.issues.length
    ? data.validation.issues.map((issue) => `<tr><td><span class="pill ${issue.severity}">${severityLabel(issue.severity)}</span></td><td>${escapeHtml(issue.title)}</td><td>${escapeHtml(issue.detail)}</td><td>${escapeHtml(issue.documents.join(", "))}</td></tr>`).join("")
    : `<tr><td colspan="4">No inconsistencies were found in the available extracted data.</td></tr>`;
  const documentRows = data.documents.map((doc) => `<tr><td>${escapeHtml(doc.name)}</td><td>${escapeHtml(doc.data.documentType || "Unknown")}</td><td>${escapeHtml(`${doc.data.confidenceScore}%`)}</td><td>${doc.data.cargoItems.length}</td></tr>`).join("");
  const comparisonRows = data.rows.map((row) => `<tr><td>${escapeHtml(row.label)}</td>${row.values.map((value) => `<td>${escapeHtml(value || "Not found")}</td>`).join("")}<td>${escapeHtml(row.result.toUpperCase())}</td></tr>`).join("");
  const cargoRows = data.cargoGroups.flatMap((group, index) => group.entries.map((entry) => `<tr><td>${escapeHtml(group.entries.find((x) => x.item.description)?.item.description || `Cargo group ${index + 1}`)}</td><td>${escapeHtml(data.documents[entry.docIndex]?.name)}</td><td>${escapeHtml(entry.item.description)}</td><td>${escapeHtml(entry.item.hsCode)}</td><td>${entry.item.quantity || "—"} ${escapeHtml(entry.item.quantityUnit)}</td><td>${entry.item.packages || "—"}</td><td>${entry.item.netKg || "—"}</td><td>${entry.item.grossKg || "—"}</td><td>${entry.item.amount || "—"} ${escapeHtml(entry.item.currency)}</td></tr>`)).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>FreightFlow Validation Report</title><style>
    *{box-sizing:border-box}body{font:12px/1.45 Arial,sans-serif;color:#1e293b;margin:32px}h1{font-size:23px;margin:0}h2{font-size:15px;margin:26px 0 9px;color:#172554}p{color:#64748b}.brand{background:#172554;color:white;padding:22px 24px;border-radius:10px}.brand p{color:#cbd5e1;margin:6px 0 0}.status{display:inline-block;margin-top:12px;padding:6px 10px;border-radius:20px;background:${data.validation.status === "attention" ? "#fee2e2" : data.validation.status === "review" ? "#fef3c7" : "#dcfce7"};font-weight:bold}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0}.stat{border:1px solid #cbd5e1;border-radius:8px;padding:12px}.stat b{display:block;font-size:22px;margin-top:4px}.muted{color:#64748b}table{width:100%;border-collapse:collapse;font-size:10px;page-break-inside:auto}thead{display:table-header-group}tr{page-break-inside:avoid}th{background:#172554;color:white;text-align:left}th,td{border:1px solid #cbd5e1;padding:7px;vertical-align:top;overflow-wrap:anywhere}.pill{font-size:9px;font-weight:bold;padding:3px 6px;border-radius:10px}.error{background:#fee2e2;color:#991b1b}.warning{background:#fef3c7;color:#92400e}.info{background:#e0f2fe;color:#075985}.note{margin-top:22px;padding:10px;background:#f1f5f9;border-radius:6px;color:#475569;font-size:10px}.actions{margin:18px 0}.actions button{border:0;background:#0e7490;color:white;padding:10px 16px;border-radius:6px;cursor:pointer}@media print{body{margin:12mm}.actions{display:none}h2{page-break-after:avoid}}
    </style></head><body><div class="brand"><h1>FREIGHTFLOW | VALIDATION REPORT</h1><p>Cross-document consistency and shipment risk summary · Generated ${escapeHtml(new Date().toLocaleString())}</p><span class="status">${escapeHtml(statusLabel(data.validation.status))}</span></div>
    <div class="stats"><div class="stat">Documents<b>${data.documents.length}</b></div><div class="stat">Rules evaluated<b>${data.validation.checkedRules}</b></div><div class="stat">Errors<b>${data.validation.counts.error}</b></div><div class="stat">Warnings<b>${data.validation.counts.warning}</b></div></div>
    <p class="muted">Incomplete / informational findings: <b>${data.validation.counts.info}</b> · Matched cargo groups: <b>${data.matchedGroups}</b> · Unmatched lines: <b>${data.unmatchedLines}</b></p>
    <div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div>
    <h2>Source documents</h2><table><thead><tr><th>File</th><th>Document type</th><th>AI confidence</th><th>Cargo lines</th></tr></thead><tbody>${documentRows}</tbody></table>
    <h2>Shipment-level comparison</h2><table><thead><tr><th>Field</th>${data.documents.map((doc) => `<th>${escapeHtml(doc.name)}</th>`).join("")}<th>Result</th></tr></thead><tbody>${comparisonRows || `<tr><td colspan="${data.documents.length + 2}">No comparable shipment fields were extracted.</td></tr>`}</tbody></table>
    <h2>Cargo line-item matching</h2><table><thead><tr><th>Group</th><th>Document</th><th>Description</th><th>HS code</th><th>Quantity</th><th>Packages</th><th>Net kg</th><th>Gross kg</th><th>Amount</th></tr></thead><tbody>${cargoRows || `<tr><td colspan="9">No cargo lines extracted.</td></tr>`}</tbody></table>
    <h2>Validation findings</h2><table><thead><tr><th>Severity</th><th>Finding</th><th>Details</th><th>Affected documents</th></tr></thead><tbody>${issueRows}</tbody></table>
    <div class="note">Automated checks use extracted document data and deterministic validation rules. Missing fields are treated as incomplete rather than confirmed errors. Similar cargo descriptions may be incorrectly grouped or left unmatched. Always verify flagged findings against the original documents before operational, customs, or payment decisions.</div>
    <script>window.addEventListener('load',()=>setTimeout(()=>window.print(),350));</script></body></html>`;
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
}
