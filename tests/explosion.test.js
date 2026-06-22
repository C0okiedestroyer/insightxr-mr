import test from "node:test";
import assert from "node:assert/strict";
import { clamp, componentExplosion, easeInOutCubic, formatPercent } from "../src/explosion.js";

test("clamp keeps values inside the normalized range", () => {
  assert.equal(clamp(-2), 0);
  assert.equal(clamp(0.4), 0.4);
  assert.equal(clamp(5), 1);
});

test("easing preserves endpoints and midpoint", () => {
  assert.equal(easeInOutCubic(0), 0);
  assert.equal(easeInOutCubic(0.5), 0.5);
  assert.equal(easeInOutCubic(1), 1);
});

test("every component reaches full separation", () => {
  for (let order = 1; order <= 9; order += 1) {
    assert.equal(componentExplosion(1, order), 1);
  }
});

test("outer components begin moving before internal components", () => {
  assert.ok(componentExplosion(0.2, 1) > componentExplosion(0.2, 9));
});

test("percentage formatting is bounded and rounded", () => {
  assert.equal(formatPercent(-0.2), "0%");
  assert.equal(formatPercent(0.456), "46%");
  assert.equal(formatPercent(1.2), "100%");
});
