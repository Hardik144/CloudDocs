"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  Download,
  File,
  ChevronRight,
  ChevronDown,
  Code2,
  Layers,
  HardDrive
} from "lucide-react";

interface TreeNode {
  name: string;
  type: "directory" | "file";
  path?: string;
  size?: number;
  children?: TreeNode[];
}

interface ProjectCodeExplorerProps {
  projectId: string;
  archiveId: string;
  archiveName: string;
  archiveSize: number;
  totalFiles: number;
  totalDirs: number;
  onUploadNew?: () => void;
}

export function ProjectCodeExplorer({
  projectId,
  archiveId,
  archiveName,
  archiveSize,
  totalFiles,
  totalDirs,
  onUploadNew
}: ProjectCodeExplorerProps) {
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  // Fetch full archive details (including file tree)
  const { data: archive, isLoading: treeLoading } = useQuery({
    queryKey: ["project-archive", projectId, archiveId],
    queryFn: () => fetchApi(`/api/v1/projects/${projectId}/archives/${archiveId}`),
    enabled: !!archiveId,
  });

  // Fetch selected file content
  const { data: fileData, isLoading: fileLoading } = useQuery({
    queryKey: ["archive-file", projectId, archiveId, selectedFilePath],
    queryFn: () =>
      fetchApi(`/api/v1/projects/${projectId}/archives/${archiveId}/file?path=${encodeURIComponent(selectedFilePath!)}`),
    enabled: !!selectedFilePath,
  });

  // Automatically select the first file when the tree loads
  useEffect(() => {
    if (archive?.file_tree && !selectedFilePath) {
      const findFirstFile = (node: TreeNode): string | null => {
        if (node.type === "file" && node.path) return node.path;
        if (node.children) {
          for (const child of node.children) {
            const found = findFirstFile(child);
            if (found) return found;
          }
        }
        return null;
      };
      const firstFile = findFirstFile(archive.file_tree);
      if (firstFile) {
        setSelectedFilePath(firstFile);
        // Expand root directories
        if (archive.file_tree.path) {
          setExpandedPaths(new Set([archive.file_tree.path]));
        }
      }
    }
  }, [archive, selectedFilePath]);

  const toggleExpand = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleDownload = () => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const downloadUrl = `${apiBase}/api/v1/projects/${projectId}/archives/${archiveId}/download`;
    window.open(downloadUrl, "_blank");
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase();
    if (["js", "jsx", "ts", "tsx", "py", "html", "css", "json", "go", "rs", "cpp", "c", "java", "sql"].includes(ext || "")) {
      return <FileCode className="w-4 h-4 text-indigo-500 shrink-0" />;
    }
    if (["md", "txt", "env", "yml", "yaml", "xml", "ini"].includes(ext || "")) {
      return <FileText className="w-4 h-4 text-amber-500 shrink-0" />;
    }
    return <File className="w-4 h-4 text-slate-400 shrink-0" />;
  };

  const renderTree = (node: TreeNode, depth: number = 0) => {
    const path = node.path || node.name;
    const isExpanded = expandedPaths.has(path) || depth === 0;

    if (node.type === "directory") {
      return (
        <div key={path} className="select-none">
          <div
            onClick={() => toggleExpand(path)}
            className="flex items-center space-x-1.5 py-1 px-2 hover:bg-slate-100 rounded cursor-pointer text-xs font-medium text-slate-700"
            style={{ paddingLeft: `${depth * 14 + 8}px` }}
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-amber-500 shrink-0" />
            )}
            <span className="truncate">{node.name}</span>
          </div>

          {isExpanded && node.children && (
            <div>
              {node.children.map((child) => renderTree(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    const isSelected = selectedFilePath === node.path;

    return (
      <div
        key={node.path || node.name}
        onClick={() => node.path && setSelectedFilePath(node.path)}
        className={`flex items-center space-x-2 py-1 px-2 rounded cursor-pointer text-xs transition-colors ${
          isSelected
            ? "bg-indigo-50 text-indigo-700 font-semibold"
            : "text-slate-600 hover:bg-slate-100 font-normal"
        }`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        <span className="w-3.5" />
        {getFileIcon(node.name)}
        <span className="truncate flex-1">{node.name}</span>
        {node.size !== undefined && (
          <span className="text-[10px] text-slate-400 pr-1">{formatBytes(node.size)}</span>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80 gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-slate-900">{archiveName}</h3>
              <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-medium">
                Active Repository
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {totalFiles} files • {totalDirs} directories • {formatBytes(archiveSize)}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onUploadNew && (
            <button
              onClick={onUploadNew}
              className="text-xs font-semibold px-3 py-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Upload New Archive
            </button>
          )}
          <button
            onClick={handleDownload}
            className="flex items-center space-x-1.5 text-xs font-semibold px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Project (.zip)</span>
          </button>
        </div>
      </div>

      {/* Split Pane: Explorer & Code Viewer */}
      <div className="grid grid-cols-1 md:grid-cols-12 min-h-[550px] max-h-[700px]">
        {/* Left: Tree View */}
        <div className="md:col-span-4 border-r border-slate-200 bg-slate-50/40 p-3 overflow-y-auto max-h-[700px]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 mb-1">
            Project Files
          </div>
          {treeLoading ? (
            <div className="p-4 text-xs text-slate-400 text-center">Loading project hierarchy...</div>
          ) : archive?.file_tree ? (
            <div className="space-y-0.5">{renderTree(archive.file_tree)}</div>
          ) : (
            <div className="p-4 text-xs text-slate-400 text-center">No files in archive.</div>
          )}
        </div>

        {/* Right: Code Inspector */}
        <div className="md:col-span-8 flex flex-col bg-slate-900 text-slate-100 overflow-hidden">
          {/* File Header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800 text-xs">
            <div className="flex items-center space-x-2">
              <span className="text-slate-400">Viewing:</span>
              <span className="font-mono text-indigo-400 font-medium">
                {selectedFilePath || "No file selected"}
              </span>
            </div>
            {fileData?.size && (
              <span className="text-[11px] text-slate-400 font-mono">
                {formatBytes(fileData.size)}
              </span>
            )}
          </div>

          {/* Code Viewer Body */}
          <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed bg-[#0d1117]">
            {fileLoading ? (
              <div className="flex items-center justify-center h-48 text-slate-400">
                Loading file content...
              </div>
            ) : !selectedFilePath ? (
              <div className="flex items-center justify-center h-48 text-slate-500">
                Select a file from the tree to view source code.
              </div>
            ) : fileData?.message ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-center px-6">
                <p>{fileData.message}</p>
                {fileData.is_binary && (
                  <p className="text-xs text-slate-500 mt-1">Binary files can be inspected after downloading.</p>
                )}
              </div>
            ) : (
              <div className="flex space-x-4">
                {/* Line Numbers */}
                <div className="select-none text-slate-600 text-right pr-2 border-r border-slate-800 font-mono text-xs">
                  {(fileData?.content || "")
                    .split("\n")
                    .map((_: string, idx: number) => (
                      <div key={idx}>{idx + 1}</div>
                    ))}
                </div>
                {/* File Code */}
                <pre className="flex-1 overflow-x-auto text-slate-200">
                  <code>{fileData?.content}</code>
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
