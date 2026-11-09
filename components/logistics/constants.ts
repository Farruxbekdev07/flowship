import type { FreightFormData, TextFieldKey } from "./types";

export const initialFormData: FreightFormData = {
  documentType: "",
  shipperName: "",
  address: "",
  consigneeName: "",
  deliveryDestination: "",
  truckLicensePlate: "",
  trailerNumber: "",
  carrierName: "",
  driverId: "",
  cargoItems: [],
  invoiceTotals: {
    subtotal: 0,
    tax: 0,
    freight: 0,
    insurance: 0,
    otherCharges: 0,
    totalAmount: 0,
    currency: "",
  },
  confidenceScore: 0,
  additionalFields: [],
  currency: "",
};

export const shipmentFields: { label: string; key: TextFieldKey }[] = [
  { label: "Shipper name", key: "shipperName" },
  { label: "Address", key: "address" },
  { label: "Consignee name", key: "consigneeName" },
  { label: "Delivery destination", key: "deliveryDestination" },
];

export const transportFields: { label: string; key: TextFieldKey }[] = [
  { label: "Truck license plate", key: "truckLicensePlate" },
  { label: "Trailer number", key: "trailerNumber" },
  { label: "Carrier name", key: "carrierName" },
  { label: "Driver ID", key: "driverId" },
];
