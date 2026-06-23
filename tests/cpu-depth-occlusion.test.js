import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  copyDepthMeters,
  depthBufferValue,
} from "../src/cpu-depth-occlusion.js";

test("CPU depth values are converted from millimeters to meters", () => {
  const raw = new Uint16Array([0, 500, 1250, 3000]);
  const depth = copyDepthMeters({
    width: 2,
    height: 2,
    data: raw.buffer,
    rawValueToMeters: 0.001,
  }, "luminance-alpha");

  assert.deepEqual([...depth], [0, 0.5, 1.25, 3]);
});

test("metric camera-plane depth converts to the WebGL depth buffer", () => {
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 10);
  camera.updateProjectionMatrix();

  assert.ok(depthBufferValue(0.11, camera.projectionMatrix) < 0.1);
  assert.ok(depthBufferValue(1, camera.projectionMatrix) > 0.8);
  assert.ok(depthBufferValue(9, camera.projectionMatrix) < 1);
  assert.equal(depthBufferValue(0, camera.projectionMatrix), 1);
});
