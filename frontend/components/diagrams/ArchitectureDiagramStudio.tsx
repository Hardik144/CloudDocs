"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  GitBranch, 
  Save, 
  Download, 
  RotateCcw, 
  Check, 
  Code, 
  Eye, 
  Sparkles,
  Layers,
  Server,
  Cloud
} from "lucide-react";
import { fetchApi } from "@/lib/api";

const DIAGRAM_TEMPLATES: Record<string, { label: string; icon: any; syntax: string }> = {
  cloud_arch: {
    label: "Cloud Production Architecture",
    icon: Cloud,
    syntax: `graph TD
    Client[Web Browser / Mobile Client] --> Nginx[Nginx Reverse Proxy :80]
    Nginx --> Frontend[Next.js 14 Web App :3000]
    Nginx --> Backend[FastAPI Python Backend :8000]
    Backend --> Postgres[(PostgreSQL 16 Database)]
    Backend --> Redis[(Redis 7 Cache / PubSub)]
    Backend --> Storage[(Local Storage / Cloudflare R2)]
    Backend --> Prometheus[Prometheus Metrics :9090]
    Prometheus --> Grafana[Grafana Dashboards :3001]`
  },
  microservices: {
    label: "Microservices & Event Mesh",
    icon: Server,
    syntax: `graph LR
    API[API Gateway] --> Auth[Auth Service]
    API --> Docs[Document Engine]
    API --> Tasks[Project / Task Service]
    Docs --> Queue[Message Broker / Kafka]
    Tasks --> Queue
    Queue --> Worker[Async PDF / Export Worker]
    Worker --> S3[(Object Store)]`
  },
  cicd_pipeline: {
    label: "DevOps CI/CD Deployment Flow",
    icon: Layers,
    syntax: `graph TD
    Dev[Developer Push] --> GitHub[GitHub Repository]
    GitHub --> Actions[GitHub Actions CI Pipeline]
    Actions --> Test[Run Pytest & ESLint]
    Test --> Build[Docker Multi-Stage Build]
    Build --> GHCR[Container Registry]
    GHCR --> Deploy[Deploy to Docker Compose / K8s]
    Deploy --> Verify[Healthcheck Audit :8000/health]`
  },
  auth_flow: {
    label: "OAuth2 & JWT Auth Lifecycle",
    icon: GitBranch,
    syntax: `sequenceDiagram
    autonumber
    actor User
    participant App as Next.js Client
    participant API as FastAPI Backend
    participant DB as PostgreSQL
    participant Cache as Redis Session

    User->>App: Enters credentials (email/password)
    App->>API: POST /api/v1/auth/login
    API->>DB: Verify bcrypt password hash
    DB-->>API: Password verified
    API->>Cache: Store active session key
    API-->>App: Return JWT Bearer Token (access_token)
    App->>App: Store token in secure HttpOnly / LocalStorage
    App->>API: GET /api/v1/projects (Authorization: Bearer)`
  }
};

interface ArchitectureDiagramStudioProps {
  projectId: string;
  initialSyntax?: string;
  canEdit?: boolean;
}

