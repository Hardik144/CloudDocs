"use client";

import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { Star, FileText } from "lucide-react";
import Link from "next/link";

export default function StarredPage() {
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["starred-documents"],
    queryFn: () => fetchApi("/api/v1/documents/?starred=true"),
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Starred Documents</h1>
          <p className="text-sm text-slate-500">Quick access to important files</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-12 text-center text-slate-400 text-xs">Loading starred documents...</div>
            ) : documents.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">No starred documents yet.</div>
            ) : (
              documents.map((doc: any) => (
                <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                  <div className="flex items-center space-x-3">
                    <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                    <FileText className="w-5 h-5 text-indigo-500" />
                    <div>
                      <Link href={`/documents/${doc.id}`} className="text-sm font-semibold text-slate-900 hover:text-indigo-600">
                        {doc.name}
                      </Link>
                      <p className="text-xs text-slate-400">
                        v{doc.current_version} • {(doc.file_size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <Link href={`/documents/${doc.id}`} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                    Open &rarr;
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
