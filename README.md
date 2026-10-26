# AirCanvas Studio ✋🎨

**Intelligent gesture-based drawing with computer vision.** Draw in the air using
your index finger and a webcam. No mouse, keyboard, or touchscreen.



## Features

- Real-time hand tracking (MediaPipe Hand Landmarker, 21 landmarks)
- Gesture control: draw, pause, pinch-to-select, fist-hold to clear (with confirmation)
- Color palette, brush sizes, eraser, undo/redo, PNG export
- **Stabilized drawing:** exponential moving average filter plus curve interpolation
- **Sketch-to-shape recognition:** circle, triangle, rectangle (rule-based)
- **Gesture analytics:** FPS, confidence, gesture counts, and an accuracy test with a confusion matrix

## Tech stack

React (Vite), JavaScript, MediaPipe Tasks Vision, HTML Canvas API

## How it works

Webcam → MediaPipe landmarks → gesture classifier (finger geometry, debounced)
→ state machine → smoothed fingertip → stroke engine → canvas

Everything runs in the browser, so camera video never leaves your computer.

## Run locally

```bash
cd frontend
npm install
npm run dev
```

Open the printed URL in **Chrome or Edge** and allow camera access.
The hand model and WASM files are served locally from `frontend/public`.

## Gestures

| Gesture | Action |
|---|---|
| ☝️ Index finger up | Draw |
| ✋ Open palm | Pause |
| 🤏 Pinch over a button | Select |
| ✊ Hold fist ~1.5 s | Clear (hold again to confirm) |

## Evaluation

20 trials per run (5 per gesture, random order). The predicted gesture is the
majority vote over a 2 s recording window. One tester, one webcam.

| Lighting | Overall accuracy |
|---|---|
| Normal | [your %] |
| Dim | [your %] |
| Backlit | [your %] |

Known limitations: sensitive to lighting, single hand, assumes an upright hand.

## Future work

Multi-hand support, a learned gesture classifier, One Euro filter, ML-based shape
recognition, drawing replay.

## Author

[Deepthi c r ]