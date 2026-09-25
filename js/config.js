/** 按键动作（含上方向，用于切换攻击模组） */
export const ACTIONS = [
  { id: "left", label: "左移" },
  { id: "right", label: "右移" },
  { id: "up", label: "上(模组)" },
  { id: "defend", label: "下/防御" },
  { id: "jump", label: "跳跃(也算上)" },
  { id: "attack", label: "普攻" },
  { id: "dash", label: "闪现" },
  { id: "skill", label: "技能" },
];

export const DEFAULT_BINDS = {
  p1: {
    left: "KeyA",
    right: "KeyD",
    up: "KeyW",
    defend: "KeyS",
    jump: "KeyG",
    attack: "KeyF",
    dash: "KeyH",
    skill: "KeyR",
  },
  p2: {
    left: "ArrowLeft",
    right: "ArrowRight",
    up: "KeyI",
    defend: "ArrowDown",
    jump: "ArrowUp",
    attack: "Numpad1",
    dash: "Numpad2",
    skill: "Numpad3",
  },
};

const STORAGE_KEY = "fighter-keybinds-v2";

export function loadBinds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_BINDS);
    const parsed = JSON.parse(raw);
    return {
      p1: { ...DEFAULT_BINDS.p1, ...parsed.p1 },
      p2: { ...DEFAULT_BINDS.p2, ...parsed.p2 },
    };
  } catch {
    return structuredClone(DEFAULT_BINDS);
  }
}

export function saveBinds(binds) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(binds));
}

export function codeLabel(code) {
  if (!code) return "未设置";
  const map = {
    ArrowLeft: "←",
    ArrowRight: "→",
    ArrowUp: "↑",
    ArrowDown: "↓",
    Space: "空格",
  };
  if (map[code]) return map[code];
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return "小键盘" + code.slice(6);
  return code;
}
