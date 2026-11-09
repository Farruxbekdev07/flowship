export type CargoItem = {
  description: string;
  hsCode: string;
  packages: number;
  quantity: number;
  quantityUnit: string;
  netKg: number;
  grossKg: number;
  dimensions: string;
  volumeM3: number;
  unitPrice: number;
  currency: string;
  amount: number;
};

export type InvoiceTotals = {
  subtotal: number;
  tax: number;
  freight: number;
  insurance: number;
  otherCharges: number;
  totalAmount: number;
  currency: string;
};

export type AdditionalField = {
  label: string;
  value: string;
};

export type FreightFormData = {
  documentType: string;

  shipperName: string;
  address: string;
  consigneeName: string;
  deliveryDestination: string;

  truckLicensePlate: string;
  trailerNumber: string;
  carrierName: string;
  driverId: string;

  currency: string;

  cargoItems: CargoItem[];

  invoiceTotals: InvoiceTotals;

  confidenceScore: number;

  additionalFields: AdditionalField[];
};

export type TextFieldKey =
  | "shipperName"
  | "address"
  | "consigneeName"
  | "deliveryDestination"
  | "truckLicensePlate"
  | "trailerNumber"
  | "carrierName"
  | "driverId";
