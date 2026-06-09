/**
 * Thin fetch wrapper around the backend API.
 * Attaches the JWT and centralises error handling.
 *
 * BASE resolution:
 *  - In production, set VITE_API_BASE to your backend URL, e.g.
 *      VITE_API_BASE=https://your-backend.onrender.com/api
 *  - Locally it defaults to "/api" (Vite dev proxy / same-origin).
 */
const BASE = (import.meta.env.VITE_API_BASE || "/api").replace(/\/$/, "");

function getToken() {
  return localStorage.getItem("aqg_token") || "";
}

async function request(path, { method = "GET", body, isForm = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let payload = body;
  if (body && !isForm) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const res = await fetch(`${BASE}${path}`, { method, headers, body: payload });
  if (res.status === 204) return null;

  const contentType = res.headers.get("content-type") || "";
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    if (contentType.includes("application/json")) {
      const data = await res.json().catch(() => ({}));
      detail = data.detail || detail;
      if (Array.isArray(detail)) detail = detail.map((d) => d.msg).join(", ");
    }
    throw new Error(detail);
  }
  if (contentType.includes("application/json")) return res.json();
  return res;
}

export const api = {
  // auth
  register: (data) => request("/auth/register", { method: "POST", body: data }),
  login: (data) => request("/auth/login", { method: "POST", body: data }),
  me: () => request("/auth/me"),
  updateProfile: (data) => request("/auth/me", { method: "PUT", body: data }),

  // settings / providers
  providers: () => request("/settings/providers"),
  listKeys: () => request("/settings/keys"),
  upsertKey: (data) => request("/settings/keys", { method: "PUT", body: data }),
  deleteKey: (provider) => request(`/settings/keys/${provider}`, { method: "DELETE" }),
  testKey: (provider) => request(`/settings/keys/${provider}/test`, { method: "POST" }),

  // step 2: summaries
  summaryTopic: (data) => request("/quizzes/summary/topic", { method: "POST", body: data }),
  summaryPrompt: (data) => request("/quizzes/summary/prompt", { method: "POST", body: data }),
  summaryPdf: (formData) =>
    request("/quizzes/summary/pdf", { method: "POST", body: formData, isForm: true }),

  // step 3: quiz generation
  generateTopic: (data) => request("/quizzes/generate/topic", { method: "POST", body: data }),
  generatePrompt: (data) => request("/quizzes/generate/prompt", { method: "POST", body: data }),
  generatePdf: (data) => request("/quizzes/generate/pdf", { method: "POST", body: data }),
  regenerate: (id, data) => request(`/quizzes/${id}/regenerate`, { method: "POST", body: data }),

  // library
  listQuizzes: () => request("/quizzes"),
  getQuiz: (id) => request(`/quizzes/${id}`),
  deleteQuiz: (id) => request(`/quizzes/${id}`, { method: "DELETE" }),
  exportUrl: (id) => `${BASE}/quizzes/${id}/export`,
  exportToken: () => getToken(),
};

export { getToken };
