const COLORS = ["#00e5ff", "#ff4081", "#76ff03", "#ffea00", "#ff9100", "#ffffff"];
const SIZES = [4, 8, 16];
const BTN = 44;

function btn(id, active, hoverId, onAction, content, bg) {
  const hovered = hoverId === id;
  return (
    <button
      key={id}
      data-action={id}
      onClick={() => onAction(id)}
      style={{
        width: BTN,
        height: BTN,
        borderRadius: 10,
        border: active ? "3px solid #fff" : "3px solid transparent",
        outline: hovered ? "4px solid #00e5ff" : "none",
        transform: hovered ? "scale(1.12)" : "none",
        background: bg ?? "#2a2d34",
        color: "#fff",
        fontSize: 20,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "transform 0.1s",
      }}
    >
      {content}
    </button>
  );
}

const divider = (k) => (
  <div key={k} style={{ width: 2, background: "#444", margin: "0 4px" }} />
);

export default function Toolbar({ color, size, tool, hoverId, onAction }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 10,
        left: 10,
        zIndex: 5,
        display: "flex",
        gap: 8,
        padding: 8,
        background: "rgba(20,22,28,0.85)",
        borderRadius: 16,
      }}
    >
      {COLORS.map((c) =>
        btn(`color:${c}`, tool === "draw" && color === c, hoverId, onAction, null, c)
      )}
      {divider("d1")}
      {SIZES.map((s) =>
        btn(
          `size:${s}`,
          size === s,
          hoverId,
          onAction,
          <span
            style={{
              width: s,
              height: s,
              borderRadius: "50%",
              background: "#fff",
              display: "block",
            }}
          />
        )
      )}
      {divider("d2")}
      {btn("tool:draw", tool === "draw", hoverId, onAction, "✏️")}
      {btn("tool:erase", tool === "erase", hoverId, onAction, "🧽")}
      {divider("d3")}
      {btn("action:undo", false, hoverId, onAction, "↩️")}
      {btn("action:redo", false, hoverId, onAction, "↪️")}
      {btn("action:clear", false, hoverId, onAction, "🗑️")}
      {btn("action:save", false, hoverId, onAction, "💾")}
    </div>
  );
}