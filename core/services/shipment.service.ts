import type { ShipmentRepository } from "@/core/interfaces/shipment.repository";
import type { CreateShipmentInput, UpdateShipmentInput } from "@/core/entities/shipment";

/** Business rules live here, not in Firestore adapters or React components. */
export class ShipmentService {
  constructor(private readonly repository: ShipmentRepository) {}

  create(ownerId: string, input: CreateShipmentInput, id?: string) {
    if (!ownerId) throw new Error("Authentication is required to save a shipment.");
    if (!input.reference.trim()) throw new Error("Shipment reference is required.");
    return this.repository.create(ownerId, input, id);
  }

  list(ownerId: string, limit = 50) {
    if (!ownerId) throw new Error("Authentication is required to view saved shipments.");
    return this.repository.findByUserId(ownerId, { limit });
  }

  get(ownerId: string, id: string) {
    if (!ownerId) throw new Error("Authentication is required to view saved shipments.");
    return this.repository.findById(ownerId, id);
  }

  update(ownerId: string, id: string, input: UpdateShipmentInput) {
    if (!ownerId) throw new Error("Authentication is required to update a shipment.");
    return this.repository.update(ownerId, id, input);
  }

  delete(ownerId: string, id: string) {
    if (!ownerId) throw new Error("Authentication is required to delete a shipment.");
    return this.repository.delete(ownerId, id);
  }
}
