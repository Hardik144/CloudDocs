"use client";

import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { FolderKanban, Plus, Users, Files, CheckSquare, X } from "lucide-react";
import Link from "next/link";

export default function ProjectsPage() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => fetchApi("/api/v1/projects/"),
  });

  const createProjectMutation = useMutation({
    mutationFn: () =>
      fetchApi("/api/v1/projects/", {
        method: "POST",
        body: JSON.stringify({ name, description, priority, status: "active" }),
      }),
    onSuccess: () => {
      setName("");
      setDescription("");
      setCreateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Projects</h1>
            <p className="text-sm text-slate-500">Organize documents, tasks, milestones, and collaborators</p>
          </div>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full text-center py-12 text-slate-400 text-sm">Loading projects...</div>
          ) : projects.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-400 text-sm">
              No projects created yet. Click &ldquo;New Project&rdquo; to create your first workspace.
            </div>
          ) : (
            projects.map((p: any) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                      <FolderKanban className="w-5 h-5" />
                    </div>
                    {p.health && (
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          p.health.status === "Excellent"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : p.health.status === "Good"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {p.health.score}% Health
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition">
                    {p.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{p.description || "No description provided"}</p>
                </div>

                <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 mt-6">
                  <span className="flex items-center space-x-1">
                    <Files className="w-3.5 h-3.5 text-slate-400" />
                    <span>{p.documents_count || 0} Docs</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
                    <span>{p.tasks_count || 0} Tasks</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{p.members_count || 1} Members</span>
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Create Project Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Create New Project</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Cloud Migration"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  placeholder="Project objectives, requirements, and deliverables..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3">
              <button
                onClick={() => setCreateModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => createProjectMutation.mutate()}
                disabled={!name || createProjectMutation.isPending}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
              >
                {createProjectMutation.isPending ? "Creating..." : "Create Project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
