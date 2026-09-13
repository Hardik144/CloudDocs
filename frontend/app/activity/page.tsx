"use client";

import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { Activity as ActivityIcon, Clock, User, FileText, CheckSquare, FolderKanban } from "lucide-react";

export default function ActivityPage() {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["full-activity-feed"],
    queryFn: () => fetchApi("/api/v1/activity/?limit=50"),
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Activity Timeline</h1>
          <p className="text-sm text-slate-500">Real-time audit of project milestones, document uploads, and task completions</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          {isLoading ? (
            <div className="text-center py-12 text-slate-400 text-xs">Loading activity timeline...</div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">No activity logged yet.</div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {activities.map((act: any) => (
                <div key={act.id} className="relative group">
                  <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-white" />
                  <div className="bg-slate-50/70 hover:bg-indigo-50/40 p-4 rounded-xl border border-slate-100 transition space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 capitalize">
                        {act.action.replace(".", " ")}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(act.created_at).toLocaleString()}</span>
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">{act.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
