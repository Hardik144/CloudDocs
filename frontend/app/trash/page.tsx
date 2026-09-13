"use client";

import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { Trash2, RotateCcw, AlertTriangle } from "lucide-react";

export default function TrashPage() {
  const queryClient = useQueryClient();

  const { data: trashDocs = [], isLoading } = useQuery({
    queryKey: ["trash-documents"],
    queryFn: () => fetchApi("/api/v1/documents/?trash=true"),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/api/v1/documents/${id}/restore`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trash-documents"] }),
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/api/v1/documents/${id}/permanent`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trash-documents"] }),
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Trash Bin</h1>
          <p className="text-sm text-slate-500">Deleted documents can be restored or permanently expunged</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-12 text-center text-slate-400 text-xs">Loading trash...</div>
            ) : trashDocs.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">Trash is currently empty.</div>
            ) : (
              trashDocs.map((doc: any) => (
                <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">{doc.name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Deleted {doc.deleted_at ? new Date(doc.deleted_at).toLocaleDateString() : ""}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => restoreMutation.mutate(doc.id)}
                      className="flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Permanently delete ${doc.name}? This cannot be undone.`)) {
                          permanentDeleteMutation.mutate(doc.id);
                        }
                      }}
                      className="flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Forever</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
