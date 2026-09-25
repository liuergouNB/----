import { drawSprite, fillPx, strokePx, pixelText } from "./pixel.js";
import * as SPR from "./sprites.js";
import { MOVES, moveId, nextAttack, nextSkill, resolveModule, resolveChainMod, starterAttack, starterSkill, isAttackMove, isSkillMove } from "./moves.js";
import { drawSwingFx } from "./fx.js";

const GROUND_Y = 460;
const GRAVITY = 0.72;
const MOVE_SPEED = 4.2;
const JUMP_V = -19.5;         // 一段跳（更高）
const DOUBLE_JUMP_V = -16.5;  // 二段跳
const MAX_JUMPS = 2;
const DASH_SPEED = 18;
const AIR_DASH_SPEED = 16;
const DASH_FRAMES = 12;
const PHASE_EXTRA = 10;
const DASH_COOLDOWN = 36;
const DASH_CHAIN_CD = 6;      // 闪现取消闪现：几乎无后摇
const DASH_FROM_ATK_CD = 14;  // 攻击取消闪现：短 CD
const DASH_CANCEL_FROM = 4;   // 闪现第几帧起可取消
const SPRITE_SCALE = SPR.SCALE;

/** 大地图宽度（BVN 风格） */
export const WORLD_W = 3200;

let nextProjectileId = 1;

export class Fighter {
  constructor({ x, facing, color, name, maxHp = 100, palette, settings }) {
    this.x = x;
    this.y = GROUND_Y;
    this.w = SPR.COLS * SPRITE_SCALE;
    this.h = SPR.ROWS * SPRITE_SCALE;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.color = color;
    this.palette = palette;
    this.name = name;
    this.settings = settings;
    this.maxHp = maxHp;
    this.hp = maxHp;

    this.onGround = true;
    this.defending = false;
    /** idle | move | attack | dash | stun | down | wakeup | dead */
    this.state = "idle";
    this.stateTimer = 0;
    this.moveName = null; // atk1 / skl2 ...
    this.moveHit = false;
    this.shotDone = false;
    this.invuln = 0;
    this.dashCd = 0;
    this.animTick = 0;
    this.landTimer = 0;
    this.wasAir = false;
    this.moving = false;
    this.jumpsLeft = MAX_JUMPS;
    this.phaseTimer = 0;
    this.afterimages = [];
    /** 连点缓冲：招式中途按下，到衔接帧自动接下一段 */
    this.bufAttack = false;
    this.bufSkill = false;
    /** 方向模组缓冲（按过 W/S 后短时间内仍生效） */
    this.dirBuf = null;
    this.dirBufTimer = 0;
    /** 下段结束后短暂忽略纯防御，避免按着 S 蹲死起不来 */
    this.standGrace = 0;

    /** 同一段攻击命中计数：同 key 第二次 → 倒地 */
    this.lastHitKey = null;
    this.lastHitCount = 0;
    /** 连击显示 */
    this.combo = 0;
    this.comboTimer = 0;
  }

  registerComboHit() {
    this.combo += 1;
    this.comboTimer = 90;
  }

  resetCombo() {
    this.combo = 0;
    this.comboTimer = 0;
  }

  tickCombo() {
    if (this.comboTimer > 0) {
      this.comboTimer--;
      if (this.comboTimer <= 0) this.combo = 0;
    }
  }

  get left() { return this.x - this.w / 2; }
  get right() { return this.x + this.w / 2; }
  get top() { return this.y - this.h; }
  get bottom() { return this.y; }

  alive() {
    return this.hp > 0;
  }

  isGhost() {
    return (
      this.state === "dash" ||
      this.state === "down" ||
      this.state === "wakeup" ||
      this.phaseTimer > 0
    );
  }

  isSolid() {
    return this.alive() && !this.isGhost() && this.state !== "dead";
  }

  /** 硬直/倒地/起身中不能行动 */
  canAct() {
    return (
      this.alive() &&
      this.state !== "stun" &&
      this.state !== "down" &&
      this.state !== "wakeup" &&
      this.state !== "dead"
    );
  }

