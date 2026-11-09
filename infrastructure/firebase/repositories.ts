import { ShipmentService } from "@/core/services/shipment.service";
import { FirestoreShipmentRepository } from "./firestore-shipment.repository";

/** Composition root: replace this adapter with a SQL implementation during migration. */
export function createShipmentService() {
  return new ShipmentService(new FirestoreShipmentRepository());
}
