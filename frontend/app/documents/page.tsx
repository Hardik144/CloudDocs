"use client";

import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import {
  FileText,
  Plus,
  Search,
  Star,
  Download,
  Trash2,
  ExternalLink,
  Share2
} from "lucide-react";
import Link from "next/link";
import { UploadModal } from "@/components/documents/UploadModal";

export default function DocumentsPage() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents", showStarredOnly],
    queryFn: () => {
      let url = "/api/v1/documents/";
      if (showStarredOnly) url += "?starred=true";
      return fetchApi(url);
    },
  });

  const toggleStar = useMutation({
    mutationFn: ({ id, is_starred }: { id: string; is_starred: boolean }) =>
      fetchApi(`/api/v1/documents/${id}`, {
        method: "PUT",
        body: JSON.stringify({ is_starred: !is_starred }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents"] }),
  });

  const moveToTrash = useMutation({
    mutationFn: (id: string) => fetchApi(`/api/v1/documents/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents"] }),
  });

  const filtered = documents.filter((d: any) =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Documents Library</h1>
            <p className="text-sm text-slate-500">Secure storage, in-browser previews, and document version history</p>
          </div>
          <button
            onClick={() => setUploadOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setShowStarredOnly(!showStarredOnly)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                showStarredOnly
                  ? "bg-amber-50 border-amber-300 text-amber-800"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${showStarredOnly ? "fill-amber-500 text-amber-500" : ""}`} />
              <span>Starred</span>
            </button>
          </div>
        </div>

        {/* Documents Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="text-xs text-slate-400 uppercase bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Version</th>
                  <th className="px-4 py-3 font-semibold">Size</th>
                  <th className="px-4 py-3 font-semibold">Uploaded</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400 text-xs">
                      Loading documents...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400 text-xs">
                      No documents found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((doc: any) => (
                    <tr key={doc.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3.5 flex items-center space-x-3 font-medium text-slate-900">
                        <button
                          onClick={() => toggleStar.mutate({ id: doc.id, is_starred: doc.is_starred })}
                          className="text-slate-300 hover:text-amber-500"
                        >
                          <Star
                            className={`w-4 h-4 ${doc.is_starred ? "fill-amber-400 text-amber-400" : ""}`}
                          />
                        </button>
                        <FileText className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                        <div>
                          <Link href={`/documents/${doc.id}`} className="hover:text-indigo-600">
                            {doc.name}
                          </Link>
                          {doc.description && (
                            <p className="text-[11px] text-slate-400 line-clamp-1">{doc.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                          v{doc.current_version}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        {(doc.file_size / 1024).toFixed(1)} KB
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-2">
                        <a
                          href={doc.download_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block p-1 text-slate-400 hover:text-indigo-600"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => moveToTrash.mutate(doc.id)}
                          className="p-1 text-slate-400 hover:text-red-600"
                          title="Move to Trash"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <UploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["documents"] })}
      />
    </AppLayout>
  );
}
