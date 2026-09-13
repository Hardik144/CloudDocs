"use client";

import React, { useState } from "react";
import { GitBranch, GitCommit, PlayCircle, CheckCircle2, XCircle, Clock, ExternalLink, Settings, RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

interface GitHubSyncCardProps {
  projectId: string;
  githubRepo?: string | null;
  canManage?: boolean;
}

export function GitHubSyncCard({ projectId, githubRepo, canManage = false }: GitHubSyncCardProps) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [repoInput, setRepoInput] = useState(githubRepo || "");

  const { data: statusData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["github-status", projectId],
    queryFn: () => fetchApi(`/api/v1/projects/${projectId}/github/status`),
    enabled: !!projectId && !!githubRepo,
    refetchInterval: 60000 // poll every minute
  });

  const updateMutation = useMutation({
    mutationFn: (newRepo: string) =>
      fetchApi(`/api/v1/projects/${projectId}/github`, {
        method: "PUT",
        body: JSON.stringify({ github_repo: newRepo })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["github-status", projectId] });
      setModalOpen(false);
    },
    onError: (err: any) => {
      alert("Failed to update repository: " + err.message);
    }
  });

  const handleSaveRepo = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(repoInput.trim());
  };

  const workflow = statusData?.latest_workflow;
  const commit = statusData?.latest_commit;

  const getWorkflowBadge = () => {
    if (!workflow) return null;
    const conclusion = workflow.conclusion;
    const status = workflow.status;

    if (conclusion === "success") {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>CI Passing</span>
        </span>
      );
    }
    if (conclusion === "failure") {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
          <XCircle className="w-3.5 h-3.5 text-rose-600" />
          <span>CI Failing</span>
        </span>
      );
    }
    if (status === "in_progress" || status === "queued") {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          <span>CI In Progress</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
        <PlayCircle className="w-3.5 h-3.5 text-slate-500" />
        <span>{workflow.name}</span>
      </span>
    );
  };

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-slate-900 text-white rounded-lg">
              <GitBranch className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">GitHub CI/CD Sync</h4>
              {githubRepo ? (
                <a
                  href={`https://github.com/${githubRepo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 group"
                >
                  <span>{githubRepo}</span>
                  <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition" />
                </a>
              ) : (
                <span className="text-xs text-slate-400">No repository connected</span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {githubRepo && (
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                title="Refresh GitHub status"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-indigo-600" : ""}`} />
              </button>
            )}
            {canManage && (
              <button
                onClick={() => {
                  setRepoInput(githubRepo || "");
                  setModalOpen(true);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                title="Configure GitHub Repository"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Status Content */}
        {!githubRepo ? (
          <div className="pt-3 text-center">
            <p className="text-xs text-slate-500 mb-2">Connect a repository to view live commits & CI build badges.</p>
            {canManage && (
              <button
                onClick={() => setModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold text-xs transition"
              >
                Connect GitHub Repo
              </button>
            )}
          </div>
        ) : isLoading ? (
          <div className="pt-3 flex items-center justify-center space-x-2 text-xs text-slate-400">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
            <span>Connecting to GitHub API...</span>
          </div>
        ) : statusData?.error ? (
          <div className="pt-3 text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
            {statusData.error}
          </div>
        ) : (
          <div className="pt-3 space-y-2.5">
            {/* CI Status Badge */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Pipeline Status</span>
              {getWorkflowBadge() || (
                <span className="text-xs text-slate-400">No workflow runs found</span>
              )}
            </div>

            {/* Latest Commit */}
            {commit && (
              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 flex items-start space-x-2 text-xs">
                <GitCommit className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold text-slate-700">{commit.sha}</span>
                    <span className="text-[11px] text-slate-400">{commit.author}</span>
                  </div>
                  <p className="text-slate-600 truncate mt-0.5 font-medium">{commit.message}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900">Configure GitHub Integration</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRepo} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  GitHub Repository (Owner/Repo)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hardik144/CloudDocs"
                  value={repoInput}
                  onChange={(e) => setRepoInput(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Enter the repository identifier or full GitHub URL to stream live commits and Actions CI/CD status badges.
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl shadow-sm transition"
                >
                  {updateMutation.isPending ? "Saving..." : "Save Connection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
