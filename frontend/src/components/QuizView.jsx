import { useMemo, useState } from "react";
import { api } from "../api/client";

const LETTERS = ["A", "B", "C", "D", "E"];
const TYPE_LABELS = {
  mcq: "MCQ",
  true_false: "True/False",
  short_answer: "Short Answer",
  fill_blank: "Fill in the Blank",
  scenario: "Scenario",
};

const norm = (s) => (s || "").trim().toLowerCase().replace(/\s+/g, " ");

/** Lenient grading for typed answers (short_answer / fill_blank). */
function gradeText(userAns, correct) {
  const u = norm(userAns);
  const c = norm(correct);
  if (!u) return false;
  if (u === c || u.includes(c) || c.includes(u)) return true;
  const cWords = c.split(" ").filter((w) => w.length > 3);
  if (cWords.length === 0) return u === c;
  const hits = cWords.filter((w) => u.includes(w)).length;
  return hits / cWords.length >= 0.6;
}

function isCorrect(q, answer) {
  if (q.qtype === "short_answer" || q.qtype === "fill_blank")
    return gradeText(answer, q.correct_answer);
  return norm(answer) === norm(q.correct_answer);
}

const isTyped = (q) => q.qtype === "short_answer" || q.qtype === "fill_blank";

/**
 * Interactive quiz shown ONE QUESTION AT A TIME.
 * The user answers the current question, sees instant feedback, then advances
 * to the next. At the end a score summary is shown.
 *
 * Props:
 *   quiz        - the quiz object
 *   reviewOnly  - if true, show the full answer key instead of attempting
 */
