export type ShipmentStatus = "Draft" | "Processing" | "Validated" | "Completed";

export type ShipmentDocument = {
  id?: string;
  name: string;
  type: string;
  parsed: boolean;
  error?: string;
  storagePath?: string;
  order?: number;
  parsedData?: Record<string, unknown>;
};

/** Portable domain entity: deliberately contains no Firebase or database-specific types. */
export type Shipment = {
  id: string;
  ownerId: string;
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
  validationSnapshot?: {
    status: "clear" | "review" | "attention";
    issues: Array<{
      id: string;
      severity: "error" | "warning" | "info";
      category: "shipment" | "cargo" | "invoice" | "document";
      title: string;
      detail: string;
      documents: string[];
      field?: string;
    }>;
    counts: { error: number; warning: number; info: number };
    checkedRules: number;
  };
};

export type CreateShipmentInput = Omit<Shipment, "id" | "ownerId">;
export type UpdateShipmentInput = Partial<Omit<Shipment, "id" | "ownerId" | "createdAt">>;
export type PaginationOptions = { limit?: number; cursor?: string };
export type PaginatedResult<T> = { items: T[]; nextCursor: string | null };
