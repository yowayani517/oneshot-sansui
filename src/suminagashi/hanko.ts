/** Draw a vermillion hanko (落款) onto a 2D context. */
export function drawHanko(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  angleDeg: number,
  char = "山",
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((angleDeg * Math.PI) / 180);

  const half = size / 2;
  const radius = size * 0.08;

  // Soft impression shadow
  ctx.fillStyle = "rgba(120, 20, 16, 0.18)";
  roundRect(ctx, -half + 2, -half + 3, size, size, radius);
  ctx.fill();

  // Seal body
  const grad = ctx.createLinearGradient(-half, -half, half, half);
  grad.addColorStop(0, "#c94a3c");
  grad.addColorStop(0.45, "#a4342c");
  grad.addColorStop(1, "#7a241c");
  ctx.fillStyle = grad;
  roundRect(ctx, -half, -half, size, size, radius);
  ctx.fill();

  // Inner border
  ctx.strokeStyle = "rgba(255, 230, 220, 0.28)";
  ctx.lineWidth = Math.max(1.5, size * 0.035);
  roundRect(ctx, -half + size * 0.08, -half + size * 0.08, size * 0.84, size * 0.84, radius * 0.6);
  ctx.stroke();

  // Character
  ctx.fillStyle = "rgba(255, 248, 240, 0.94)";
  ctx.font = `700 ${size * 0.52}px "Shippori Mincho", "Yu Mincho", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(char, 0, size * 0.03);

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = filename;
  a.click();
}
