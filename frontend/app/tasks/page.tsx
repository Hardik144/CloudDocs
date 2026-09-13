"use client";

import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { CheckSquare } from "lucide-react";
import Link from "next/link";

export default function TasksPage() {
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => fetchApi("/api/v1/tasks/"),
  });

  const updateTaskStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetchApi(`/api/v1/tasks/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tasks Management</h1>
          <p className="text-sm text-slate-500">Track and update assigned tasks across all your projects</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-12 text-center text-slate-400 text-xs">Loading tasks...</div>
            ) : tasks.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">No active tasks found.</div>
            ) : (
              tasks.map((task: any) => (
                <div key={task.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                  <div className="flex items-center space-x-3">
                    <CheckSquare
                      className={`w-5 h-5 ${
                        task.status === "completed" ? "text-emerald-500" : "text-slate-400"
                      }`}
                    />
                    <div>
                      <h4
                        className={`text-sm font-semibold ${
                          task.status === "completed" ? "line-through text-slate-400" : "text-slate-900"
                        }`}
                      >
                        {task.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Priority: <span className="font-medium capitalize text-slate-600">{task.priority}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <select
                      value={task.status}
                      onChange={(e) => updateTaskStatus.mutate({ id: task.id, status: e.target.value })}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700"
                    >
                      <option value="todo">TODO</option>
                      <option value="in_progress">IN PROGRESS</option>
                      <option value="in_review">IN REVIEW</option>
                      <option value="completed">COMPLETED</option>
                    </select>

                    <Link
                      href={`/projects/${task.project_id}`}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      Go to Project &rarr;
                    </Link>
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
