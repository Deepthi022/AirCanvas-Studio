import { TEST_GESTURES, LABELS } from "../utils/accuracyTest";

const card = {
  background: "#1b1e25",
  borderRadius: 14,
  padding: 14,
  width: 560,
  color: "white",
};
const cell = { padding: "4px 8px", textAlign: "center", border: "1px solid #333" };
const pct = (v) => `${Math.round(v * 100)}%`;

function downloadCsv(runs) {
  const header = ["lighting", "trials", "overall", "frame_accuracy", ...TEST_GESTURES];
  const rows = runs.map((r) =>
    [
      r.lighting,
      r.trials,
      pct(r.accuracy),
      pct(r.frameAccuracy),
      ...TEST_GESTURES.map((g) => pct(r.perGesture[g])),
    ].join(",")
  );
  const blob = new Blob([[header.join(","), ...rows].join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "aircanvas-accuracy.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function AccuracyPanel({
  lighting,
  setLighting,
  running,
  onStart,
  onCancel,
  runs,
  onClearRuns,
}) {
  const latest = runs[runs.length - 1];

  return (
    <div style={card}>
      <h3 style={{ margin: "0 0 10px" }}>🎯 Gesture recognition accuracy test</h3>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <label>
          Lighting:{" "}
          <select
            value={lighting}
            disabled={running}
            onChange={(e) => setLighting(e.target.value)}
          >
            <option>Bright</option>
            <option>Normal</option>
            <option>Dim</option>
            <option>Backlit</option>
          </select>
        </label>
        {!running ? (
          <button onClick={onStart}>▶ Start test (20 trials, about 75 s)</button>
        ) : (
          <button onClick={onCancel}>■ Cancel (Esc)</button>
        )}
        {runs.length > 0 && !running && (
          <>
            <button onClick={() => downloadCsv(runs)}>⬇ CSV</button>
            <button onClick={onClearRuns}>Clear</button>
          </>
        )}
      </div>

      {runs.length === 0 && (
        <p style={{ opacity: 0.7, fontSize: 14 }}>
          Set your lighting, press Start, and follow the on-screen prompt. Each trial
          shows a gesture, gives you 1.5 s to get ready, then records for 2 s. Run it
          again under different lighting to compare.
        </p>
      )}

      {runs.length > 0 && (
        <>
          <h4 style={{ margin: "14px 0 6px" }}>Results by run</h4>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
            <thead>
              <tr>
                <th style={cell}>Lighting</th>
                <th style={cell}>Overall</th>
                <th style={cell}>Frame acc.</th>
                {TEST_GESTURES.map((g) => (
                  <th key={g} style={cell}>
                    {g}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runs.map((r, i) => (
                <tr key={i}>
                  <td style={cell}>{r.lighting}</td>
                  <td style={cell}>
                    <b>{pct(r.accuracy)}</b>
                  </td>
                  <td style={cell}>{pct(r.frameAccuracy)}</td>
                  {TEST_GESTURES.map((g) => (
                    <td key={g} style={cell}>
                      {pct(r.perGesture[g])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <h4 style={{ margin: "14px 0 6px" }}>
            Confusion matrix (latest run: {latest.lighting})
          </h4>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
            <thead>
              <tr>
                <th style={cell}>Actual ↓ / Predicted →</th>
                {LABELS.map((p) => (
                  <th key={p} style={cell}>
                    {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TEST_GESTURES.map((a) => (
                <tr key={a}>
                  <td style={{ ...cell, fontWeight: 700 }}>{a}</td>
                  {LABELS.map((p) => {
                    const v = latest.matrix[a][p];
                    return (
                      <td
                        key={p}
                        style={{
                          ...cell,
                          background:
                            a === p && v > 0
                              ? "rgba(118,255,3,0.25)"
                              : v > 0
                              ? "rgba(255,82,82,0.3)"
                              : "transparent",
                        }}
                      >
                        {v}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}