  currentMove() {
    return this.moveName ? MOVES[this.moveName] : null;
  }

  startMove(name) {
    const m = MOVES[name];
    if (!m) return;
    this.state = "attack";
    this.moveName = name;
    this.stateTimer = m.frames;
    this.moveHit = false;
    this.shotDone = false;
    this.defending = false;
    this.bufAttack = false;
    this.bufSkill = false;
    // 模组自带位移 —— 差异拉大，一眼能分清
    if (m.mod === "up") {
      this.vx = this.facing * 0.8;
      if (m.seg === 1) {
        this.vy = -8; // 上段明显跳起
        this.onGround = false;
      } else {
        this.vy = Math.min(this.vy, -3);
      }
    } else if (m.mod === "down") {
      this.vx = this.facing * (m.seg === 3 ? 9 : m.seg === 2 ? 5 : 3);
      this.vy = 0;
      this.onGround = true;
      this.y = GROUND_Y;
    } else if (m.mod === "air") {
      this.vx = this.facing * (m.seg === 3 ? 2 : 4);
      if (m.seg === 3) this.vy = Math.max(this.vy, 6); // 俯冲
      else this.vy = Math.min(this.vy, -1);
    } else {
      this.vx = this.facing * (m.reach ? 2.8 : 1.2);
    }
  }

  /** @param {"normal"|"chain"|"fromAttack"} kind */
  startDash(kind = "normal") {
    this.state = "dash";
    this.stateTimer = DASH_FRAMES;
    this.dashCd =
      kind === "chain" ? DASH_CHAIN_CD :
      kind === "fromAttack" ? DASH_FROM_ATK_CD :
      DASH_COOLDOWN;
    this.phaseTimer = DASH_FRAMES + PHASE_EXTRA;
    this.invuln = DASH_FRAMES + PHASE_EXTRA;
    this.afterimages = [];
    this.moveName = null;
    this.defending = false;
    this.bufAttack = false;
    this.bufSkill = false;
    this.moveHit = false;
    const spd = this.onGround ? DASH_SPEED : AIR_DASH_SPEED;
    this.vx = this.facing * spd;
    // 空中冲刺略停坠
    if (!this.onGround) this.vy *= 0.25;
  }

  tryJump() {
    if (this.jumpsLeft <= 0) return false;
    this.vy = this.onGround ? JUMP_V : DOUBLE_JUMP_V;
    this.jumpsLeft--;
    this.onGround = false;
    this.landTimer = 0;
    this.defending = false;
    return true;
  }

  /** 攻击帧进度 */
  attackFrame() {
    const m = this.currentMove();
    if (!m) return 0;
    return m.frames - this.stateTimer;
  }

  /** 同键连段窗口（偏后） */
  canLink() {
    if (this.state !== "attack") return false;
    const m = this.currentMove();
    if (!m) return false;
    return this.attackFrame() >= m.cancelFrom;
  }

  /** 切招 / 闪现取消：判定开始后即可（取消后摇） */
  canSpecialCancel() {
    if (this.state !== "attack") return false;
    const m = this.currentMove();
    if (!m) return false;
    const t = this.attackFrame();
    // 有判定用 hitStart；纯弹道用 cancelFrom 的更早一点
    const gate = m.hitEnd >= 0 ? m.hitStart : Math.max(8, Math.floor(m.cancelFrom * 0.55));
    return t >= gate;
  }

  /** 闪现中可取消 */
  canDashCancel() {
    if (this.state !== "dash") return false;
    return DASH_FRAMES - this.stateTimer >= DASH_CANCEL_FROM;
  }

  applyFacing(controls) {
    if (controls.left.hold && !controls.right.hold) this.facing = -1;
    else if (controls.right.hold && !controls.left.hold) this.facing = 1;
  }

  /** @deprecated 兼容旧名 */
  canChain() {
    return this.canLink();
  }

