import type { Shipment } from "@/core/entities/shipment";

const DB_NAME = "freightflow-guest-session";
const STORE_NAME = "pending";
const PENDING_KEY = "shipment-bundle";

export type PendingShipmentBundle = {
  record: Omit<Shipment, "ownerId">;
  files: File[];
  savedAt: number;
};

const PENDING_TTL_MS = 24 * 60 * 60 * 1000;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local guest storage."));
  });
}

export async function savePendingShipmentBundle(bundle: Omit<PendingShipmentBundle, "savedAt">): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put({ ...bundle, savedAt: Date.now() }, PENDING_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not preserve this guest shipment."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Guest shipment save was interrupted."));
  });
  database.close();
}

export async function readPendingShipmentBundle(): Promise<PendingShipmentBundle | null> {
  if (typeof indexedDB === "undefined") return null;
  const database = await openDatabase();
  const value = await new Promise<PendingShipmentBundle | null>((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(PENDING_KEY);
    request.onsuccess = () => resolve((request.result as PendingShipmentBundle | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Could not read the pending guest shipment."));
  });
  database.close();
  if (value && Date.now() - value.savedAt > PENDING_TTL_MS) {
    await clearPendingShipmentBundle();
    return null;
  }
  return value;
}

export async function clearPendingShipmentBundle(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(PENDING_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not clear guest shipment data."));
  });
  database.close();
}
