const GESTURES = ["DRAW", "PALM", "PINCH", "FIST"];
const EMOJI = { DRAW: "☝️", PALM: "✋", PINCH: "🤏", FIST: "✊" };

const card = {
  background: "#1b1e25",
  borderRadius: 14,
  padding: 14,
  width: 340,
  color: "white",
};

const pct = (v) => `${Math.round(v * 100)}%`;

function Bar({ value, color }) {
  return (
    <div style={{ background: "#333", borderRadius: 6, height: 10, width: "100%" }}>
      <div
        style={{
          width: pct(Math.min(1, value)),
          height: "100%",
          borderRadius: 6,
          background: color,
          transition: "width 0.3s",
        }}
      />
    </div>
  );
}

export default function ConfidencePanel({ stats }) {
  const s = stats ?? {
    fps: 0,
    confidence: 0,
    avgConfidence: 0,
    detectionRate: 0,
    counts: {},
    seconds: 0,
  };
  const fpsColor = s.fps >= 20 ? "#76ff03" : s.fps >= 12 ? "#ffea00" : "#ff5252";

  return (
    <div style={card}>
      <h3 style={{ margin: "0 0 10px" }}>📊 Live tracking stats</h3>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <span>FPS</span>
        <b style={{ color: fpsColor }}>{s.fps}</b>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Hand confidence (now)</span>
          <b>{pct(s.confidence)}</b>
        </div>
        <Bar value={s.confidence} color="#00e5ff" />
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Average confidence</span>
          <b>{pct(s.avgConfidence)}</b>
        </div>
        <Bar value={s.avgConfidence} color="#7c4dff" />
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Hand detected (frames)</span>
          <b>{pct(s.detectionRate)}</b>
        </div>
        <Bar value={s.detectionRate} color="#76ff03" />
      </div>

      <div style={{ marginBottom: 6 }}>Gesture counts</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {GESTURES.map((g) => (
          <div
            key={g}
            style={{
              background: "#2a2d34",
              borderRadius: 8,
              padding: "6px 10px",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>
              {EMOJI[g]} {g}
            </span>
            <b>{s.counts[g] ?? 0}</b>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 10, opacity: 0.6, fontSize: 13 }}>
        Session: {Math.floor(s.seconds / 60)}m {Math.floor(s.seconds % 60)}s
      </div>
    </div>
  );
}