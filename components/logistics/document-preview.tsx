"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { FileText, ScanLine, Upload, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DocumentPreview({
  file,
  onUpload,
  loading,
}: {
  file: File | null;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  loading: boolean;
}) {
  const [zoom, setZoom] = useState(100);
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const isPdf = file?.type === "application/pdf";

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-100">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-sky-600 text-white">
            <ScanLine className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-slate-800">
              Source document
            </p>
            <p className="max-w-50 truncate font-mono text-[10px] text-slate-400">
              {file?.name ?? "No document selected"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 rounded-md border border-slate-200 p-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setZoom((value) => Math.max(70, value - 10))}
            aria-label="Zoom out"
          >
            <ZoomOut className="size-3.5" />
          </Button>
          <span className="w-10 text-center font-mono text-[10px] text-slate-500">
            {zoom}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setZoom((value) => Math.min(140, value + 10))}
            aria-label="Zoom in"
          >
            <ZoomIn className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-5">
        {previewUrl ? (
          isPdf ? (
            <iframe
              src={previewUrl}
              title="Freight document preview"
              className="h-full min-h-125 w-full bg-white"
            />
          ) : (
            <img
              src={previewUrl}
              alt="Freight document preview"
              className="mx-auto max-w-full origin-top shadow-lg"
              style={{ transform: `scale(${zoom / 100})` }}
            />
          )
        ) : (
          <div className="flex min-h-100 h-full items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white">
            <div className="text-center">
              <FileText className="mx-auto mb-3 size-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">
                Upload a freight document
              </p>
              <p className="mt-1 text-xs text-slate-400">
                PDF, PNG, JPG or WEBP
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3">
        <span className="truncate text-[11px] text-slate-500">
          {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "No file"}
        </span>
        <label
          className={`cursor-pointer ${loading ? "pointer-events-none opacity-50" : ""}`}
        >
          <span className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs hover:bg-slate-50">
            <Upload className="size-3.5" />
            Upload document
          </span>
          <input
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            onChange={onUpload}
            disabled={loading}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
}
