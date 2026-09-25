import { ACTIONS, codeLabel, loadBinds, saveBinds, DEFAULT_BINDS } from "./config.js";

/**
 * 键盘输入：按住 / 刚按下（edge）
 * 键位可在设置里改，并写入 localStorage
 */
export class InputManager {
  constructor() {
    this.binds = loadBinds();
    this.down = new Set();
    this.pressed = new Set();
    this._listening = null;

    window.addEventListener("keydown", (e) => {
      if (this._listening) {
        e.preventDefault();
        this._finishListen(e.code);
        return;
      }
      if (this._isGameKey(e.code)) e.preventDefault();
      if (!this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code);
    });

    window.addEventListener("keyup", (e) => {
      this.down.delete(e.code);
    });

    window.addEventListener("blur", () => {
      this.down.clear();
      this.pressed.clear();
    });
  }

  _isGameKey(code) {
    const all = { ...this.binds.p1, ...this.binds.p2 };
    return Object.values(all).includes(code);
  }

  endFrame() {
    this.pressed.clear();
  }

  /** 某玩家某动作是否按住 */
  hold(player, action) {
    const code = this.binds[player][action];
    return code ? this.down.has(code) : false;
  }

  /** 某玩家某动作是否刚按下（本帧） */
  tap(player, action) {
    const code = this.binds[player][action];
    return code ? this.pressed.has(code) : false;
  }

  /** 给 AI 或测试用：合成一份“虚拟按键状态” */
  snapshot(player) {
    const out = {};
    for (const { id } of ACTIONS) {
      out[id] = {
        hold: this.hold(player, id),
        tap: this.tap(player, id),
      };
    }
    return out;
  }

  startListen(player, action, onDone) {
    this._listening = { player, action, onDone };
  }

  cancelListen() {
    this._listening = null;
  }

  get listening() {
    return this._listening;
  }

  _finishListen(code) {
    const job = this._listening;
    if (!job) return;
    this._listening = null;

    // 同一玩家内避免两个动作绑同一键
    for (const { id } of ACTIONS) {
      if (id !== job.action && this.binds[job.player][id] === code) {
        this.binds[job.player][id] = "";
      }
    }
    this.binds[job.player][job.action] = code;
    saveBinds(this.binds);
    job.onDone?.(code);
  }

  resetDefaults() {
    this.binds = structuredClone(DEFAULT_BINDS);
    saveBinds(this.binds);
  }
}

export function buildKeySettingsUI(rootP1, rootP2, input, hintEl) {
  rootP1.className = "key-col h-p1";
  rootP2.className = "key-col h-p2";

  const render = () => {
    rootP1.innerHTML = "<h3>玩家 1</h3>";
    rootP2.innerHTML = "<h3>玩家 2</h3>";

    for (const side of ["p1", "p2"]) {
      const root = side === "p1" ? rootP1 : rootP2;
      for (const action of ACTIONS) {
        const row = document.createElement("div");
        row.className = "key-row";
        const label = document.createElement("span");
        label.textContent = action.label;
        const btn = document.createElement("button");
        btn.className = "btn small";
        btn.type = "button";
        btn.textContent = codeLabel(input.binds[side][action.id]);
        btn.addEventListener("click", () => {
          document.querySelectorAll(".btn.listening").forEach((b) => b.classList.remove("listening"));
          btn.classList.add("listening");
          btn.textContent = "按下按键…";
          hintEl.textContent = `正在设置 ${side === "p1" ? "玩家1" : "玩家2"} 的「${action.label}」，请按键（Esc 取消）`;
          input.startListen(side, action.id, () => {
            hintEl.textContent = "已保存。点击动作旁按钮可继续改键。";
            render();
          });
        });
        row.append(label, btn);
        root.appendChild(row);
      }
    }
  };

  window.addEventListener("keydown", (e) => {
    if (e.code === "Escape" && input.listening) {
      input.cancelListen();
      hintEl.textContent = "已取消。点击动作旁按钮可继续改键。";
      render();
    }
  });

  render();
  return { refresh: render };
}