export default function QuizView({ quiz, reviewOnly = false }) {
  const total = quiz.questions.length;

  const [answers, setAnswers] = useState({});        // { [qid]: userAnswer }
  const [current, setCurrent] = useState(0);          // index of current question
  const [checked, setChecked] = useState({});         // { [qid]: true } once revealed
  const [finished, setFinished] = useState(false);
  const [reviewMode, setReviewMode] = useState(reviewOnly);

  const q = quiz.questions[current];
  const userAns = q ? answers[q.id] : undefined;
  const isRevealed = q ? !!checked[q.id] : false;

  const score = useMemo(() => {
    let correct = 0;
    quiz.questions.forEach((qq) => {
      if (isCorrect(qq, answers[qq.id])) correct += 1;
    });
    return correct;
  }, [answers, quiz.questions]);

  function setAnswer(value) {
    if (isRevealed) return;
    setAnswers((prev) => ({ ...prev, [q.id]: value }));
  }

  function checkAnswer() {
    if (userAns === undefined || userAns === "") {
      const ok = window.confirm("You haven't answered. Submit blank as incorrect?");
      if (!ok) return;
    }
    setChecked((prev) => ({ ...prev, [q.id]: true }));
  }

  function next() {
    if (current + 1 < total) {
      setCurrent((c) => c + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setFinished(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function restart() {
    setAnswers({});
    setChecked({});
    setCurrent(0);
    setFinished(false);
    setReviewMode(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleExport() {
    const res = await fetch(api.exportUrl(quiz.id), {
      headers: { Authorization: `Bearer ${api.exportToken()}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(quiz.title || "quiz").replace(/\s+/g, "_")}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---- Header (shared) ----
  const header = (
    <>
      <div className="spread" style={{ marginBottom: 10 }}>
        <h2 style={{ margin: 0 }}>📝 {quiz.title}</h2>
        <button className="btn small" onClick={handleExport}>⬇ Export PDF</button>
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        {quiz.subject && <>Subject: {quiz.subject} · </>}
        {quiz.topic && <>Topic: {quiz.topic} · </>}
        Difficulty: {quiz.difficulty} · {total} questions
        {quiz.provider_used && <> · generated with <strong>{quiz.provider_used}</strong></>}
      </p>
    </>
  );

  // ---- One question card renderer (used in attempt + review) ----
  function renderQuestion(qq, idx, reveal) {
    const ans = answers[qq.id];
    const correct = reveal ? isCorrect(qq, ans) : null;
    const hasOptions = qq.options && qq.options.length > 0;
    return (
      <div className="question">
        <div className="q-text">
          {idx + 1}. {qq.text}
          {reveal && !reviewMode && (
            <span className={`result-pill ${correct ? "right" : "wrong"}`}>
              {correct ? "✓ Correct" : "✗ Incorrect"}
            </span>
          )}
        </div>
        <div style={{ margin: "6px 0" }}>
          <span className="tag bloom">{qq.bloom_level || "—"}</span>
          <span className="tag diff">{qq.difficulty || quiz.difficulty}</span>
          <span className="tag type">{TYPE_LABELS[qq.qtype] || qq.qtype}</span>
        </div>

        {hasOptions && (
          <div>
            {qq.options.map((opt, j) => {
              const selected = norm(ans) === norm(opt);
              const optIsAnswer = norm(opt) === norm(qq.correct_answer);
              let cls = "option selectable";
              if (!reveal && selected) cls += " selected";
              if (reveal) {
                if (optIsAnswer) cls += " correct";
                else if (selected && !reviewMode) cls += " wrong";
              }
              return (
                <div
                  key={j}
                  className={cls}
                  onClick={() => !reveal && setAnswer(opt)}
                  role="button"
                >
                  <span className="opt-letter">{LETTERS[j]}</span> {opt}
                  {reveal && optIsAnswer && " ✓"}
                  {reveal && !reviewMode && selected && !optIsAnswer && " ✗"}
                </div>
              );
            })}
          </div>
        )}

        {!hasOptions && (
          <input
            type="text"
            placeholder={qq.qtype === "fill_blank" ? "Fill in the blank…" : "Type your answer…"}
            value={ans || ""}
            disabled={reveal}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !reveal) checkAnswer();
            }}
          />
        )}

        {reveal && (
          <div className="explanation">
            {isTyped(qq) && (
              <>
                {!reviewMode && (
                  <div style={{ marginBottom: 4 }}>
                    <strong>Your answer:</strong> {ans || <em>(blank)</em>}
                  </div>
                )}
                <div>
                  <strong>Correct answer:</strong> {qq.correct_answer}
                </div>
              </>
            )}
            {qq.explanation && (
              <div>
                <strong>💡 Why:</strong> {qq.explanation}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ---- REVIEW-ONLY MODE: show all questions as an answer key ----
  if (reviewMode) {
    return (
      <div>
        {header}
        {quiz.questions.map((qq, idx) => (
          <div key={qq.id || idx}>{renderQuestion(qq, idx, true)}</div>
        ))}
        <div className="quiz-actions">
          <button className="btn" onClick={restart}>🔄 Take the quiz</button>
          <button className="btn ghost" onClick={handleExport}>⬇ Export PDF</button>
        </div>
      </div>
    );
  }

  // ---- FINISHED: score summary + full review ----
  if (finished) {
    const pct = Math.round((score / total) * 100);
    return (
      <div>
        {header}
        <div className={`score-banner ${pct >= 70 ? "good" : pct >= 40 ? "ok" : "low"}`}>
          <div className="score-ring">{pct}%</div>
          <div>
            <h3 style={{ margin: 0 }}>You scored {score} / {total}</h3>
            <p className="muted" style={{ margin: "2px 0 0" }}>
              {pct >= 70
                ? "Great job! 🎉 Review the explanations below to lock it in."
                : pct >= 40
                ? "Good effort — read the explanations to fill the gaps. 💪"
                : "Keep going! The explanations below will help you learn. 📚"}
            </p>
          </div>
          <button className="btn secondary small" style={{ marginLeft: "auto" }} onClick={restart}>
            🔄 Retry quiz
          </button>
        </div>
        <h3>Review</h3>
        {quiz.questions.map((qq, idx) => (
          <div key={qq.id || idx}>{renderQuestion(qq, idx, true)}</div>
        ))}
        <div className="quiz-actions">
          <button className="btn" onClick={restart}>🔄 Retry quiz</button>
          <button className="btn ghost" onClick={handleExport}>⬇ Export PDF</button>
        </div>
      </div>
    );
  }

  // ---- ATTEMPT MODE: ONE QUESTION AT A TIME ----
  const progressPct = Math.round((current / total) * 100);
  return (
    <div>
      {header}

      {/* progress */}
      <div className="attempt-bar">
        <span className="badge">
          Question {current + 1} of {total}
        </span>
        <span className="muted" style={{ fontSize: ".88rem" }}>Score so far: {score}</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      {/* single question */}
      <div key={q.id}>{renderQuestion(q, current, isRevealed)}</div>

      {/* action bar */}
      <div className="quiz-actions">
        {!isRevealed ? (
          <button className="btn" onClick={checkAnswer}>Check answer</button>
        ) : (
          <button className="btn" onClick={next}>
            {current + 1 < total ? "Next question →" : "Finish & see score"}
          </button>
        )}
        {!reviewOnly && current === 0 && !isRevealed && (
          <button className="btn ghost" onClick={() => setReviewMode(true)}>
            View answer key instead
          </button>
        )}
      </div>
    </div>
  );
}
