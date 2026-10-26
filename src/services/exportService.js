export function exportPng(drawCanvas, width, height) {
  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const ctx = out.getContext("2d");
  ctx.fillStyle = "#111111";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(drawCanvas, 0, 0);

  const link = document.createElement("a");
  link.download = `aircanvas-${Date.now()}.png`;
  link.href = out.toDataURL("image/png");
  link.click();
}