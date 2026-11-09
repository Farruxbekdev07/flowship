import ExcelJS from "exceljs";
import type { FreightFormData } from "@/components/logistics/types";
import { toExcelValue } from "../utils";

const COLORS = {
  navy: "FF14243A",
  navyLight: "FF203B5C",
  blue: "FF1677C8",
  cyan: "FF16A6B6",
  lightBlue: "FFEAF3FB",
  lightCyan: "FFE8F7F8",
  lightGray: "FFF3F5F7",
  mediumGray: "FFD8DEE6",
  darkGray: "FF526174",
  white: "FFFFFFFF",
  black: "FF17212F",
  green: "FF16845B",
};

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: COLORS.mediumGray } },
  bottom: { style: "thin", color: { argb: COLORS.mediumGray } },
  left: { style: "thin", color: { argb: COLORS.mediumGray } },
  right: { style: "thin", color: { argb: COLORS.mediumGray } },
};

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function positiveNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatDate(value: unknown): string | null {
  if (!hasValue(value)) return null;

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-GB");
}

function styleTitle(
  sheet: ExcelJS.Worksheet,
  title: string,
  subtitle: string,
  lastColumn: number,
) {
  sheet.mergeCells(1, 1, 1, lastColumn);

  const titleCell = sheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = {
    name: "Aptos Display",
    size: 20,
    bold: true,
    color: { argb: COLORS.white },
  };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLORS.navy },
  };
  titleCell.alignment = {
    vertical: "middle",
    horizontal: "left",
  };

  sheet.getRow(1).height = 38;

  sheet.mergeCells(2, 1, 2, lastColumn);

  const subtitleCell = sheet.getCell(2, 1);
  subtitleCell.value = subtitle;
  subtitleCell.font = {
    name: "Aptos",
    size: 10,
    italic: true,
    color: { argb: COLORS.darkGray },
  };
  subtitleCell.alignment = {
    vertical: "middle",
  };

  sheet.getRow(2).height = 24;
}

function addSection(
  sheet: ExcelJS.Worksheet,
  rowNumber: number,
  title: string,
  lastColumn: number,
) {
  sheet.mergeCells(rowNumber, 1, rowNumber, lastColumn);

  const cell = sheet.getCell(rowNumber, 1);
  cell.value = title;
  cell.font = {
    bold: true,
    size: 11,
    color: { argb: COLORS.white },
  };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLORS.navyLight },
  };
  cell.alignment = {
    vertical: "middle",
  };

  sheet.getRow(rowNumber).height = 25;
}

function styleTableHeader(row: ExcelJS.Row) {
  row.height = 32;

  row.eachCell((cell) => {
    cell.font = {
      bold: true,
      size: 10,
      color: { argb: COLORS.white },
    };

    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLORS.blue },
    };

    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };

    cell.border = thinBorder;
  });
}

function styleDataRow(row: ExcelJS.Row, index: number) {
  row.height = 25;

  row.eachCell((cell) => {
    cell.font = {
      name: "Aptos",
      size: 10,
      color: { argb: COLORS.black },
    };

    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: index % 2 === 0 ? COLORS.white : COLORS.lightBlue,
      },
    };

    cell.alignment = {
      vertical: "middle",
      wrapText: true,
    };

    cell.border = thinBorder;
  });
}

function addKeyValueRows(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  entries: Array<[string, unknown]>,
): number {
  const filtered = entries.filter(([, value]) => hasValue(value));

  let rowNumber = startRow;

  for (let i = 0; i < filtered.length; i += 2) {
    const first = filtered[i];
    const second = filtered[i + 1];

    const row = sheet.getRow(rowNumber);

    row.values = [
      first[0],
      toExcelValue(first[1]),
      second?.[0] ?? null,
      toExcelValue(second?.[1]),
    ];

    row.height = 26;

    [1, 3].forEach((column) => {
      const cell = row.getCell(column);

      cell.font = {
        bold: true,
        size: 9,
        color: { argb: COLORS.darkGray },
      };

      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: COLORS.lightGray },
      };
    });

    [2, 4].forEach((column) => {
      const cell = row.getCell(column);

      cell.font = {
        size: 10,
        color: { argb: COLORS.black },
      };

      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: COLORS.white },
      };
    });

    row.eachCell((cell) => {
      cell.border = thinBorder;
      cell.alignment = {
        vertical: "middle",
        wrapText: true,
      };
    });

    rowNumber++;
  }

  return rowNumber;
}

