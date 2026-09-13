"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import {
  Cloud,
  Download,
  FileText,
  ShieldCheck,
  AlertCircle,
  Lock,
  Flame,
  Unlock,
  EyeOff
} from "lucide-react";
import Link from "next/link";

export default function SharedDocumentPage() {
  const { token } = useParams() as { token: string };
  const [passwordInput, setPasswordInput] = useState("");
  const [unlockedData, setUnlockedData] = useState<any>(null);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  const resolveUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    return `${base}${url}`;
  };

  // 1. Fetch metadata (checks expiry, burn status, password requirement)
  const { data: meta, isLoading, error } = useQuery({
    queryKey: ["shared-meta", token],
    queryFn: () => fetchApi(`/api/v1/documents/shared/${token}`),
    retry: false,
  });

  // 2. Mutation to unlock the document
  const unlockMutation = useMutation({
    mutationFn: (pwd?: string) =>
      fetchApi(`/api/v1/documents/shared/${token}/unlock`, {
        method: "POST",
        body: JSON.stringify({ password: pwd || null }),
      }),
    onSuccess: (data: any) => {
      setUnlockedData(data);
      setUnlockError(null);
    },
    onError: (err: any) => {
      setUnlockError(err.message || "Failed to unlock document");
    },
  });

  // Auto-unlock if no password is required
  useEffect(() => {
    if (meta && !meta.has_password && !unlockedData && !unlockMutation.isPending) {
      unlockMutation.mutate(undefined);
    }
  }, [meta, unlockedData]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
            <Cloud className="w-5 h-5" />
          </div>
          <span className="font-bold text-slate-900">CloudDocs</span>
        </Link>
        <span className="text-xs text-slate-500 flex items-center space-x-1 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Secure Temporary Share Link</span>
        </span>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 flex flex-col justify-center">
        {isLoading ? (
          <div className="text-center py-20 text-slate-400 text-sm">Verifying secure share link...</div>
        ) : error || !meta ? (
          <div className="bg-white p-8 rounded-3xl border border-rose-200 text-center max-w-md mx-auto space-y-3 shadow-lg">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">Link Unavailable or Burned</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              This document share link is either invalid, reached its single-use limit, or has expired.
            </p>
            <Link
              href="/"
              className="inline-block mt-2 px-5 py-2.5 bg-indigo-600 text-white text-xs font-semibold rounded-xl shadow-sm hover:bg-indigo-700 transition"
            >
              Back to Home
            </Link>
          </div>
        ) : meta.has_password && !unlockedData ? (
          /* Password Unlock Gate */
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md w-full mx-auto p-8 space-y-5">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Password Protected Document</h2>
              <p className="text-xs text-slate-500">
                Enter the password set by the sender to view <span className="font-semibold text-slate-700">{meta.name}</span>.
              </p>
            </div>

            {meta.burn_after_reading && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center space-x-2 text-amber-800 text-xs">
                <Flame className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Single-use: this document burns immediately upon unlocking.</span>
              </div>
            )}

            {unlockError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{unlockError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                unlockMutation.mutate(passwordInput);
              }}
              className="space-y-4"
            >
              <div>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter access password"
                  autoFocus
                  className="w-full px-4 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <button
                type="submit"
                disabled={!passwordInput || unlockMutation.isPending}
                className="w-full flex items-center justify-center space-x-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition"
              >
                <Unlock className="w-4 h-4" />
                <span>{unlockMutation.isPending ? "Unlocking..." : "Unlock Document"}</span>
              </button>
            </form>
          </div>
        ) : unlockedData ? (
          /* Unlocked Document View */
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-8 space-y-6">
            {unlockedData.burned && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center space-x-2 text-amber-800 text-xs">
                <EyeOff className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Single-Use Link Burned:</strong> This link has now expired and cannot be reloaded. Please download your copy now.
                </span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">{unlockedData.name}</h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {(unlockedData.file_size / 1024).toFixed(1)} KB • Access: {unlockedData.permission_level}
                  </p>
                </div>
              </div>

              <a
                href={resolveUrl(unlockedData.download_url)}
                target="_blank"
                rel="noreferrer"
                download
                className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
              >
                <Download className="w-4 h-4" />
                <span>Download Document</span>
              </a>
            </div>

            {/* Document preview if PDF or image */}
            {unlockedData.mime_type.includes("pdf") ? (
              <iframe
                src={resolveUrl(unlockedData.preview_url)}
                className="w-full h-[600px] rounded-2xl border border-slate-200"
                title="Shared PDF Preview"
              />
            ) : unlockedData.mime_type.includes("image") ? (
              <div className="flex justify-center p-6 bg-slate-50 rounded-2xl">
                <img
                  src={resolveUrl(unlockedData.preview_url)}
                  alt={unlockedData.name}
                  className="max-h-[500px] object-contain rounded-xl shadow-sm"
                />
              </div>
            ) : (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-xs text-slate-600">This document is ready for download.</p>
              </div>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}
