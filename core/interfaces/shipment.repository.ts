import type {
  CreateShipmentInput,
  PaginatedResult,
  PaginationOptions,
  Shipment,
  UpdateShipmentInput,
} from "@/core/entities/shipment";

/** Persistence contract. Implementations may use Firestore, PostgreSQL, MySQL, etc. */
export interface ShipmentRepository {
  create(ownerId: string, data: CreateShipmentInput, id?: string): Promise<Shipment>;
  findById(ownerId: string, id: string): Promise<Shipment | null>;
  findByUserId(ownerId: string, options?: PaginationOptions): Promise<PaginatedResult<Shipment>>;
  update(ownerId: string, id: string, data: UpdateShipmentInput): Promise<Shipment>;
  delete(ownerId: string, id: string): Promise<void>;
}