function configurePrint(
  sheet: ExcelJS.Worksheet,
  orientation: "portrait" | "landscape" = "landscape",
) {
  sheet.pageSetup = {
    paperSize: 9,
    orientation,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.25,
      right: 0.25,
      top: 0.5,
      bottom: 0.5,
      header: 0.2,
      footer: 0.2,
    },
  };

  sheet.headerFooter.oddFooter =
    "&LFreightFlow | AI Logistics Platform&CPage &P of &N";
}

function applyWorkbookDefaults(workbook: ExcelJS.Workbook) {
  workbook.creator = "FreightFlow";
  workbook.subject = "AI-generated logistics document export";
  workbook.title = "FreightFlow Shipment Report";
  workbook.created = new Date();
  workbook.modified = new Date();
}

function createOverview(workbook: ExcelJS.Workbook, data: FreightFormData) {
  const sheet = workbook.addWorksheet("Shipment Overview", {
    properties: {
      tabColor: { argb: COLORS.blue },
    },
    views: [{ state: "frozen", ySplit: 2 }],
  });

  sheet.columns = [{ width: 24 }, { width: 30 }, { width: 24 }, { width: 30 }];

  styleTitle(
    sheet,
    "FREIGHTFLOW | SHIPMENT REPORT",
    `Generated on ${new Date().toLocaleString()}`,
    4,
  );

  let row = 4;

  addSection(sheet, row++, "SHIPMENT INFORMATION", 4);

  row = addKeyValueRows(sheet, row, [
    ["Shipper", data.shipperName],
    ["Consignee", data.consigneeName],
    ["Carrier", data.carrierName],
    ["Delivery destination", data.deliveryDestination],
    ["Pickup address", data.address],
    ["Document type", data.documentType],
  ]);

  row += 1;
  addSection(sheet, row++, "TRANSPORT INFORMATION", 4);

  row = addKeyValueRows(sheet, row, [
    ["Truck license plate", data.truckLicensePlate],
    ["Trailer number", data.trailerNumber],
    ["Driver ID", data.driverId],
  ]);

  row += 1;
  addSection(sheet, row++, "CARGO STATISTICS", 4);

  const cargoItems = data.cargoItems ?? [];

  const totalPackages = cargoItems.reduce(
    (sum, item) => sum + (positiveNumber(item.packages) ?? 0),
    0,
  );

  const totalGross = cargoItems.reduce(
    (sum, item) => sum + (positiveNumber(item.grossKg) ?? 0),
    0,
  );

  const totalNet = cargoItems.reduce(
    (sum, item) => sum + (positiveNumber(item.netKg) ?? 0),
    0,
  );

  const totalVolume = cargoItems.reduce(
    (sum, item) => sum + (positiveNumber(item.volumeM3) ?? 0),
    0,
  );

  row = addKeyValueRows(sheet, row, [
    ["Cargo item types", cargoItems.length || null],
    ["Total packages", totalPackages || null],
    ["Total gross weight (kg)", totalGross || null],
    ["Total net weight (kg)", totalNet || null],
    ["Total volume (m³)", totalVolume || null],
  ]);

  row += 1;
  addSection(sheet, row++, "INVOICE SUMMARY", 4);

  const invoice = data.invoiceTotals;

  row = addKeyValueRows(sheet, row, [
    ["Subtotal", positiveNumber(invoice.subtotal)],
    ["Tax", positiveNumber(invoice.tax)],
    ["Freight", positiveNumber(invoice.freight)],
    ["Insurance", positiveNumber(invoice.insurance)],
    ["Other charges", positiveNumber(invoice.otherCharges)],
    ["Total amount", positiveNumber(invoice.totalAmount)],
    ["Currency", invoice.currency ?? data.currency],
  ]);

  sheet.autoFilter = undefined;

  configurePrint(sheet);

  return sheet;
}

