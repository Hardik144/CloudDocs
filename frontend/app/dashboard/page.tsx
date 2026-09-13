"use client";

import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import {
  Files,
  FolderKanban,
  CheckSquare,
  HardDrive,
  Clock,
  ArrowUpRight,
  Plus,
  FileText,
  Activity as ActivityIcon
} from "lucide-react";
import Link from "next/link";
import { UploadModal } from "@/components/documents/UploadModal";

export default function DashboardPage() {
  const [uploadOpen, setUploadOpen] = useState(false);

  const { data: documents = [], refetch: refetchDocs } = useQuery({
    queryKey: ["documents"],
    queryFn: () => fetchApi("/api/v1/documents/"),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => fetchApi("/api/v1/projects/"),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => fetchApi("/api/v1/tasks/"),
  });

  const { data: storage } = useQuery({
    queryKey: ["storage-summary"],
    queryFn: () => fetchApi("/api/v1/storage/summary"),
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["activities"],
    queryFn: () => fetchApi("/api/v1/activity/?limit=8"),
  });

  const usedMB = storage ? (storage.used_bytes / (1024 * 1024)).toFixed(1) : "0";
  const quotaGB = storage ? (storage.quota_bytes / (1024 * 1024 * 1024)).toFixed(0) : "10";
  const pct = storage ? storage.percentage_used : 0;

  const activeTasks = tasks.filter((t: any) => t.status !== "completed");

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Overview</h1>
            <p className="text-sm text-slate-500">Document management, active projects, and team updates</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setUploadOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
            <Link
              href="/projects"
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50 shadow-sm transition"
            >
              New Project
            </Link>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Metric 1: Documents */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Documents</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{documents.length}</h3>
              <p className="text-xs text-indigo-600 font-medium mt-1">Direct Cloudflare R2</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Files className="w-6 h-6" />
            </div>
          </div>

          {/* Metric 2: Projects */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Projects</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{projects.length}</h3>
              <p className="text-xs text-emerald-600 font-medium mt-1">Calculated Health</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <FolderKanban className="w-6 h-6" />
            </div>
          </div>

          {/* Metric 3: Tasks */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Open Tasks</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{activeTasks.length}</h3>
              <p className="text-xs text-amber-600 font-medium mt-1">{tasks.length - activeTasks.length} completed</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <CheckSquare className="w-6 h-6" />
            </div>
          </div>

          {/* Metric 4: Storage */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Used Storage</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{usedMB} MB</h3>
              <p className="text-xs text-slate-400 font-medium mt-1">{pct}% of {quotaGB} GB</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <HardDrive className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Content Section: Projects & Recent Documents */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active Projects List */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Active Projects & Health Scores</h3>
              <Link href="/projects" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                View all &rarr;
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {projects.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">No projects created yet.</div>
              ) : (
                projects.slice(0, 4).map((p: any) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="py-3.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-xl transition group"
                  >
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600">{p.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{p.description || "No description"}</p>
                    </div>
                    <div className="flex items-center space-x-3 flex-shrink-0">
                      {p.health && (
                        <div className="text-right">
                          <span
                            className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full ${
                              p.health.status === "Excellent"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : p.health.status === "Good"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : p.health.status === "At Risk"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`}
                          >
                            {p.health.score}% • {p.health.status}
                          </span>
                        </div>
                      )}
                      <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <ActivityIcon className="w-4 h-4 text-indigo-500" />
                <span>Recent Activity</span>
              </h3>
              <Link href="/activity" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                Full feed
              </Link>
            </div>
            <div className="space-y-4">
              {activities.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">No recent events logged.</div>
              ) : (
                activities.slice(0, 5).map((act: any) => (
                  <div key={act.id} className="text-xs border-l-2 border-indigo-200 pl-3 py-1 space-y-0.5">
                    <p className="font-medium text-slate-800">{act.description}</p>
                    <p className="text-[10px] text-slate-400 flex items-center space-x-1">
                      <Clock className="w-3 h-3 inline" />
                      <span>{new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Documents Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900">Recent Documents & Revisions</h3>
            <Link href="/documents" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
              View all &rarr;
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="text-xs text-slate-400 uppercase bg-slate-50/50 border-y border-slate-100">
                <tr>
                  <th className="px-4 py-3 font-semibold">Document Name</th>
                  <th className="px-4 py-3 font-semibold">Version</th>
                  <th className="px-4 py-3 font-semibold">Size</th>
                  <th className="px-4 py-3 font-semibold">Last Modified</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-slate-400 text-xs">
                      No documents uploaded. Click &ldquo;Upload Document&rdquo; to begin.
                    </td>
                  </tr>
                ) : (
                  documents.slice(0, 5).map((doc: any) => (
                    <tr key={doc.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3.5 flex items-center space-x-3 font-medium text-slate-900">
                        <FileText className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                        <Link href={`/documents/${doc.id}`} className="hover:text-indigo-600">
                          {doc.name}
                        </Link>
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
                        {new Date(doc.updated_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          href={`/documents/${doc.id}`}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          View / Edit
                        </Link>
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
        onSuccess={() => refetchDocs()}
      />
    </AppLayout>
  );
}
