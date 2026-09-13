"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, X, CheckCircle, AlertCircle, Archive } from "lucide-react";
import { getAuthToken } from "@/lib/api";

export function UploadArchiveModal({
  isOpen,
  onClose,
  projectId,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const ext = droppedFile.name.toLowerCase();
      if (ext.endsWith(".zip") || ext.endsWith(".tar.gz") || ext.endsWith(".tgz") || ext.endsWith(".tar")) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError("Please upload a .zip or .tar.gz archive file.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    if (description) formData.append("description", description);

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const token = getAuthToken();

    try {
      const res = await fetch(`${apiBase}/api/v1/projects/${projectId}/archives/upload`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to upload and extract project archive");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred while uploading project archive.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Upload Project / Repository</h2>
              <p className="text-xs text-slate-500">Store and inspect a full codebase archive (.zip or .tar.gz)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-5 space-y-4">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              dragActive
                ? "border-indigo-600 bg-indigo-50/50"
                : "border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".zip,.tar.gz,.tgz,.tar"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div className="flex flex-col items-center">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl mb-2">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <p className="text-sm font-semibold text-slate-900">{file.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="mt-2 text-xs font-semibold text-rose-600 hover:text-rose-700"
                >
                  Choose different file
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl mb-2">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <p className="text-sm font-semibold text-slate-900">
                  Drag and drop your project archive
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supports <span className="font-semibold text-slate-700">.zip</span> or{" "}
                  <span className="font-semibold text-slate-700">.tar.gz</span> (up to 500 MB)
                </p>
                <p className="text-[11px] text-slate-400 mt-2">
                  Build folders (node_modules, .git, venv) will be automatically filtered.
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Version / Release Note (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Initial production release v1.0.0"
              className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!file || uploading}
            onClick={handleUpload}
            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm transition-colors"
          >
            {uploading ? "Extracting & Uploading..." : "Upload Repository"}
          </button>
        </div>
      </div>
    </div>
  );
}
