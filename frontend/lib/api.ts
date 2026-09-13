const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("clouddocs_token");
}

export function setAuthToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("clouddocs_token", token);
  }
}

export function removeAuthToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("clouddocs_token");
  }
}

export async function fetchApi<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      removeAuthToken();
      window.location.href = "/login";
    }
  }

  if (!response.ok) {
    let errMsg = "An error occurred";
    try {
      const errData = await response.json();
      errMsg = errData.detail || errData.message || errMsg;
    } catch {
      errMsg = response.statusText;
    }
    throw new Error(errMsg);
  }

  // Handle empty or text responses
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }
  return response.text() as unknown as T;
}

export async function uploadDocumentFlow(
  file: File,
  projectId?: string,
  changeDescription?: string,
  onProgress?: (pct: number) => void
) {
  // 1. Request upload authorization from FastAPI
  const authRes = await fetchApi<{
    upload_url: string;
    storage_key: string;
    method: string;
    headers: Record<string, string>;
    is_direct_r2: boolean;
  }>("/api/v1/documents/request-upload", {
    method: "POST",
    body: JSON.stringify({
      filename: file.name,
      mime_type: file.type || "application/octet-stream",
      file_size: file.size,
      project_id: projectId || null,
      change_description: changeDescription || null,
    }),
  });

  if (onProgress) onProgress(30);

  // 2. Upload file to R2 or Local Storage endpoint
  if (authRes.is_direct_r2) {
    // Direct PUT to Cloudflare R2 presigned URL
    await fetch(authRes.upload_url, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
    });
  } else {
    // Local storage fallback endpoint
    const formData = new FormData();
    formData.append("file", file);
    await fetchApi(authRes.upload_url, {
      method: "POST",
      body: formData,
    });
  }

  if (onProgress) onProgress(75);

  // 3. Complete metadata in PostgreSQL
  const completeRes = await fetchApi("/api/v1/documents/complete-upload", {
    method: "POST",
    body: JSON.stringify({
      name: file.name,
      storage_key: authRes.storage_key,
      mime_type: file.type || "application/octet-stream",
      file_size: file.size,
      project_id: projectId || null,
      description: "",
      change_description: changeDescription || "Initial upload",
    }),
  });

  if (onProgress) onProgress(100);
  return completeRes;
}
