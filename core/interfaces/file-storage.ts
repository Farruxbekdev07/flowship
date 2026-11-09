export type StoredFile = { path: string; downloadUrl: string; contentType: string; size: number };

export interface FileStorage {
  uploadUserFile(input: {
    ownerId: string;
    shipmentId: string;
    file: File;
  }): Promise<StoredFile>;
  getDownloadUrl(path: string): Promise<string>;
  deleteFile(path: string): Promise<void>;
}
