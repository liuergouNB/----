/**
 * 攻击模组（方向）——靠招式形态/特效区分，不是靠染色：
 * - 站立：中段拳踢劈（thrust/kick/chop）
 * - 上：升龙柱 + 上挑（rise）
 * - 下：贴地扫 + 扬尘（sweep）
 * - 空中：回旋踢 / 俯冲（spin/dive）
 */

export const MOVES = {
  /* ===== 站立普攻：中段拳脚 ===== */
  atk1: {
    key: "atk", seg: 1, mod: "neutral", label: "直拳",
    frames: 26, hitStart: 8, hitEnd: 13,
    damage: 8, knock: 3, knockDir: 1, stun: 32, cancelFrom: 18,
    reach: 54, boxW: 42, boxH: 30, boxY: 0.55, launch: 1.5, blade: "thrust",
  },
  atk2: {
    key: "atk", seg: 2, mod: "neutral", label: "侧踢",
    frames: 28, hitStart: 9, hitEnd: 15,
    damage: 10, knock: 8, knockDir: 1, stun: 34, cancelFrom: 20,
    reach: 66, boxW: 50, boxH: 34, boxY: 0.48, launch: 2.5, blade: "kick",
  },
  atk3: {
    key: "atk", seg: 3, mod: "neutral", label: "劈斩",
    frames: 32, hitStart: 10, hitEnd: 17,
    damage: 14, knock: 12, knockDir: 1, stun: 38, cancelFrom: 24,
    reach: 70, boxW: 52, boxH: 40, boxY: 0.42, launch: 8, blade: "chop",
  },

  /* ===== 上攻击：整段上挑升龙 ===== */
  up1: {
    key: "upAtk", seg: 1, mod: "up", label: "上勾",
    frames: 24, hitStart: 6, hitEnd: 13,
    damage: 9, knock: 2, knockDir: 1, stun: 30, cancelFrom: 16,
    reach: 44, boxW: 34, boxH: 64, boxY: 0.02, launch: 11, blade: "rise",
  },
  up2: {
    key: "upAtk", seg: 2, mod: "up", label: "上天踢",
    frames: 26, hitStart: 7, hitEnd: 14,
    damage: 11, knock: 3, knockDir: 1, stun: 32, cancelFrom: 18,
    reach: 50, boxW: 36, boxH: 70, boxY: -0.05, launch: 14, blade: "rise",
  },
  up3: {
    key: "upAtk", seg: 3, mod: "up", label: "升龙拳",
    frames: 32, hitStart: 7, hitEnd: 16,
    damage: 16, knock: 4, knockDir: 1, stun: 36, cancelFrom: 22,
    reach: 52, boxW: 40, boxH: 78, boxY: -0.12, launch: 18, blade: "rise",
  },

  /* ===== 下攻击：贴地扫腿/滑铲 ===== */
  dn1: {
    key: "dnAtk", seg: 1, mod: "down", label: "下砸",
    frames: 22, hitStart: 5, hitEnd: 12,
    damage: 7, knock: 3, knockDir: 1, stun: 26, cancelFrom: 14,
    reach: 50, boxW: 48, boxH: 18, boxY: 0.92, launch: 0.2, blade: "sweep",
  },
  dn2: {
    key: "dnAtk", seg: 2, mod: "down", label: "扫腿",
    frames: 26, hitStart: 7, hitEnd: 14,
    damage: 10, knock: 11, knockDir: 1, stun: 30, cancelFrom: 18,
    reach: 72, boxW: 60, boxH: 16, boxY: 0.94, launch: 0.3, blade: "sweep",
  },
  dn3: {
    key: "dnAtk", seg: 3, mod: "down", label: "滑铲",
    frames: 30, hitStart: 6, hitEnd: 18,
    damage: 13, knock: 14, knockDir: 1, stun: 32, cancelFrom: 20,
    reach: 82, boxW: 68, boxH: 14, boxY: 0.96, launch: 0.5, blade: "sweep",
  },

  /* ===== 跳跃攻击：回旋 / 俯冲 ===== */
  air1: {
    key: "airAtk", seg: 1, mod: "air", label: "回旋踢",
    frames: 20, hitStart: 4, hitEnd: 12,
    damage: 9, knock: 7, knockDir: 1, stun: 24, cancelFrom: 12,
    reach: 58, boxW: 52, boxH: 40, boxY: 0.4, launch: 4, blade: "spin",
  },
  air2: {
    key: "airAtk", seg: 2, mod: "air", label: "空旋肘",
    frames: 22, hitStart: 4, hitEnd: 12,
    damage: 11, knock: 6, knockDir: 1, stun: 26, cancelFrom: 14,
    reach: 50, boxW: 44, boxH: 44, boxY: 0.35, launch: 5, blade: "spin",
  },
  air3: {
    key: "airAtk", seg: 3, mod: "air", label: "俯冲砸",
    frames: 26, hitStart: 5, hitEnd: 16,
    damage: 15, knock: 5, knockDir: 1, stun: 28, cancelFrom: 16,
    reach: 46, boxW: 48, boxH: 56, boxY: 0.55, launch: -6, blade: "dive",
  },

  /* ===== 站立技能 ===== */
  skl1: {
    key: "skl", seg: 1, mod: "neutral", label: "气弹",
    frames: 34, hitStart: 0, hitEnd: -1,
    damage: 12, knock: 3, knockDir: 1, stun: 30, cancelFrom: 24,
    projectile: {
      at: 14, speed: 10, r: 14, damage: 12, knock: 3.5, knockDir: 1, launch: 2, stun: 28, life: 75,
    },
  },
  skl2: {
    key: "skl", seg: 2, mod: "neutral", label: "吸掌",
    frames: 30, hitStart: 8, hitEnd: 16,
    damage: 12, knock: 10, knockDir: -1, stun: 34, cancelFrom: 22,
    reach: 74, boxW: 54, boxH: 42, boxY: 0.5, launch: 1.5, blade: "palm",
  },
  skl3: {
    key: "skl", seg: 3, mod: "neutral", label: "升龙",
    frames: 36, hitStart: 10, hitEnd: 18,
    damage: 18, knock: 14, knockDir: 1, stun: 42, cancelFrom: 26,
    reach: 78, boxW: 56, boxH: 56, boxY: 0.28, launch: 15, blade: "rise",
    projectile: {
      at: 12, speed: 8, r: 18, damage: 8, knock: 6, knockDir: 1, launch: 8, stun: 30, life: 50,
    },
  },

  /* ===== 上技能 ===== */
  upSkl1: {
    key: "upSkl", seg: 1, mod: "up", label: "上天弹",
    frames: 30, hitStart: 0, hitEnd: -1,
    damage: 11, knock: 1, knockDir: 1, stun: 28, cancelFrom: 20,
    projectile: {
      at: 12, speed: 8, r: 13, damage: 11, knock: 1.5, knockDir: 1, launch: 12, stun: 28, life: 65,
      angle: -0.7,
    },
  },
  upSkl2: {
    key: "upSkl", seg: 2, mod: "up", label: "升掌",
    frames: 28, hitStart: 6, hitEnd: 15,
    damage: 13, knock: 3, knockDir: 1, stun: 32, cancelFrom: 20,
    reach: 56, boxW: 40, boxH: 68, boxY: -0.02, launch: 13, blade: "rise",
  },
  upSkl3: {
    key: "upSkl", seg: 3, mod: "up", label: "大升龙",
    frames: 34, hitStart: 8, hitEnd: 18,
    damage: 18, knock: 5, knockDir: 1, stun: 38, cancelFrom: 24,
    reach: 58, boxW: 44, boxH: 80, boxY: -0.15, launch: 20, blade: "rise",
  },

  /* ===== 下技能 ===== */
  dnSkl1: {
    key: "dnSkl", seg: 1, mod: "down", label: "地波",
    frames: 28, hitStart: 0, hitEnd: -1,
    damage: 10, knock: 8, knockDir: 1, stun: 26, cancelFrom: 18,
    projectile: {
      at: 10, speed: 9, r: 14, damage: 10, knock: 9, knockDir: 1, launch: 0.5, stun: 26, life: 70,
      low: true,
    },
  },
  dnSkl2: {
    key: "dnSkl", seg: 2, mod: "down", label: "下吸",
    frames: 26, hitStart: 6, hitEnd: 14,
    damage: 11, knock: 12, knockDir: -1, stun: 30, cancelFrom: 18,
    reach: 72, boxW: 58, boxH: 20, boxY: 0.9, launch: 0.4, blade: "sweep",
  },
  dnSkl3: {
    key: "dnSkl", seg: 3, mod: "down", label: "裂地",
    frames: 32, hitStart: 8, hitEnd: 17,
    damage: 16, knock: 15, knockDir: 1, stun: 34, cancelFrom: 22,
    reach: 80, boxW: 64, boxH: 18, boxY: 0.93, launch: 1, blade: "sweep",
  },

  /* ===== 空中技能 ===== */
  airSkl1: {
    key: "airSkl", seg: 1, mod: "air", label: "空弹",
    frames: 26, hitStart: 0, hitEnd: -1,
    damage: 10, knock: 4, knockDir: 1, stun: 24, cancelFrom: 16,
    projectile: {
      at: 10, speed: 11, r: 13, damage: 10, knock: 4, knockDir: 1, launch: 2, stun: 24, life: 60,
      angle: 0.45,
    },
  },
  airSkl2: {
    key: "airSkl", seg: 2, mod: "air", label: "空旋",
    frames: 24, hitStart: 4, hitEnd: 14,
    damage: 12, knock: 8, knockDir: 1, stun: 26, cancelFrom: 16,
    reach: 64, boxW: 58, boxH: 48, boxY: 0.38, launch: 5, blade: "spin",
  },
  airSkl3: {
    key: "airSkl", seg: 3, mod: "air", label: "俯冲击",
    frames: 26, hitStart: 5, hitEnd: 16,
    damage: 15, knock: 7, knockDir: 1, stun: 28, cancelFrom: 18,
    reach: 50, boxW: 50, boxH: 58, boxY: 0.5, launch: -7, blade: "dive",
  },
};

