import { useEffect, useRef, useState } from "react";
import WebcamView from "../components/WebcamView";
import Toolbar from "../components/Toolbar";
import ConfidencePanel from "../components/ConfidencePanel";
import AccuracyPanel from "../components/AccuracyPanel";
import GestureGuide from "../components/GestureGuide";
import { useHandTracking } from "../hooks/useHandTracking";
import { toCanvas } from "../utils/coordinateMapper";
import { classifyGesture, createDebouncer } from "../utils/gestureRules";
import { exportPng } from "../services/exportService";
import { createSmoother } from "../utils/strokeSmoothing";
import { recognizeShape } from "../utils/shapeRecognition";
import { createTracker } from "../utils/analyticsTracker";
import { createAccuracyTest, summarize } from "../utils/accuracyTest";

const W = 960;
const H = 540;
const HOLD_MS = 1500; // how long to hold a fist
const CONFIRM_MS = 6000; // confirmation window

const GESTURE_HINT = {
  DRAW: "☝️ Index finger only",
  PALM: "✋ Open palm",
  PINCH: "🤏 Pinch thumb + index",
  FIST: "✊ Closed fist",
};

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

function drawSkeleton(ctx, landmarks) {
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  for (const [a, b] of HAND_CONNECTIONS) {
    const p = toCanvas(landmarks[a], W, H);
    const q = toCanvas(landmarks[b], W, H);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
  }
  ctx.fillStyle = "#ff4081";
  for (const lm of landmarks) {
    const p = toCanvas(lm, W, H);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

export default function Studio() {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const drawRef = useRef(null);
  const overlayRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [gesture, setGesture] = useState("NONE");

  const [color, setColor] = useState("#00e5ff");
  const [size, setSize] = useState(8);
  const [tool, setTool] = useState("draw");
  const [hoverId, setHoverId] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState("");

  const [smoothOn, setSmoothOn] = useState(true);
  const [smoothness, setSmoothness] = useState(0.65);
  const smoother = useRef(createSmoother());

  const [shapeAssist, setShapeAssist] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [suggestion, setSuggestion] = useState(null);
  const suggestionRef = useRef(null);

  // analytics
  const tracker = useRef(createTracker());
  const [stats, setStats] = useState(null);

  // accuracy test
  const testRef = useRef(null);
  const testKey = useRef("");
  const [testState, setTestState] = useState(null);
  const [lighting, setLighting] = useState("Normal");
  const [runs, setRuns] = useState([]);

  const strokes = useRef([]);
  const redoStack = useRef([]);
  const current = useRef(null);
  const debounce = useRef(createDebouncer(5));
  const hoverRef = useRef(null);
  const prevGesture = useRef("NONE");

  // fist-hold + confirmation state
  const fistStart = useRef(null);
  const needRelease = useRef(false);
  const confirmingRef = useRef(false);
  const confirmDeadline = useRef(0);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 1500);
  };

  // refresh the stats panel twice per second
  useEffect(() => {
    const id = setInterval(() => setStats(tracker.current.snapshot()), 500);
    return () => clearInterval(id);
  }, []);

  const redraw = () => {
    const ctx = drawRef.current.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const s of strokes.current) {
      if (s.points.length < 2) continue;
      ctx.globalCompositeOperation = s.erase ? "destination-out" : "source-over";
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.size;

      const pts = s.points;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i].x + pts[i + 1].x) / 2;
        const my = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
      }
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
  };

  // --- shape suggestion helpers ---
  const clearSuggestion = () => {
    suggestionRef.current = null;
    setSuggestion(null);
  };

  const acceptShape = () => {
    const sug = suggestionRef.current;
    if (sug && strokes.current.includes(sug.stroke)) {
      sug.stroke.points = sug.shape.points;
      redraw();
      showToast(`Converted to ${sug.shape.type}`);
    }
    clearSuggestion();
  };

  // called when a stroke ends
  const finishStroke = () => {
    const s = current.current;
    current.current = null;
    if (!s || s.erase || !shapeAssist) return;
    const shape = recognizeShape(s.points);
    if (shape) {
      suggestionRef.current = { stroke: s, shape };
      setSuggestion({ type: shape.type });
    }
  };

  const undo = () => {
    current.current = null;
    clearSuggestion();
    const s = strokes.current.pop();
    if (s) {
      redoStack.current.push(s);
      redraw();
    }
  };

  const redo = () => {
    const s = redoStack.current.pop();
    if (s) {
      strokes.current.push(s);
      redraw();
    }
  };

  const enterConfirm = () => {
    confirmingRef.current = true;
    confirmDeadline.current = performance.now() + CONFIRM_MS;
    setConfirming(true);
  };

  const exitConfirm = () => {
    confirmingRef.current = false;
    setConfirming(false);
  };

  const doClear = () => {
    current.current = null;
    clearSuggestion();
    strokes.current = [];
    redoStack.current = [];
    redraw();
    exitConfirm();
    showToast("Canvas cleared");
  };

  const savePng = () => {
    exportPng(drawRef.current, W, H);
    showToast("Saved PNG");
  };

  // --- accuracy test ---
  const startTest = () => {
    if (testRef.current) return;
    clearSuggestion();
    current.current = null;
    exitConfirm();
    testRef.current = createAccuracyTest(5);
    testKey.current = "";
    setTestState(testRef.current.update("NONE", performance.now()));
  };

  const cancelTest = () => {
    testRef.current = null;
    setTestState(null);
  };

  const runTest = (g) => {
    const t = testRef.current;
    if (!t) return;
    const st = t.update(g, performance.now());
    if (st.done) {
      const summary = summarize(t.results());
      setRuns((prev) => [...prev, { lighting, ...summary }]);
      testRef.current = null;
      setTestState(null);
      needRelease.current = true; // open your hand before a fist can clear again
      fistStart.current = null;
      showToast("Accuracy test finished");
      return;
    }
    const key = `${st.index}-${st.phase}-${Math.ceil(st.remainingMs / 250)}`;
    if (key !== testKey.current) {
      testKey.current = key;
      setTestState(st);
    }
  };

  const handleAction = (id) => {
    const i = id.indexOf(":");
    const type = id.slice(0, i);
    const value = id.slice(i + 1);
    if (type === "color") {
      setColor(value);
      setTool("draw");
    }
    if (type === "size") setSize(Number(value));
    if (type === "tool") setTool(value);
    if (type === "action") {
      if (value === "undo") undo();
      if (value === "redo") redo();
      if (value === "save") savePng();
      if (value === "clear") enterConfirm();
    }
    if (type === "shape") {
      if (value === "accept") acceptShape();
      else clearSuggestion();
    }
  };

  // Keyboard backup: Ctrl+Z, Ctrl+Y, Esc, Enter (accept shape)
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === "z") undo();
      if (e.ctrlKey && e.key.toLowerCase() === "y") redo();
      if (e.key === "Escape") {
        exitConfirm();
        clearSuggestion();
        cancelTest();
      }
      if (e.key === "Enter" && suggestionRef.current) acceptShape();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const getHovered = (tip) => {
    const box = containerRef.current.getBoundingClientRect();
    const els = containerRef.current.querySelectorAll("[data-action]");
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (
        tip.x >= r.left - box.left &&
        tip.x <= r.right - box.left &&
        tip.y >= r.top - box.top &&
        tip.y <= r.bottom - box.top
      ) {
        return el.dataset.action;
      }
    }
    return null;
  };

  const drawRing = (ctx, pos, progress, danger) => {
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 42, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 42, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    ctx.strokeStyle = danger ? "#ff1744" : "#ffab00";
    ctx.lineWidth = 8;
    ctx.stroke();
  };

  const clearHover = () => {
    if (hoverRef.current !== null) {
      hoverRef.current = null;
      setHoverId(null);
    }
  };

  const onFrame = ({ landmarks, confidence }) => {
    const ov = overlayRef.current.getContext("2d");
    ov.clearRect(0, 0, W, H);

    if (!landmarks) {
      tracker.current.record({ hasHand: false, confidence: 0, gesture: "NONE" });
      smoother.current.reset();
      finishStroke();
      prevGesture.current = "NONE";
      fistStart.current = null;
      clearHover();
      setGesture("NONE");
      runTest("NONE");
      return;
    }

    const g = debounce.current(classifyGesture(landmarks));
    setGesture(g);
    tracker.current.record({ hasHand: true, confidence, gesture: g });
    if (showSkeleton) drawSkeleton(ov, landmarks);

    const rawTip = toCanvas(landmarks[8], W, H);
    const tip = smoothOn
      ? smoother.current.next(rawTip, 1 - smoothness)
      : rawTip;

    // --- accuracy test mode: no drawing, no toolbar, no clearing ---
    if (testRef.current) {
      runTest(g);
      current.current = null;
      prevGesture.current = g;
      fistStart.current = null;
      clearHover();
      ov.beginPath();
      ov.arc(tip.x, tip.y, 12, 0, Math.PI * 2);
      ov.fillStyle = "#ffffff";
      ov.fill();
      return;
    }

    // --- fist hold: first hold asks to clear, second hold confirms ---
    if (g === "FIST" && !needRelease.current) {
      if (fistStart.current === null) fistStart.current = performance.now();
      const p = Math.min((performance.now() - fistStart.current) / HOLD_MS, 1);
      const fistPos = toCanvas(landmarks[9], W, H);
      drawRing(ov, fistPos, p, confirmingRef.current);
      if (p >= 1) {
        fistStart.current = null;
        needRelease.current = true;
        if (confirmingRef.current) doClear();
        else enterConfirm();
      }
    } else {
      fistStart.current = null;
      if (g !== "FIST") needRelease.current = false;
    }

    // open palm or timeout cancels the confirmation
    if (confirmingRef.current) {
      if (g === "PALM" || performance.now() > confirmDeadline.current) {
        exitConfirm();
      }
    }

    // --- toolbar hover + pinch-to-select ---
    const hovered = getHovered(tip);
    if (hovered !== hoverRef.current) {
      hoverRef.current = hovered;
      setHoverId(hovered);
    }
    if (hovered && g === "PINCH" && prevGesture.current !== "PINCH") {
      handleAction(hovered);
    }
    prevGesture.current = g;

    // --- cursor ---
    const erasing = tool === "erase";
    ov.beginPath();
    if (erasing) {
      ov.arc(tip.x, tip.y, size * 1.5, 0, Math.PI * 2);
      ov.strokeStyle = "#fff";
      ov.lineWidth = 2;
      ov.stroke();
    } else {
      ov.arc(tip.x, tip.y, g === "DRAW" ? size / 2 + 2 : 12, 0, Math.PI * 2);
      ov.fillStyle = g === "DRAW" ? color : "#ffffff";
      ov.fill();
    }

    // --- stroke logic ---
    if (g === "DRAW" && !hovered && !confirmingRef.current) {
      if (!current.current) {
        clearSuggestion(); // starting a new stroke dismisses any old suggestion
        current.current = {
          color,
          size: erasing ? size * 3 : size,
          erase: erasing,
          points: [],
        };
        strokes.current.push(current.current);
        redoStack.current = [];
      }
      const pts = current.current.points;
      const last = pts[pts.length - 1];
      if (!last || Math.hypot(tip.x - last.x, tip.y - last.y) > 1.5) {
        pts.push(tip);
      }
      redraw();
    } else {
      finishStroke();
    }
  };

  const { modelReady } = useHandTracking(videoRef, cameraReady, onFrame);

  const bannerBtn = (id, label, bg) => (
    <button
      data-action={id}
      onClick={() => handleAction(id)}
      style={{
        height: 48,
        padding: "0 18px",
        borderRadius: 10,
        border: "none",
        background: bg,
        color: "#fff",
        fontSize: 16,
        cursor: "pointer",
        outline: hoverId === id ? "4px solid #00e5ff" : "none",
        transform: hoverId === id ? "scale(1.08)" : "none",
        transition: "transform 0.1s",
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ minHeight: "100vh", padding: 20, color: "white" }}>
      <h1>AirCanvas Studio {modelReady ? "✅" : "⏳ loading model..."}</h1>
      <p style={{ fontSize: 20 }}>
        Gesture: <b>{gesture}</b> &nbsp;|&nbsp; Tool: <b>{tool}</b>
      </p>

      <div
        style={{
          display: "flex",
          gap: 16,
          alignItems: "center",
          marginBottom: 10,
          flexWrap: "wrap",
        }}
      >
        <label style={{ cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={smoothOn}
            onChange={(e) => setSmoothOn(e.target.checked)}
          />{" "}
          Stabilized drawing
        </label>
        <label>
          Strength:{" "}
          <input
            type="range"
            min="0"
            max="0.9"
            step="0.05"
            value={smoothness}
            disabled={!smoothOn}
            onChange={(e) => setSmoothness(Number(e.target.value))}
          />{" "}
          {smoothness.toFixed(2)}
        </label>
        <label style={{ cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={shapeAssist}
            onChange={(e) => {
              setShapeAssist(e.target.checked);
              if (!e.target.checked) clearSuggestion();
            }}
          />{" "}
          Shape assist
        </label>
        <label style={{ cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={showSkeleton}
            onChange={(e) => setShowSkeleton(e.target.checked)}
          />{" "}
          Show hand skeleton
        </label>
      </div>

      <div ref={containerRef} style={{ position: "relative", width: W, height: H }}>
        <WebcamView
          ref={videoRef}
          width={W}
          height={H}
          onReady={() => setCameraReady(true)}
        />
        <canvas
          ref={drawRef}
          width={W}
          height={H}
          style={{ position: "absolute", inset: 0 }}
        />
        <canvas
          ref={overlayRef}
          width={W}
          height={H}
          style={{ position: "absolute", inset: 0 }}
        />
        <Toolbar
          color={color}
          size={size}
          tool={tool}
          hoverId={hoverId}
          onAction={handleAction}
        />

        {testState && !testState.done && (
          <div
            style={{
              position: "absolute",
              top: 84,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 7,
              pointerEvents: "none",
              background:
                testState.phase === "record"
                  ? "rgba(198,40,40,0.92)"
                  : "rgba(20,22,28,0.92)",
              padding: "14px 28px",
              borderRadius: 16,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 14, opacity: 0.8 }}>
              Trial {testState.index + 1} / {testState.total}
            </div>
            <div style={{ fontSize: 30, fontWeight: 700 }}>
              {GESTURE_HINT[testState.expected]}
            </div>
            <div style={{ fontSize: 18 }}>
              {testState.phase === "prep"
                ? `Get ready… ${(testState.remainingMs / 1000).toFixed(1)}s`
                : `Hold it… recording ${(testState.remainingMs / 1000).toFixed(1)}s`}
            </div>
          </div>
        )}

        {suggestion && (
          <div
            style={{
              position: "absolute",
              left: 16,
              bottom: 16,
              zIndex: 6,
              background: "rgba(20,22,28,0.92)",
              padding: "10px 14px",
              borderRadius: 14,
              display: "flex",
              gap: 12,
              alignItems: "center",
              fontSize: 18,
            }}
          >
            <span>
              Looks like a <b>{suggestion.type}</b>. Convert?
            </span>
            {bannerBtn("shape:accept", "✔ Convert", "#2e7d32")}
            {bannerBtn("shape:dismiss", "✖ Keep", "#555")}
          </div>
        )}

        {confirming && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: 30,
              transform: "translateX(-50%)",
              zIndex: 6,
              background: "rgba(120,0,20,0.92)",
              padding: "14px 22px",
              borderRadius: 14,
              textAlign: "center",
              fontSize: 18,
            }}
          >
            <div>
              Clear everything? Hold ✊ <b>fist</b> again to confirm, or show ✋{" "}
              <b>open palm</b> to cancel.
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={doClear}>Confirm</button>
              <button onClick={exitConfirm}>Cancel</button>
            </div>
          </div>
        )}

        {toast && (
          <div
            style={{
              position: "absolute",
              right: 16,
              top: 16,
              zIndex: 6,
              background: "rgba(0,0,0,0.8)",
              padding: "8px 14px",
              borderRadius: 10,
            }}
          >
            {toast}
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: 16,
          marginTop: 16,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <GestureGuide />
        <ConfidencePanel stats={stats} />
        <AccuracyPanel
          lighting={lighting}
          setLighting={setLighting}
          running={!!testState}
          onStart={startTest}
          onCancel={cancelTest}
          runs={runs}
          onClearRuns={() => setRuns([])}
        />
      </div>
    </div>
  );
}