function createCargoManifest(
  workbook: ExcelJS.Workbook,
  data: FreightFormData,
) {
  const sheet = workbook.addWorksheet("Cargo Manifest", {
    properties: {
      tabColor: { argb: COLORS.cyan },
    },
    views: [{ state: "frozen", ySplit: 4 }],
  });

  const columns = [
    { header: "No.", key: "number", width: 8 },
    { header: "Description", key: "description", width: 32 },
    { header: "HS Code", key: "hsCode", width: 16 },
    { header: "Packages", key: "packages", width: 12 },
    { header: "Quantity", key: "quantity", width: 12 },
    { header: "Unit", key: "quantityUnit", width: 12 },
    { header: "Net kg", key: "netKg", width: 13 },
    { header: "Gross kg", key: "grossKg", width: 13 },
    { header: "Dimensions", key: "dimensions", width: 20 },
    { header: "Volume m³", key: "volumeM3", width: 13 },
    { header: "Unit Price", key: "unitPrice", width: 15 },
    { header: "Currency", key: "currency", width: 12 },
    { header: "Amount", key: "amount", width: 16 },
  ];

  sheet.columns = columns;

  styleTitle(
    sheet,
    "CARGO MANIFEST",
    "Detailed cargo and item information extracted from source documents",
    columns.length,
  );

  addSection(sheet, 3, "CARGO DETAILS", columns.length);

  const header = sheet.getRow(4);
  header.values = columns.map((column) => column.header);

  styleTableHeader(header);

  const cargoItems = data.cargoItems ?? [];

  if (cargoItems.length === 0) {
    sheet.mergeCells(5, 1, 5, columns.length);

    sheet.getCell(5, 1).value =
      "No cargo items were detected in the uploaded document.";

    sheet.getCell(5, 1).font = {
      italic: true,
      color: { argb: COLORS.darkGray },
    };
  } else {
    cargoItems.forEach((item, index) => {
      const row = sheet.addRow([
        index + 1,
        item.description ?? null,
        item.hsCode ?? null,
        positiveNumber(item.packages),
        positiveNumber(item.quantity),
        item.quantityUnit ?? null,
        positiveNumber(item.netKg),
        positiveNumber(item.grossKg),
        item.dimensions ?? null,
        positiveNumber(item.volumeM3),
        positiveNumber(item.unitPrice),
        item.currency ?? data.currency ?? null,
        positiveNumber(item.amount),
      ]);

      styleDataRow(row, index);

      [4, 5, 7, 8, 10, 11, 13].forEach((column) => {
        row.getCell(column).numFmt = "#,##0.00";

        row.getCell(column).alignment = {
          horizontal: "right",
          vertical: "middle",
        };
      });
    });
  }

  sheet.autoFilter = {
    from: { row: header.number, column: 1 },
    to: {
      row: Math.max(header.number, sheet.rowCount),
      column: columns.length,
    },
  };

  configurePrint(sheet);

  return sheet;
}

function createInvoiceSummary(
  workbook: ExcelJS.Workbook,
  data: FreightFormData,
) {
  const sheet = workbook.addWorksheet("Invoice Summary", {
    properties: {
      tabColor: { argb: COLORS.green },
    },
    views: [{ state: "frozen", ySplit: 5 }],
  });

  sheet.columns = [{ width: 34 }, { width: 24 }, { width: 18 }];

  styleTitle(
    sheet,
    "INVOICE SUMMARY",
    "Financial information extracted from the source document",
    3,
  );

  addSection(sheet, 4, "FINANCIAL BREAKDOWN", 3);

  const header = sheet.getRow(5);
  header.values = ["Description", "Amount", "Currency"];

  styleTableHeader(header);

  const invoice = data.invoiceTotals;

  const allFinancialRows: Array<[string, number]> = [
    ["Subtotal", positiveNumber(invoice.subtotal) ?? 0],
    ["Tax", positiveNumber(invoice.tax) ?? 0],
    ["Freight", positiveNumber(invoice.freight) ?? 0],
    ["Insurance", positiveNumber(invoice.insurance) ?? 0],
    ["Other charges", positiveNumber(invoice.otherCharges) ?? 0],
    ["Total amount", positiveNumber(invoice.totalAmount) ?? 0],
  ];

  const financialRows: Array<[string, number]> = allFinancialRows.filter(
    ([, value]) => value > 0,
  );

  const currency = invoice.currency ?? data.currency ?? null;

  if (financialRows.length === 0) {
    sheet.mergeCells(6, 1, 6, 3);

    sheet.getCell(6, 1).value =
      "No financial amounts were detected in the uploaded document.";

    sheet.getCell(6, 1).font = {
      italic: true,
      color: { argb: COLORS.darkGray },
    };
  } else {
    financialRows.forEach(([label, amount], index) => {
      const row = sheet.addRow([label, amount, currency]);

      styleDataRow(row, index);

      row.getCell(2).numFmt = "#,##0.00";

      row.getCell(2).alignment = {
        horizontal: "right",
        vertical: "middle",
      };

      if (label === "Total amount") {
        row.eachCell((cell) => {
          cell.font = {
            bold: true,
            color: { argb: COLORS.green },
          };

          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: COLORS.lightCyan },
          };
        });
      }
    });
  }

  sheet.autoFilter = {
    from: { row: header.number, column: 1 },
    to: {
      row: Math.max(header.number, sheet.rowCount),
      column: 3,
    },
  };

  configurePrint(sheet, "portrait");

  return sheet;
}

