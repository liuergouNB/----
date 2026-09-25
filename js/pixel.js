/** 像素绘制工具：全部用整数方块，关掉平滑 */

export function prepPixelCtx(ctx) {
  ctx.imageSmoothingEnabled = false;
}

export function px(n) {
  return Math.round(n);
}

/** 按格子画精灵。fxRect 若提供，则把 Y 特效拉伸铺满该判定矩形 */
export function drawSprite(ctx, grid, colors, originX, originY, scale, flip = false, alpha = 1, fxRect = null) {
  const rows = grid.length;
  const cols = grid[0].length;
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = prev * alpha;

  // 本体（不含 Y）
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const ch = grid[y][flip ? cols - 1 - x : x];
      if (ch === "." || ch === " " || ch === "Y") continue;
      const color = colors[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(px(originX) + x * scale, px(originY) + y * scale, scale, scale);
    }
  }

  // 收集 Y 像素包围盒
  let minX = cols, maxX = -1, minY = rows, maxY = -1;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const ch = grid[y][flip ? cols - 1 - x : x];
      if (ch !== "Y") continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX >= minX) {
    if (fxRect) {
      // 把 Y 图案映射到判定框大小
      const srcW = maxX - minX + 1;
      const srcH = maxY - minY + 1;
      const dstW = Math.max(4, fxRect.right - fxRect.left);
      const dstH = Math.max(4, fxRect.bottom - fxRect.top);
      const sx = dstW / srcW;
      const sy = dstH / srcH;
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const ch = grid[y][flip ? cols - 1 - x : x];
          if (ch !== "Y") continue;
          const lx = x - minX;
          const ly = y - minY;
          ctx.fillStyle = colors.Y || "#ffe840";
          ctx.fillRect(
            px(fxRect.left + lx * sx),
            px(fxRect.top + ly * sy),
            Math.max(2, Math.ceil(sx)),
            Math.max(2, Math.ceil(sy))
          );
        }
      }
    } else {
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const ch = grid[y][flip ? cols - 1 - x : x];
          if (ch !== "Y") continue;
          ctx.fillStyle = colors.Y || "#ffe840";
          ctx.fillRect(px(originX) + x * scale, px(originY) + y * scale, scale, scale);
        }
      }
    }
  }

  ctx.globalAlpha = prev;
}

export function fillPx(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(px(x), px(y), Math.round(w), Math.round(h));
}

export function strokePx(ctx, x, y, w, h, color, thickness = 2) {
  ctx.fillStyle = color;
  const X = px(x);
  const Y = px(y);
  const W = Math.round(w);
  const H = Math.round(h);
  const t = thickness;
  ctx.fillRect(X, Y, W, t);
  ctx.fillRect(X, Y + H - t, W, t);
  ctx.fillRect(X, Y, t, H);
  ctx.fillRect(X + W - t, Y, t, H);
}

/** 像素字：用系统无衬线也可以，这里统一成锐利小字 */
export function pixelText(ctx, text, x, y, color, size = 12, align = "left") {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = color;
  ctx.font = `bold ${size}px "Courier New", monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.fillText(text, px(x), px(y));
}
