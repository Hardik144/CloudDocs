"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { Cloud, Download, FileText, ShieldCheck, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function SharedDocumentPage() {
  const { token } = useParams() as { token: string };

  const resolveUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    return `${base}${url}`;
  };

  const { data: document, isLoading, error } = useQuery({
    queryKey: ["shared-doc", token],
    queryFn: () => fetchApi(`/api/v1/documents/shared/${token}`),
    retry: false,
  });

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
          <div className="text-center py-20 text-slate-400 text-sm">Loading shared document...</div>
        ) : error || !document ? (
          <div className="bg-white p-8 rounded-2xl border border-red-200 text-center max-w-md mx-auto space-y-3">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">Share Link Expired or Invalid</h3>
            <p className="text-xs text-slate-500">This document share link is either invalid, reached its download limit, or has expired.</p>
            <Link href="/" className="inline-block mt-2 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl">
              Go to Home
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <FileText className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">{document.name}</h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {(document.file_size / 1024).toFixed(1)} KB • Permission: {document.permission_level}
                  </p>
                </div>
              </div>

              <a
                href={resolveUrl(document.download_url)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition"
              >
                <Download className="w-4 h-4" />
                <span>Download Document</span>
              </a>
            </div>

            {/* Document preview iframe if supported */}
            {document.mime_type.includes("pdf") ? (
              <iframe
                src={resolveUrl(document.preview_url)}
                className="w-full h-[600px] rounded-xl border border-slate-200"
                title="Shared PDF Preview"
              />
            ) : document.mime_type.includes("image") ? (
              <div className="flex justify-center p-6 bg-slate-50 rounded-xl">
                <img src={resolveUrl(document.preview_url)} alt={document.name} className="max-h-[500px] object-contain rounded-lg" />
              </div>
            ) : (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-sm text-slate-600">This file is ready for download.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
