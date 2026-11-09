"use server";

import { GoogleGenAI } from "@google/genai";
import { geminiResponseSchema, normalizeFreightDocument } from "./freightSchema";

const DEFAULT_MODEL = "gemini-2.5-flash";
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const MAX_ATTEMPTS = 3;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Hujjatni qayta ishlashda kutilmagan xatolik yuz berdi.";
}

function isRetryableError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  const candidate = error as { status?: number; code?: number | string };
  const statusValue = String(candidate?.status ?? candidate?.code ?? "").toLowerCase();
  const status = Number(statusValue);
  return [429, 500, 502, 503, 504].includes(status) ||
    ["unavailable", "resource_exhausted", "internal", "deadline_exceeded"].includes(statusValue) ||
    /\b(429|500|502|503|504)\b|resource exhausted|temporarily unavailable|high demand|overloaded|deadline exceeded/.test(message);
}

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function hasValidFileSignature(file: File): Promise<boolean> {
  const header = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  const startsWith = (...bytes: number[]) => bytes.every((byte, index) => header[index] === byte);

  if (file.type === "application/pdf") {
    return new TextDecoder().decode(header).includes("%PDF-");
  }
  if (file.type === "image/png") return startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  if (file.type === "image/jpeg") return startsWith(0xff, 0xd8, 0xff);
  if (file.type === "image/webp") {
    return startsWith(0x52, 0x49, 0x46, 0x46) &&
      new TextDecoder().decode(header.slice(8, 12)) === "WEBP";
  }
  return false;
}

export async function parseFreightDocument(formData: FormData) {
  try {
    const file = formData.get("document");
    if (!(file instanceof File) || file.size === 0) {
      return { success: false as const, error: "Iltimos, PDF yoki rasm faylini tanlang." };
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return { success: false as const, error: "Faqat PDF, JPG, PNG yoki WEBP fayllari qo‘llab-quvvatlanadi." };
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return { success: false as const, error: "Fayl hajmi 20 MB dan oshmasligi kerak." };
    }
    if (!(await hasValidFileSignature(file))) {
      return { success: false as const, error: "Fayl formati noto‘g‘ri yoki fayl buzilgan. Boshqa fayl tanlang." };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not configured.");
      return { success: false as const, error: "AI xizmati sozlanmagan. Administrator bilan bog‘laning." };
    }

    const ai = new GoogleGenAI({ apiKey });
    const bytes = await file.arrayBuffer();
    const base64Data = Buffer.from(bytes).toString("base64");
    const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

    let responseText: string | undefined;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{
            role: "user",
            parts: [
              { inlineData: { data: base64Data, mimeType: file.type } },
              {
                text: [
                  "Analyze this logistics document. Identify whether it is a Commercial Invoice, Packing List, CMR, Bill of Lading, or another document.",
                  "Extract only information explicitly visible in the document. Never guess or invent values.",
                  "For missing text fields return an empty string. For missing numeric fields return 0.",
                  "Include every useful field not represented by the standard fields in additionalFields as label/value pairs.",
                  "Extract document-level invoice totals separately in invoiceTotals: subtotal, tax, freight, insurance, otherCharges, totalAmount and currency. These are totals for the whole invoice, not per-item values. Include only explicitly visible values; do not calculate missing totals. For absent numeric totals return 0 and absent currency empty string. For each cargo line extract packages/cartons separately from item quantity and quantity unit (for example 120 and pcs). Extract unitPrice, currency, and line amount (amount) for each item when explicitly present, preserving the document currency (USD, EUR, CNY, etc.). Do not calculate missing prices or amounts and never infer currency. If absent, return 0 for numeric price fields and empty string for currency. Extract netKg and grossKg separately. Extract dimensions exactly as printed (for example 60x40x35 cm). Extract volumeM3 only when explicitly stated or directly readable; do not calculate it unless all dimensions and package count make the calculation unambiguous. Missing numeric fields must be 0 and missing text fields empty.",
                  "Return cargo quantities, weights and volume as numbers. confidenceScore must be from 0 to 100.",
                ].join(" "),
              },
            ],
          }],
          config: {
            responseMimeType: "application/json",
            responseSchema: geminiResponseSchema,
            temperature: 0.1,
          },
        });
        responseText = response.text;
        break;
      } catch (error) {
        if (!isRetryableError(error) || attempt === MAX_ATTEMPTS) throw error;
        await wait(800 * 2 ** (attempt - 1));
      }
    }

    if (!responseText) {
      return { success: false as const, error: "AI xizmatidan javob olinmadi. Iltimos, qayta urinib ko‘ring." };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      console.error("Gemini returned invalid JSON.");
      return { success: false as const, error: "AI javobini o‘qib bo‘lmadi. Hujjatni qayta yuklab ko‘ring." };
    }

    const data = normalizeFreightDocument(parsed);
    return { success: true as const, data };
  } catch (error) {
    console.error("Freight document parsing failed:", error);
    const message = getErrorMessage(error);
    if (isRetryableError(error)) {
      return { success: false as const, error: "AI xizmati hozir band. Bir ozdan keyin qayta urinib ko‘ring." };
    }
    return { success: false as const, error: message || "Hujjatni o‘qishda xatolik yuz berdi." };
  }
}
