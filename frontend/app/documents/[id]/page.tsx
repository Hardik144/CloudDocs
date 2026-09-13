"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import {
  FileText,
  Download,
  Share2,
  History,
  MessageSquare,
  Save,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  RotateCcw,
  UploadCloud
} from "lucide-react";
import Link from "next/link";

export default function DocumentDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"preview" | "versions" | "comments">("preview");
  const [textContent, setTextContent] = useState<string>("");
  const [hasTextChanges, setHasTextChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [changeDesc, setChangeDesc] = useState("");
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareLinkGenerated, setShareLinkGenerated] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");

  const { data: document, isLoading } = useQuery({
    queryKey: ["document", id],
    queryFn: () => fetchApi(`/api/v1/documents/${id}`),
    enabled: !!id,
  });

  const isTextEditable = document && (
    document.mime_type.includes("text") ||
    document.name.endsWith(".txt") ||
    document.name.endsWith(".md") ||
    document.name.endsWith(".json") ||
    document.name.endsWith(".csv")
  );

  const isPdf = document && (document.mime_type.includes("pdf") || document.name.endsWith(".pdf"));
  const isImage = document && (
    document.mime_type.includes("image") ||
    /\.(png|jpe?g|webp|gif)$/i.test(document.name)
  );

  const resolveUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    return `${base}${url}`;
  };

  // Load raw content if text editable
  useEffect(() => {
    if (isTextEditable && id) {
      fetchApi(`/api/v1/documents/${id}/content`)
        .then((text) => {
          setTextContent(typeof text === "string" ? text : JSON.stringify(text, null, 2));
          setHasTextChanges(false);
        })
        .catch((err) => console.error("Could not fetch text content", err));
    }
  }, [id, isTextEditable, document?.current_version]);

  const saveContentMutation = useMutation({
    mutationFn: () =>
      fetchApi(`/api/v1/documents/${id}/content`, {
        method: "PUT",
        body: JSON.stringify({
          content: textContent,
          change_description: changeDesc || "In-browser update",
        }),
      }),
    onSuccess: () => {
      setHasTextChanges(false);
      setSaveSuccess(true);
      setChangeDesc("");
      setTimeout(() => setSaveSuccess(false), 3000);
      queryClient.invalidateQueries({ queryKey: ["document", id] });
    },
  });

  const restoreVersionMutation = useMutation({
    mutationFn: (versionId: string) =>
      fetchApi(`/api/v1/documents/${id}/versions/${versionId}/restore`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document", id] });
    },
  });

  const createShareLinkMutation = useMutation({
    mutationFn: () =>
      fetchApi(`/api/v1/documents/${id}/share-link`, {
        method: "POST",
        body: JSON.stringify({ permission_level: "viewer", expires_in_hours: 24 }),
      }),
    onSuccess: (data: any) => {
      const fullUrl = `${window.location.origin}${data.share_url}`;
      setShareLinkGenerated(fullUrl);
    },
  });

  // Comments
  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ["document-comments", id],
    queryFn: () => fetchApi(`/api/v1/comments/?document_id=${id}`),
    enabled: activeTab === "comments",
  });

  const postCommentMutation = useMutation({
    mutationFn: () =>
      fetchApi("/api/v1/comments/", {
        method: "POST",
        body: JSON.stringify({ document_id: id, content: newComment }),
      }),
    onSuccess: () => {
      setNewComment("");
      refetchComments();
    },
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="text-center py-20 text-slate-400 text-sm">Loading document...</div>
      </AppLayout>
    );
  }

  if (!document) {
    return (
      <AppLayout>
        <div className="text-center py-20 text-slate-400 text-sm">Document not found</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Top Breadcrumb & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Link href="/documents" className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-slate-900">{document.name}</h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                  v{document.current_version}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {(document.file_size / 1024).toFixed(1)} KB • Uploaded {new Date(document.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setShareModalOpen(true);
                createShareLinkMutation.mutate();
              }}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
            >
              <Share2 className="w-4 h-4 text-slate-400" />
              <span>Share Link</span>
            </button>
            <a
              href={resolveUrl(document.download_url)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-sm transition"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </a>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 space-x-8">
          <button
            onClick={() => setActiveTab("preview")}
            className={`pb-3 text-sm font-semibold border-b-2 transition ${
              activeTab === "preview"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Preview & Edit
          </button>
          <button
            onClick={() => setActiveTab("versions")}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center space-x-1.5 transition ${
              activeTab === "versions"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <History className="w-4 h-4" />
            <span>Version History ({document.versions?.length || 1})</span>
          </button>
          <button
            onClick={() => setActiveTab("comments")}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center space-x-1.5 transition ${
              activeTab === "comments"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Comments</span>
          </button>
        </div>

        {/* Tab: Preview & Edit */}
        {activeTab === "preview" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
            {isTextEditable ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <div className="flex items-center space-x-2 text-xs text-slate-600">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    <span>In-Browser Text Editor • Saves automatically create version v{document.current_version + 1}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    {saveSuccess && (
                      <span className="text-xs text-emerald-600 flex items-center space-x-1 font-medium">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Saved v{document.current_version}!</span>
                      </span>
                    )}
                    <button
                      onClick={() => saveContentMutation.mutate()}
                      disabled={!hasTextChanges || saveContentMutation.isPending}
                      className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{saveContentMutation.isPending ? "Saving..." : "Save Changes"}</span>
                    </button>
                  </div>
                </div>

                <textarea
                  value={textContent}
                  onChange={(e) => {
                    setTextContent(e.target.value);
                    setHasTextChanges(true);
                  }}
                  rows={20}
                  className="w-full font-mono text-sm p-4 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
              </div>
            ) : isPdf ? (
              <div className="space-y-3">
                <div className="p-3 bg-indigo-50 text-indigo-900 rounded-xl text-xs font-medium flex items-center justify-between">
                  <span>PDF Previewer • Zoom & read enabled</span>
                  <a href={resolveUrl(document.download_url)} target="_blank" rel="noreferrer" className="underline font-semibold">
                    Open in new tab
                  </a>
                </div>
                <iframe
                  src={resolveUrl(document.preview_url)}
                  className="w-full h-[650px] rounded-xl border border-slate-200"
                  title="PDF Preview"
                />
              </div>
            ) : isImage ? (
              <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-xl">
                <img
                  src={resolveUrl(document.preview_url)}
                  alt={document.name}
                  className="max-h-[550px] object-contain rounded-lg shadow-md"
                />
              </div>
            ) : (
              <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h4 className="text-sm font-semibold text-slate-800">Preview not available for this binary format</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                  For Microsoft Office documents (DOCX, XLSX, PPTX), please download the file to inspect and edit with your desktop suite.
                </p>
                <a
                  href={resolveUrl(document.download_url)}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
                >
                  <Download className="w-4 h-4" />
                  <span>Download {document.name}</span>
                </a>
              </div>
            )}
          </div>
        )}

        {/* Tab: Version History */}
        {activeTab === "versions" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">Revision History</h3>
            <div className="space-y-3">
              {document.versions?.map((ver: any) => (
                <div
                  key={ver.id}
                  className={`p-4 rounded-xl border flex items-center justify-between ${
                    ver.version_number === document.current_version
                      ? "border-indigo-200 bg-indigo-50/40"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-slate-900">Version {ver.version_number}</span>
                      {ver.version_number === document.current_version && (
                        <span className="text-[10px] font-bold uppercase bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{ver.change_description || "No description provided"}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {(ver.file_size / 1024).toFixed(1)} KB • {new Date(ver.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center space-x-3">
                    {ver.version_number !== document.current_version && (
                      <button
                        onClick={() => restoreVersionMutation.mutate(ver.id)}
                        disabled={restoreVersionMutation.isPending}
                        className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg border border-indigo-200 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore this version</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Comments */}
        {activeTab === "comments" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No comments on this document yet.</p>
              ) : (
                comments.map((c: any) => (
                  <div key={c.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{c.author?.name || "Collaborator"}</span>
                      <span className="text-[10px] text-slate-400">{new Date(c.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-slate-700">{c.content}</p>
                  </div>
                ))
              )}
            </div>

            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && newComment && postCommentMutation.mutate()}
                className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={() => postCommentMutation.mutate()}
                disabled={!newComment || postCommentMutation.isPending}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                Post
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Share Link Modal */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Secure Share Link</h3>
            <p className="text-xs text-slate-500">
              Anyone with this link can view and download this document. Valid for 24 hours.
            </p>
            {shareLinkGenerated && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono break-all text-indigo-700">
                {shareLinkGenerated}
              </div>
            )}
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => {
                  if (shareLinkGenerated) navigator.clipboard.writeText(shareLinkGenerated);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700"
              >
                Copy Link
              </button>
              <button
                onClick={() => setShareModalOpen(false)}
                className="px-4 py-2 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
