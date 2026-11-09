import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import type { FileStorage, StoredFile } from "@/core/interfaces/file-storage";
import { getFirebaseStorage } from "./client";

/** Private per-user Storage adapter. Files are never stored inside Firestore documents. */
export class FirebaseFileStorage implements FileStorage {
  async uploadUserFile({ ownerId, shipmentId, file }: { ownerId: string; shipmentId: string; file: File }): Promise<StoredFile> {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `users/${ownerId}/shipments/${shipmentId}/documents/${crypto.randomUUID()}-${safeName}`;
    const fileRef = ref(getFirebaseStorage(), path);
    await uploadBytes(fileRef, file, { contentType: file.type || "application/octet-stream" });
    return { path, downloadUrl: await getDownloadURL(fileRef), contentType: file.type, size: file.size };
  }

  async getDownloadUrl(path: string): Promise<string> {
    return getDownloadURL(ref(getFirebaseStorage(), path));
  }

  async deleteFile(path: string): Promise<void> {
    await deleteObject(ref(getFirebaseStorage(), path));
  }
}
