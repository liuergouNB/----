import { fillPx, px, pixelText } from "./pixel.js";

/**
 * 近战气刃多帧动画
 * frame: 0出现 1展开 2顶点 3余韵 4消散
 * progress: 0~1 连续进度
 */
export function drawSwingFx(ctx, box, color, facing, tick, style = "slash", frame = 2, progress = 0.5) {
  if (!box) return;
  const padX = 8;
  const padY = 6;
  const b = {
    left: box.left - padX,
    right: box.right + padX,
    top: box.top - padY,
    bottom: box.bottom + padY,
  };
  const w = Math.max(8, b.right - b.left);
  const h = Math.max(8, b.bottom - b.top);
  const dir = facing >= 0 ? 1 : -1;
  const edge = color || "#ffe840";

  // 按帧调节透明度与规模
  const fade =
    frame === 0 ? 0.55 :
    frame === 1 ? 0.85 :
    frame === 2 ? 1 :
    frame === 3 ? 0.7 :
    0.4;
  const grow =
    frame === 0 ? 0.35 :
    frame === 1 ? 0.7 :
    frame === 2 ? 1 :
    frame === 3 ? 0.95 :
    0.55;

  const flash = tick % 3 === 0 && frame <= 2;
  const aEdge = 0.38 * fade;
  const aMid = 0.28 * fade;
  const aCore = (flash ? 0.62 : 0.48) * fade;
  const aTip = 0.7 * fade;
  const cEdge = withAlpha(edge, aEdge);
  const cMid = withAlpha(edge, aMid);
  const cCore = withAlpha("#ffffff", aCore);
  const cTip = withAlpha("#ffffff", aTip);

  const anim = { frame, progress, grow, fade };

  if (style === "thrust") drawThrust(ctx, b, w, h, dir, cCore, cEdge, cMid, cTip, tick, anim);
  else if (style === "kick") drawKick(ctx, b, w, h, dir, cCore, cEdge, cMid, cTip, tick, anim);
  else if (style === "chop") drawChop(ctx, b, w, h, dir, cCore, cEdge, cMid, cTip, tick, anim);
  else if (style === "palm") drawPalm(ctx, b, w, h, dir, cCore, cEdge, cMid, cTip, tick, anim);
  else if (style === "upper" || style === "rise") drawRise(ctx, b, w, h, dir, cCore, cEdge, cMid, cTip, tick, anim);
  else if (style === "sweep") drawSweep(ctx, b, w, h, dir, cCore, cEdge, cMid, cTip, tick, anim);
  else if (style === "spin") drawSpin(ctx, b, w, h, dir, cCore, cEdge, cMid, cTip, tick, anim);
  else if (style === "dive") drawDive(ctx, b, w, h, dir, cCore, cEdge, cMid, cTip, tick, anim);
  else drawSlash(ctx, b, w, h, dir, cCore, cEdge, cMid, cTip, anim);
}

/** 直拳：长度随帧伸出 → 满幅 → 回收残影 */
function drawThrust(ctx, box, w, h, dir, cCore, cEdge, cMid, cTip, tick, anim) {
  const cy = (box.top + box.bottom) / 2;
  const rear = dir > 0 ? box.left : box.right;
  const tipFull = dir > 0 ? box.right : box.left;
  const lenFull = tipFull - rear;
  // 帧控制伸出比例
  let extend = anim.grow;
  if (anim.frame === 3) extend = 1;
  if (anim.frame === 4) extend = 0.45;
  const tip = rear + lenFull * extend;
  const len = Math.abs(tip - rear);
  const steps = Math.max(8, Math.floor(len / 2.5));

  const layers = anim.frame <= 1
    ? [{ yOff: 0, hMul: 0.55, col: cEdge }]
    : [
        { yOff: 0, hMul: 0.85, col: cEdge },
        { yOff: -h * 0.12, hMul: 0.55, col: cMid },
        { yOff: h * 0.12, hMul: 0.55, col: cMid },
      ];

  for (const layer of layers) {
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = rear + (tip - rear) * t;
      const thick = Math.max(3, Math.floor(h * layer.hMul * (0.85 - t * 0.35)));
      const col = t > 0.65 ? cCore : layer.col;
      fillPx(ctx, x - (dir > 0 ? 0 : 4), cy + layer.yOff - thick / 2, 4, thick, col);
    }
  }
  if (anim.frame >= 1 && anim.frame <= 3) {
    fillPx(ctx, tip - (dir > 0 ? 6 : 0), cy - 8, 6, 6, cTip);
    fillPx(ctx, tip - (dir > 0 ? 6 : 0), cy + 2, 6, 6, cTip);
  }
  // 余韵：身后残影条
  if (anim.frame >= 3) {
    fillPx(ctx, rear + dir * 2, cy - h * 0.25, Math.abs(len) * 0.5, h * 0.5, cMid);
  }
}

