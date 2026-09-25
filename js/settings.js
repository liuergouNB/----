const STORAGE_KEY = "fighter-game-settings-v1";

export const DEFAULT_SETTINGS = {
  maxHp: 100,
  damageScale: 1,
  /** 硬直时长倍率 */
  stunScale: 1,
  /** 倒地躺地帧数 */
  knockdownFrames: 36,
  /** 倒地/起身无碰撞帧数 */
  downPhaseFrames: 48,
  /** 起身硬直（不能立刻攻击） */
  wakeupFrames: 12,
  defendDamageMul: 0.25,
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function clampSettings(s) {
  return {
    maxHp: clamp(s.maxHp, 50, 500),
    damageScale: clamp(s.damageScale, 0.25, 3),
    stunScale: clamp(s.stunScale, 0.5, 2.5),
    knockdownFrames: clamp(s.knockdownFrames, 10, 120),
    downPhaseFrames: clamp(s.downPhaseFrames, 10, 150),
    wakeupFrames: clamp(s.wakeupFrames, 0, 60),
    defendDamageMul: clamp(s.defendDamageMul, 0, 1),
  };
}

function clamp(n, a, b) {
  n = Number(n);
  if (Number.isNaN(n)) return a;
  return Math.min(b, Math.max(a, n));
}
