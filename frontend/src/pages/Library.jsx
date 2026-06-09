import { useEffect, useState } from "react";
import { api } from "../api/client";
import QuizView from "../components/QuizView";

const SOURCE_ICON = { topic: "📚", prompt: "💬", pdf: "📄" };

export default function Library() {
  const [quizzes, setQuizzes] = useState([]);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      setQuizzes(await api.listQuizzes());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function open(id) {
    setError("");
    try {
      setActive(await api.getQuiz(id));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id, e) {
    e.stopPropagation();
    if (!confirm("Delete this quiz?")) return;
    await api.deleteQuiz(id);
    if (active?.id === id) setActive(null);
    load();
  }

  if (active) {
    return (
      <div className="container">
        <button className="btn secondary small" onClick={() => setActive(null)}>
          ← Back to library
        </button>
        <div className="card" style={{ marginTop: 14 }}>
          <QuizView quiz={active} />
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>My Quizzes</h1>
      {error && <div className="alert error">{error}</div>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : quizzes.length === 0 ? (
        <div className="card center">
          <p className="muted">No quizzes yet. Head to <strong>Create</strong> to make your first one!</p>
        </div>
      ) : (
        <div className="grid-cards">
          {quizzes.map((q) => (
            <div key={q.id} className="card notebook" style={{ cursor: "pointer" }} onClick={() => open(q.id)}>
              <div style={{ fontSize: 22 }}>{SOURCE_ICON[q.source_type] || "📝"}</div>
              <h3 style={{ marginBottom: 6 }}>{q.title}</h3>
              <p className="muted" style={{ fontSize: "0.85rem", margin: 0 }}>
                {q.subject && <>{q.subject} · </>}
                {q.question_count} Qs · {q.difficulty}
              </p>
              <p className="muted" style={{ fontSize: "0.78rem" }}>
                {new Date(q.created_at).toLocaleString()}
              </p>
              <button className="btn danger small" onClick={(e) => remove(q.id, e)}>
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