/** 侧踢：弧从短扫到满扫 */
function drawKick(ctx, box, w, h, dir, cCore, cEdge, cMid, cTip, tick, anim) {
  const cx = (box.left + box.right) / 2;
  const cy = (box.top + box.bottom) / 2;
  const rx = w * 0.55 * anim.grow;
  const ry = h * 0.48 * Math.max(0.5, anim.grow);
  const steps = Math.max(14, Math.floor(w / 2));
  // 扫过角度随帧变大
  const sweep =
    anim.frame === 0 ? 0.35 :
    anim.frame === 1 ? 0.7 :
    anim.frame === 2 ? 1.1 :
    anim.frame === 3 ? 1.0 :
    0.5;
  const ang0 = -sweep / 2;
  const passes = anim.frame >= 2 ? 2 : 1;

  for (let pass = 0; pass < passes; pass++) {
    const rScale = pass === 0 ? 1 : 0.72;
    const col = pass === 0 ? cEdge : cMid;
    // 余韵只画后半弧
    const i0 = anim.frame >= 3 ? Math.floor(steps * 0.45) : 0;
    for (let i = i0; i <= steps; i++) {
      const t = i / steps;
      const ang = ang0 + sweep * t;
      const ox = Math.cos(ang) * rx * rScale * dir;
      const oy = Math.sin(ang) * ry * rScale;
      const thick = 3 + Math.floor(Math.sin(t * Math.PI) * 7);
      fillPx(ctx, cx + ox - thick / 2, cy + oy - thick / 2, thick + 2, thick, col);
      if (pass === 0 && thick >= 6 && anim.frame <= 2) {
        fillPx(ctx, cx + ox - 2, cy + oy - 2, 4, 4, cCore);
      }
    }
  }
  if (anim.frame <= 3) {
    const tipX = cx + rx * dir;
    fillPx(ctx, tipX - 3, cy - 5, 7, 10, cTip);
  }
}

/** 劈斩：从上往下逐帧落下 */
function drawChop(ctx, box, w, h, dir, cCore, cEdge, cMid, cTip, tick, anim) {
  const cx = (box.left + box.right) / 2 + dir * w * 0.05;
  const top = box.top;
  const bot = box.bottom;
  const rx = w * 0.5;
  const steps = Math.max(16, Math.floor(h / 2));
  // 刃锋下落进度
  const fall =
    anim.frame === 0 ? 0.25 :
    anim.frame === 1 ? 0.55 :
    anim.frame === 2 ? 1 :
    anim.frame === 3 ? 1 :
    0.7;
  const iMax = Math.floor(steps * fall);
  const iMin = anim.frame >= 3 ? Math.floor(steps * 0.4) : 0;

  for (let pass = 0; pass < (anim.frame >= 1 ? 2 : 1); pass++) {
    const bendMul = pass === 0 ? 1 : 0.65;
    const col = pass === 0 ? cEdge : cMid;
    for (let i = iMin; i <= iMax; i++) {
      const t = i / steps;
      const y = top + (bot - top) * t;
      const bend = Math.sin(t * Math.PI) * rx * dir * bendMul * anim.grow;
      const thick = 4 + Math.floor((1 - Math.abs(t - 0.4) * 1.5) * 8);
      const x = cx + bend - (1 - t) * dir * 4;
      fillPx(ctx, x - thick / 2, y - 2, thick, 4, col);
      if (pass === 0 && thick >= 7 && anim.frame <= 2) fillPx(ctx, x - 2, y - 1, 4, 3, cCore);
    }
  }
  if (anim.frame === 0) fillPx(ctx, cx - dir * 6 - 3, top - 2, 10, 6, cTip);
  if (anim.frame >= 2) fillPx(ctx, cx + dir * 10, bot - 8, 6, 6, cCore);
}

