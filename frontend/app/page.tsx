"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Cloud,
  FileCheck,
  FolderKanban,
  GitBranch,
  ShieldCheck,
  Terminal,
  Activity,
  ArrowRight,
  Play
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function LandingPage() {
  const { demoLogin, user } = useAuth();
  const router = useRouter();

  const handleTryDemo = async () => {
    try {
      await demoLogin();
      router.push("/dashboard");
    } catch (err) {
      console.error("Demo login error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <header className="h-20 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <span className="font-bold text-xl text-slate-900 tracking-tight">CloudDocs</span>
              <span className="block text-[10px] text-slate-400 font-medium -mt-1">DevOps Document Platform</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <Link
                href="/dashboard"
                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition shadow-sm"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <button
                  onClick={handleTryDemo}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100 text-sm font-semibold transition"
                >
                  <Play className="w-3.5 h-3.5 fill-amber-700" />
                  <span>Try Demo</span>
                </button>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-indigo-600 transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition shadow-sm"
                >
                  Create Account
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-24 px-6 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-6">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <span>Cloud-Native & DevOps-Driven Architecture</span>
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight mb-6">
          Secure Document & Project Management,{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
            Engineered for Modern Teams
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
          Manage files, organize projects, collaborate with versioning, and track team activity seamlessly in your browser. Powered by Cloudflare R2, FastAPI, PostgreSQL, and Kubernetes.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={handleTryDemo}
            className="w-full sm:w-auto flex items-center justify-center space-x-2.5 px-8 py-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-base shadow-lg shadow-amber-200 transition"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>Try Recruiter Demo (Instant Access)</span>
          </button>
          <Link
            href="/register"
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base shadow-lg shadow-indigo-200 transition"
          >
            <span>Create Free Account</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        <p className="text-xs text-slate-400 mt-4">
          Instant demo mode includes pre-seeded projects, documents, version history, and Prometheus metrics.
        </p>
      </section>

      {/* Feature Pillars */}
      <section className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6">
            <FileCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">True Document Versioning</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Automatic internal version tracking (v1, v2, v3, v4). Compare, restore historical revisions, and edit markdown/text directly in-browser.
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center mb-6">
            <FolderKanban className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Projects & Calculated Health</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Link documents directly to projects. Transparent mathematical health score formula weighing tasks, milestones, deadlines, and recent activity.
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6">
            <Cloud className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Cloudflare R2 Direct Uploads</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            High-performance direct browser-to-storage presigned upload URLs with automated local filesystem fallback for zero-dependency development.
          </p>
        </div>
      </section>

      {/* DevOps Architecture Strip */}
      <section className="bg-slate-900 text-white py-16 px-6 mt-auto">
        <div className="max-w-7xl mx-auto text-center">
          <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-3">
            Production Engineering Under The Hood
          </h3>
          <p className="text-2xl font-bold mb-8">
            FastAPI Monolith • Next.js 14 • PostgreSQL 16 • Redis • Docker • Kubernetes • Prometheus & Loki
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-400">
            <span className="flex items-center space-x-1.5"><ShieldCheck className="w-4 h-4 text-emerald-400" /><span>RBAC Permissions</span></span>
            <span className="flex items-center space-x-1.5"><Terminal className="w-4 h-4 text-cyan-400" /><span>Trivy Container Security</span></span>
            <span className="flex items-center space-x-1.5"><Activity className="w-4 h-4 text-amber-400" /><span>Prometheus /metrics</span></span>
            <span className="flex items-center space-x-1.5"><GitBranch className="w-4 h-4 text-indigo-400" /><span>Automated CI/CD Workflows</span></span>
          </div>
        </div>
      </section>
    </div>
  );
}
