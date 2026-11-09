import { Type } from "@google/genai";
import { z } from "zod";

const nonNegativeNumber = z.number().finite().min(0);

export const CargoItemSchema = z.object({
  description: z.string(),
  hsCode: z.string(),
  packages: nonNegativeNumber,
  quantity: nonNegativeNumber,
  quantityUnit: z.string(),
  netKg: nonNegativeNumber,
  grossKg: nonNegativeNumber,
  dimensions: z.string(),
  volumeM3: nonNegativeNumber,
  unitPrice: nonNegativeNumber,
  currency: z.string(),
  amount: nonNegativeNumber,
});

export const InvoiceTotalsSchema = z.object({
  subtotal: nonNegativeNumber,
  tax: nonNegativeNumber,
  freight: nonNegativeNumber,
  insurance: nonNegativeNumber,
  otherCharges: nonNegativeNumber,
  totalAmount: nonNegativeNumber,
  currency: z.string(),
});

export const AdditionalFieldSchema = z.object({
  label: z.string().min(1),
  value: z.string(),
});

export const FreightDocumentSchema = z.object({
  documentType: z.string(),
  shipperName: z.string(),
  address: z.string(),
  consigneeName: z.string(),
  deliveryDestination: z.string(),
  truckLicensePlate: z.string(),
  trailerNumber: z.string(),
  carrierName: z.string(),
  driverId: z.string(),
  cargoItems: z.array(CargoItemSchema),
  invoiceTotals: InvoiceTotalsSchema,
  confidenceScore: z.number().finite().min(0).max(100),
  additionalFields: z.array(AdditionalFieldSchema),
});

export type FreightDocument = z.infer<typeof FreightDocumentSchema>;
export type CargoItem = z.infer<typeof CargoItemSchema>;
export type InvoiceTotals = z.infer<typeof InvoiceTotalsSchema>;

// Gemini's response schema is deliberately permissive for absent document fields:
// the prompt asks the model to return empty strings / zero values rather than invent data.
export const geminiResponseSchema = {
  type: Type.OBJECT,
  properties: {
    documentType: { type: Type.STRING },
    shipperName: { type: Type.STRING },
    address: { type: Type.STRING },
    consigneeName: { type: Type.STRING },
    deliveryDestination: { type: Type.STRING },
    truckLicensePlate: { type: Type.STRING },
    trailerNumber: { type: Type.STRING },
    carrierName: { type: Type.STRING },
    driverId: { type: Type.STRING },
    cargoItems: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          hsCode: { type: Type.STRING },
          packages: { type: Type.NUMBER },
          quantity: { type: Type.NUMBER },
          quantityUnit: { type: Type.STRING },
          netKg: { type: Type.NUMBER },
          grossKg: { type: Type.NUMBER },
          dimensions: { type: Type.STRING },
          volumeM3: { type: Type.NUMBER },
          unitPrice: { type: Type.NUMBER },
          currency: { type: Type.STRING },
          amount: { type: Type.NUMBER },
        },
        required: ["description", "hsCode", "packages", "quantity", "quantityUnit", "netKg", "grossKg", "dimensions", "volumeM3", "unitPrice", "currency", "amount"],
      },
    },
    invoiceTotals: {
      type: Type.OBJECT,
      properties: {
        subtotal: { type: Type.NUMBER },
        tax: { type: Type.NUMBER },
        freight: { type: Type.NUMBER },
        insurance: { type: Type.NUMBER },
        otherCharges: { type: Type.NUMBER },
        totalAmount: { type: Type.NUMBER },
        currency: { type: Type.STRING },
      },
      required: ["subtotal", "tax", "freight", "insurance", "otherCharges", "totalAmount", "currency"],
    },
    confidenceScore: { type: Type.NUMBER },
    additionalFields: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          value: { type: Type.STRING },
        },
        required: ["label", "value"],
      },
    },
  },
  required: [
    "documentType", "shipperName", "address", "consigneeName",
    "deliveryDestination", "truckLicensePlate", "trailerNumber",
    "carrierName", "driverId", "cargoItems", "invoiceTotals", "confidenceScore",
    "additionalFields",
  ],
};

export function normalizeFreightDocument(input: unknown): FreightDocument {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const rawCargo = Array.isArray(raw.cargoItems) ? raw.cargoItems : [];
  const rawAdditional = Array.isArray(raw.additionalFields) ? raw.additionalFields : [];

  const normalized = {
    documentType: typeof raw.documentType === "string" ? raw.documentType : "Unknown",
    shipperName: typeof raw.shipperName === "string" ? raw.shipperName : "",
    address: typeof raw.address === "string" ? raw.address : "",
    consigneeName: typeof raw.consigneeName === "string" ? raw.consigneeName : "",
    deliveryDestination: typeof raw.deliveryDestination === "string" ? raw.deliveryDestination : "",
    truckLicensePlate: typeof raw.truckLicensePlate === "string" ? raw.truckLicensePlate : "",
    trailerNumber: typeof raw.trailerNumber === "string" ? raw.trailerNumber : "",
    carrierName: typeof raw.carrierName === "string" ? raw.carrierName : "",
    driverId: typeof raw.driverId === "string" ? raw.driverId : "",
    cargoItems: rawCargo.map((item) => {
      const cargo = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
      const numeric = (value: unknown) => {
        const parsed = typeof value === "number" ? value : Number(value);
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
      };
      return {
        description: typeof cargo.description === "string" ? cargo.description : "",
        hsCode: typeof cargo.hsCode === "string" ? cargo.hsCode : "",
        packages: numeric(cargo.packages),
        quantity: numeric(cargo.quantity),
        quantityUnit: typeof cargo.quantityUnit === "string" ? cargo.quantityUnit : "",
        netKg: numeric(cargo.netKg),
        grossKg: numeric(cargo.grossKg),
        dimensions: typeof cargo.dimensions === "string" ? cargo.dimensions : "",
        volumeM3: numeric(cargo.volumeM3),
        unitPrice: numeric(cargo.unitPrice),
        currency: typeof cargo.currency === "string" ? cargo.currency : "",
        amount: numeric(cargo.amount),
      };
    }),
    invoiceTotals: (() => {
      const totals = (raw.invoiceTotals && typeof raw.invoiceTotals === "object" ? raw.invoiceTotals : {}) as Record<string, unknown>;
      const numeric = (value: unknown) => {
        const parsed = typeof value === "number" ? value : Number(value);
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
      };
      return {
        subtotal: numeric(totals.subtotal),
        tax: numeric(totals.tax),
        freight: numeric(totals.freight),
        insurance: numeric(totals.insurance),
        otherCharges: numeric(totals.otherCharges),
        totalAmount: numeric(totals.totalAmount),
        currency: typeof totals.currency === "string" ? totals.currency : "",
      };
    })(),
    confidenceScore: Math.min(100, Math.max(0, Number(raw.confidenceScore) || 0)),
    additionalFields: rawAdditional.flatMap((item) => {
      const field = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
      if (typeof field.label !== "string" || !field.label.trim()) return [];
      return [{ label: field.label, value: typeof field.value === "string" ? field.value : String(field.value ?? "") }];
    }),
  };

  return FreightDocumentSchema.parse(normalized);
}
