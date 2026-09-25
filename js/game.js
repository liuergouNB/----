import { Fighter, drawHud, GROUND_Y, WORLD_W, PALETTE_P1, PALETTE_P2 } from "./fighter.js";
import { makeAIController } from "./ai.js";
import { prepPixelCtx, fillPx, pixelText } from "./pixel.js";
import { loadSettings } from "./settings.js";
import {
  spawnShockwave,
  spawnExplosion,
  updateFx,
  drawFx,
} from "./fx.js";

const INTRO_BEATS = [
  { text: "3", frames: 40, color: "#f4e8c1" },
  { text: "2", frames: 40, color: "#f4e8c1" },
  { text: "1", frames: 40, color: "#f4e8c1" },
  { text: "FIGHT!", frames: 50, color: "#e8b020" },
];

export class Game {
  constructor(canvas, input) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    prepPixelCtx(this.ctx);
    this.input = input;
    this.mode = "pvp";
    this.running = false;
    this.ended = false;
    this.winner = null;
    this.projectiles = [];
    this.fx = [];
    this.petals = [];
    this.worldW = WORLD_W;
    this.arena = { left: 60, right: WORLD_W - 60 };
    this.camX = 0;
    this.camY = 0;
    this.onEnd = null;
    this._raf = 0;
    this.tick = 0;
    this.settings = loadSettings();
    this.p1 = null;
    this.p2 = null;
    this.intro = null;
    this.hitstop = 0;
    this.shake = 0;
    this.koFlash = 0;
    this.finishText = null;
    this.finishTimer = 0;
  }

  start(mode) {
    this.settings = loadSettings();
    this.mode = mode;
    this.ended = false;
    this.winner = null;
    this.projectiles = [];
    this.fx = [];
    this.tick = 0;
    this.hitstop = 0;
    this.shake = 0;
    this.koFlash = 0;
    this.finishText = null;
    this.finishTimer = 0;
    this._endReported = false;
    this.intro = { beat: 0, timer: INTRO_BEATS[0].frames };
    this.petals = makePetals(48, this.worldW, this.canvas.height);

    const mid = this.worldW / 2;
    const hp = this.settings.maxHp;
    this.p1 = new Fighter({
      x: mid - 180,
      facing: 1,
      color: "#e04040",
      name: "P1",
      palette: PALETTE_P1,
      maxHp: hp,
      settings: this.settings,
    });
    this.p2 = new Fighter({
      x: mid + 180,
      facing: -1,
      color: "#3080e0",
      name: mode === "pve" ? "CPU" : "P2",
      palette: PALETTE_P2,
      maxHp: hp,
      settings: this.settings,
    });
    this.camX = mid - this.canvas.width / 2;
    this.camY = 0;
    this.running = true;
    cancelAnimationFrame(this._raf);
    const loop = () => {
      if (!this.running) return;
      this.update();
      this.draw();
      this.input.endFrame();
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this._raf);
  }

  inIntro() {
    return !!this.intro;
  }

  update() {
    this.tick++;
    if (this.shake > 0) this.shake--;
    if (this.koFlash > 0) this.koFlash--;
    updatePetals(this.petals, this.worldW, this.canvas.height);
    this.updateCamera();

    // 开场倒计时：角色站桩，不接收操作
    if (this.intro) {
      this.intro.timer--;
      if (this.intro.timer <= 0) {
        this.intro.beat++;
        if (this.intro.beat >= INTRO_BEATS.length) {
          this.intro = null;
          this.shake = 10;
        } else {
          this.intro.timer = INTRO_BEATS[this.intro.beat].frames;
        }
      }
      updateFx(this.fx);
      return;
    }

    if (this.ended) {
      if (this.finishTimer > 0) this.finishTimer--;
      else if (!this._endReported) {
        this._endReported = true;
        this.onEnd?.(this.winner);
      }
      updateFx(this.fx);
      return;
    }

    if (this.hitstop > 0) {
      this.hitstop--;
      updateFx(this.fx);
      return;
    }

    const c1 = this.input.snapshot("p1");
    const c2 =
      this.mode === "pve"
        ? makeAIController(this.p2, this.p1)
        : this.input.snapshot("p2");

    const proj1 = this.p1.update(c1, this.arena);
    const proj2 = this.p2.update(c2, this.arena);
    if (proj1) this.projectiles.push(proj1);
    if (proj2) this.projectiles.push(proj2);

    if (this.p1.isSolid() && this.p2.isSolid()) {
      this.separate(this.p1, this.p2);
    }

    this.resolveMelee(this.p1, this.p2);
    this.resolveMelee(this.p2, this.p1);
    this.updateProjectiles();
    updateFx(this.fx);

    // 连击超时衰减
    this.p1.tickCombo();
    this.p2.tickCombo();

    if (!this.p1.alive() || !this.p2.alive()) {
      this.ended = true;
      this.koFlash = 24;
      this.shake = 18;
      if (!this.p1.alive() && !this.p2.alive()) {
        this.winner = "DRAW!";
        this.finishText = "DOUBLE KO";
      } else if (!this.p1.alive()) {
        this.winner = `${this.p2.name} WIN!`;
        this.finishText = "K.O.";
      } else {
        this.winner = `${this.p1.name} WIN!`;
        this.finishText = "K.O.";
      }
      this.finishTimer = 70;
      this._endReported = false;
    }
  }

  updateCamera() {
    if (!this.p1 || !this.p2) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const midX = (this.p1.x + this.p2.x) / 2;
    const midY = (this.p1.y + this.p2.y) / 2;
    // 目标：两人中点居中；跳很高时镜头略上抬
    let targetX = midX - w / 2;
    let targetY = Math.min(0, midY - h * 0.62);
    const maxX = Math.max(0, this.worldW - w);
    const maxY = 0;
    const minY = -120;
    targetX = Math.max(0, Math.min(maxX, targetX));
    targetY = Math.max(minY, Math.min(maxY, targetY));
    this.camX += (targetX - this.camX) * 0.14;
    this.camY += (targetY - this.camY) * 0.1;
  }

  separate(a, b) {
    const overlap = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const yOverlap = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (overlap > 0 && yOverlap > 0) {
      const push = overlap / 2 + 0.5;
      if (a.x <= b.x) {
        a.x -= push;
        b.x += push;
      } else {
        a.x += push;
        b.x -= push;
      }
    }
  }

  onLandedHit(attacker, defender, ix, iy, blocked) {
    attacker.registerComboHit();
    defender.resetCombo();
    const power = blocked ? 3 : Math.min(14, 5 + attacker.combo * 1.2);
    this.hitstop = blocked ? 2 : Math.min(10, 3 + Math.floor(attacker.combo / 2));
    this.shake = Math.max(this.shake, power);
    spawnShockwave(this.fx, ix, iy, attacker.palette.Y || "#ffe840");
    // 飘字伤害感：连击数字
    if (!blocked && attacker.combo >= 2) {
      this.fx.push({
        type: "floatText",
        x: ix,
        y: iy - 20,
        text: `${attacker.combo} HIT!`,
        color: attacker.combo >= 5 ? "#ffe840" : "#ffffff",
        life: 28,
        maxLife: 28,
        vy: -1.2,
      });
    }
  }

  resolveMelee(attacker, defender) {
    if (attacker.state !== "attack" || !defender.isSolid()) return;
    if (attacker.isGhost() && attacker.state === "dash") return;
    const box = attacker.getAttackBox();
    if (!box || attacker.moveHit) return;
    if (rectsOverlap(box, bodyBox(defender))) {
      attacker.moveHit = true;
      const wasDef = defender.defending && defender.state === "idle";
      const landed = defender.takeHit({
        damage: box.damage,
        knock: box.knock,
        launch: box.launch,
        stun: box.stun,
        hitKey: box.hitKey,
        defendable: true,
      });
      if (landed) {
        const ix = (Math.max(box.left, defender.left) + Math.min(box.right, defender.right)) / 2;
        const iy = (Math.max(box.top, defender.top) + Math.min(box.bottom, defender.bottom)) / 2;
        this.onLandedHit(attacker, defender, ix, iy, wasDef);
      }
    }
  }

  updateProjectiles() {
    const next = [];
    for (const p of this.projectiles) {
      p.x += p.vx;
      p.y += p.vy || 0;
      p.life--;
      if (p.life <= 0) continue;
      if (p.x < this.arena.left - 40 || p.x > this.arena.right + 40) continue;

      const target = p.owner === this.p1 ? this.p2 : this.p1;
      if (!target.isSolid()) {
        next.push(p);
        continue;
      }

      const hit =
        p.x + p.r > target.left &&
        p.x - p.r < target.right &&
        p.y + p.r > target.top &&
        p.y - p.r < target.bottom;

      if (hit) {
        const wasDef = target.defending && target.state === "idle";
        const landed = target.takeHit({
          damage: p.damage,
          knock: p.knock,
          launch: p.launch ?? 3,
          stun: p.stun,
          hitKey: p.hitKey,
          defendable: true,
        });
        if (landed) {
          const col = p.owner === this.p1 ? "#ff6040" : "#40a0ff";
          spawnExplosion(this.fx, p.x, p.y, col, Math.max(18, p.r * 2.5));
          this.onLandedHit(p.owner, target, p.x, p.y, wasDef);
          continue;
        }
      }
      next.push(p);
    }
    this.projectiles = next;
  }

  draw() {
    const { ctx, canvas } = this;
    prepPixelCtx(ctx);
    const w = canvas.width;
    const h = canvas.height;

    const shakeX = this.shake > 0 ? (((Math.random() * 2 - 1) * Math.min(10, this.shake * 0.7)) | 0) : 0;
    const shakeY = this.shake > 0 ? (((Math.random() * 2 - 1) * Math.min(10, this.shake * 0.7)) | 0) : 0;
    const camX = Math.round(this.camX) - shakeX;
    const camY = Math.round(this.camY) - shakeY;

    // ===== 世界层（大地图 + 角色）=====
    ctx.save();
    ctx.translate(-camX, -camY);

    this.drawStage(ctx, this.worldW, h);
    drawPetals(ctx, this.petals);

    for (const p of this.projectiles) {
      const c = p.owner === this.p1 ? "#ff6040" : "#40a0ff";
      const r = p.r;
      for (let dy = -r; dy <= r; dy++) {
        const half = r - Math.abs(dy);
        if (half <= 0) continue;
        fillPx(ctx, p.x - half, p.y + dy, half * 2, 1, c);
      }
      const r2 = Math.max(2, Math.floor(r * 0.45));
      for (let dy = -r2; dy <= r2; dy++) {
        const half = r2 - Math.abs(dy);
        if (half <= 0) continue;
        fillPx(ctx, p.x - half, p.y + dy, half * 2, 1, "#ffffff");
      }
    }

    this.p1.draw(ctx);
    this.p2.draw(ctx);
    drawFx(ctx, this.fx);
    ctx.restore();

    // ===== 屏幕 UI =====
    this.drawDangerVignette(ctx, w, h);
    drawHud(ctx, this.p1, this.p2, w);

    pixelText(
      ctx,
      this.mode === "pve" ? "VS CPU  ESC=MENU" : "1P VS 2P  ESC=MENU",
      w / 2,
      h - 22,
      "#8a7050",
      11,
      "center"
    );

    if (this.intro) {
      const beat = INTRO_BEATS[this.intro.beat];
      const pulse = 1 + Math.sin(this.intro.timer * 0.35) * 0.08;
      const size = beat.text.length > 2 ? 42 * pulse : 56 * pulse;
      fillPx(ctx, 0, 0, w, h, "rgba(0,0,0,0.28)");
      pixelText(ctx, beat.text, w / 2, h * 0.42, beat.color, size, "center");
      if (beat.text === "FIGHT!") {
        pixelText(ctx, "READY?", w / 2, h * 0.42 - 48, "#f4e8c1", 16, "center");
      }
    }

    if (this.finishText && this.finishTimer > 0) {
      const a = Math.min(1, this.finishTimer / 20);
      fillPx(ctx, 0, 0, w, h, `rgba(20,8,0,${0.35 * a})`);
      pixelText(ctx, this.finishText, w / 2, h * 0.4, "#ffe840", 48, "center");
      if (this.winner) {
        pixelText(ctx, this.winner, w / 2, h * 0.4 + 52, "#f4e8c1", 18, "center");
      }
    }

    if (this.koFlash > 0 && this.koFlash % 4 < 2) {
      fillPx(ctx, 0, 0, w, h, "rgba(255,240,200,0.25)");
    }
  }

  drawDangerVignette(ctx, w, h) {
    const low1 = this.p1.hp / this.p1.maxHp < 0.28;
    const low2 = this.p2.hp / this.p2.maxHp < 0.28;
    if (!low1 && !low2) return;
    const pulse = 0.12 + Math.sin(this.tick * 0.15) * 0.06;
    if (low1) {
      fillPx(ctx, 0, 0, 80, h, `rgba(180,20,20,${pulse})`);
    }
    if (low2) {
      fillPx(ctx, w - 80, 0, 80, h, `rgba(180,20,20,${pulse})`);
    }
    if (low1 || low2) {
      fillPx(ctx, 0, 0, w, 40, `rgba(120,10,10,${pulse * 0.7})`);
      fillPx(ctx, 0, h - 40, w, 40, `rgba(120,10,10,${pulse * 0.7})`);
    }
  }

  drawStage(ctx, worldW, h) {
    // 天空（随镜头拉宽）
    const bands = [
      { h: 90, c: "#1a2048" },
      { h: 70, c: "#2a3060" },
      { h: 70, c: "#3a4068" },
      { h: 55, c: "#7a4848" },
      { h: 45, c: "#c06040" },
      { h: Math.max(20, GROUND_Y - 330), c: "#e88840" },
    ];
    let y = 0;
    for (const b of bands) {
      fillPx(ctx, 0, y, worldW, b.h, b.c);
      y += b.h;
    }
    if (y < GROUND_Y) fillPx(ctx, 0, y, worldW, GROUND_Y - y, "#e89850");

    // 远山（多段铺满大地图，轻微视差感用 cam 偏移在调用侧）
    for (let i = 0; i < Math.ceil(worldW / 160) + 2; i++) {
      const mx = i * 160 - 40 + Math.sin((this.tick + i * 40) * 0.008) * 6;
      const mh = 50 + (i % 3) * 22;
      fillPx(ctx, mx, GROUND_Y - mh - 40, 150, mh, "#1a2038");
      fillPx(ctx, mx + 40, GROUND_Y - mh - 70, 70, 40, "#181e30");
    }

    // 太阳（世界中偏右）
    const sunX = worldW * 0.72;
    const sunY = 110;
    fillPx(ctx, sunX, sunY, 56, 56, "#ffc060");
    fillPx(ctx, sunX + 8, sunY + 8, 40, 40, "#ffe090");
    fillPx(ctx, sunX + 16, sunY + 16, 24, 24, "#fff5c0");

    // 多座鸟居 / 灯笼铺开
    const toriiXs = [480, 1100, 1750, 2400, 2900];
    for (const tx of toriiXs) {
      drawTorii(ctx, tx, GROUND_Y - 8, 1.05 + (tx % 200) * 0.0004);
    }
    for (let x = 100; x < worldW; x += 420) {
      drawLantern(ctx, x, GROUND_Y, this.tick + x * 0.05);
      drawLantern(ctx, x + 200, GROUND_Y, this.tick + x * 0.05 + 20);
    }

    // 地面
    fillPx(ctx, 0, GROUND_Y, worldW, h - GROUND_Y + 140, "#2a1810");
    fillPx(ctx, 0, GROUND_Y, worldW, 16, "#3a2820");
    fillPx(ctx, 0, GROUND_Y, worldW, 6, "#5a4030");
    for (let x = 0; x < worldW; x += 28) {
      fillPx(ctx, x, GROUND_Y + 18, 24, 14, "#342018");
      fillPx(ctx, x + 2, GROUND_Y + 20, 20, 4, "#403028");
    }
    fillPx(ctx, 0, GROUND_Y - 4, worldW, 4, "rgba(255,160,60,0.35)");
    fillPx(ctx, this.arena.left, GROUND_Y - 2, this.arena.right - this.arena.left, 2, "#1a1008");

    // 近景草
    for (let x = 20; x < worldW; x += 18) {
      const gh = 6 + ((x * 3 + this.tick) % 5);
      fillPx(ctx, x, GROUND_Y - gh, 2, gh, "#4a6830");
    }

    // 地图边界柱
    fillPx(ctx, this.arena.left - 16, GROUND_Y - 120, 12, 120, "#4a3020");
    fillPx(ctx, this.arena.right + 4, GROUND_Y - 120, 12, 120, "#4a3020");
  }
}

