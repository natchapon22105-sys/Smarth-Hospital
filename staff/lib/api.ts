// Thin fetch wrapper. Requests go to /api/* which next.config.js rewrites
// (proxies) to the backend, so the session cookie stays same-origin.

export class ApiError extends Error {
  status: number;
  payload: any;
  constructor(status: number, payload: any) {
    super(payload?.message || payload?.error || `Request failed (${status})`);
    this.status = status;
    this.payload = payload;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    throw new ApiError(res.status, payload);
  }
  return payload as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) =>
    request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, formData: FormData) =>
    fetch(path, { method: "POST", credentials: "include", body: formData }).then(async (res) => {
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new ApiError(res.status, payload);
      return payload as T;
    }),
};