  update(controls, arena) {
    if (!this.alive()) {
      this.state = "dead";
      this.afterimages = [];
      this.phaseTimer = 0;
      return null;
    }

    this.animTick++;
    if (this.invuln > 0) this.invuln--;
    if (this.dashCd > 0) this.dashCd--;
    if (this.landTimer > 0) this.landTimer--;
    if (this.phaseTimer > 0) this.phaseTimer--;
    if (this.standGrace > 0) this.standGrace--;
    if (this.dirBufTimer > 0) {
      this.dirBufTimer--;
      if (this.dirBufTimer <= 0) this.dirBuf = null;
    }

    // 刷新方向缓冲（地上：S=下，W或跳键=上）
    if (this.onGround) {
      if (controls.defend?.hold || controls.defend?.tap) {
        this.dirBuf = "down";
        this.dirBufTimer = 16;
      } else if (
        controls.up?.hold || controls.up?.tap ||
        controls.jump?.hold || controls.jump?.tap
      ) {
        this.dirBuf = "up";
        this.dirBufTimer = 16;
      }
    } else {
      this.dirBuf = null;
      this.dirBufTimer = 0;
    }

    let projectile = null;
    this.moving = false;

    if (this.state === "stun") {
      this.stateTimer--;
      this.vx *= 0.88;
      this.defending = false;
      if (this.stateTimer <= 0) {
        // 硬直结束 → 倒地 + 无碰撞
        this.enterDown();
      }
    } else if (this.state === "down") {
      this.stateTimer--;
      this.vx *= 0.7;
      this.defending = false;
      if (this.stateTimer <= 0) {
        this.state = "wakeup";
        this.stateTimer = this.settings.wakeupFrames;
        // 起身期间继续相位
        this.phaseTimer = Math.max(this.phaseTimer, this.settings.wakeupFrames + 6);
      }
    } else if (this.state === "wakeup") {
      this.stateTimer--;
      this.vx = 0;
      if (this.stateTimer <= 0) {
        this.state = "idle";
        this.lastHitKey = null;
        this.lastHitCount = 0;
      }
    } else if (this.state === "dash") {
      this.stateTimer--;
      this.defending = false;
      this.applyFacing(controls);
      const spd = this.onGround ? DASH_SPEED : AIR_DASH_SPEED;
      this.vx = this.facing * spd;

      if (this.animTick % 2 === 0) {
        this.afterimages.push({
          x: this.x,
          y: this.y,
          facing: this.facing,
          life: 8,
        });
      }

      // 闪现中途：可取消到攻击/技能/再闪现；空中也可
      if (this.canDashCancel()) {
        const mod = resolveModule(controls, this.onGround, this.dirBuf);
        if (controls.attack.tap || this.bufAttack) {
          this.bufAttack = false;
          this.startMove(starterAttack(mod));
        } else if (controls.skill.tap || this.bufSkill) {
          this.bufSkill = false;
          this.startMove(starterSkill(mod));
        } else if (controls.dash.tap) {
          this.startDash("chain");
        } else if (controls.jump.tap) {
          this.tryJump();
          this.state = "idle";
          this.stateTimer = 0;
        }
      } else {
        // 取消窗口前也可缓冲输入
        if (controls.attack.tap) this.bufAttack = true;
        if (controls.skill.tap) this.bufSkill = true;
      }

      if (this.state === "dash" && this.stateTimer <= 0) {
        // 落地缓冲：后摇极短，有缓冲则立刻接
        const mod = resolveModule(controls, this.onGround, this.dirBuf);
        if (this.bufAttack || controls.attack.hold) {
          this.bufAttack = false;
          this.startMove(starterAttack(mod));
        } else if (this.bufSkill || controls.skill.hold) {
          this.bufSkill = false;
          this.startMove(starterSkill(mod));
        } else if (controls.dash.hold) {
          this.startDash("chain");
        } else {
          this.state = "idle";
          this.vx = 0;
        }
      }
    } else if (this.state === "attack") {
      projectile = this.updateAttack(controls);
    } else if (this.canAct()) {
      const wantAtk = controls.attack.tap;
      const wantSkl = controls.skill.tap;
      const mod = resolveModule(controls, this.onGround, this.dirBuf);

      if (wantAtk) {
        this.defending = false;
        this.startMove(starterAttack(mod));
      } else if (wantSkl) {
        this.defending = false;
        this.startMove(starterSkill(mod));
      } else if (controls.dash.tap && this.dashCd <= 0) {
        this.applyFacing(controls);
        this.startDash("normal");
      } else {
        // S = 下段/蹲；只有「蹲着不动」才防御。
        // 蹲着可走、可跳起身；下段刚结束有起身宽限，避免按着 S 蹲死。
        const holdDown = controls.defend.hold && this.onGround;
        const wantMove = controls.left.hold || controls.right.hold;
        const wantJump = controls.jump.tap;

        this.defending =
          holdDown &&
          !wantMove &&
          !wantJump &&
          this.standGrace <= 0;

        if (wantJump && this.tryJump()) {
          // 一段/二段跳（蹲着跳也算起身）
        } else if (!this.defending) {
          let move = 0;
          if (controls.left.hold) move -= 1;
          if (controls.right.hold) move += 1;
          // 蹲走稍慢；空中也可微调
          const spd = holdDown ? MOVE_SPEED * 0.6 : MOVE_SPEED;
          this.vx = move * spd;
          this.moving = move !== 0 && this.onGround;
          if (move !== 0) this.facing = move > 0 ? 1 : -1;
        } else {
          this.vx = 0;
        }
      }
    }

    this.afterimages = this.afterimages
      .map((a) => ({ ...a, life: a.life - 1 }))
      .filter((a) => a.life > 0);

    this.vy += GRAVITY;
    this.x += this.vx;
    this.y += this.vy;

    if (this.y >= GROUND_Y) {
      if (this.wasAir && this.vy >= 0) this.landTimer = 6;
      this.y = GROUND_Y;
      this.vy = 0;
      this.onGround = true;
      this.wasAir = false;
      this.jumpsLeft = MAX_JUMPS;
    } else {
      this.onGround = false;
      this.wasAir = true;
      // 天花板，防止飞出大地图上方
      if (this.y < 48) {
        this.y = 48;
        if (this.vy < 0) this.vy = 0;
      }
    }

    this.x = Math.max(arena.left + this.w / 2, Math.min(arena.right - this.w / 2, this.x));
    return projectile;
  }

