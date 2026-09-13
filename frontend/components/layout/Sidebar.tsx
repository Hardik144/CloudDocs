"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Files,
  FolderKanban,
  CheckSquare,
  Star,
  Trash2,
  Activity,
  Terminal,
  Settings,
  HardDrive,
  Cloud
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Documents", href: "/documents", icon: Files },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Starred", href: "/starred", icon: Star },
  { label: "Trash", href: "/trash", icon: Trash2 },
  { label: "Activity", href: "/activity", icon: Activity },
  { label: "DevOps", href: "/devops", icon: Terminal },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  const { data: storage } = useQuery({
    queryKey: ["storage-summary"],
    queryFn: () => fetchApi("/api/v1/storage/summary"),
  });

  const usedMB = storage ? (storage.used_bytes / (1024 * 1024)).toFixed(1) : "0";
  const quotaGB = storage ? (storage.quota_bytes / (1024 * 1024 * 1024)).toFixed(0) : "10";
  const pct = storage ? storage.percentage_used : 0;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between h-screen sticky top-0">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <Link href="/dashboard" className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base text-slate-900 tracking-tight">CloudDocs</span>
              <span className="block text-[10px] text-slate-400 font-medium -mt-1">Cloud-Native Platform</span>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  active
                    ? "bg-indigo-50 text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? "text-indigo-600" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Storage Widget */}
      <div className="p-4 m-4 rounded-xl bg-slate-50 border border-slate-200/80">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
          <span className="flex items-center space-x-1.5">
            <HardDrive className="w-3.5 h-3.5 text-indigo-500" />
            <span>Cloud Storage</span>
          </span>
          <span className="text-[11px] text-slate-400">{pct}%</span>
        </div>
        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-indigo-600 rounded-full transition-all duration-500"
            style={{ width: `${Math.max(2, pct)}%` }}
          />
        </div>
        <p className="text-[11px] text-slate-500 font-medium">
          {usedMB} MB used of {quotaGB} GB
        </p>
      </div>
    </aside>
  );
}
