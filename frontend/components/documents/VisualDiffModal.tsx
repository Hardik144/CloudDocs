"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { X, GitCompare, Plus, Minus, ArrowRight, Check } from "lucide-react";

interface DiffLine {
  type: "equal" | "insert" | "delete";
  content: string;
  old_lineno?: number | null;
  new_lineno?: number | null;
}

interface DocumentDiffData {
  document_id: string;
  v1_number: number;
  v2_number: number;
  v1_created_at: string;
  v2_created_at: string;
  additions: number;
  deletions: number;
  diff_lines: DiffLine[];
}

export function VisualDiffModal({
  isOpen,
  onClose,
  documentId,
  documentName,
  versions,
  currentVersion
}: {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentName: string;
  versions: Array<{ version_number: number; created_at: string; change_description?: string }>;
  currentVersion: number;
}) {
  const [baseVersion, setBaseVersion] = useState<number>(
    versions.length > 1 ? versions[versions.length - 1].version_number : 1
  );
  const [targetVersion, setTargetVersion] = useState<number>(currentVersion);
  const [viewMode, setViewMode] = useState<"split" | "unified">("split");

  const { data: diffData, isLoading, error } = useQuery<DocumentDiffData>({
    queryKey: ["document-diff", documentId, baseVersion, targetVersion],
    queryFn: () => fetchApi(`/api/v1/documents/${documentId}/diff?v1=${baseVersion}&v2=${targetVersion}`),
    enabled: isOpen && !!documentId && baseVersion !== targetVersion,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/90 gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900">Version Diff Comparison</h3>
                <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-mono">
                  {documentName}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Visual side-by-side comparison of document revisions
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Version Pickers */}
            <div className="flex items-center space-x-2 text-xs bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
              <span className="text-slate-400 font-medium">Compare:</span>
              <select
                value={baseVersion}
                onChange={(e) => setBaseVersion(Number(e.target.value))}
                className="bg-transparent font-semibold text-slate-700 focus:outline-none"
              >
                {versions.map((v) => (
                  <option key={v.version_number} value={v.version_number}>
                    v{v.version_number}
                  </option>
                ))}
              </select>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={targetVersion}
                onChange={(e) => setTargetVersion(Number(e.target.value))}
                className="bg-transparent font-semibold text-indigo-600 focus:outline-none"
              >
                {versions.map((v) => (
                  <option key={v.version_number} value={v.version_number}>
                    v{v.version_number} {v.version_number === currentVersion ? "(Current)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Diff Stats Banner */}
        {diffData && (
          <div className="flex items-center justify-between px-6 py-2.5 bg-slate-100/70 border-b border-slate-200 text-xs">
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1 text-emerald-700 font-semibold">
                <Plus className="w-3.5 h-3.5" />
                <span>{diffData.additions} additions</span>
              </span>
              <span className="flex items-center space-x-1 text-rose-700 font-semibold">
                <Minus className="w-3.5 h-3.5" />
                <span>{diffData.deletions} deletions</span>
              </span>
            </div>
            <div className="text-slate-400 font-mono text-[11px]">
              Comparing v{diffData.v1_number} ➔ v{diffData.v2_number}
            </div>
          </div>
        )}

        {/* Diff Content Area */}
        <div className="flex-1 overflow-auto bg-[#0d1117] p-4 text-xs font-mono leading-relaxed">
          {baseVersion === targetVersion ? (
            <div className="flex items-center justify-center h-48 text-slate-400">
              Please select two different versions to compare.
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center h-48 text-slate-400">
              Calculating revision differences...
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-48 text-rose-400">
              {(error as any).message || "Failed to compare versions. Visual diff is only available for text/markdown."}
            </div>
          ) : diffData?.diff_lines ? (
            <div className="divide-y divide-slate-800/50">
              {diffData.diff_lines.map((line, idx) => {
                const isInsert = line.type === "insert";
                const isDelete = line.type === "delete";
                return (
                  <div
                    key={idx}
                    className={`flex items-start font-mono text-xs py-0.5 px-2 ${
                      isInsert
                        ? "bg-emerald-950/40 text-emerald-300"
                        : isDelete
                        ? "bg-rose-950/40 text-rose-300"
                        : "text-slate-300 hover:bg-slate-800/30"
                    }`}
                  >
                    {/* Old line number */}
                    <span className="w-10 text-right pr-2 text-slate-600 select-none">
                      {line.old_lineno || ""}
                    </span>
                    {/* New line number */}
                    <span className="w-10 text-right pr-3 text-slate-600 select-none border-r border-slate-800">
                      {line.new_lineno || ""}
                    </span>
                    {/* Sign indicator */}
                    <span className="w-6 text-center select-none font-bold">
                      {isInsert ? "+" : isDelete ? "-" : " "}
                    </span>
                    {/* Code content */}
                    <pre className="flex-1 overflow-x-auto whitespace-pre-wrap pl-1 font-mono">
                      {line.content}
                    </pre>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-400">
              No differences detected between selected versions.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-xl transition"
          >
            Close Diff
          </button>
        </div>
      </div>
    </div>
  );
}
