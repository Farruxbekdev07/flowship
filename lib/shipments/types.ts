export type ShipmentStatus = "Draft" | "Processing" | "Validated" | "Completed";
export type ShipmentDocument = { name: string; type: string; parsed: boolean; error?: string };
export type ShipmentRecord = {
  id: string;
  reference: string;
  title: string;
  shipper: string;
  consignee: string;
  destination: string;
  status: ShipmentStatus;
  createdAt: string;
  updatedAt: string;
  documents: ShipmentDocument[];
  issueCounts?: { error: number; warning: number; info: number };
  checkedRules?: number;
};
export const SHIPMENTS_STORAGE_KEY = "freightflow.shipments.v1";
