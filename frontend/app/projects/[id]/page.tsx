"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  FolderKanban,
  CheckSquare,
  Files,
  Users,
  Activity as ActivityIcon,
  Flag,
  Plus,
  ArrowLeft,
  UserPlus,
  X,
  Code2,
  Archive,
  UploadCloud,
  Terminal,
  GitBranch
} from "lucide-react";
import Link from "next/link";
import { UploadModal } from "@/components/documents/UploadModal";
import { UploadArchiveModal } from "@/components/projects/UploadArchiveModal";
import { ProjectCodeExplorer } from "@/components/projects/ProjectCodeExplorer";
import { GitHubSyncCard } from "@/components/projects/GitHubSyncCard";
import { ArchitectureDiagramStudio } from "@/components/diagrams/ArchitectureDiagramStudio";
import { CodeRunnerWidget } from "@/components/runner/CodeRunnerWidget";

export default function ProjectDetailPage() {
  const { id } = useParams() as { id: string };
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"overview" | "code" | "diagram" | "playground" | "tasks" | "documents" | "milestones" | "members" | "activity">("overview");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");

  // Real-time presence state from WebSocket
  const [onlineUsers, setOnlineUsers] = useState<Array<{ user_id: string; name: string }>>([]);

  // Fetch Project
  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: () => fetchApi(`/api/v1/projects/${id}`),
    enabled: !!id,
  });

  // Fetch Project Tasks
  const { data: tasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ["project-tasks", id],
    queryFn: () => fetchApi(`/api/v1/tasks/?project_id=${id}`),
    enabled: !!id,
  });

  // Fetch Project Documents
  const { data: documents = [], refetch: refetchDocs } = useQuery({
    queryKey: ["project-documents", id],
    queryFn: () => fetchApi(`/api/v1/documents/?project_id=${id}`),
    enabled: !!id,
  });

  // Fetch Project Members
  const { data: members = [], refetch: refetchMembers } = useQuery({
    queryKey: ["project-members", id],
    queryFn: () => fetchApi(`/api/v1/projects/${id}/members`),
    enabled: !!id,
  });

  // Fetch Milestones
  const { data: milestones = [], refetch: refetchMilestones } = useQuery({
    queryKey: ["project-milestones", id],
    queryFn: () => fetchApi(`/api/v1/milestones/project/${id}`),
    enabled: !!id,
  });

  // Fetch Project Activity
  const { data: activities = [] } = useQuery({
    queryKey: ["project-activity", id],
    queryFn: () => fetchApi(`/api/v1/activity/?project_id=${id}`),
    enabled: !!id,
  });

  // Fetch Project Archives / Repositories
  const { data: archives = [], refetch: refetchArchives } = useQuery({
    queryKey: ["project-archives", id],
    queryFn: () => fetchApi(`/api/v1/projects/${id}/archives`),
    enabled: !!id,
  });

  // Setup WebSocket connection for live project presence
  useEffect(() => {
    if (!id || !user) return;
    const wsBase = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
    const wsUrl = `${wsBase}/ws/projects/${id}?user_id=${user.id}&user_name=${encodeURIComponent(user.name)}`;
    
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "presence") {
            setOnlineUsers(data.users || []);
          }
        } catch {
          // ignore
        }
      };
    } catch (err) {
      console.error("WebSocket failed:", err);
    }

    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [id, user]);

  // Create Task Mutation
  const createTaskMutation = useMutation({
    mutationFn: () =>
      fetchApi("/api/v1/tasks/", {
        method: "POST",
        body: JSON.stringify({
          project_id: id,
          title: taskTitle,
          priority: taskPriority,
          status: "todo",
        }),
      }),
    onSuccess: () => {
      setTaskTitle("");
      setTaskModalOpen(false);
      refetchTasks();
      queryClient.invalidateQueries({ queryKey: ["project", id] });
    },
  });

  // Update Task Status Mutation
  const updateTaskStatusMutation = useMutation({
    mutationFn: ({ taskId, newStatus }: { taskId: string; newStatus: string }) =>
      fetchApi(`/api/v1/tasks/${taskId}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      }),
    onSuccess: () => {
      refetchTasks();
      queryClient.invalidateQueries({ queryKey: ["project", id] });
    },
  });

  // Add Member Mutation
  const addMemberMutation = useMutation({
    mutationFn: () =>
      fetchApi(`/api/v1/projects/${id}/members`, {
        method: "POST",
        body: JSON.stringify({ user_email: inviteEmail, role: inviteRole }),
      }),
    onSuccess: () => {
      setInviteEmail("");
      setMemberModalOpen(false);
      refetchMembers();
      queryClient.invalidateQueries({ queryKey: ["project", id] });
    },
  });

  if (isLoading || !project) {
    return (
      <AppLayout>
        <div className="text-center py-20 text-slate-400 text-sm">Loading project workspace...</div>
      </AppLayout>
    );
  }

  const health = project.health;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header & Presence */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Link href="/projects" className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
                <span className="text-xs uppercase font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {project.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{project.description || "No description"}</p>
            </div>
          </div>

          {/* Real-time Presence Indicators */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="font-semibold text-slate-700">Active Collaborators:</span>
              <span className="text-slate-500 font-medium">
                {onlineUsers.length > 0
                  ? onlineUsers.map((u) => u.name).join(", ")
                  : user?.name}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 space-x-8 overflow-x-auto">
          {[
            { key: "overview", label: "Overview", icon: FolderKanban },
            { key: "code", label: `Repository / Code ${archives.length > 0 ? `(${archives.length})` : ""}`, icon: Code2 },
            { key: "diagram", label: "Architecture Studio", icon: GitBranch },
            { key: "playground", label: "Sandbox / Runner", icon: Terminal },
            { key: "tasks", label: `Tasks (${tasks.length})`, icon: CheckSquare },
            { key: "documents", label: `Documents (${documents.length})`, icon: Files },
            { key: "milestones", label: `Milestones (${milestones.length})`, icon: Flag },
            { key: "members", label: `Members (${members.length})`, icon: Users },
            { key: "activity", label: "Activity", icon: ActivityIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`pb-3 text-sm font-semibold border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition ${
                  active
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab: Overview (Includes Health Score Breakdown) */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {health && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Calculated Project Health
                    </span>
                    <div className="flex items-center space-x-3 mt-1">
                      <span className="text-4xl font-extrabold text-slate-900">{health.score}%</span>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          health.status === "Excellent"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : health.status === "Good"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {health.status}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 max-w-md">{health.summary}</p>
                </div>

                {/* Breakdown Gauges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500 font-medium">Task Completion (35%)</span>
                      <span className="font-bold text-slate-900">{health.breakdown.task_completion}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600" style={{ width: `${health.breakdown.task_completion}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500 font-medium">Milestones (25%)</span>
                      <span className="font-bold text-slate-900">{health.breakdown.milestone_progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-600" style={{ width: `${health.breakdown.milestone_progress}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500 font-medium">Deadlines (20%)</span>
                      <span className="font-bold text-slate-900">{health.breakdown.deadline_adherence}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-600" style={{ width: `${health.breakdown.deadline_adherence}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500 font-medium">Activity (20%)</span>
                      <span className="font-bold text-slate-900">{health.breakdown.recent_activity}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500" style={{ width: `${health.breakdown.recent_activity}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* GitHub CI/CD Sync Card */}
            <GitHubSyncCard
              projectId={id}
              githubRepo={project.github_repo}
              canManage={user?.id === project.owner_id || members.some((m: any) => m.user_id === user?.id && ["owner", "editor"].includes(m.role))}
            />
          </div>
        )}

        {/* Tab: Repository / Code */}
        {activeTab === "code" && (
          <div className="space-y-6">
            {archives.length > 0 ? (
              <ProjectCodeExplorer
                projectId={id}
                archiveId={archives[0].id}
                archiveName={archives[0].name}
                archiveSize={archives[0].file_size}
                totalFiles={archives[0].total_files}
                totalDirs={archives[0].total_dirs}
                onUploadNew={() => setArchiveModalOpen(true)}
              />
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm max-w-2xl mx-auto">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <Code2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">No Code Repository Attached</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6">
                  Upload your full project directory or codebase as a .zip or .tar.gz archive to store it, browse the files, and inspect code directly in your browser.
                </p>
                <button
                  onClick={() => setArchiveModalOpen(true)}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-2xl shadow-sm transition-colors"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload Project Code (.zip)</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab: Architecture Studio */}
        {activeTab === "diagram" && (
          <div className="space-y-6">
            <ArchitectureDiagramStudio
              projectId={id}
              initialSyntax={project.diagram_syntax}
              canEdit={user?.id === project.owner_id || members.some((m: any) => m.user_id === user?.id && ["owner", "editor"].includes(m.role))}
            />
          </div>
        )}

        {/* Tab: Python Code Runner & Sandbox */}
        {activeTab === "playground" && (
          <div className="space-y-6">
            <CodeRunnerWidget />
          </div>
        )}

        {/* Tab: Tasks (Kanban Columns) */}
        {activeTab === "tasks" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900">Task Management</h3>
              <button
                onClick={() => setTaskModalOpen(true)}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {["todo", "in_progress", "in_review", "completed"].map((colStatus) => {
                const columnTasks = tasks.filter((t: any) => t.status === colStatus);
                return (
                  <div key={colStatus} className="bg-slate-100/80 p-4 rounded-2xl border border-slate-200 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        {colStatus.replace("_", " ")}
                      </span>
                      <span className="text-xs font-bold bg-white text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                        {columnTasks.length}
                      </span>
                    </div>

                    <div className="space-y-3 flex-1">
                      {columnTasks.map((t: any) => (
                        <div key={t.id} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-2">
                          <div className="flex items-start justify-between">
                            <h4 className="text-xs font-bold text-slate-900">{t.title}</h4>
                            <span
                              className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                t.priority === "critical"
                                  ? "bg-red-50 text-red-700"
                                  : t.priority === "high"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-slate-50 text-slate-600"
                              }`}
                            >
                              {t.priority}
                            </span>
                          </div>

                          <select
                            value={t.status}
                            onChange={(e) =>
                              updateTaskStatusMutation.mutate({ taskId: t.id, newStatus: e.target.value })
                            }
                            className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-600 focus:outline-none"
                          >
                            <option value="todo">TODO</option>
                            <option value="in_progress">IN PROGRESS</option>
                            <option value="in_review">IN REVIEW</option>
                            <option value="completed">COMPLETED</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab: Documents */}
        {activeTab === "documents" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900">Project Documents</h3>
              <button
                onClick={() => setUploadOpen(true)}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload to Project</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {documents.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">No documents attached to this project.</div>
              ) : (
                documents.map((d: any) => (
                  <div key={d.id} className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <Files className="w-4 h-4 text-indigo-500" />
                      <div>
                        <Link href={`/documents/${d.id}`} className="text-sm font-semibold text-slate-900 hover:text-indigo-600">
                          {d.name}
                        </Link>
                        <p className="text-[11px] text-slate-400">
                          v{d.current_version} • {(d.file_size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <Link href={`/documents/${d.id}`} className="text-xs text-indigo-600 font-semibold hover:underline">
                      View Document &rarr;
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab: Milestones */}
        {activeTab === "milestones" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Project Milestones</h3>
            <div className="space-y-4">
              {milestones.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">No milestones defined.</div>
              ) : (
                milestones.map((m: any) => (
                  <div key={m.id} className="p-4 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900">{m.title}</span>
                      <span className="text-xs font-bold text-indigo-600">{m.progress_pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600" style={{ width: `${m.progress_pct}%` }} />
                    </div>
                    <p className="text-xs text-slate-500">{m.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab: Members */}
        {activeTab === "members" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900">Collaborators & Permissions</h3>
              <button
                onClick={() => setMemberModalOpen(true)}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Invite Collaborator</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {members.map((m: any) => (
                <div key={m.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                      {m.user?.name?.[0] || "U"}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{m.user?.name}</p>
                      <p className="text-[11px] text-slate-400">{m.user?.email}</p>
                    </div>
                  </div>
                  <span className="text-xs capitalize font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                    {m.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Activity */}
        {activeTab === "activity" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">Project Activity Log</h3>
            <div className="space-y-4">
              {activities.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">No activity logged yet.</div>
              ) : (
                activities.map((act: any) => (
                  <div key={act.id} className="text-xs border-l-2 border-indigo-200 pl-3 py-1 space-y-0.5">
                    <p className="font-medium text-slate-800">{act.description}</p>
                    <p className="text-[10px] text-slate-400">{new Date(act.created_at).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Task Creation Modal */}
      {taskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900">New Task</h3>
              <button onClick={() => setTaskModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
              <input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="e.g. Implement presigned URL endpoint"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
              <select
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button onClick={() => setTaskModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">Cancel</button>
              <button
                onClick={() => createTaskMutation.mutate()}
                disabled={!taskTitle || createTaskMutation.isPending}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg disabled:opacity-50"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member Invite Modal */}
      {memberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900">Invite Collaborator</h3>
              <button onClick={() => setMemberModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">User Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
              >
                <option value="viewer">Viewer (Read & Download)</option>
                <option value="commenter">Commenter</option>
                <option value="editor">Editor (Upload versions & edit)</option>
              </select>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button onClick={() => setMemberModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">Cancel</button>
              <button
                onClick={() => addMemberMutation.mutate()}
                disabled={!inviteEmail || addMemberMutation.isPending}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg disabled:opacity-50"
              >
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}

      <UploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        projectId={id}
        onSuccess={() => refetchDocs()}
      />

      <UploadArchiveModal
        isOpen={archiveModalOpen}
        onClose={() => setArchiveModalOpen(false)}
        projectId={id}
        onSuccess={() => {
          refetchArchives();
          setActiveTab("code");
        }}
      />
    </AppLayout>
  );
}
