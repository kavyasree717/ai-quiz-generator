import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Settings() {
  const { user, setUser } = useAuth();
  const [providers, setProviders] = useState([]);
  const [keys, setKeys] = useState([]);
  const [drafts, setDrafts] = useState({}); // provider -> {api_key, model}
  const [profile, setProfile] = useState({
    full_name: "",
    institution: "",
    role: "student",
    bio: "",
    default_provider: "gemini",
  });
  const [msg, setMsg] = useState(null); // {type, text}

  function flash(type, text) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  }

  async function loadKeys() {
    setKeys(await api.listKeys());
  }

  useEffect(() => {
    api.providers().then(setProviders).catch(() => {});
    loadKeys().catch(() => {});
    if (user) {
      setProfile({
        full_name: user.full_name || "",
        institution: user.institution || "",
        role: user.role || "student",
        bio: user.bio || "",
        default_provider: user.default_provider || "gemini",
      });
    }
  }, [user]);

  async function saveProfile(e) {
    e.preventDefault();
    try {
      const updated = await api.updateProfile(profile);
      setUser(updated);
      flash("ok", "Profile saved.");
    } catch (err) {
      flash("error", err.message);
    }
  }

  async function saveKey(pid) {
    const draft = drafts[pid] || {};
    if (!draft.api_key) {
      flash("error", "Enter an API key first.");
      return;
    }
    try {
      await api.upsertKey({ provider: pid, api_key: draft.api_key, model: draft.model || "" });
      setDrafts({ ...drafts, [pid]: { api_key: "", model: draft.model || "" } });
      await loadKeys();
      flash("ok", `${pid} key saved (encrypted).`);
    } catch (err) {
      flash("error", err.message);
    }
  }

  async function testKey(pid) {
    try {
      const res = await api.testKey(pid);
      flash("ok", res.message);
    } catch (err) {
      flash("error", err.message);
    }
  }

  async function removeKey(pid) {
    if (!confirm(`Remove ${pid} key?`)) return;
    await api.deleteKey(pid);
    await loadKeys();
    flash("ok", `${pid} key removed.`);
  }

  function keyFor(pid) {
    return keys.find((k) => k.provider === pid);
  }

  return (
    <div className="container">
      <h1>Settings</h1>
      {msg && <div className={`alert ${msg.type}`}>{msg.text}</div>}

      {/* ---------------- Profile ---------------- */}
      <div className="card notebook">
        <h2>👤 Profile</h2>
        <form onSubmit={saveProfile}>
          <div className="row">
            <div>
              <label>Full name</label>
              <input
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              />
            </div>
            <div>
              <label>Institution / School</label>
              <input
                value={profile.institution}
                onChange={(e) => setProfile({ ...profile, institution: e.target.value })}
              />
            </div>
          </div>
          <div className="row">
            <div>
              <label>Role</label>
              <select
                value={profile.role}
                onChange={(e) => setProfile({ ...profile, role: e.target.value })}
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>
            <div>
              <label>Default AI provider</label>
              <select
                value={profile.default_provider}
                onChange={(e) => setProfile({ ...profile, default_provider: e.target.value })}
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label>Bio</label>
          <textarea
            value={profile.bio}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            placeholder="A little about you and what you study/teach."
          />
          <p className="muted" style={{ fontSize: "0.82rem" }}>Email: {user?.email}</p>
          <button className="btn" style={{ marginTop: 8 }}>Save profile</button>
        </form>
      </div>

      {/* ---------------- API Keys ---------------- */}
      <div className="card notebook">
        <h2>🔑 AI API Keys</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Add your own free API keys. Keys are <strong>encrypted</strong> before being stored and are
          never shown again in full.
        </p>

        <div className="keyhelp">
          <strong>✨ Recommended free keys</strong>
          <p className="muted" style={{ margin: "4px 0 8px" }}>
            Both have generous free tiers and take about a minute to set up. Create a key, copy it,
            then paste it below.
          </p>
          <div className="keyhelp-links">
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="btn small">
              Get Gemini key ↗
            </a>
            <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="btn small secondary">
              Get Groq key ↗
            </a>
          </div>
        </div>

        <div className="alert info" style={{ marginTop: 0 }}>
          ♻️ <strong>Auto-fallback:</strong> your <em>Default AI provider</em> (set above) is tried first.
          If its key hits a rate limit or runs out, the app automatically switches to your other
          saved keys — so generation keeps working.
        </div>

        {providers.map((p) => {
          const existing = keyFor(p.id);
          const draft = drafts[p.id] || {};
          return (
            <div key={p.id} className="card" style={{ marginBottom: 12 }}>
              <div className="spread">
                <div>
                  <strong>{p.label}</strong>{" "}
                  {p.free ? (
                    <span className="tag type">Free tier</span>
                  ) : (
                    <span className="tag diff">Paid</span>
                  )}
                </div>
                <a href={p.get_key_url} target="_blank" rel="noreferrer" className="btn ghost small">
                  Get a key ↗
                </a>
              </div>
              <p className="muted" style={{ fontSize: "0.85rem", margin: "6px 0" }}>{p.note}</p>

              {existing?.is_set && (
                <p style={{ margin: "4px 0" }}>
                  Current: <span className="kbd">{existing.masked_key}</span>{" "}
                  {existing.model && <span className="muted">({existing.model})</span>}
                </p>
              )}

              <div className="row">
                <div style={{ flex: 2 }}>
                  <label>API key {existing?.is_set && "(enter to replace)"}</label>
                  <input
                    type="password"
                    placeholder="Paste API key"
                    value={draft.api_key || ""}
                    onChange={(e) =>
                      setDrafts({ ...drafts, [p.id]: { ...draft, api_key: e.target.value } })
                    }
                  />
                </div>
                <div>
                  <label>Model (optional)</label>
                  <input
                    placeholder={p.default_model}
                    value={draft.model ?? (existing?.model || "")}
                    onChange={(e) =>
                      setDrafts({ ...drafts, [p.id]: { ...draft, model: e.target.value } })
                    }
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <button className="btn small" onClick={() => saveKey(p.id)}>Save</button>
                {existing?.is_set && (
                  <>
                    <button className="btn secondary small" onClick={() => testKey(p.id)}>Test</button>
                    <button className="btn danger small" onClick={() => removeKey(p.id)}>Remove</button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