/** 吸掌：波纹一圈圈推开 */
function drawPalm(ctx, box, w, h, dir, cCore, cEdge, cMid, cTip, tick, anim) {
  const tip = dir > 0 ? box.right - 2 : box.left + 2;
  const cy = (box.top + box.bottom) / 2;
  const rear = dir > 0 ? box.left : box.right;
  const waveCount =
    anim.frame === 0 ? 2 :
    anim.frame === 1 ? 3 :
    anim.frame === 2 ? 5 :
    anim.frame === 3 ? 4 :
    2;

  for (let wave = 0; wave < waveCount; wave++) {
    const t = (wave + anim.progress * 2) / Math.max(waveCount, 1);
    const tt = Math.min(0.95, 0.15 + t * 0.8 * anim.grow);
    const x = rear + (tip - rear) * tt;
    const halfH = h * (0.3 + tt * 0.55);
    const steps = Math.max(10, Math.floor(halfH / 1.5));
    const col = wave >= waveCount - 1 ? cCore : wave === 0 ? cMid : cEdge;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const yy = cy - halfH + u * halfH * 2;
      const curve = Math.sin(u * Math.PI) * (6 + wave * 2) * dir;
      fillPx(ctx, x + curve - 2, yy, 4, 3, col);
    }
  }
  if (anim.frame <= 3) fillPx(ctx, tip - 3, cy - 6, 6, 12, cTip);
}

/** 升龙柱：整条竖向气柱从下往上冲，带螺旋碎点（上段专用） */
function drawRise(ctx, box, w, h, dir, cCore, cEdge, cMid, cTip, tick, anim) {
  const cx = (box.left + box.right) / 2 + dir * 4;
  const bot = box.bottom;
  const top = box.top;
  const rise =
    anim.frame === 0 ? 0.25 :
    anim.frame === 1 ? 0.55 :
    anim.frame === 2 ? 1 :
    anim.frame === 3 ? 1 :
    0.7;
  const yTop = bot - (bot - top) * rise * anim.grow;
  const steps = Math.max(16, Math.floor(h / 2));

  // 主气柱（竖条）
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = bot - (bot - yTop) * t;
    if (y < yTop) break;
    const thick = 6 + Math.floor((1 - t) * 10);
    const wobble = Math.sin(t * Math.PI * 3 + anim.progress * 6) * 5 * dir;
    fillPx(ctx, cx + wobble - thick / 2, y - 2, thick, 4, t > 0.7 ? cCore : cEdge);
    if (t > 0.4) fillPx(ctx, cx + wobble - 2, y - 1, 4, 2, cMid);
  }

  // 螺旋碎点向上飞
  const sparks = 6 + anim.frame;
  for (let i = 0; i < sparks; i++) {
    const t = (i / sparks + anim.progress * 0.5) % 1;
    const y = bot - (bot - yTop) * t;
    const ang = t * Math.PI * 4 + tick * 0.2;
    const ox = Math.cos(ang) * (8 + t * 14) * dir;
    fillPx(ctx, cx + ox, y, 3, 3, i % 2 ? cTip : cCore);
  }

  // 顶端爆发
  if (anim.frame >= 1) {
    fillPx(ctx, cx - 8, yTop - 6, 16, 8, cTip);
    fillPx(ctx, cx - 4, yTop - 12, 8, 6, cCore);
    fillPx(ctx, cx + dir * 10, yTop, 5, 5, cEdge);
    fillPx(ctx, cx - dir * 8, yTop + 4, 4, 4, cMid);
  }
}

/** 旧 upper 保留为 rise 别名逻辑已合并 */
function drawUpper(ctx, box, w, h, dir, cCore, cEdge, cMid, cTip, tick, anim) {
  drawRise(ctx, box, w, h, dir, cCore, cEdge, cMid, cTip, tick, anim);
}