export function ArchitectureDiagramStudio({
  projectId,
  initialSyntax,
  canEdit = true
}: ArchitectureDiagramStudioProps) {
  const [syntax, setSyntax] = useState(
    initialSyntax || DIAGRAM_TEMPLATES.cloud_arch.syntax
  );
  const [svgContent, setSvgContent] = useState<string>("");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [mode, setMode] = useState<"split" | "preview" | "code">("split");

  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Re-render Mermaid diagram whenever syntax changes
  useEffect(() => {
    let isMounted = true;

    async function renderMermaid() {
      try {
        setRenderError(null);
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          securityLevel: "loose",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          themeVariables: {
            primaryColor: "#4f46e5",
            primaryTextColor: "#ffffff",
            primaryBorderColor: "#4338ca",
            lineColor: "#64748b",
            secondaryColor: "#0ea5e9",
            tertiaryColor: "#f1f5f9"
          }
        });

        const id = `mermaid-svg-${Date.now()}`;
        const { svg } = await mermaid.render(id, syntax);
        if (isMounted) {
          setSvgContent(svg);
        }
      } catch (err: any) {
        if (isMounted) {
          setRenderError(err?.message || "Invalid Mermaid syntax diagram.");
        }
      }
    }

    const timer = setTimeout(renderMermaid, 300);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [syntax]);

  const handleSave = async () => {
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      await fetchApi(`/api/v1/projects/${projectId}/diagram`, {
        method: "PUT",
        body: JSON.stringify({ diagram_syntax: syntax })
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err: any) {
      alert("Failed to save diagram: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportSVG = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `architecture-diagram-${projectId}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
      {/* Studio Header */}
      <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 bg-indigo-600 rounded-lg text-white">
            <GitBranch className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">System Architecture Studio</h3>
            <p className="text-xs text-slate-400">Live Mermaid.js architectural diagrams & pipeline graphs</p>
          </div>
        </div>

        {/* View mode toggle & Actions */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-slate-800 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setMode("split")}
              className={`px-2.5 py-1 rounded-md transition ${
                mode === "split" ? "bg-indigo-600 text-white font-medium" : "text-slate-400 hover:text-white"
              }`}
            >
              Split View
            </button>
            <button
              onClick={() => setMode("preview")}
              className={`px-2.5 py-1 rounded-md transition ${
                mode === "preview" ? "bg-indigo-600 text-white font-medium" : "text-slate-400 hover:text-white"
              }`}
            >
              Canvas Only
            </button>
            <button
              onClick={() => setMode("code")}
              className={`px-2.5 py-1 rounded-md transition ${
                mode === "code" ? "bg-indigo-600 text-white font-medium" : "text-slate-400 hover:text-white"
              }`}
            >
              Syntax
            </button>
          </div>

          <button
            onClick={handleExportSVG}
            disabled={!svgContent || !!renderError}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold transition"
            title="Download diagram as vector SVG"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export SVG</span>
          </button>

          {canEdit && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Saved!</span>
                </>
              ) : isSaving ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Diagram</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Preset Architecture Templates Bar */}
      <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200 flex items-center space-x-2 overflow-x-auto text-xs">
        <span className="font-semibold text-slate-600 flex items-center space-x-1 mr-1">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>Templates:</span>
        </span>
        {Object.entries(DIAGRAM_TEMPLATES).map(([key, template]) => {
          const TemplateIcon = template.icon;
          return (
            <button
              key={key}
              onClick={() => setSyntax(template.syntax)}
              className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-white hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 text-slate-700 transition whitespace-nowrap"
            >
              <TemplateIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>{template.label}</span>
            </button>
          );
        })}
      </div>

      {/* Workspace Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 min-h-[500px]">
        {/* Code Editor Pane */}
        {(mode === "split" || mode === "code") && (
          <div className={`flex flex-col bg-slate-950 p-4 font-mono text-xs ${mode === "code" ? "lg:col-span-2" : ""}`}>
            <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800 mb-3">
              <span className="text-slate-400 uppercase tracking-wider text-[11px] font-semibold">Mermaid Syntax</span>
              <span className="text-slate-500 text-[11px]">Flowchart, Sequence & C4</span>
            </div>
            <textarea
              value={syntax}
              onChange={(e) => setSyntax(e.target.value)}
              disabled={!canEdit}
              className="flex-1 w-full bg-transparent text-slate-100 placeholder-slate-600 resize-none outline-none font-mono leading-relaxed"
              rows={18}
              spellCheck={false}
              placeholder="graph TD..."
            />
          </div>
        )}

        {/* Live Diagram Canvas Pane */}
        {(mode === "split" || mode === "preview") && (
          <div 
            ref={previewContainerRef}
            className={`flex flex-col bg-white p-6 overflow-auto items-center justify-center relative ${mode === "preview" ? "lg:col-span-2" : ""}`}
          >
            {renderError ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 max-w-md text-xs">
                <p className="font-bold mb-1">Diagram Syntax Error:</p>
                <p className="font-mono whitespace-pre-wrap">{renderError}</p>
              </div>
            ) : svgContent ? (
              <div 
                className="w-full flex justify-center items-center py-4 [&>svg]:max-w-full [&>svg]:h-auto transition-all"
                dangerouslySetInnerHTML={{ __html: svgContent }} 
              />
            ) : (
              <div className="text-slate-400 flex items-center space-x-2 text-sm">
                <RotateCcw className="w-4 h-4 animate-spin text-indigo-500" />
                <span>Compiling architecture SVG...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