  updateAttack(controls) {
    const m = this.currentMove();
    if (!m) {
      this.state = "idle";
      return null;
    }

    this.stateTimer--;
    this.vx *= 0.82;
    this.defending = false;

    // 攻击中可按左右转向
    this.applyFacing(controls);

    // 连点写入缓冲
    if (controls.attack.tap) this.bufAttack = true;
    if (controls.skill.tap) this.bufSkill = true;

    let projectile = null;
    const t = this.attackFrame();

    if (m.projectile && !this.shotDone && t >= m.projectile.at) {
      this.shotDone = true;
      const p = m.projectile;
      const dir = p.knockDir ?? 1;
      const ang = p.angle || 0;
      const spd = p.speed;
      const spawnY = p.low
        ? this.y - this.h * 0.25
        : this.y - this.h * (0.55 + (ang < 0 ? 0.15 : 0));
      projectile = {
        id: nextProjectileId++,
        x: this.x + this.facing * 44,
        y: spawnY,
        vx: this.facing * spd * Math.cos(ang),
        vy: spd * Math.sin(ang),
        r: p.r,
        damage: p.damage * this.settings.damageScale,
        knock: this.facing * p.knock * dir,
        launch: p.launch ?? 2,
        stun: Math.round(p.stun * this.settings.stunScale),
        hitKey: moveId(m),
        owner: this,
        life: p.life,
        low: !!p.low,
      };
    }

    // 连招锁定模组：上段微跳后不会窜成空中（WR 不会变成跳跃技能）
    const liveMod = resolveChainMod(controls, this.onGround, this.dirBuf, m.mod);
    const wantSkill = controls.skill.hold || this.bufSkill || controls.skill.tap;
    const wantAtk = controls.attack.hold || this.bufAttack || controls.attack.tap;
    const wantDash = controls.dash.tap;

    // ① 特殊取消：切另一键 / 闪现 / 明确换方向重开
    if (this.canSpecialCancel()) {
      // 攻击 → 闪现
      if (wantDash) {
        this.startDash("fromAttack");
        return projectile;
      }

      // 普攻中按技能 → 同模组技能；技能中按普攻 → 同模组普攻
      if (wantSkill && isAttackMove(this.moveName)) {
        this.startMove(starterSkill(liveMod));
        return projectile;
      }
      if (wantAtk && isSkillMove(this.moveName)) {
        this.startMove(starterAttack(liveMod));
        return projectile;
      }

      // 只有明确换方向时才重开模组（liveMod 与当前不同）
      if (wantAtk && isAttackMove(this.moveName) && liveMod !== m.mod) {
        this.startMove(starterAttack(liveMod));
        return projectile;
      }
      if (wantSkill && isSkillMove(this.moveName) && liveMod !== m.mod) {
        this.startMove(starterSkill(liveMod));
        return projectile;
      }
    }

    // ② 同键连段（偏后窗口）
    if (this.canLink()) {
      if (wantSkill && isSkillMove(this.moveName)) {
        const next = nextSkill(this.moveName);
        if (next) {
          this.startMove(next);
          return projectile;
        }
        // 链尽：可用当前方向重开，或清缓冲
        if (liveMod !== m.mod) {
          this.startMove(starterSkill(liveMod));
          return projectile;
        }
        this.bufSkill = false;
      }
      if (wantAtk && isAttackMove(this.moveName)) {
        const next = nextAttack(this.moveName);
        if (next) {
          this.startMove(next);
          return projectile;
        }
        if (liveMod !== m.mod) {
          this.startMove(starterAttack(liveMod));
          return projectile;
        }
        this.bufAttack = false;
      }
    }

    if (this.stateTimer <= 0) {
      // 招式结束瞬间：缓冲的闪现/攻击立刻接上，吃掉空档后摇
      if (controls.dash.tap || controls.dash.hold) {
        this.startDash("fromAttack");
      } else if (this.bufAttack || controls.attack.hold) {
        this.bufAttack = false;
        this.startMove(starterAttack(liveMod));
      } else if (this.bufSkill || controls.skill.hold) {
        this.bufSkill = false;
        this.startMove(starterSkill(liveMod));
      } else {
        // 下段结束：给起身宽限，松手或走位不会立刻被 S 钉成防御
        if (m.mod === "down") this.standGrace = 18;
        this.state = "idle";
        this.moveName = null;
        this.moveHit = false;
        this.bufAttack = false;
        this.bufSkill = false;
        this.defending = false;
      }
    }
    return projectile;
  }

