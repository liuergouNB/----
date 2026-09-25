import { InputManager, buildKeySettingsUI } from "./input.js";
import { Game } from "./game.js";
import {
  loadSettings,
  saveSettings,
  clampSettings,
  DEFAULT_SETTINGS,
} from "./settings.js";

const menu = document.getElementById("menu");
const keysPanel = document.getElementById("keys");
const settingsPanel = document.getElementById("settings");
const gameWrap = document.getElementById("game-wrap");
const overlay = document.getElementById("overlay");
const resultText = document.getElementById("result-text");
const canvas = document.getElementById("game");
const keyHint = document.getElementById("key-hint");
const settingsForm = document.getElementById("settings-form");
const settingsHint = document.getElementById("settings-hint");

const SETTING_FIELDS = [
  { key: "maxHp", label: "最大血量", step: 10 },
  { key: "damageScale", label: "伤害倍率", step: 0.25 },
  { key: "stunScale", label: "硬直倍率", step: 0.25 },
  { key: "knockdownFrames", label: "倒地帧数", step: 1 },
  { key: "downPhaseFrames", label: "倒地无敌帧", step: 1 },
  { key: "wakeupFrames", label: "起身硬直帧", step: 1 },
  { key: "defendDamageMul", label: "防御受伤倍率", step: 0.05 },
];

const input = new InputManager();
const keyUI = buildKeySettingsUI(
  document.getElementById("keys-p1"),
  document.getElementById("keys-p2"),
  input,
  keyHint
);

const game = new Game(canvas, input);
let lastMode = "pvp";
let draftSettings = loadSettings();

game.onEnd = (text) => {
  resultText.textContent = text;
  overlay.classList.remove("hidden");
};

function show(view) {
  menu.classList.add("hidden");
  keysPanel.classList.add("hidden");
  settingsPanel.classList.add("hidden");
  gameWrap.classList.add("hidden");
  if (view === "menu") menu.classList.remove("hidden");
  if (view === "keys") keysPanel.classList.remove("hidden");
  if (view === "settings") settingsPanel.classList.remove("hidden");
  if (view === "game") gameWrap.classList.remove("hidden");
}

function renderSettingsForm() {
  settingsForm.innerHTML = "";
  for (const field of SETTING_FIELDS) {
    const row = document.createElement("div");
    row.className = "setting-row";
    const label = document.createElement("label");
    label.textContent = field.label;
    label.htmlFor = `set-${field.key}`;
    const inputEl = document.createElement("input");
    inputEl.id = `set-${field.key}`;
    inputEl.type = "number";
    inputEl.step = field.step;
    inputEl.value = draftSettings[field.key];
    inputEl.addEventListener("change", () => {
      draftSettings[field.key] = Number(inputEl.value);
    });
    row.append(label, inputEl);
    settingsForm.appendChild(row);
  }
}

function startMatch(mode) {
  lastMode = mode;
  overlay.classList.add("hidden");
  show("game");
  game.start(mode);
}

function backToMenu() {
  game.stop();
  overlay.classList.add("hidden");
  show("menu");
}

document.getElementById("app").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;

  if (action === "pvp") startMatch("pvp");
  if (action === "pve") startMatch("pve");
  if (action === "keys") {
    keyUI.refresh();
    show("keys");
  }
  if (action === "settings") {
    draftSettings = loadSettings();
    renderSettingsForm();
    show("settings");
  }
  if (action === "back-menu") backToMenu();
  if (action === "pause-menu") backToMenu();
  if (action === "rematch") startMatch(lastMode);
  if (action === "reset-keys") {
    input.resetDefaults();
    keyUI.refresh();
    keyHint.textContent = "已恢复默认键位。";
  }
  if (action === "reset-settings") {
    draftSettings = { ...DEFAULT_SETTINGS };
    renderSettingsForm();
    settingsHint.textContent = "已恢复默认数值（尚未保存）。";
  }
  if (action === "save-settings") {
    // 从输入框再读一遍，避免没触发 change
    for (const field of SETTING_FIELDS) {
      const el = document.getElementById(`set-${field.key}`);
      if (el) draftSettings[field.key] = Number(el.value);
    }
    draftSettings = clampSettings(draftSettings);
    saveSettings(draftSettings);
    renderSettingsForm();
    settingsHint.textContent = "已保存，下一局生效。";
    show("menu");
  }
});

window.addEventListener("keydown", (e) => {
  if (e.code === "Escape" && !gameWrap.classList.contains("hidden") && !input.listening) {
    backToMenu();
  }
});

show("menu");
