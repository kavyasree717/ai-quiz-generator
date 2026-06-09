/**
 * Quiz options the user controls. Bloom's levels are applied AUTOMATICALLY by
 * the AI (not shown here). The AI provider lives in Settings (not here).
 */
const TYPES = [
  { id: "mcq", label: "Multiple Choice" },
  { id: "true_false", label: "True / False" },
  { id: "short_answer", label: "Short Answer" },
  { id: "fill_blank", label: "Fill in the Blank" },
  { id: "scenario", label: "Scenario" },
];
const DIFFICULTY = ["Easy", "Medium", "Hard"];

export default function GenerationControls({ opts, setOpts }) {
  function toggleType(value) {
    const cur = opts.question_types;
    const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
    if (next.length === 0) return;
    setOpts({ ...opts, question_types: next });
  }

  return (
    <div>
      <div className="row">
        <div>
          <label>Number of questions</label>
          <input
            type="number"
            min={1}
            max={50}
            value={opts.num_questions}
            onChange={(e) => setOpts({ ...opts, num_questions: Number(e.target.value) })}
          />
        </div>
        <div>
          <label>Difficulty</label>
          <select
            value={opts.difficulty}
            onChange={(e) => setOpts({ ...opts, difficulty: e.target.value })}
          >
            {DIFFICULTY.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      <label>Question types</label>
      <div className="chips">
        {TYPES.map((t) => (
          <span
            key={t.id}
            className={`chip ${opts.question_types.includes(t.id) ? "on" : ""}`}
            onClick={() => toggleType(t.id)}
          >
            {t.label}
          </span>
        ))}
      </div>
      <p className="muted" style={{ fontSize: ".82rem", marginTop: 8 }}>
        💡 Bloom's Taxonomy levels are applied automatically — questions progress from
        recall to higher-order thinking to deepen understanding.
      </p>
    </div>
  );
}

export const defaultOpts = {
  num_questions: 8,
  difficulty: "Medium",
  question_types: ["mcq"],
};
