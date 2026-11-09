import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import ExcelJS from "exceljs";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toExcelValue(value: unknown): ExcelJS.CellValue {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value;
  }

  if (value === null || value === undefined) {
    return null;
  }

  return JSON.stringify(value);
}
