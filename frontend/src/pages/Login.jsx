import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next") || "/create";
  const [mode, setMode] = useState("register"); // default to sign-up for first-time users
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "student" });
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        await register(form);
      }
      navigate(next);
    } catch (err) {
      // Friendlier messages
      let msg = err.message;
      if (mode === "register" && /already registered/i.test(msg)) {
        msg = "That email already has an account. Switch to “Log in”.";
      }
      if (mode === "login" && /invalid credentials/i.test(msg)) {
        msg = "Wrong email or password. New here? Switch to “Sign up”.";
      }
      if (/Failed to fetch|NetworkError/i.test(msg)) {
        msg = "Can't reach the server. Make sure the backend is running on port 8000.";
      }
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  function switchMode(m) {
    setMode(m);
    setError("");
    setInfo(
      m === "register"
        ? "Create your own account — choose any email & password you like."
        : "Log in with the email & password you signed up with."
    );
  }

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <div className="center">
          <div className="auth-logo">📘</div>
          <h1 style={{ marginBottom: 4 }}>AI Quiz Generator</h1>
          <p className="muted" style={{ marginTop: 0 }}>
            Learn anything: get a summary, then a quiz that teaches you.
          </p>
        </div>

        <div className="tabs auth-tabs">
          <button className={`tab ${mode === "register" ? "active" : ""}`} onClick={() => switchMode("register")}>
            Sign up
          </button>
          <button className={`tab ${mode === "login" ? "active" : ""}`} onClick={() => switchMode("login")}>
            Log in
          </button>
        </div>

        {info && <div className="alert info">{info}</div>}
        {error && <div className="alert error">{error}</div>}

        <form onSubmit={submit}>
          {mode === "register" && (
            <>
              <label>Full name</label>
              <input value={form.full_name} onChange={(e) => update("full_name", e.target.value)} placeholder="Your name" />
              <label>I am a…</label>
              <select value={form.role} onChange={(e) => update("role", e.target.value)}>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
            </>
          )}
          <label>Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="you@example.com"
          />
          <label>Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            placeholder="At least 6 characters"
          />
          <button className="btn btn-block" style={{ marginTop: 18 }} disabled={busy}>
            {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account & start"}
          </button>
        </form>
      </div>
      <p className="muted center" style={{ fontSize: ".85rem" }}>
        It's free. After signing in, add a free AI API key in <strong>Settings</strong> (Gemini, Groq…).
      </p>
    </div>
  );
}
