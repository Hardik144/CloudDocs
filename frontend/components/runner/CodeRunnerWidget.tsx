"use client";

import React, { useState } from "react";
import { Play, RotateCcw, Terminal, CheckCircle2, AlertCircle, Clock, Copy, Check } from "lucide-react";
import { fetchApi } from "@/lib/api";

const PRESET_SNIPPETS: Record<string, { label: string; code: string }> = {
  healthcheck: {
    label: "DevOps Healthcheck",
    code: `import json
import urllib.request

def check_system():
    services = {
        "Nginx Gateway": "OK",
        "FastAPI Service": "OK",
        "PostgreSQL DB": "Connected",
        "Redis Cache": "Active"
    }
    print("🚀 CloudDocs DevOps Infrastructure Audit:")
    for service, status in services.items():
        print(f"  ✓ {service.ljust(20)}: {status}")
    
    metrics = {"cpu_load": "12.4%", "mem_usage": "38.2%", "uptime": "99.98%"}
    print("\\n📊 Realtime Telemetry Summary:")
    print(json.dumps(metrics, indent=4))

check_system()`
  },
  data_processing: {
    label: "Data Analysis Script",
    code: `import math

def calculate_percentiles(latencies):
    sorted_data = sorted(latencies)
    n = len(sorted_data)
    p50 = sorted_data[int(n * 0.50)]
    p95 = sorted_data[int(n * 0.95)]
    p99 = sorted_data[int(n * 0.99)]
    return p50, p95, p99

sample_latencies = [12, 14, 15, 12, 18, 25, 80, 15, 16, 14, 120, 13, 14, 15, 20]
p50, p95, p99 = calculate_percentiles(sample_latencies)

print(f"Request Latency Benchmarks (ms):")
print(f"  • p50: {p50} ms")
print(f"  • p95: {p95} ms")
print(f"  • p99: {p99} ms")`
  },
  cicd_validation: {
    label: "CI/CD Pipeline Validator",
    code: `def validate_pipeline_manifest():
    steps = [
        ("Checkout Code", True),
        ("Lint Frontend (ESLint)", True),
        ("Run Backend Tests (Pytest)", True),
        ("Docker Container Build", True),
        ("Deploy Production", True)
    ]
    print("🛠️ GitHub Actions CI Pipeline Run #42:")
    all_passed = True
    for step, passed in steps:
        mark = "✅ PASS" if passed else "❌ FAIL"
        print(f"  [{mark}] {step}")
        if not passed:
            all_passed = False
            
    if all_passed:
        print("\\n🎉 All 5 workflow checks passed! Ready to merge.")

validate_pipeline_manifest()`
  }
};

export function CodeRunnerWidget() {
  const [code, setCode] = useState(PRESET_SNIPPETS.healthcheck.code);
  const [output, setOutput] = useState<{
    stdout: string;
    stderr: string;
    exit_code: number;
    duration_ms: number;
  } | null>(null);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleRun = async () => {
    setRunning(true);
    setOutput(null);
    try {
      const res = await fetchApi("/api/v1/runner/execute", {
        method: "POST",
        body: JSON.stringify({
          code,
          language: "python"
        })
      });
      setOutput(res);
    } catch (err: any) {
      setOutput({
        stdout: "",
        stderr: err?.message || "Execution network error occurred.",
        exit_code: 1,
        duration_ms: 0
      });
    } finally {
      setRunning(false);
    }
  };

  const copyOutput = () => {
    if (!output) return;
    const text = output.stdout || output.stderr;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
      {/* Header Controls */}
      <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 bg-indigo-600 rounded-lg text-white">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">DevOps Python Runner & Sandbox</h3>
            <p className="text-xs text-slate-400">Safe isolated subprocess execution (5s timeout & 50KB limit)</p>
          </div>
        </div>

        {/* Presets & Actions */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 mr-1 hidden sm:inline">Templates:</span>
          {Object.entries(PRESET_SNIPPETS).map(([key, item]) => (
            <button
              key={key}
              onClick={() => {
                setCode(item.code);
                setOutput(null);
              }}
              className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              {item.label}
            </button>
          ))}

          <button
            onClick={handleRun}
            disabled={running}
            className="flex items-center space-x-1.5 ml-2 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition"
          >
            {running ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Script</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor & Output Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 min-h-[420px]">
        {/* Code Input */}
        <div className="flex flex-col bg-slate-950 p-4 font-mono text-xs">
          <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800 mb-3">
            <span className="text-slate-400 uppercase tracking-wider text-[11px] font-semibold">script.py</span>
            <span className="text-slate-500 text-[11px]">Python 3.x</span>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 w-full bg-transparent text-slate-100 placeholder-slate-600 resize-none outline-none font-mono leading-relaxed"
            placeholder="# Write Python code to execute safely..."
            rows={16}
            spellCheck={false}
          />
        </div>

        {/* Terminal Output */}
        <div className="flex flex-col bg-slate-900 p-4 font-mono text-xs">
          <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800 mb-3">
            <div className="flex items-center space-x-2">
              <span className="text-slate-400 uppercase tracking-wider text-[11px] font-semibold">Terminal Output</span>
              {output && (
                <span className={`inline-flex items-center space-x-1 text-[11px] font-medium px-2 py-0.5 rounded ${
                  output.exit_code === 0 ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-red-950 text-red-400 border border-red-800"
                }`}>
                  {output.exit_code === 0 ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Success (0)</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3 text-red-400" />
                      <span>Failed ({output.exit_code})</span>
                    </>
                  )}
                </span>
              )}
            </div>

            {output && (
              <div className="flex items-center space-x-3 text-slate-400 text-[11px]">
                <span className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{output.duration_ms} ms</span>
                </span>
                <button
                  onClick={copyOutput}
                  className="flex items-center space-x-1 hover:text-white transition"
                  title="Copy terminal output"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto rounded bg-slate-950 p-3 border border-slate-800 text-slate-200">
            {running && (
              <div className="flex items-center space-x-2 text-slate-400 italic">
                <RotateCcw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>Spawning isolated subprocess sandbox...</span>
              </div>
            )}

            {!running && !output && (
              <div className="text-slate-500 italic">
                Click &quot;Run Script&quot; to execute your code in the sandbox environment.
              </div>
            )}

            {!running && output && (
              <div className="space-y-2">
                {output.stdout && (
                  <pre className="text-emerald-400 whitespace-pre-wrap leading-relaxed font-mono">
                    {output.stdout}
                  </pre>
                )}
                {output.stderr && (
                  <pre className="text-rose-400 whitespace-pre-wrap leading-relaxed font-mono">
                    {output.stderr}
                  </pre>
                )}
                {!output.stdout && !output.stderr && (
                  <div className="text-slate-500 italic">Process completed with no console output.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