  getAttackBox() {
    if (this.state !== "attack") return null;
    const m = this.currentMove();
    if (!m || m.hitEnd < 0) return null;
    const t = m.frames - this.stateTimer;
    if (t < m.hitStart || t > m.hitEnd) return null;
    return this._makeHitBox(m);
  }

  /** 气刃动画用：比判定略早出现、略晚消失，并带 0~1 进度 */
  getSwingFxInfo() {
    if (this.state !== "attack") return null;
    const m = this.currentMove();
    if (!m || m.hitEnd < 0 || !m.blade) return null;
    const t = m.frames - this.stateTimer;
    const start = Math.max(0, m.hitStart - 3);
    const end = Math.min(m.frames - 1, m.hitEnd + 4);
    if (t < start || t > end) return null;
    const progress = (t - start) / Math.max(1, end - start);
    // 5 帧：出现 → 展开 → 顶点 → 余韵 → 消散
    const frame = Math.min(4, Math.floor(progress * 5));
    return {
      box: this._makeHitBox(m),
      progress,
      frame,
      style: m.blade || "slash",
    };
  }

  _makeHitBox(m) {
    const reach = m.reach || 50;
    const bw = m.boxW || 40;
    const bh = m.boxH || 36;
    // boxY 可为负（上段超出头顶）
    const cy = this.y - this.h * (m.boxY ?? 0.6);
    const cx = this.x + this.facing * (this.w / 2 + reach / 2);
    const dir = m.knockDir ?? 1;
    return {
      left: cx - bw / 2,
      right: cx + bw / 2,
      top: cy,
      bottom: cy + bh,
      damage: m.damage * this.settings.damageScale,
      knock: this.facing * m.knock * dir,
      launch: m.launch ?? 3,
      stun: Math.round(m.stun * this.settings.stunScale),
      hitKey: moveId(m),
    };
  }

