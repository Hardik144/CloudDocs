"use client";

import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { User, Lock, HardDrive, ShieldCheck, CheckCircle, AlertCircle } from "lucide-react";

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();

  const [name, setName] = useState(user?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);
  const [pwdError, setPwdError] = useState<string | null>(null);

  // Storage summary
  const { data: storage } = useQuery({
    queryKey: ["storage-summary"],
    queryFn: () => fetchApi("/api/v1/storage/summary"),
  });

  // Audit logs
  const { data: auditLogs = [] } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => fetchApi("/api/v1/audit/?limit=20"),
  });

  const updateProfileMutation = useMutation({
    mutationFn: () =>
      fetchApi("/api/v1/users/profile", {
        method: "PUT",
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      setProfileMsg("Profile updated successfully!");
      refreshUser();
      setTimeout(() => setProfileMsg(null), 3000);
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: () =>
      fetchApi("/api/v1/users/password", {
        method: "PUT",
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      }),
    onSuccess: () => {
      setPwdMsg("Password changed successfully!");
      setPwdError(null);
      setCurrentPassword("");
      setNewPassword("");
      setTimeout(() => setPwdMsg(null), 3000);
    },
    onError: (err: any) => {
      setPwdError(err.message || "Failed to change password");
    },
  });

  return (
    <AppLayout>
      <div className="space-y-8 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Account & Security Settings</h1>
          <p className="text-sm text-slate-500">Manage profile preferences, credentials, and view security audit logs</p>
        </div>

        {/* Profile Settings */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <User className="w-4 h-4 text-indigo-600" />
            <span>Profile Details</span>
          </h3>

          {profileMsg && (
            <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              <span>{profileMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email (Read Only)</label>
              <input
                type="email"
                disabled
                value={user?.email || ""}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => updateProfileMutation.mutate()}
              disabled={updateProfileMutation.isPending}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
              Save Profile
            </button>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Lock className="w-4 h-4 text-indigo-600" />
            <span>Change Password</span>
          </h3>

          {pwdMsg && (
            <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              <span>{pwdMsg}</span>
            </div>
          )}
          {pwdError && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" />
              <span>{pwdError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => changePasswordMutation.mutate()}
              disabled={!currentPassword || !newPassword || changePasswordMutation.isPending}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
              Update Password
            </button>
          </div>
        </div>

        {/* Storage Distribution */}
        {storage && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <HardDrive className="w-4 h-4 text-emerald-600" />
              <span>Storage Consumption & Distribution</span>
            </h3>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium text-slate-600">
                <span>{(storage.used_bytes / (1024 * 1024)).toFixed(2)} MB of {(storage.quota_bytes / (1024 * 1024 * 1024)).toFixed(0)} GB Quota</span>
                <span className="font-bold text-indigo-600">{storage.percentage_used}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600" style={{ width: `${Math.max(2, storage.percentage_used)}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
              {storage.types_breakdown.map((t: any) => (
                <div key={t.type_name} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <p className="text-[11px] font-semibold text-slate-500">{t.type_name}</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{t.percentage}%</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{(t.bytes / 1024).toFixed(0)} KB ({t.count} files)</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audit Log Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Security & Access Audit Logs</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 uppercase text-slate-400 font-semibold">
                <tr>
                  <th className="px-3 py-2.5">Action</th>
                  <th className="px-3 py-2.5">Resource</th>
                  <th className="px-3 py-2.5">IP Address</th>
                  <th className="px-3 py-2.5 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 font-bold text-slate-800">{log.action}</td>
                    <td className="px-3 py-2.5 text-slate-500">{log.resource_type} ({log.resource_id || "global"})</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500">{log.ip_address || "127.0.0.1"}</td>
                    <td className="px-3 py-2.5 text-right text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
