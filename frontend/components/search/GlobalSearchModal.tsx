"use client";

import React, { useState, useEffect } from "react";
import { Search, FileText, FolderKanban, CheckSquare, X } from "lucide-react";
import { fetchApi } from "@/lib/api";
import Link from "next/link";

interface SearchResults {
  documents: Array<{ id: string; name: string; mime_type: string; current_version: number }>;
  projects: Array<{ id: string; name: string; status: string; priority: string }>;
  tasks: Array<{ id: string; title: string; status: string; project_id: string }>;
}

export function GlobalSearchModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await fetchApi<{ results: SearchResults }>(`/api/v1/search/?q=${encodeURIComponent(query)}`);
        setResults(data.results);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        <div className="flex items-center px-4 py-3 border-b border-slate-200">
          <Search className="w-5 h-5 text-slate-400 mr-3" />
          <input
            type="text"
            placeholder="Search documents, projects, tasks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent border-none outline-none text-slate-900 placeholder-slate-400 text-base"
          />
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-4 space-y-4">
          {isLoading && (
            <div className="text-center py-6 text-slate-400 text-sm">Searching...</div>
          )}

          {!isLoading && results && (
            <>
              {/* Documents */}
              {results.documents.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Documents</h4>
                  <div className="space-y-1">
                    {results.documents.map((d) => (
                      <Link
                        key={d.id}
                        href={`/documents/${d.id}`}
                        onClick={onClose}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-indigo-50 text-slate-700 hover:text-indigo-900 group"
                      >
                        <div className="flex items-center space-x-2.5">
                          <FileText className="w-4 h-4 text-indigo-500" />
                          <span className="text-sm font-medium">{d.name}</span>
                        </div>
                        <span className="text-xs bg-slate-100 group-hover:bg-indigo-100 text-slate-600 px-2 py-0.5 rounded">
                          v{d.current_version}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects */}
              {results.projects.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Projects</h4>
                  <div className="space-y-1">
                    {results.projects.map((p) => (
                      <Link
                        key={p.id}
                        href={`/projects/${p.id}`}
                        onClick={onClose}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-indigo-50 text-slate-700 hover:text-indigo-900"
                      >
                        <div className="flex items-center space-x-2.5">
                          <FolderKanban className="w-4 h-4 text-amber-500" />
                          <span className="text-sm font-medium">{p.name}</span>
                        </div>
                        <span className="text-xs capitalize text-slate-500">{p.status}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks */}
              {results.tasks.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Tasks</h4>
                  <div className="space-y-1">
                    {results.tasks.map((t) => (
                      <Link
                        key={t.id}
                        href={`/projects/${t.project_id}`}
                        onClick={onClose}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-indigo-50 text-slate-700 hover:text-indigo-900"
                      >
                        <div className="flex items-center space-x-2.5">
                          <CheckSquare className="w-4 h-4 text-emerald-500" />
                          <span className="text-sm font-medium">{t.title}</span>
                        </div>
                        <span className="text-xs uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {t.status}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {results.documents.length === 0 && results.projects.length === 0 && results.tasks.length === 0 && (
                <div className="text-center py-6 text-slate-500 text-sm">No results found for &ldquo;{query}&rdquo;</div>
              )}
            </>
          )}

          {!isLoading && !results && !query && (
            <div className="text-center py-6 text-slate-400 text-sm">Type keywords to search across files, projects, and tasks</div>
          )}
        </div>
      </div>
    </div>
  );
}