  enterDown() {
    this.state = "down";
    this.stateTimer = this.settings.knockdownFrames;
    this.phaseTimer = this.settings.downPhaseFrames;
    this.invuln = this.settings.downPhaseFrames;
    this.moveName = null;
    this.vy = -2;
    this.onGround = false;
  }

  /**
   * @returns {boolean} 是否成功吃到伤害
   */
  takeHit({ damage, knock, launch = 4, stun, hitKey, defendable = true }) {
    if (!this.alive() || !this.isSolid()) return false;
    // 倒地/起身/闪现中已是 ghost；硬直中可被连段
    if (this.state === "dash") return false;

    let dmg = damage;
    const blocked = defendable && this.defending && this.state === "idle";
    if (blocked) {
      dmg *= this.settings.defendDamageMul;
      this.hp = Math.max(0, this.hp - dmg);
      this.vx = knock * 0.3;
      this.invuln = 6;
      return true;
    }

    // 同段攻击计数
    if (hitKey && hitKey === this.lastHitKey) {
      this.lastHitCount += 1;
    } else {
      this.lastHitKey = hitKey || null;
      this.lastHitCount = 1;
    }

    this.hp = Math.max(0, this.hp - dmg);
    this.vx = knock;
    this.vy = -launch;
    this.onGround = false;
    this.defending = false;
    this.moveName = null;
    this.moveHit = false;

    // 同一段第 2 次 → 直接倒地
    if (this.lastHitCount >= 2) {
      this.enterDown();
      return true;
    }

    // 进入硬直（强制不能行动）；硬直结束会倒地
    this.state = "stun";
    this.stateTimer = Math.max(8, stun || 20);
    this.invuln = 2; // 极短，方便不同招连段
    return true;
  }

  pickSprite() {
    if (this.state === "dead" || this.state === "down") return SPR.DEAD;
    if (this.state === "wakeup") return SPR.LAND;
    if (this.state === "stun") return SPR.HIT;
    if (this.state === "dash") return SPR.DASH;

    if (this.state === "attack") {
      const m = this.currentMove();
      if (!m) return SPR.IDLE_A;
      const t = m.frames - this.stateTimer;
      let phase = "rec";
      if (m.projectile && m.hitEnd < 0) {
        if (t < m.projectile.at) phase = "wind";
        else if (t < m.projectile.at + 6) phase = "hit";
        else phase = "rec";
      } else if (m.projectile && m.hitEnd >= 0) {
        // 技能3：近战+弹
        if (t < Math.min(m.hitStart, m.projectile.at)) phase = "wind";
        else if (t <= m.hitEnd || t < m.projectile.at + 5) phase = "hit";
        else phase = "rec";
      } else {
        if (t < m.hitStart) phase = "wind";
        else if (t <= m.hitEnd) phase = "hit";
        else phase = "rec";
      }

      // 模组优先：上/下/空各用专属姿势，站立用原来的
      const mod = m.mod || "neutral";
      const blade = m.blade || (m.projectile ? "beam" : "thrust");

      if (mod === "up") {
        return phase === "wind" ? SPR.UP_WIND : phase === "hit" ? SPR.UP_HIT : SPR.UP_REC;
      }
      if (mod === "down") {
        return phase === "wind" ? SPR.DN_WIND : phase === "hit" ? SPR.DN_HIT : SPR.DN_REC;
      }
      if (mod === "air") {
        return phase === "wind" ? SPR.AIR_WIND : phase === "hit" ? SPR.AIR_HIT : SPR.AIR_REC;
      }

      // 站立
      if (blade === "kick") {
        return phase === "wind" ? SPR.ATK2_WIND : phase === "hit" ? SPR.ATK2_HIT : SPR.ATK2_REC;
      }
      if (blade === "upper") {
        return phase === "wind" ? SPR.SKL3_WIND : phase === "hit" ? SPR.SKL3_HIT : SPR.SKL3_REC;
      }
      if (blade === "chop") {
        return phase === "wind" ? SPR.ATK3_WIND : phase === "hit" ? SPR.ATK3_HIT : SPR.ATK3_REC;
      }
      if (blade === "palm") {
        return phase === "wind" ? SPR.SKL2_WIND : phase === "hit" ? SPR.SKL2_HIT : SPR.SKL2_REC;
      }
      if (m.projectile) {
        return phase === "wind" ? SPR.SKL1_WIND : phase === "hit" ? SPR.SKL1_HIT : SPR.SKL1_REC;
      }
      if (m.seg === 2) {
        return phase === "wind" ? SPR.ATK2_WIND : phase === "hit" ? SPR.ATK2_HIT : SPR.ATK2_REC;
      }
      if (m.seg === 3) {
        return phase === "wind" ? SPR.ATK3_WIND : phase === "hit" ? SPR.ATK3_HIT : SPR.ATK3_REC;
      }
      return phase === "wind" ? SPR.ATK1_WIND : phase === "hit" ? SPR.ATK1_HIT : SPR.ATK1_REC;
    }

    if (this.defending) return SPR.DEFEND;
    if (!this.onGround) return SPR.JUMP;
    if (this.landTimer > 0) return SPR.LAND;
    if (this.moving) {
      return Math.floor(this.animTick / 6) % 2 === 0 ? SPR.WALK_A : SPR.WALK_B;
    }
    return Math.floor(this.animTick / 20) % 2 === 0 ? SPR.IDLE_A : SPR.IDLE_B;
  }

