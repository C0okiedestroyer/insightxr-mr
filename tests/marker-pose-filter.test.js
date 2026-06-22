import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { MarkerPoseFilter } from "../src/marker-pose-filter.js";

test("marker pose filter initializes from the first valid pose", () => {
  const filter = new MarkerPoseFilter();
  const position = new THREE.Vector3(1, 2, 3);
  const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, 0.3, 0));
  const result = filter.update(position, quaternion, 1000);

  assert.equal(result.accepted, true);
  assert.equal(result.snapped, true);
  assert.ok(filter.position.distanceTo(position) < 1e-9);
  assert.ok(filter.quaternion.angleTo(quaternion) < 1e-9);
});

test("marker pose filter smooths small frame-to-frame movement", () => {
  const filter = new MarkerPoseFilter({ positionResponse: 5 });
  filter.update(new THREE.Vector3(0, 0, 0), new THREE.Quaternion(), 1000);
  filter.update(new THREE.Vector3(0.05, 0, 0), new THREE.Quaternion(), 1016);

  assert.ok(filter.position.x > 0);
  assert.ok(filter.position.x < 0.05);
});

test("marker pose filter rejects a single implausible jump", () => {
  const filter = new MarkerPoseFilter({ maxPositionJump: 0.1, outlierFramesBeforeSnap: 3 });
  filter.update(new THREE.Vector3(0, 0, 0), new THREE.Quaternion(), 1000);
  const result = filter.update(new THREE.Vector3(1, 0, 0), new THREE.Quaternion(), 1016);

  assert.equal(result.accepted, false);
  assert.equal(result.reason, "outlier");
  assert.equal(filter.position.x, 0);
});

test("marker pose filter accepts a sustained large movement as reacquisition", () => {
  const filter = new MarkerPoseFilter({ maxPositionJump: 0.1, outlierFramesBeforeSnap: 3 });
  filter.update(new THREE.Vector3(0, 0, 0), new THREE.Quaternion(), 1000);
  filter.update(new THREE.Vector3(1, 0, 0), new THREE.Quaternion(), 1016);
  filter.update(new THREE.Vector3(1, 0, 0), new THREE.Quaternion(), 1032);
  const result = filter.update(new THREE.Vector3(1, 0, 0), new THREE.Quaternion(), 1048);

  assert.equal(result.accepted, true);
  assert.equal(result.reason, "reacquired");
  assert.equal(filter.position.x, 1);
});