const ATK_CHAIN = {
  atk1: "atk2", atk2: "atk3",
  up1: "up2", up2: "up3",
  dn1: "dn2", dn2: "dn3",
  air1: "air2", air2: "air3",
};

const SKL_CHAIN = {
  skl1: "skl2", skl2: "skl3",
  upSkl1: "upSkl2", upSkl2: "upSkl3",
  dnSkl1: "dnSkl2", dnSkl2: "dnSkl3",
  airSkl1: "airSkl2", airSkl2: "airSkl3",
};

export function moveId(move) {
  return `${move.key}:${move.seg}`;
}

/** 根据方向/空中选择模组（hold / 刚按下 / 方向缓冲） */
export function resolveModule(controls, onGround, dirBuf = null) {
  if (!onGround) return "air";
  if (controls.defend?.hold || controls.defend?.tap) return "down";
  if (
    controls.up?.hold || controls.up?.tap ||
    controls.jump?.hold || controls.jump?.tap
  ) {
    return "up";
  }
  if (dirBuf === "down" || dirBuf === "up") return dirBuf;
  return "neutral";
}

/**
 * 连招中的模组：锁定当前招，避免上段微跳后被当成空中模组（WR 变成“跳跃技能”）
 * 只有明确换方向才切换。
 */
export function resolveChainMod(controls, onGround, dirBuf, lockedMod) {
  const locked = lockedMod || "neutral";

  // 明确按住下 → 切下段
  if (controls.defend?.hold || controls.defend?.tap) {
    return "down";
  }

  // 当前是上段：微跳离地后仍算上段（按着 W，或没主动跳去打空中）
  if (locked === "up") {
    if (!onGround) return "up";
    // 落地后仍按 W/上 则继续上；松开则保持上直到换方向（同串）
    return "up";
  }

  // 当前是下段：滑铲中保持下
  if (locked === "down") {
    return "down";
  }

  // 当前是空中：在空中保持 air；落地后按方向重算
  if (locked === "air") {
    if (!onGround) return "air";
    return resolveModule(controls, onGround, dirBuf);
  }

  // 站立串：离地才变空中；地上可切上
  if (!onGround) return "air";
  if (
    controls.up?.hold || controls.up?.tap ||
    controls.jump?.hold || controls.jump?.tap
  ) {
    return "up";
  }
  if (dirBuf === "up") return "up";
  return "neutral";
}

export function starterAttack(mod) {
  if (mod === "up") return "up1";
  if (mod === "down") return "dn1";
  if (mod === "air") return "air1";
  return "atk1";
}

export function starterSkill(mod) {
  if (mod === "up") return "upSkl1";
  if (mod === "down") return "dnSkl1";
  if (mod === "air") return "airSkl1";
  return "skl1";
}

export function nextAttack(currentId) {
  return ATK_CHAIN[currentId] || null;
}

export function nextSkill(currentId) {
  return SKL_CHAIN[currentId] || null;
}

export function isAttackMove(name) {
  return !!MOVES[name] && !String(MOVES[name].key).includes("Skl") && MOVES[name].key !== "skl";
}

export function isSkillMove(name) {
  const k = MOVES[name]?.key || "";
  return k === "skl" || k.includes("Skl");
}
