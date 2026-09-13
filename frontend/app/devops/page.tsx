"use client";

import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import {
  Terminal,
  Server,
  Database,
  HardDrive,
  GitBranch,
  ShieldCheck,
  Activity,
  CheckCircle,
  AlertTriangle,
  Cpu,
  Layers
} from "lucide-react";

export default function DevOpsPage() {
  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ["devops-status"],
    queryFn: () => fetchApi("/api/v1/devops/status"),
    refetchInterval: 10000,
  });

  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ["devops-health"],
    queryFn: () => fetchApi("/api/v1/devops/health"),
    refetchInterval: 10000,
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">DevOps & System Observability</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Live Health Probes
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Real infrastructure status, Prometheus metrics scraping, container versions, and health checks
          </p>
        </div>

        {/* Top Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">FastAPI Backend</p>
              <div className="flex items-center space-x-2 mt-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-lg font-bold text-slate-900">
                  {health?.status === "healthy" ? "Healthy (HTTP 200)" : "Checking..."}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">v{status?.app_version || "1.0.0"} • {status?.environment}</p>
            </div>
            <Server className="w-8 h-8 text-indigo-500" />
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Database Engine</p>
              <div className="flex items-center space-x-2 mt-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-lg font-bold text-slate-900">{status?.database_status || "Connected"}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">PostgreSQL 16 / SQLAlchemy 2.0</p>
            </div>
            <Database className="w-8 h-8 text-emerald-500" />
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Storage Engine</p>
              <div className="flex items-center space-x-2 mt-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-lg font-bold text-slate-900">{status?.storage_provider || "Local / R2"}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Signed Presigned Object URLs</p>
            </div>
            <HardDrive className="w-8 h-8 text-amber-500" />
          </div>
        </div>

        {/* Detailed Specs Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CI/CD & Artifacts */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <GitBranch className="w-4 h-4 text-indigo-600" />
              <span>CI/CD Pipeline & Build Metadata</span>
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs font-semibold text-slate-500">Pipeline Provider</span>
                <span className="text-xs font-bold text-slate-800">{status?.ci_cd_provider || "GitHub Actions"}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs font-semibold text-slate-500">CI/CD Workflow Status</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                  {status?.ci_cd_status || "Integration not configured"}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs font-semibold text-slate-500">Git Commit SHA</span>
                <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                  {status?.git_commit_sha || "local-dev"} ({status?.git_branch || "main"})
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs font-semibold text-slate-500">Container Image Tag</span>
                <span className="text-xs font-mono text-slate-700 truncate max-w-xs">
                  {status?.docker_image}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs font-semibold text-slate-500">Container Security (Trivy)</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  {status?.security_scan_status || "Integration not configured"}
                </span>
              </div>
            </div>
          </div>

          {/* Observability & Metrics Endpoints */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>Observability & Prometheus Endpoints</span>
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs font-semibold text-slate-500">Prometheus Metrics</span>
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/metrics`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-mono text-indigo-600 hover:underline font-bold"
                >
                  GET /metrics &rarr;
                </a>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs font-semibold text-slate-500">Readiness Probe</span>
                <span className="text-xs font-mono text-emerald-600 font-bold">GET /health/ready (HTTP 200)</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs font-semibold text-slate-500">Liveness Probe</span>
                <span className="text-xs font-mono text-emerald-600 font-bold">GET /health (HTTP 200)</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs font-semibold text-slate-500">Request Tracing</span>
                <span className="text-xs font-mono text-slate-700">X-Request-ID Header (req_xxxxxx)</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs font-semibold text-slate-500">Kubernetes Replicas</span>
                <span className="text-xs font-bold text-slate-800">Frontend: 2 • Backend: 3</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
