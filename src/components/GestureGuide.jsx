const ITEMS = [
  ["☝️", "Index finger up", "Draw"],
  ["✋", "Open palm", "Pause (stops the stroke)"],
  ["🤏", "Pinch over a button", "Select tool / color / action"],
  ["✊", "Hold fist ~1.5 s", "Clear canvas (then hold again to confirm)"],
];

export default function GestureGuide() {
  return (
    <div
      style={{
        background: "#1b1e25",
        borderRadius: 14,
        padding: 14,
        width: 340,
        color: "white",
      }}
    >
      <h3 style={{ margin: "0 0 10px" }}>🖐️ Gesture guide</h3>
      {ITEMS.map(([icon, gesture, action]) => (
        <div
          key={gesture}
          style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "center" }}
        >
          <span style={{ fontSize: 26, width: 34, textAlign: "center" }}>{icon}</span>
          <div>
            <div style={{ fontWeight: 600 }}>{gesture}</div>
            <div style={{ opacity: 0.7, fontSize: 14 }}>{action}</div>
          </div>
        </div>
      ))}
      <div style={{ opacity: 0.6, fontSize: 13, marginTop: 6 }}>
        Shortcuts: Ctrl+Z undo, Ctrl+Y redo, Enter accept shape, Esc cancel
      </div>
    </div>
  );
}