/** 贴地扫：沿地面横扫 + 扬尘碎块（下段专用） */
function drawSweep(ctx, box, w, h, dir, cCore, cEdge, cMid, cTip, tick, anim) {
  const ground = box.bottom - 2;
  const rear = dir > 0 ? box.left : box.right;
  const tipFull = dir > 0 ? box.right : box.left;
  const extend =
    anim.frame === 0 ? 0.35 :
    anim.frame === 1 ? 0.7 :
    anim.frame === 2 ? 1 :
    anim.frame === 3 ? 0.95 :
    0.5;
  const tip = rear + (tipFull - rear) * extend * anim.grow;
  const len = Math.abs(tip - rear);
  const steps = Math.max(12, Math.floor(len / 3));

  // 贴地刃带（很扁）
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = rear + (tip - rear) * t;
    const thick = 3 + Math.floor(Math.sin(t * Math.PI) * 5);
    fillPx(ctx, x - 2, ground - thick, 5, thick + 1, t > 0.7 ? cCore : cEdge);
    fillPx(ctx, x - 1, ground - 1, 4, 2, cMid);
  }

  // 扬尘：地面小方块蹦起
  const dustN = 5 + anim.frame * 2;
  for (let i = 0; i < dustN; i++) {
    const t = i / dustN;
    const x = rear + (tip - rear) * t;
    const hop = (4 + (i % 3) * 3) * Math.sin((t + anim.progress) * Math.PI);
    const s = 2 + (i % 3);
    fillPx(ctx, x + dir * 2, ground - hop - s, s, s, i % 2 ? cMid : cEdge);
  }

  // 前缘冲击
  if (anim.frame >= 1 && anim.frame <= 3) {
    fillPx(ctx, tip - (dir > 0 ? 4 : 0), ground - 10, 6, 10, cTip);
    fillPx(ctx, tip + dir * 4, ground - 6, 4, 4, cCore);
  }

  // 地面裂痕线
  if (anim.frame >= 2) {
    for (let i = 0; i < 4; i++) {
      const x = rear + (tip - rear) * (0.2 + i * 0.2);
      fillPx(ctx, x, ground + 1, 8, 2, cMid);
    }
  }
}

/** 回旋：完整圆环气刃绕身扫过（空中专用） */
function drawSpin(ctx, box, w, h, dir, cCore, cEdge, cMid, cTip, tick, anim) {
  const cx = (box.left + box.right) / 2;
  const cy = (box.top + box.bottom) / 2;
  const rx = w * 0.55 * anim.grow;
  const ry = h * 0.5 * anim.grow;
  const steps = Math.max(20, Math.floor((w + h) / 2.5));
  // 扫过角度随帧增加（像旋转）
  const sweep =
    anim.frame === 0 ? Math.PI * 0.6 :
    anim.frame === 1 ? Math.PI * 1.2 :
    anim.frame === 2 ? Math.PI * 2 :
    anim.frame === 3 ? Math.PI * 1.7 :
    Math.PI * 0.9;
  const startAng = -Math.PI / 2 + anim.progress * dir * 0.8;

  for (let pass = 0; pass < 2; pass++) {
    const scale = pass === 0 ? 1 : 0.72;
    const col = pass === 0 ? cEdge : cMid;
    const iMax = Math.floor(steps * (sweep / (Math.PI * 2)));
    for (let i = 0; i <= iMax; i++) {
      const t = i / steps;
      const ang = startAng + sweep * t * dir;
      const ox = Math.cos(ang) * rx * scale;
      const oy = Math.sin(ang) * ry * scale;
      const thick = 3 + Math.floor(Math.sin(t * Math.PI) * 6);
      fillPx(ctx, cx + ox - thick / 2, cy + oy - thick / 2, thick, thick, col);
      if (pass === 0 && thick >= 6 && anim.frame <= 2) {
        fillPx(ctx, cx + ox - 2, cy + oy - 2, 3, 3, cCore);
      }
    }
  }

  // 旋转残影点
  if (anim.frame >= 1) {
    for (let i = 0; i < 4; i++) {
      const ang = startAng + (sweep * i) / 4 * dir;
      fillPx(ctx, cx + Math.cos(ang) * rx, cy + Math.sin(ang) * ry, 4, 4, cTip);
    }
  }
}

/** 俯冲：斜向大型冲击带从头顶砸向脚前（空中终段） */
function drawDive(ctx, box, w, h, dir, cCore, cEdge, cMid, cTip, tick, anim) {
  const x0 = dir > 0 ? box.left : box.right;
  const y0 = box.top;
  const x1 = dir > 0 ? box.right : box.left;
  const y1 = box.bottom;
  const extend =
    anim.frame === 0 ? 0.3 :
    anim.frame === 1 ? 0.65 :
    anim.frame === 2 ? 1 :
    anim.frame === 3 ? 1 :
    0.55;
  const steps = Math.max(16, Math.floor((w + h) / 3));
  const iMax = Math.floor(steps * extend * anim.grow);

  for (let pass = 0; pass < 2; pass++) {
    const col = pass === 0 ? cEdge : cMid;
    const fat = pass === 0 ? 1 : 0.55;
    for (let i = 0; i <= iMax; i++) {
      const t = i / steps;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      const thick = Math.floor((5 + t * 10) * fat);
      fillPx(ctx, x - thick / 2, y - thick / 2, thick + 2, thick, col);
      if (pass === 0 && t > 0.6) fillPx(ctx, x - 2, y - 2, 4, 4, cCore);
    }
  }

  // 落点冲击
  if (anim.frame >= 2) {
    fillPx(ctx, x1 - 10, y1 - 8, 20, 8, cTip);
    fillPx(ctx, x1 - 6, y1 - 14, 12, 6, cCore);
    for (let i = 0; i < 5; i++) {
      const ang = Math.PI + (i / 4) * Math.PI;
      fillPx(ctx, x1 + Math.cos(ang) * 12, y1 + Math.sin(ang) * 6, 3, 3, cEdge);
    }
  }
}

