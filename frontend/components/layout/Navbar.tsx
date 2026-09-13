"use client";

import React, { useState } from "react";
import { Search, Bell, ShieldCheck, LogOut, User as UserIcon, Check } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { fetchApi } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export function Navbar({ onOpenSearch }: { onOpenSearch: () => void }) {
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery<NotificationItem[]>({
    queryKey: ["notifications"],
    queryFn: () => fetchApi("/api/v1/notifications/"),
    refetchInterval: 15000,
    enabled: !!user,
  });

  const markAllRead = useMutation({
    mutationFn: () => fetchApi("/api/v1/notifications/read-all", { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Search Bar Button */}
      <button
        onClick={onOpenSearch}
        className="flex items-center space-x-3 w-80 px-3.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 hover:border-indigo-300 hover:bg-white text-sm transition"
      >
        <Search className="w-4 h-4 text-slate-400" />
        <span className="flex-1 text-left">Search documents, tasks...</span>
        <kbd className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-400 font-mono">
          ⌘K
        </kbd>
      </button>

      {/* Right Action Icons */}
      <div className="flex items-center space-x-4">
        {/* Recruiter / Demo Mode Badge */}
        {user?.is_demo_user && (
          <span className="hidden md:inline-flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>DEMO MODE</span>
          </span>
        )}

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-lg relative"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-indigo-600 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllRead.mutate()}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">No notifications</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 text-xs space-y-1 ${n.is_read ? "bg-white" : "bg-indigo-50/50"}`}
                    >
                      <p className="font-semibold text-slate-800">{n.title}</p>
                      <p className="text-slate-600">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-slate-50 text-slate-700"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-semibold overflow-hidden">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user?.name?.[0] || "U"
              )}
            </div>
            <span className="text-sm font-medium hidden md:inline-block">{user?.name}</span>
          </button>

          {showProfile && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-800 truncate">{user?.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
              </div>
              <div className="p-1 space-y-0.5">
                <Link
                  href="/settings"
                  onClick={() => setShowProfile(false)}
                  className="flex items-center px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg"
                >
                  <UserIcon className="w-4 h-4 mr-2 text-slate-400" />
                  Profile & Settings
                </Link>
                <button
                  onClick={logout}
                  className="w-full flex items-center px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <LogOut className="w-4 h-4 mr-2 text-red-500" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
