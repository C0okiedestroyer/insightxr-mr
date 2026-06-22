import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  clampSectionProgress,
  sectionCoordinate,
  sectionDisplayPercent,
} from "../src/cross-section.js";

test("cross-section progress remains normalized", () => {
  assert.equal(clampSectionProgress(-1), 0);
  assert.equal(clampSectionProgress(0.42), 0.42);
  assert.equal(clampSectionProgress(4), 1);
});

test("cross-section coordinate follows the selected model axis", () => {
  const bounds = new THREE.Box3(
    new THREE.Vector3(-2, -1, -4),
    new THREE.Vector3(2, 3, 6),
  );
  assert.equal(sectionCoordinate(bounds, "x", 0.5, 0), 0);
  assert.equal(sectionCoordinate(bounds, "y", 0.5, 0), 1);
  assert.equal(sectionCoordinate(bounds, "z", 0.5, 0), 1);
});

test("cross-section percentage is rounded for the interface", () => {
  assert.equal(sectionDisplayPercent(0.456), "46%");
});