function drawSlash(ctx, box, w, h, dir, cCore, cEdge, cMid, cTip, anim) {
  const cx = (box.left + box.right) / 2;
  const cy = (box.top + box.bottom) / 2;
  const rx = w * 0.55 * anim.grow;
  const ry = h * 0.5 * anim.grow;
  const steps = Math.max(14, Math.floor((w + h) / 3));
  const span =
    anim.frame === 0 ? 0.35 :
    anim.frame === 1 ? 0.65 :
    1;
  const iMax = Math.floor(steps * span);
  const iMin = anim.frame >= 3 ? Math.floor(steps * 0.4) : 0;

  for (let pass = 0; pass < (anim.frame >= 1 ? 2 : 1); pass++) {
    const s = pass === 0 ? 1 : 0.75;
    const col = pass === 0 ? cEdge : cMid;
    for (let i = iMin; i <= iMax; i++) {
      const t = i / steps;
      const ang = -Math.PI / 2 + Math.PI * t;
      const ox = Math.cos(ang) * rx * s * dir;
      const oy = Math.sin(ang) * ry * s;
      const thick = 3 + Math.floor(Math.sin(t * Math.PI) * 7);
      fillPx(ctx, cx + ox - thick / 2, cy + oy - thick / 2, thick, thick, col);
      if (pass === 0 && thick >= 6 && anim.frame <= 2) fillPx(ctx, cx + ox - 2, cy + oy - 2, 4, 4, cCore);
    }
  }
  if (anim.frame <= 3) fillPx(ctx, cx + rx * dir - 3, cy - 3, 6, 6, cTip);
}

/** 近战命中：冲击星 + 短气浪环 */
export function spawnShockwave(list, x, y, color = "#ffe840") {
  list.push({
    type: "hitstar",
    x: px(x),
    y: px(y),
    color,
    life: 10,
    maxLife: 10,
  });
  list.push({
    type: "ring",
    x: px(x),
    y: px(y),
    color,
    life: 12,
    maxLife: 12,
    r: 6,
    grow: 2.2,
  });
  for (let i = 0; i < 4; i++) {
    const ang = (Math.PI / 2) * i + Math.PI / 4;
    list.push({
      type: "streak",
      x: px(x),
      y: px(y),
      ang,
      len: 6,
      color: i % 2 ? "#ffffff" : color,
      life: 8,
      maxLife: 8,
    });
  }
}

/** 远战命中：同心爆开 + 放射碎块 */
export function spawnExplosion(list, x, y, color = "#ff8040", size = 16) {
  const cx = px(x);
  const cy = px(y);
  list.push({
    type: "burst",
    x: cx,
    y: cy,
    color,
    life: 14,
    maxLife: 14,
    r: Math.max(8, size * 0.35),
  });
  list.push({
    type: "ring",
    x: cx,
    y: cy,
    color: "#ffffff",
    life: 12,
    maxLife: 12,
    r: 4,
    grow: 3.5,
  });
  list.push({
    type: "ring",
    x: cx,
    y: cy,
    color,
    life: 14,
    maxLife: 14,
    r: 2,
    grow: 2.8,
  });
  for (let i = 0; i < 8; i++) {
    const ang = (Math.PI * 2 * i) / 8;
    list.push({
      type: "spark",
      x: cx,
      y: cy,
      vx: Math.cos(ang) * 3.2,
      vy: Math.sin(ang) * 3.2,
      color: i % 2 ? "#ffffff" : color,
      life: 11,
      maxLife: 11,
      size: 3,
    });
  }
}