function makePetals(n, w, h) {
  const list = [];
  for (let i = 0; i < n; i++) {
    list.push({
      x: Math.random() * w,
      y: Math.random() * h * 0.7,
      vx: 0.4 + Math.random() * 0.8,
      vy: 0.3 + Math.random() * 0.6,
      s: 2 + (Math.random() * 3) | 0,
      phase: Math.random() * 100,
    });
  }
  return list;
}

function updatePetals(list, w, h) {
  for (const p of list) {
    p.phase++;
    p.x += p.vx + Math.sin(p.phase * 0.05) * 0.4;
    p.y += p.vy;
    if (p.y > GROUND_Y + 10 || p.x > w + 10) {
      p.x = Math.random() * w;
      p.y = -10 - Math.random() * 80;
    }
  }
}

function drawPetals(ctx, list) {
  for (const p of list) {
    const a = 0.45 + Math.sin(p.phase * 0.1) * 0.2;
    fillPx(ctx, p.x, p.y, p.s + 1, p.s, `rgba(255,160,170,${a})`);
    fillPx(ctx, p.x + 1, p.y + 1, Math.max(1, p.s - 1), Math.max(1, p.s - 1), `rgba(255,220,220,${a})`);
  }
}

function drawTorii(ctx, cx, baseY, scale) {
  const s = scale;
  const w = 160 * s;
  const h = 120 * s;
  const x = cx - w / 2;
  const y = baseY - h;
  // 柱
  fillPx(ctx, x + 18 * s, y + 30 * s, 16 * s, 90 * s, "#8a2020");
  fillPx(ctx, x + w - 34 * s, y + 30 * s, 16 * s, 90 * s, "#8a2020");
  // 横梁
  fillPx(ctx, x, y + 20 * s, w, 14 * s, "#a02828");
  fillPx(ctx, x + 10 * s, y + 42 * s, w - 20 * s, 10 * s, "#901818");
  // 顶梁翘角
  fillPx(ctx, x - 8 * s, y + 8 * s, w + 16 * s, 12 * s, "#b03030");
  fillPx(ctx, x - 12 * s, y + 4 * s, 20 * s, 10 * s, "#b03030");
  fillPx(ctx, x + w - 8 * s, y + 4 * s, 20 * s, 10 * s, "#b03030");
  // 高光
  fillPx(ctx, x + 20 * s, y + 32 * s, 4 * s, 40 * s, "#c05050");
}

function drawLantern(ctx, x, baseY, tick) {
  const flicker = tick % 8 < 4;
  fillPx(ctx, x - 6, baseY - 50, 12, 50, "#3a3028");
  fillPx(ctx, x - 16, baseY - 70, 32, 28, "#4a3830");
  fillPx(ctx, x - 12, baseY - 66, 24, 20, flicker ? "#ffb040" : "#e89030");
  fillPx(ctx, x - 6, baseY - 60, 12, 10, flicker ? "#fff0a0" : "#ffd060");
  fillPx(ctx, x - 18, baseY - 74, 36, 6, "#2a2018");
  fillPx(ctx, x - 18, baseY - 44, 36, 6, "#2a2018");
}

function bodyBox(f) {
  return { left: f.left, right: f.right, top: f.top, bottom: f.bottom };
}

function rectsOverlap(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}
