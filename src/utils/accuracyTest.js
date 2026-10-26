export const TEST_GESTURES = ["DRAW", "PALM", "PINCH", "FIST"];
export const LABELS = [...TEST_GESTURES, "NONE"];
export const PREP_MS = 1500; // time to get into position
export const REC_MS = 2000; // time we record

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export function createAccuracyTest(trialsPerGesture = 5) {
  // every round contains each gesture once, in random order
  const seq = [];
  for (let i = 0; i < trialsPerGesture; i++) seq.push(...shuffle(TEST_GESTURES));

  const results = [];
  let idx = 0;
  let phase = "prep";
  let phaseStart = null;
  let counts = {};

  const state = (now) => ({
    done: idx >= seq.length,
    index: idx,
    total: seq.length,
    expected: seq[idx] ?? null,
    phase,
    remainingMs: Math.max(
      0,
      (phase === "prep" ? PREP_MS : REC_MS) - (now - (phaseStart ?? now))
    ),
  });

  return {
    update(gesture, now) {
      if (idx >= seq.length) return state(now);
      if (phaseStart === null) phaseStart = now;
      const elapsed = now - phaseStart;

      if (phase === "prep") {
        if (elapsed >= PREP_MS) {
          phase = "record";
          phaseStart = now;
          counts = {};
        }
      } else {
        counts[gesture] = (counts[gesture] || 0) + 1;
        if (elapsed >= REC_MS) {
          const expected = seq[idx];
          let predicted = "NONE";
          let best = -1;
          let total = 0;
          for (const [k, v] of Object.entries(counts)) {
            total += v;
            if (v > best) {
              best = v;
              predicted = k;
            }
          }
          results.push({
            expected,
            predicted, // majority vote over the recording window
            frames: total,
            correctFrames: counts[expected] || 0,
          });
          idx++;
          phase = "prep";
          phaseStart = now;
          counts = {};
        }
      }
      return state(now);
    },
    results: () => results,
  };
}

export function summarize(results) {
  const matrix = {};
  const perTotal = {};
  const perCorrect = {};
  for (const a of TEST_GESTURES) {
    matrix[a] = {};
    for (const p of LABELS) matrix[a][p] = 0;
    perTotal[a] = 0;
    perCorrect[a] = 0;
  }

  let correct = 0;
  let frames = 0;
  let correctFrames = 0;
  for (const r of results) {
    matrix[r.expected][r.predicted]++;
    perTotal[r.expected]++;
    if (r.predicted === r.expected) {
      correct++;
      perCorrect[r.expected]++;
    }
    frames += r.frames;
    correctFrames += r.correctFrames;
  }

  const perGesture = {};
  for (const a of TEST_GESTURES) {
    perGesture[a] = perTotal[a] ? perCorrect[a] / perTotal[a] : 0;
  }

  return {
    trials: results.length,
    accuracy: results.length ? correct / results.length : 0,
    frameAccuracy: frames ? correctFrames / frames : 0,
    perGesture,
    matrix,
  };
}