export function updateFx(list) {
  for (let i = list.length - 1; i >= 0; i--) {
    const f = list[i];
    f.life--;
    if (f.type === "ring") {
      f.r += f.grow;
    } else if (f.type === "burst") {
      f.r += 2.5;
    } else if (f.type === "streak") {
      f.len += 2.5;
    } else if (f.type === "spark") {
      f.x += f.vx;
      f.y += f.vy;
      f.vx *= 0.88;
      f.vy *= 0.88;
    } else if (f.type === "floatText") {
      f.y += f.vy || -1.2;
    }
    if (f.life <= 0) list.splice(i, 1);
  }
}

export function drawFx(ctx, list) {
  for (const f of list) {
    const a = Math.max(0, f.life / f.maxLife);
    if (f.type === "hitstar") {
      drawHitStar(ctx, f.x, f.y, f.color, a, f.maxLife - f.life);
    } else if (f.type === "ring") {
      drawSoftRing(ctx, f.x, f.y, f.r, f.color, a);
    } else if (f.type === "burst") {
      drawBurstCore(ctx, f.x, f.y, f.r, f.color, a);
    } else if (f.type === "streak") {
      drawStreak(ctx, f.x, f.y, f.ang, f.len, f.color, a);
    } else if (f.type === "spark") {
      fillPx(ctx, f.x, f.y, f.size, f.size, withAlpha(f.color, a));
      fillPx(ctx, f.x + 1, f.y + 1, 1, 1, withAlpha("#ffffff", a));
    } else if (f.type === "floatText") {
      pixelText(ctx, f.text, f.x, f.y, f.color, 14, "center");
    }
  }
}

function drawHitStar(ctx, x, y, color, a, age) {
  const s = 3 + Math.min(4, age);
  fillPx(ctx, x - 1, y - s, 2, s * 2, withAlpha("#ffffff", a));
  fillPx(ctx, x - s, y - 1, s * 2, 2, withAlpha("#ffffff", a));
  const d = Math.floor(s * 0.7);
  fillPx(ctx, x - d, y - d, 2, 2, withAlpha(color, a));
  fillPx(ctx, x + d - 1, y - d, 2, 2, withAlpha(color, a));
  fillPx(ctx, x - d, y + d - 1, 2, 2, withAlpha(color, a));
  fillPx(ctx, x + d - 1, y + d - 1, 2, 2, withAlpha(color, a));
  fillPx(ctx, x - 1, y - 1, 2, 2, withAlpha(color, a * 0.9));
}

function drawSoftRing(ctx, cx, cy, r, color, a) {
  if (r < 2) return;
  const steps = Math.max(16, Math.floor(r * 2.2));
  const col = withAlpha(color, a * 0.85);
  const col2 = withAlpha("#ffffff", a * 0.35);
  for (let i = 0; i < steps; i++) {
    const ang = (Math.PI * 2 * i) / steps;
    const x = cx + Math.cos(ang) * r;
    const y = cy + Math.sin(ang) * r;
    fillPx(ctx, x - 1, y - 1, 2, 2, col);
    if (i % 2 === 0 && r > 8) {
      fillPx(ctx, cx + Math.cos(ang) * (r - 3), cy + Math.sin(ang) * (r - 3), 1, 1, col2);
    }
  }
}

function drawBurstCore(ctx, cx, cy, r, color, a) {
  const layers = [
    { s: r, c: withAlpha("#ffffff", a) },
    { s: r * 0.65, c: withAlpha(color, a) },
    { s: r * 0.35, c: withAlpha("#fff5c0", a) },
  ];
  for (const L of layers) drawDiamond(ctx, cx, cy, L.s, L.c);
}

function drawDiamond(ctx, cx, cy, r, color) {
  const rr = Math.max(2, Math.floor(r));
  for (let dy = -rr; dy <= rr; dy++) {
    const half = rr - Math.abs(dy);
    if (half <= 0) continue;
    fillPx(ctx, cx - half, cy + dy, half * 2, 1, color);
  }
}

function drawStreak(ctx, x, y, ang, len, color, a) {
  const steps = Math.max(3, Math.floor(len / 2));
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    fillPx(
      ctx,
      x + Math.cos(ang) * len * t,
      y + Math.sin(ang) * len * t,
      i < 2 ? 3 : 2,
      i < 2 ? 3 : 2,
      withAlpha(i === 0 ? "#ffffff" : color, a * (1 - t * 0.5))
    );
  }
}

function withAlpha(hex, a) {
  if (typeof hex === "string" && hex.startsWith("rgba")) return hex;
  const n = String(hex).replace("#", "");
  const full = n.length === 3 ? n.split("").map((c) => c + c).join("") : n;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`;
}
