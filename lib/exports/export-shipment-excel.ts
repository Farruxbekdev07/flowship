import ExcelJS from "exceljs";
import type { FreightFormData } from "@/components/logistics/types";

const COLORS = {
  navy: "FF14243A", navyLight: "FF203B5C", blue: "FF1677C8", cyan: "FF16A6B6",
  lightBlue: "FFEAF3FB", lightCyan: "FFE8F7F8", lightGray: "FFF3F5F7",
  mediumGray: "FFD8DEE6", darkGray: "FF526174", white: "FFFFFFFF",
  black: "FF17212F", green: "FF16845B",
};

export type ExportSourceFile = { name: string; type: string; size: number; lastModified?: number };
type Column<T> = { header: string; key: keyof T; width: number; kind?: "number" | "text" };

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: COLORS.mediumGray } },
  bottom: { style: "thin", color: { argb: COLORS.mediumGray } },
  left: { style: "thin", color: { argb: COLORS.mediumGray } },
  right: { style: "thin", color: { argb: COLORS.mediumGray } },
};

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "number") return Number.isFinite(value) && value !== 0;
  if (typeof value === "boolean") return true;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return false;
}
function asNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed !== 0 ? parsed : null;
}
function toCellValue(value: unknown): ExcelJS.CellValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value;
  return JSON.stringify(value);
}
function styleTitle(sheet: ExcelJS.Worksheet, title: string, subtitle: string, lastColumn: number) {
  sheet.mergeCells(1, 1, 1, lastColumn);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { name: "Aptos Display", size: 19, bold: true, color: { argb: COLORS.white } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.navy } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  sheet.getRow(1).height = 38;
  sheet.mergeCells(2, 1, 2, lastColumn);
  const subtitleCell = sheet.getCell(2, 1);
  subtitleCell.value = subtitle;
  subtitleCell.font = { name: "Aptos", size: 9, color: { argb: COLORS.darkGray } };
  subtitleCell.alignment = { vertical: "middle", wrapText: true };
  sheet.getRow(2).height = 25;
}
function addSection(sheet: ExcelJS.Worksheet, rowNumber: number, title: string, lastColumn: number) {
  sheet.mergeCells(rowNumber, 1, rowNumber, lastColumn);
  const cell = sheet.getCell(rowNumber, 1);
  cell.value = title.toUpperCase();
  cell.font = { bold: true, size: 10, color: { argb: COLORS.white } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.navyLight } };
  cell.alignment = { vertical: "middle" };
  sheet.getRow(rowNumber).height = 23;
}
function styleHeader(row: ExcelJS.Row) {
  row.height = 30;
  row.eachCell((cell) => {
    cell.font = { bold: true, size: 9, color: { argb: COLORS.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.blue } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = thinBorder;
  });
}
function styleDataRow(row: ExcelJS.Row, index: number) {
  row.height = 25;
  row.eachCell((cell) => {
    cell.font = { name: "Aptos", size: 9, color: { argb: COLORS.black } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: index % 2 ? COLORS.lightBlue : COLORS.white } };
    cell.alignment = { vertical: "middle", wrapText: true };
    cell.border = thinBorder;
  });
}
function configureSheet(sheet: ExcelJS.Worksheet, orientation: "portrait" | "landscape" = "landscape") {
  sheet.views = [{ state: "frozen", ySplit: 4 }];
  sheet.pageSetup = {
    paperSize: 9, orientation, fitToPage: true, fitToWidth: 1, fitToHeight: 0,
    margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
  };
  sheet.headerFooter.oddFooter = "&LFreightFlow | Shipment data&CPage &P of &N";
}
function addKeyValueSection(sheet: ExcelJS.Worksheet, startRow: number, title: string, entries: Array<[string, unknown]>): number {
  const filtered = entries.filter(([, value]) => hasValue(value));
  if (!filtered.length) return startRow;
  addSection(sheet, startRow, title, 2);
  let rowNumber = startRow + 1;
  filtered.forEach(([label, value], index) => {
    const row = sheet.getRow(rowNumber++);
    row.values = [label, toCellValue(value)];
    row.height = 24;
    row.getCell(1).font = { bold: true, size: 9, color: { argb: COLORS.darkGray } };
    row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.lightGray } };
    row.getCell(2).font = { size: 9, color: { argb: COLORS.black } };
    row.eachCell((cell) => {
      cell.border = thinBorder;
      cell.alignment = { vertical: "middle", wrapText: true };
    });
    if (index % 2 === 1) row.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.lightBlue } };
  });
  return rowNumber + 1;
}
function createOverview(workbook: ExcelJS.Workbook, data: FreightFormData, source?: ExportSourceFile) {
  const sheet = workbook.addWorksheet("Shipment Overview", { properties: { tabColor: { argb: COLORS.blue } } });
  sheet.columns = [{ width: 31 }, { width: 68 }];
  styleTitle(sheet, "FREIGHTFLOW | SHIPMENT REPORT", "Generated " + new Date().toLocaleString(), 2);
  let row = 4;
  row = addKeyValueSection(sheet, row, "Shipment & parties", [
    ["Document type", data.documentType], ["Shipper", data.shipperName],
    ["Shipper / pickup address", data.address], ["Consignee", data.consigneeName],
    ["Delivery destination", data.deliveryDestination], ["Carrier", data.carrierName],
  ]);
  row = addKeyValueSection(sheet, row, "Transport & vehicle", [
    ["Truck license plate", data.truckLicensePlate], ["Trailer number", data.trailerNumber], ["Driver ID", data.driverId],
  ]);
  const items = data.cargoItems ?? [];
  const sum = (key: "packages" | "netKg" | "grossKg" | "volumeM3") =>
    items.reduce((total, item) => total + (asNumber(item[key]) ?? 0), 0);
  row = addKeyValueSection(sheet, row, "Cargo totals", [
    ["Cargo line items", items.length], ["Total packages", sum("packages") || null],
    ["Total net weight (kg)", sum("netKg") || null], ["Total gross weight (kg)", sum("grossKg") || null],
    ["Total volume (m³)", sum("volumeM3") || null],
  ]);
  const invoice = data.invoiceTotals;
  row = addKeyValueSection(sheet, row, "Invoice totals", [
    ["Subtotal", asNumber(invoice.subtotal)], ["Tax", asNumber(invoice.tax)],
    ["Freight", asNumber(invoice.freight)], ["Insurance", asNumber(invoice.insurance)],
    ["Other charges", asNumber(invoice.otherCharges)], ["Total amount", asNumber(invoice.totalAmount)],
    ["Currency", invoice.currency || data.currency],
  ]);
  addKeyValueSection(sheet, row, "Extraction & source", [
    ["AI extraction confidence (%)", hasValue(data.confidenceScore) ? data.confidenceScore : null],
    ["Uploaded file", source?.name], ["File format", source?.type],
    ["File size (KB)", source ? Math.round(source.size / 1024 * 100) / 100 : null],
    ["File last modified", source?.lastModified ? new Date(source.lastModified).toLocaleString() : null],
  ]);
  configureSheet(sheet, "portrait");
}
function createCargoManifest(workbook: ExcelJS.Workbook, data: FreightFormData) {
  const items = data.cargoItems ?? [];
  if (!items.length) return;
  const allColumns: Column<(typeof items)[number]>[] = [
    { header: "Item description", key: "description", width: 34 },
    { header: "HS code", key: "hsCode", width: 17 },
    { header: "Packages", key: "packages", width: 13, kind: "number" },
    { header: "Quantity", key: "quantity", width: 13, kind: "number" },
    { header: "Quantity unit", key: "quantityUnit", width: 14 },
    { header: "Net weight (kg)", key: "netKg", width: 15, kind: "number" },
    { header: "Gross weight (kg)", key: "grossKg", width: 16, kind: "number" },
    { header: "Dimensions", key: "dimensions", width: 22 },
    { header: "Volume (m³)", key: "volumeM3", width: 14, kind: "number" },
    { header: "Unit price", key: "unitPrice", width: 15, kind: "number" },
    { header: "Currency", key: "currency", width: 12 },
    { header: "Line amount", key: "amount", width: 16, kind: "number" },
  ];
  const columns = allColumns.filter((column) => items.some((item) => hasValue(item[column.key])));
  if (!columns.length) return;
  const sheet = workbook.addWorksheet("Cargo Manifest", { properties: { tabColor: { argb: COLORS.cyan } } });
  sheet.columns = [{ header: "No.", key: "line", width: 7 }, ...columns];
  const lastColumn = columns.length + 1;
  styleTitle(sheet, "CARGO MANIFEST", "Item-level quantities, packaging, weights, dimensions and commercial values", lastColumn);
  addSection(sheet, 3, "Cargo line items", lastColumn);
  const header = sheet.getRow(4);
  header.values = ["No.", ...columns.map((column) => column.header)];
  styleHeader(header);
  items.forEach((item, index) => {
    const values: ExcelJS.CellValue[] = [index + 1];
    columns.forEach((column) => {
      const value = item[column.key];
      values.push(column.kind === "number" ? asNumber(value) : toCellValue(value));
    });
    const row = sheet.addRow(values);
    styleDataRow(row, index);
    columns.forEach((column, columnIndex) => {
      if (column.kind === "number") {
        const cell = row.getCell(columnIndex + 2);
        cell.numFmt = "#,##0.00";
        cell.alignment = { horizontal: "right", vertical: "middle" };
      }
    });
  });
  sheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: sheet.rowCount, column: lastColumn } };
  configureSheet(sheet);
}
function createInvoiceSheet(workbook: ExcelJS.Workbook, data: FreightFormData) {
  const invoice = data.invoiceTotals;
  const currency = invoice.currency || data.currency;
  const rows: Array<[string, number | null]> = [
    ["Subtotal", asNumber(invoice.subtotal)], ["Tax", asNumber(invoice.tax)],
    ["Freight", asNumber(invoice.freight)], ["Insurance", asNumber(invoice.insurance)],
    ["Other charges", asNumber(invoice.otherCharges)], ["Total amount", asNumber(invoice.totalAmount)],
  ].filter(([, amount]) => amount !== null);
  if (!rows.length && !hasValue(currency)) return;
  const sheet = workbook.addWorksheet("Invoice Summary", { properties: { tabColor: { argb: COLORS.green } } });
  sheet.columns = [{ width: 34 }, { width: 22 }, { width: 16 }];
  styleTitle(sheet, "INVOICE SUMMARY", "Document-level financial values (not recalculated)", 3);
  addSection(sheet, 3, "Financial breakdown", 3);
  const header = sheet.getRow(4);
  header.values = ["Description", "Amount", "Currency"];
  styleHeader(header);
  rows.forEach(([label, amount], index) => {
    const row = sheet.addRow([label, amount, currency || null]);
    styleDataRow(row, index);
    row.getCell(2).numFmt = "#,##0.00";
    row.getCell(2).alignment = { horizontal: "right", vertical: "middle" };
    if (label === "Total amount") {
      row.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: COLORS.green } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.lightCyan } };
      });
    }
  });
  if (!rows.length && hasValue(currency)) styleDataRow(sheet.addRow(["Currency", null, currency]), 0);
  sheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: sheet.rowCount, column: 3 } };
  configureSheet(sheet, "portrait");
}
function createAdditionalFieldsSheet(workbook: ExcelJS.Workbook, data: FreightFormData) {
  const fields = (data.additionalFields ?? []).filter((field) => hasValue(field.label) && hasValue(field.value));
  if (!fields.length) return;
  const sheet = workbook.addWorksheet("Other Document Data", { properties: { tabColor: { argb: COLORS.navyLight } } });
  sheet.columns = [{ width: 38 }, { width: 72 }];
  styleTitle(sheet, "OTHER DOCUMENT DATA", "Additional values extracted from the uploaded source and not covered by standard shipment fields", 2);
  addSection(sheet, 3, "Additional extracted fields", 2);
  const header = sheet.getRow(4);
  header.values = ["Field", "Extracted value"];
  styleHeader(header);
  fields.forEach((field, index) => {
    const row = sheet.addRow([field.label, field.value]);
    styleDataRow(row, index);
    row.height = 32;
  });
  sheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: sheet.rowCount, column: 2 } };
  configureSheet(sheet, "portrait");
}
function applyWorkbookDefaults(workbook: ExcelJS.Workbook) {
  workbook.creator = "FreightFlow";
  workbook.subject = "Extracted logistics shipment data";
  workbook.title = "FreightFlow Shipment Report";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;
}
async function downloadWorkbook(workbook: ExcelJS.Workbook, fileName: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function exportShipmentExcel(data: FreightFormData, source?: ExportSourceFile): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  applyWorkbookDefaults(workbook);
  createOverview(workbook, data, source);
  createCargoManifest(workbook, data);
  createInvoiceSheet(workbook, data);
  createAdditionalFieldsSheet(workbook, data);
  const date = new Date().toISOString().slice(0, 10);
  await downloadWorkbook(workbook, "FreightFlow_Shipment_" + date + ".xlsx");
}
