import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import GenerationControls, { defaultOpts } from "../components/GenerationControls";
import QuizView from "../components/QuizView";
import SummaryView from "../components/SummaryView";

const METHODS = [
  { id: "topic", label: "By Topic", icon: "📚", hint: "Enter a subject & topic" },
  { id: "prompt", label: "By Prompt", icon: "💬", hint: "Describe what you want" },
  { id: "pdf", label: "From PDF", icon: "📄", hint: "Upload notes / textbook" },
];

const STEPS = ["Provide info", "Read summary", "Take quiz"];

export default function Create() {
  const [searchParams] = useSearchParams();

  // wizard state
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState("topic");
  const [opts, setOpts] = useState({ ...defaultOpts });

  // Preselect method from the landing-page quick buttons (?method=pdf|topic|prompt)
  useEffect(() => {
    const m = searchParams.get("method");
    if (m && ["topic", "prompt", "pdf"].includes(m)) setMethod(m);
  }, [searchParams]);

  // inputs
  const [topic, setTopic] = useState({ subject: "", topic: "" });
  const [prompt, setPrompt] = useState("");
  const [file, setFile] = useState(null);
  const fileRef = useRef();

  // results
  const [summary, setSummary] = useState(null);
  const [quiz, setQuiz] = useState(null);

  // ui
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hasKey, setHasKey] = useState(true);

  useEffect(() => {
    api
      .listKeys()
      .then((keys) => setHasKey(keys.some((k) => k.is_set)))
      .catch(() => {});
  }, []);

  function resetAll() {
    setStep(1);
    setSummary(null);
    setQuiz(null);
    setError("");
  }

  // ---------- STEP 1 -> 2: summarize ----------
  async function goSummary() {
    setError("");
    if (method === "topic" && (!topic.subject.trim() || !topic.topic.trim())) {
      return setError("Please enter both a subject and a topic.");
    }
    if (method === "prompt" && !prompt.trim()) {
      return setError("Please describe the quiz you want.");
    }
    if (method === "pdf" && !file) {
      return setError("Please choose a PDF file to upload.");
    }
    setBusy(true);
    try {
      let result;
      if (method === "topic") result = await api.summaryTopic(topic);
      else if (method === "prompt") result = await api.summaryPrompt({ prompt });
      else {
        const fd = new FormData();
        fd.append("file", file);
        result = await api.summaryPdf(fd);
      }
      setSummary(result);
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // ---------- STEP 2 -> 3: generate quiz ----------
  async function goQuiz() {
    setError("");
    setBusy(true);
    try {
      let result;
      const common = {
        num_questions: opts.num_questions,
        difficulty: opts.difficulty,
        question_types: opts.question_types,
      };
      if (summary.source_type === "topic") {
        result = await api.generateTopic({ ...common, subject: summary.subject, topic: summary.topic });
      } else if (summary.source_type === "prompt") {
        result = await api.generatePrompt({ ...common, prompt: summary.prompt });
      } else {
        result = await api.generatePdf({ ...common, content: summary.content, title: summary.title });
      }
      setQuiz(result);
      setStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <h1>Create a Quiz</h1>
      <p className="muted">
        A simple 3-step flow: provide your material, read an AI summary to understand it,
        then take a quiz built to teach you.
      </p>

      {/* Stepper */}
      <div className="stepper">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const cls = step === n ? "active" : step > n ? "done" : "";
          return (
            <div className={`step ${cls}`} key={label}>
              <span className="step-num">{step > n ? "✓" : n}</span>
              <span className="step-label">{label}</span>
            </div>
          );
        })}
      </div>

      {!hasKey && (
        <div className="alert info">
          <strong>🔑 Add a free AI API key to start generating.</strong>
          <div style={{ marginTop: 6 }}>
            Grab a free key (takes ~1 min), then paste it in{" "}
            <Link to="/settings">Settings</Link>:
          </div>
          <ul style={{ margin: "6px 0 0", paddingLeft: 20 }}>
            <li>
              <strong>Gemini</strong> —{" "}
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">
                aistudio.google.com/app/apikey
              </a>
            </li>
            <li>
              <strong>Groq</strong> —{" "}
              <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer">
                console.groq.com/keys
              </a>
            </li>
          </ul>
          <div style={{ marginTop: 8 }}>
            <Link to="/settings" className="btn small">Go to Settings →</Link>
          </div>
        </div>
      )}
      {error && <div className="alert error">{error}</div>}

      {/* ---------------- STEP 1 ---------------- */}
      {step === 1 && (
        <div className="card">
          <h3>1. Choose a method & provide your information</h3>
          <div className="method-grid">
            {METHODS.map((m) => (
              <div
                key={m.id}
                className={`method-card ${method === m.id ? "on" : ""}`}
                onClick={() => setMethod(m.id)}
              >
                <div className="method-icon">{m.icon}</div>
                <strong>{m.label}</strong>
                <span className="muted" style={{ fontSize: ".8rem" }}>
                  {m.hint}
                </span>
              </div>
            ))}
          </div>

          {method === "topic" && (
            <div className="row" style={{ marginTop: 8 }}>
              <div>
                <label>Subject</label>
                <input
                  placeholder="e.g. Data Structures"
                  value={topic.subject}
                  onChange={(e) => setTopic({ ...topic, subject: e.target.value })}
                />
              </div>
              <div>
                <label>Topic</label>
                <input
                  placeholder="e.g. Binary Search Trees"
                  value={topic.topic}
                  onChange={(e) => setTopic({ ...topic, topic: e.target.value })}
                />
              </div>
            </div>
          )}

          {method === "prompt" && (
            <div>
              <label>Describe what you want to learn / be quizzed on</label>
              <textarea
                className="prompt-bar"
                placeholder={'e.g. "Explain and quiz me on Java Collections and Multithreading for beginners."'}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>
          )}

          {method === "pdf" && (
            <div>
              <label>Upload study material (PDF)</label>
              <div className="dropzone" onClick={() => fileRef.current?.click()}>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf"
                  style={{ display: "none" }}
                  onChange={(e) => setFile(e.target.files[0] || null)}
                />
                <div style={{ fontSize: 34 }}>📄</div>
                {file ? (
                  <strong>{file.name}</strong>
                ) : (
                  <span className="muted">Click to choose a PDF (notes, textbook, handout, paper…)</span>
                )}
              </div>
              <p className="muted" style={{ fontSize: ".82rem" }}>
                The AI reads your PDF, explains it, then builds a quiz from the ideas inside.
                (Scanned/image-only PDFs aren't supported.)
              </p>
            </div>
          )}

          <hr className="soft" />
          <GenerationControls opts={opts} setOpts={setOpts} />

          <button className="btn" style={{ marginTop: 18 }} disabled={busy} onClick={goSummary}>
            {busy ? (
              <span className="loading-inline">
                <span className="spinner" /> Reading & summarizing…
              </span>
            ) : (
              "Next: Summarize →"
            )}
          </button>
        </div>
      )}

      {/* ---------------- STEP 2 ---------------- */}
      {step === 2 && summary && (
        <div className="card">
          <SummaryView summary={summary} />
          <hr className="soft" />
          <p className="muted">
            Ready? We'll create <strong>{opts.num_questions}</strong> {opts.difficulty.toLowerCase()}{" "}
            questions ({opts.question_types.join(", ")}) that teach this material.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn secondary" onClick={() => setStep(1)}>
              ← Back
            </button>
            <button className="btn" disabled={busy} onClick={goQuiz}>
              {busy ? (
                <span className="loading-inline">
                  <span className="spinner" /> Generating quiz…
                </span>
              ) : (
                "Next: Generate Quiz →"
              )}
            </button>
          </div>
        </div>
      )}

      {/* ---------------- STEP 3 ---------------- */}
      {step === 3 && quiz && (
        <>
          {summary && (
            <details className="card" style={{ marginBottom: 14 }}>
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                📖 Review the summary again
              </summary>
              <div style={{ marginTop: 12 }}>
                <SummaryView summary={summary} />
              </div>
            </details>
          )}
          <div className="card">
            <QuizView quiz={quiz} />
          </div>
          <div className="center" style={{ marginBottom: 24 }}>
            <button className="btn secondary" onClick={resetAll}>
              ← Create another quiz
            </button>
          </div>
        </>
      )}
    </div>
  );
}
