import { Type } from "@google/genai";
import { z } from "zod";

export const FreightDocumentSchema = z.object({
  shipperName: z.string().describe("The company or person shipping the goods"),
  address: z.string().describe("Full address of the shipper"),
  consigneeName: z
    .string()
    .describe("The company or person receiving the goods"),
  deliveryDestination: z.string().describe("Full delivery destination address"),
  truckLicensePlate: z.string().describe("License plate of the truck/vehicle"),
  trailerNumber: z.string().describe("Trailer number if visible"),
  carrierName: z.string().describe("Name of the transport/logistics company"),
  driverId: z
    .string()
    .describe("Driver identification or passport number if any"),
  cargoItems: z.array(
    z.object({
      description: z
        .string()
        .describe("Detailed description of the cargo item"),
      hsCode: z.string().describe("Harmonized System customs code"),
      packages: z.number().describe("Number of packages/boxes"),
      grossKg: z.number().describe("Gross weight in kilograms"),
      volumeM3: z.number().describe("Volume in cubic meters"),
    }),
  ),
  confidenceScore: z
    .number()
    .describe("Your estimate of data extraction accuracy from 0 to 100"),
});

export const geminiResponseSchema = {
  type: Type.OBJECT,
  properties: {
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
          grossKg: { type: Type.NUMBER },
          volumeM3: { type: Type.NUMBER },
        },
        required: ["description", "hsCode", "packages", "grossKg", "volumeM3"],
      },
    },

    confidenceScore: { type: Type.NUMBER },
  },
  required: [
    "shipperName",
    "address",
    "consigneeName",
    "deliveryDestination",
    "truckLicensePlate",
    "trailerNumber",
    "carrierName",
    "driverId",
    "cargoItems",
    "confidenceScore",
  ],
};
