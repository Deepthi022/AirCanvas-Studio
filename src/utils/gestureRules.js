const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// A finger is "up" if its tip is higher on screen than its middle joint
const isUp = (lm, tip, pip) => lm[tip].y < lm[pip].y;

export function classifyGesture(lm) {
  const index = isUp(lm, 8, 6);
  const middle = isUp(lm, 12, 10);
  const ring = isUp(lm, 16, 14);
  const pinky = isUp(lm, 20, 18);

  // Thumb-to-index distance divided by hand size, so it works at any distance
  const pinch = dist(lm[4], lm[8]) / dist(lm[0], lm[9]);

  if (pinch < 0.25) return "PINCH";
  if (index && !middle && !ring && !pinky) return "DRAW";
  if (index && middle && ring && pinky) return "PALM";
  if (!index && !middle && !ring && !pinky) return "FIST";
  return "NONE";
}

// Only switch gesture after it has been stable for N frames (stops flicker)
export function createDebouncer(frames = 5) {
  let stable = "NONE";
  let candidate = "NONE";
  let count = 0;
  return (g) => {
    if (g === candidate) count++;
    else {
      candidate = g;
      count = 1;
    }
    if (count >= frames) stable = candidate;
    return stable;
  };
}