  draw(ctx) {
    const flip = this.facing < 0;
    const grid = this.pickSprite();
    const swing = this.getSwingFxInfo();
    const m = this.state === "attack" ? this.currentMove() : null;
    const t = m ? m.frames - this.stateTimer : 0;
    const inHitFx =
      m &&
      ((m.hitEnd >= 0 && t >= m.hitStart && t <= m.hitEnd) ||
        (m.projectile && t >= m.projectile.at && t <= m.projectile.at + 8));

    for (const a of this.afterimages) {
      const ax = a.x - (SPR.COLS * SPRITE_SCALE) / 2;
      const ay = a.y - SPR.ROWS * SPRITE_SCALE;
      drawSprite(ctx, SPR.DASH, ghostPalette(), ax, ay, SPRITE_SCALE, a.facing < 0, a.life / 10, null);
    }

    const ox = this.x - (SPR.COLS * SPRITE_SCALE) / 2;
    let oy = this.y - SPR.ROWS * SPRITE_SCALE;
    // 模组高低差：上抬、下蹲（姿势差，不是染色）
    if (m?.mod === "up") oy -= 18;
    else if (m?.mod === "down") oy += 22;
    else if (this.defending) oy += 14;
    else if (m?.mod === "air") oy -= 8;

    if (this.state !== "dead" && this.state !== "down") {
      fillPx(ctx, this.x - 22, GROUND_Y + 2, 44, 8, "rgba(0,0,0,0.35)");
    }

    const colors = { ...this.palette };
    if (this.state === "dash") {
      colors.C = "#ffffff";
      colors.H = "#f0f0f0";
      colors.L = "#e0e0e0";
    } else if (this.state === "stun") {
      colors.S = "#ffaaaa";
      colors.C = "#ffcccc";
    }
    if (inHitFx) {
      colors.Y = this.animTick % 4 < 2 ? "#ffffff" : this.palette.Y;
    }

    const alpha = this.isGhost() ? 0.5 : 1;
    drawSprite(ctx, grid, colors, ox, oy, SPRITE_SCALE, flip, alpha, null);

    if (swing) {
      drawSwingFx(
        ctx,
        swing.box,
        this.palette.Y || "#ffe840",
        this.facing,
        this.animTick,
        swing.style,
        swing.frame,
        swing.progress
      );
    }

    if (this.state === "stun") {
      pixelText(ctx, "STUN", this.x, oy - 28, "#ff8080", 11, "center");
    } else if (this.state === "down") {
      pixelText(ctx, "DOWN", this.x, oy - 8, "#a89070", 11, "center");
    } else if (this.state === "wakeup") {
      pixelText(ctx, "GETUP", this.x, oy - 14, "#80e080", 11, "center");
    } else if (this.state === "attack" && m) {
      pixelText(ctx, m.label || "", this.x, oy - 28, "#f4e8c1", 12, "center");
    }

    if (this.state !== "dead" && this.state !== "down") {
      pixelText(ctx, this.name, this.x, oy - 12, "#f4e8c1", 11, "center");
    }
  }
}

