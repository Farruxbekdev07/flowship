import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import type { CreateShipmentInput, PaginatedResult, PaginationOptions, Shipment, ShipmentDocument, UpdateShipmentInput } from "@/core/entities/shipment";
import type { ShipmentRepository } from "@/core/interfaces/shipment.repository";
import { getFirebaseDb } from "./client";

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => stripUndefined(item)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, stripUndefined(item)])) as T;
  }
  return value;
}

/** Firestore implementation of the database-independent ShipmentRepository contract. */
export class FirestoreShipmentRepository implements ShipmentRepository {
  private shipmentsFor(ownerId: string) {
    return collection(getFirebaseDb(), "users", ownerId, "shipments");
  }

  private shipmentRef(ownerId: string, id: string) {
    return doc(this.shipmentsFor(ownerId), id);
  }

  private documentsFor(ownerId: string, shipmentId: string) {
    return collection(this.shipmentRef(ownerId, shipmentId), "documents");
  }

  private async readDocuments(ownerId: string, shipmentId: string): Promise<ShipmentDocument[]> {
    const snapshot = await getDocs(this.documentsFor(ownerId, shipmentId));
    return snapshot.docs
      .map((item) => ({ id: item.id, ...(item.data() as Omit<ShipmentDocument, "id">) }))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  private async replaceDocuments(ownerId: string, shipmentId: string, documents: ShipmentDocument[]): Promise<ShipmentDocument[]> {
    const collectionRef = this.documentsFor(ownerId, shipmentId);
    const existing = await getDocs(collectionRef);
    await Promise.all(existing.docs.map((item) => deleteDoc(item.ref)));
    return Promise.all(documents.map(async (document, order) => {
      const id = document.id ?? crypto.randomUUID();
      const { id: _ignored, ...data } = document;
      const orderedData = { ...data, order };
      await setDoc(doc(collectionRef, id), stripUndefined(orderedData));
      return { ...orderedData, id };
    }));
  }

  async create(ownerId: string, data: CreateShipmentInput, suppliedId?: string): Promise<Shipment> {
    const id = suppliedId ?? `shp_${crypto.randomUUID()}`;
    const { documents, ...shipmentData } = data;
    const reference = this.shipmentRef(ownerId, id);
    const record: Shipment = { ...shipmentData, id, ownerId, documents: [] };
    await setDoc(reference, stripUndefined({ ...shipmentData, id, ownerId }));
    record.documents = await this.replaceDocuments(ownerId, id, documents ?? []);
    return record;
  }

  async findById(ownerId: string, id: string): Promise<Shipment | null> {
    const snapshot = await getDoc(this.shipmentRef(ownerId, id));
    if (!snapshot.exists()) return null;
    const data = snapshot.data() as Omit<Shipment, "documents">;
    return { ...data, id: snapshot.id, ownerId, documents: await this.readDocuments(ownerId, id) };
  }

  async findByUserId(ownerId: string, options: PaginationOptions = {}): Promise<PaginatedResult<Shipment>> {
    const pageSize = Math.min(Math.max(options.limit ?? 50, 1), 100);
    const snapshot = await getDocs(query(this.shipmentsFor(ownerId), orderBy("updatedAt", "desc"), firestoreLimit(pageSize)));
    const items = await Promise.all(snapshot.docs.map(async (item) => {
      const data = item.data() as Omit<Shipment, "documents">;
      return { ...data, id: item.id, ownerId, documents: await this.readDocuments(ownerId, item.id) } as Shipment;
    }));
    return { items, nextCursor: null };
  }

  async update(ownerId: string, id: string, data: UpdateShipmentInput): Promise<Shipment> {
    const reference = this.shipmentRef(ownerId, id);
    const current = await getDoc(reference);
    if (!current.exists()) throw new Error("Shipment not found.");
    const { documents, ...shipmentUpdates } = data;
    const updatedAt = new Date().toISOString();
    await updateDoc(reference, stripUndefined({ ...shipmentUpdates, updatedAt }));
    const updatedDocuments = documents
      ? await this.replaceDocuments(ownerId, id, documents)
      : await this.readDocuments(ownerId, id);
    const previous = current.data() as Omit<Shipment, "documents">;
    return { ...previous, ...shipmentUpdates, id, ownerId, updatedAt, documents: updatedDocuments };
  }

  async delete(ownerId: string, id: string): Promise<void> {
    const documents = await getDocs(this.documentsFor(ownerId, id));
    await Promise.all(documents.docs.map((item) => deleteDoc(item.ref)));
    await deleteDoc(this.shipmentRef(ownerId, id));
  }
}
