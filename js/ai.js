/**
 * AI：靠近连段（长按普攻），硬直中追击，倒地时拉开
 */
export function makeAIController(self, enemy) {
  const dist = enemy.x - self.x;
  const ad = Math.abs(dist);
  const towardLeft = dist < 0;
  const towardRight = dist > 0;
  const ctrl = empty();

  if (!self.canAct || !self.canAct()) {
    // 攻击中也继续长按，方便自动连段
    if (self.state === "attack") {
      if (self.moveName?.startsWith("atk")) ctrl.attack.hold = true;
      if (self.moveName?.startsWith("skl")) ctrl.skill.hold = true;
    }
    return ctrl;
  }

  if (towardLeft) ctrl.left.hold = true;
  if (towardRight) ctrl.right.hold = true;

  if (enemy.state === "down" || enemy.state === "wakeup") {
    ctrl.left.hold = towardRight;
    ctrl.right.hold = towardLeft;
    if (ad < 90 && Math.random() < 0.08) ctrl.attack.tap = true;
    return ctrl;
  }

  // 攻击中：长按同键自动接下一段
  if (self.state === "attack") {
    if (self.moveName?.startsWith("atk")) ctrl.attack.hold = true;
    else if (self.moveName?.startsWith("skl")) ctrl.skill.hold = true;
    return ctrl;
  }

  if (ad < 75) {
    ctrl.left.hold = false;
    ctrl.right.hold = false;

    if (enemy.state === "attack" && Math.random() < 0.4) {
      ctrl.defend.hold = true;
    } else if (enemy.state === "stun" && Math.random() < 0.4) {
      ctrl.attack.hold = true;
      ctrl.attack.tap = true;
    } else if (Math.random() < 0.14) {
      ctrl.attack.hold = true;
      ctrl.attack.tap = true;
    } else if (Math.random() < 0.04) {
      ctrl.skill.hold = true;
      ctrl.skill.tap = true;
    } else if (Math.random() < 0.03) {
      ctrl.dash.tap = true;
    }
  } else if (ad < 180) {
    if (Math.random() < 0.05) {
      ctrl.attack.tap = true;
      ctrl.attack.hold = true;
    }
    if (Math.random() < 0.03) {
      ctrl.skill.tap = true;
      ctrl.skill.hold = true;
    }
    if (Math.random() < 0.02) ctrl.dash.tap = true;
  } else {
    if (Math.random() < 0.04) {
      ctrl.skill.tap = true;
      ctrl.skill.hold = true;
    }
  }

  if (self.hp < self.maxHp * 0.35 && ad < 100 && Math.random() < 0.05) {
    ctrl.dash.tap = true;
    ctrl.defend.hold = false;
  }

  return ctrl;
}

function empty() {
  const ids = ["left", "right", "up", "defend", "jump", "attack", "dash", "skill"];
  const o = {};
  for (const id of ids) o[id] = { hold: false, tap: false };
  return o;
}