function createMetadataSheet(
  workbook: ExcelJS.Workbook,
  data: FreightFormData,
) {
  const sheet = workbook.addWorksheet("Document Metadata", {
    properties: {
      tabColor: { argb: COLORS.navyLight },
    },
    views: [{ state: "frozen", ySplit: 5 }],
  });

  sheet.columns = [{ width: 32 }, { width: 55 }];

  styleTitle(
    sheet,
    "DOCUMENT METADATA",
    "Additional information extracted by FreightFlow AI",
    2,
  );

  addSection(sheet, 4, "DOCUMENT INFORMATION", 2);

  const header = sheet.getRow(5);
  header.values = ["Field", "Extracted value"];

  styleTableHeader(header);

  const metadata: Array<[string, unknown]> = [
    ["Document type", data.documentType],
    ["Shipper", data.shipperName],
    ["Consignee", data.consigneeName],
    ["Carrier", data.carrierName],
    ["Delivery destination", data.deliveryDestination],
    ["Truck license plate", data.truckLicensePlate],
    ["Trailer number", data.trailerNumber],
    ["Driver ID", data.driverId],
    ["Currency", data.invoiceTotals.currency ?? data.currency],
  ];

  // AdditionalField[] is an array, not an object.
  (data.additionalFields ?? []).forEach((field) => {
    if (hasValue(field.label) && hasValue(field.value)) {
      metadata.push([field.label, field.value]);
    }
  });

  const filteredMetadata = metadata.filter(([, value]) => hasValue(value));

  if (filteredMetadata.length === 0) {
    sheet.mergeCells(6, 1, 6, 2);

    sheet.getCell(6, 1).value = "No additional metadata was detected.";

    sheet.getCell(6, 1).font = {
      italic: true,
      color: { argb: COLORS.darkGray },
    };
  } else {
    filteredMetadata.forEach(([key, value], index) => {
      const row = sheet.addRow([
        key,
        typeof value === "object" ? JSON.stringify(value) : String(value),
      ]);

      styleDataRow(row, index);
    });
  }

  sheet.autoFilter = {
    from: { row: header.number, column: 1 },
    to: {
      row: Math.max(header.number, sheet.rowCount),
      column: 2,
    },
  };

  configurePrint(sheet, "portrait");

  return sheet;
}

async function downloadBlob(workbook: ExcelJS.Workbook, fileName: string) {
  const buffer = await workbook.xlsx.writeBuffer();

  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export async function exportShipmentExcel(
  data: FreightFormData,
): Promise<void> {
  const workbook = new ExcelJS.Workbook();

  applyWorkbookDefaults(workbook);

  createOverview(workbook, data);
  createCargoManifest(workbook, data);
  createInvoiceSummary(workbook, data);
  createMetadataSheet(workbook, data);

  const fileName = `FreightFlow_Shipment_${new Date()
    .toISOString()
    .slice(0, 10)}.xlsx`;

  await downloadBlob(workbook, fileName);
}
