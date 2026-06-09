/** Step 2: rich teaching summary so the learner understands before the quiz. */
export default function SummaryView({ summary }) {
  return (
    <div>
      <h2 style={{ marginBottom: 4 }}>📖 {summary.title}</h2>
      <span className="badge">Step 2 · Understand first</span>

      <div className="summary-block" style={{ marginTop: 16 }}>
        <h3>Overview</h3>
        <p style={{ marginTop: 4 }}>{summary.overview}</p>
      </div>

      {summary.key_concepts?.length > 0 && (
        <div className="summary-block">
          <h3>Key concepts</h3>
          <div className="concept-grid">
            {summary.key_concepts.map((c, i) => (
              <div className="concept" key={i}>
                <strong>{c.concept}</strong>
                <p className="muted" style={{ margin: "4px 0 0", fontSize: ".9rem" }}>
                  {c.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {summary.takeaways?.length > 0 && (
        <div className="summary-block">
          <h3>Key takeaways</h3>
          <ul className="takeaways">
            {summary.takeaways.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
