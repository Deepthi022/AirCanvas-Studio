// Collects live statistics. Studio reads a snapshot every 500 ms.
export function createTracker() {
  let t0 = performance.now();
  let frames = 0;
  let handFrames = 0;
  let confSum = 0;
  let lastConf = 0;
  let lastGesture = "NONE";
  let counts = { DRAW: 0, PALM: 0, PINCH: 0, FIST: 0 };
  let stamps = [];

  return {
    record({ hasHand, confidence, gesture }) {
      const now = performance.now();
      frames++;
      stamps.push(now);
      while (stamps.length && now - stamps[0] > 1000) stamps.shift();

      if (hasHand) {
        handFrames++;
        confSum += confidence;
        lastConf = confidence;
      } else {
        lastConf = 0;
      }

      // count a gesture each time it newly becomes the active one
      if (gesture !== lastGesture) {
        if (counts[gesture] !== undefined) counts[gesture]++;
        lastGesture = gesture;
      }
    },

    snapshot() {
      return {
        fps: stamps.length,
        confidence: lastConf,
        avgConfidence: handFrames ? confSum / handFrames : 0,
        detectionRate: frames ? handFrames / frames : 0,
        counts: { ...counts },
        seconds: (performance.now() - t0) / 1000,
      };
    },

    reset() {
      t0 = performance.now();
      frames = 0;
      handFrames = 0;
      confSum = 0;
      lastConf = 0;
      lastGesture = "NONE";
      counts = { DRAW: 0, PALM: 0, PINCH: 0, FIST: 0 };
      stamps = [];
    },
  };
}