function ghostPalette() {
  return {
    H: "#a0c0e0",
    S: "#c0d8f0",
    E: "#6080a0",
    B: "#80a0c0",
    C: "#90b8e0",
    L: "#7090b0",
    F: "#6080a0",
    Y: "#c0e0ff",
  };
}

export const PALETTE_P1 = {
  H: "#2a1810",
  S: "#f0c8a0",
  E: "#101010",
  B: "#c03030",
  C: "#d04040",
  L: "#803020",
  F: "#303030",
  Y: "#ffe840",
};

export const PALETTE_P2 = {
  H: "#1a2030",
  S: "#f0c8a0",
  E: "#101010",
  B: "#2060c0",
  C: "#3080e0",
  L: "#203860",
  F: "#303030",
  Y: "#80e0ff",
};

export function drawHud(ctx, p1, p2, width) {
  const barW = 320;
  const barH = 16;
  const y = 24;

  fillPx(ctx, width / 2 - 22, 18, 44, 28, "#000000");
  strokePx(ctx, width / 2 - 22, 18, 44, 28, "#e8b020", 3);
  pixelText(ctx, "VS", width / 2, 26, "#e8b020", 14, "center");

  drawBar(ctx, 40, y, barW, barH, p1.hp / p1.maxHp, "#e04040", p1.name, false);
  drawBar(ctx, width - 40 - barW, y, barW, barH, p2.hp / p2.maxHp, "#3080e0", p2.name, true);

  const p1Move = p1.moveName ? MOVES[p1.moveName]?.label : "";
  const p2Move = p2.moveName ? MOVES[p2.moveName]?.label : "";
  pixelText(ctx, cdText("DASH", p1.dashCd) + (p1Move ? `  ${p1Move}` : ""), 40, y + 34, "#a89070", 11, "left");
  pixelText(ctx, cdText("DASH", p2.dashCd) + (p2Move ? `  ${p2Move}` : ""), width - 40, y + 34, "#a89070", 11, "right");

  if (p1.combo >= 2) {
    pixelText(ctx, `${p1.combo} COMBO`, 40, y + 52, "#ffe840", 14, "left");
  }
  if (p2.combo >= 2) {
    pixelText(ctx, `${p2.combo} COMBO`, width - 40, y + 52, "#80e0ff", 14, "right");
  }
}

function cdText(label, cd) {
  return cd > 0 ? `${label}:${Math.ceil(cd / 6) / 10}` : `${label}:OK`;
}

function drawBar(ctx, x, y, w, h, ratio, color, name, alignRight) {
  fillPx(ctx, x - 3, y - 3, w + 6, h + 6, "#000000");
  strokePx(ctx, x - 3, y - 3, w + 6, h + 6, "#e8b020", 2);
  fillPx(ctx, x, y, w, h, "#401010");

  const rw = Math.max(0, Math.floor(w * Math.min(1, Math.max(0, ratio))));
  if (rw > 0) {
    if (alignRight) {
      for (let i = 0; i < rw; i += 8) {
        const seg = Math.min(8, rw - i);
        fillPx(ctx, x + w - i - seg, y, seg - 1, h, color);
      }
    } else {
      for (let i = 0; i < rw; i += 8) {
        const seg = Math.min(8, rw - i);
        fillPx(ctx, x + i, y, seg - 1, h, color);
      }
    }
  }

  pixelText(ctx, name, alignRight ? x + w : x, y - 16, "#f4e8c1", 12, alignRight ? "right" : "left");
}

export { GROUND_Y, MAX_JUMPS };
