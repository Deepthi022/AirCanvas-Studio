// Exponential moving average: smoothed = alpha * new + (1 - alpha) * previous
// Low alpha = smoother but laggier. High alpha = more responsive but shakier.
export function createSmoother() {
  let sx = null;
  let sy = null;

  return {
    next(p, alpha) {
      if (sx === null) {
        sx = p.x;
        sy = p.y;
      } else {
        sx = alpha * p.x + (1 - alpha) * sx;
        sy = alpha * p.y + (1 - alpha) * sy;
      }
      return { x: sx, y: sy };
    },
    reset() {
      sx = null;
      sy = null;
    },
  };
}