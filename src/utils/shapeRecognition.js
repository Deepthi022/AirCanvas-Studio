const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function pathLength(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += dist(pts[i - 1], pts[i]);
  return L;
}

// Shoelace formula: area enclosed by the stroke
function polygonArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
}

function perpDist(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return dist(p, a);
  return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / len;
}

// Ramer-Douglas-Peucker: simplify a path to its key corner points
function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  const a = pts[0];
  const b = pts[pts.length - 1];
  let maxD = 0;
  let idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpDist(pts[i], a, b);
    if (d > maxD) {
      maxD = d;
      idx = i;
    }
  }
  if (maxD > eps) {
    const left = rdp(pts.slice(0, idx + 1), eps);
    const right = rdp(pts.slice(idx), eps);
    return left.slice(0, -1).concat(right);
  }
  return [a, b];
}

// RDP breaks on closed loops (start ~ end), so split at the farthest point first
function simplifyClosed(pts, eps) {
  let k = 0;
  let far = 0;
  for (let i = 0; i < pts.length; i++) {
    const d = dist(pts[i], pts[0]);
    if (d > far) {
      far = d;
      k = i;
    }
  }
  const half1 = rdp(pts.slice(0, k + 1), eps);
  const half2 = rdp(pts.slice(k), eps);
  const merged = half1.slice(0, -1).concat(half2);
  merged.pop(); // last point is ~ the first point
  return merged;
}

// Merge corners that are very close together (e.g. from an overshoot)
function mergeClose(verts, minDist) {
  const out = [];
  for (const v of verts) {
    if (!out.length || dist(v, out[out.length - 1]) > minDist) out.push(v);
  }
  while (out.length > 1 && dist(out[0], out[out.length - 1]) <= minDist) out.pop();
  return out;
}

function angleAt(v, prev, next) {
  const a1 = Math.atan2(prev.y - v.y, prev.x - v.x);
  const a2 = Math.atan2(next.y - v.y, next.x - v.x);
  let d = Math.abs(a1 - a2) * (180 / Math.PI);
  if (d > 180) d = 360 - d;
  return d;
}

// Turn a closed list of corners into a dense path so curve drawing keeps corners sharp
function densify(verts, step = 4) {
  const out = [];
  for (let i = 0; i < verts.length; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % verts.length];
    const n = Math.max(1, Math.round(dist(a, b) / step));
    for (let j = 0; j < n; j++) {
      out.push({ x: a.x + ((b.x - a.x) * j) / n, y: a.y + ((b.y - a.y) * j) / n });
    }
  }
  out.push({ ...verts[0] });
  return out;
}

export function recognizeShape(points) {
  if (points.length < 15) return null;

  const P = pathLength(points);
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const w = maxX - minX;
  const h = maxY - minY;

  if (Math.hypot(w, h) < 60 || P < 120) return null; // too small
  if (dist(points[0], points[points.length - 1]) > 0.2 * P) return null; // not closed

  // 1) Circle: 4*pi*area / perimeter^2 is 1 for a circle (0.79 square, 0.60 triangle)
  const circularity = (4 * Math.PI * polygonArea(points)) / (P * P);
  if (circularity > 0.84) {
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const r = (w + h) / 4;
    const circle = [];
    for (let i = 0; i <= 72; i++) {
      const t = (i / 72) * Math.PI * 2;
      circle.push({ x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) });
    }
    return { type: "circle", points: circle };
  }

  // 2) Polygons: find corners with RDP
  let verts = simplifyClosed(points, 0.02 * P);
  verts = mergeClose(verts, 0.06 * P);

  if (verts.length === 3) {
    return { type: "triangle", points: densify(verts) };
  }

  if (verts.length === 4) {
    const rightAngles = verts.every((v, i) => {
      const ang = angleAt(v, verts[(i + 3) % 4], verts[(i + 1) % 4]);
      return Math.abs(ang - 90) < 28;
    });
    if (rightAngles) {
      const rect = [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY },
      ];
      return { type: "rectangle", points: densify(rect) };
    }
  }

  return null;
}