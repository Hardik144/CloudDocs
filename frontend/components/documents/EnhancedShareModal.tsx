"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import {
  X,
  Share2,
  Lock,
  Flame,
  Clock,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle
} from "lucide-react";

interface EnhancedShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentName: string;
}

export function EnhancedShareModal({
  isOpen,
  onClose,
  documentId,
  documentName
}: EnhancedShareModalProps) {
  const [expiresInHours, setExpiresInHours] = useState<number>(24);
  const [password, setPassword] = useState("");
  const [burnAfterReading, setBurnAfterReading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<{
    url: string;
    has_password: boolean;
    burn_after_reading: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createShareLinkMutation = useMutation({
    mutationFn: () =>
      fetchApi(`/api/v1/documents/${documentId}/share-link`, {
        method: "POST",
        body: JSON.stringify({
          permission_level: "viewer",
          expires_in_hours: expiresInHours,
          password: password || null,
          burn_after_reading: burnAfterReading,
        }),
      }),
    onSuccess: (data: any) => {
      const fullUrl = `${window.location.origin}${data.share_url}`;
      setGeneratedLink({
        url: fullUrl,
        has_password: data.has_password,
        burn_after_reading: data.burn_after_reading,
      });
      setError(null);
    },
    onError: (err: any) => {
      setError(err.message || "Failed to create share link");
    }
  });

  if (!isOpen) return null;

  const handleCopy = () => {
    if (generatedLink?.url) {
      navigator.clipboard.writeText(generatedLink.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Secure Share Link</h2>
              <p className="text-xs text-slate-500">Configure access controls, expiration, and password security</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!generatedLink ? (
          <div className="mt-5 space-y-4">
            {/* Expiration Options */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Link Expiration</span>
              </label>
              <select
                value={expiresInHours}
                onChange={(e) => setExpiresInHours(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value={1}>1 Hour</option>
                <option value={24}>24 Hours (1 Day)</option>
                <option value={72}>3 Days</option>
                <option value={168}>7 Days</option>
              </select>
            </div>

            {/* Password Protection Option */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Password Protection (Optional)</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank for no password"
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Recipients must enter this password before the document unlocks.
              </p>
            </div>

            {/* Burn-after-reading toggle */}
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-start space-x-3">
              <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg mt-0.5">
                <Flame className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={burnAfterReading}
                    onChange={(e) => setBurnAfterReading(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-amber-900">
                    Burn After Reading (Single-Use Link)
                  </span>
                </label>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  The link automatically self-destructs and cannot be viewed again once opened.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => createShareLinkMutation.mutate()}
                disabled={createShareLinkMutation.isPending}
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition disabled:opacity-50"
              >
                {createShareLinkMutation.isPending ? "Generating..." : "Generate Secure Link"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center space-x-3">
              <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-emerald-900">Secure Link Generated</p>
                <div className="flex items-center space-x-2 text-[11px] text-emerald-700 mt-0.5">
                  {generatedLink.has_password && <span>• Password Protected</span>}
                  {generatedLink.burn_after_reading && <span>• Self-Destructing (1 View)</span>}
                  <span>• Expires in {expiresInHours}h</span>
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-900 text-indigo-300 rounded-2xl font-mono text-xs break-all select-all flex items-center justify-between gap-2">
              <span className="truncate">{generatedLink.url}</span>
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-sans font-semibold shrink-0 flex items-center space-x-1"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>

            <div className="pt-2 flex justify-between">
              <button
                type="button"
                onClick={() => {
                  setGeneratedLink(null);
                  setPassword("");
                  setBurnAfterReading(false);
                }}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Create Another Link
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-xl transition"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
