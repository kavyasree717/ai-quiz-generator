import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // If not logged in, route through login first, then continue to /create.
  function start(method) {
    const target = method ? `/create?method=${method}` : "/create";
    if (user) navigate(target);
    else navigate(`/login?next=${encodeURIComponent(target)}`);
  }

  return (
    <div className="landing">
      <div className="container">
        {/* ----------- HERO (notebook paper) ----------- */}
        <section className="notebook-hero">
          <span className="hero-sticky" />
          <h1 className="hero-title">
            Make quizzes <mark>the smart way</mark>
          </h1>
          <p className="hero-sub">
            Upload a PDF, pick a topic, or just type what you need. AI turns your
            study material into curriculum-aligned questions at any level of
            Bloom's Taxonomy.
          </p>

          <button className="btn btn-hero" onClick={() => start()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
            </svg>
            Start Generating
            <span style={{ marginLeft: 4 }}>→</span>
          </button>

          <div className="or-try">
            <span className="or-try-label">OR TRY:</span>
            <button className="quick-btn" onClick={() => start("pdf")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              Upload PDF
            </button>
            <button className="quick-btn" onClick={() => start("topic")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              By Topic
            </button>
            <button className="quick-btn" onClick={() => start("prompt")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              By Prompt
            </button>
          </div>
        </section>

        {/* ----------- HOW IT WORKS ----------- */}
        <section className="how-section">
          <h2 className="center">How it works</h2>
          <div className="how-grid">
            <div className="how-card">
              <div className="how-num">1</div>
              <h3>Provide your material</h3>
              <p className="muted">Upload a PDF, enter a subject &amp; topic, or describe what you want to learn.</p>
            </div>
            <div className="how-card">
              <div className="how-num">2</div>
              <h3>Read the summary</h3>
              <p className="muted">AI explains the material first — overview, key concepts &amp; takeaways — so you understand before testing.</p>
            </div>
            <div className="how-card">
              <div className="how-num">3</div>
              <h3>Take a teaching quiz</h3>
              <p className="muted">Get varied questions with explanations. Bloom's Taxonomy levels are applied automatically.</p>
            </div>
          </div>
        </section>

        {/* ----------- FEATURES ----------- */}
        <section className="features">
          <div className="feature">📄 <strong>PDF, Topic &amp; Prompt</strong><span className="muted">Three ways to create</span></div>
          <div className="feature">🧠 <strong>Auto Bloom's levels</strong><span className="muted">Recall → higher-order</span></div>
          <div className="feature">♻️ <strong>Key auto-fallback</strong><span className="muted">Never blocked by limits</span></div>
          <div className="feature">⬇️ <strong>Export to PDF</strong><span className="muted">Printable answer key</span></div>
        </section>

        <div className="center" style={{ marginTop: 28 }}>
          <button className="btn btn-hero" onClick={() => start()}>Start Generating →</button>
        </div>
      </div>
    </div>
  );
}
