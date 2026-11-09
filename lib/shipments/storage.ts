import { SHIPMENTS_STORAGE_KEY, type ShipmentRecord } from "./types";

export function readShipments(): ShipmentRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const value = window.localStorage.getItem(SHIPMENTS_STORAGE_KEY);
    if (!value) return [];
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as ShipmentRecord[] : [];
  } catch {
    return [];
  }
}

export function writeShipments(shipments: ShipmentRecord[]) {
  window.localStorage.setItem(SHIPMENTS_STORAGE_KEY, JSON.stringify(shipments));
}

export function makeShipmentId() {
  return `shp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
