import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";

globalThis.window = {
  devicePixelRatio: 1,
  addEventListener() {},
  removeEventListener() {},
};

const { ARTrackingController } = await import("../src/ar-tracking.js");

function createController(onEnd = () => {}) {
  const xr = new THREE.EventDispatcher();
  xr.enabled = true;
  xr.isPresenting = false;
  xr.hasDepthSensing = () => false;
  const renderer = {
    xr,
    setPixelRatio() {},
  };
  const scene = new THREE.Scene();
  const stage = new THREE.Group();
  scene.add(stage);
  const controller = new ARTrackingController({
    renderer,
    scene,
    camera: new THREE.PerspectiveCamera(),
    stage,
    onEnd,
  });
  return { controller, renderer, scene, stage, xr };
}

test("AR cleanup is idempotent", () => {
  const { controller, renderer, scene, stage } = createController();
  controller.cleanupComplete = false;
  controller.mode = "surface";
  controller.scene.add(controller.surfaceAnchorRoot);
  controller.surfaceAnchorRoot.add(stage);

  assert.equal(controller.finishSession(), true);
  assert.equal(controller.finishSession(), false);
  assert.equal(stage.parent, scene);
  assert.equal(renderer.xr.enabled, false);
});

test("repeated exit requests end one WebXR session", async () => {
  let ended = 0;
  let restored = 0;
  const { controller, xr } = createController(() => {
    restored += 1;
  });
  controller.cleanupComplete = false;
  controller.mode = "surface";
  controller.surfaceEndPromise = new Promise((resolve) => {
    controller.resolveSurfaceEnd = resolve;
  });
  controller.session = new THREE.EventDispatcher();
  controller.session.end = async () => {
    ended += 1;
    xr.dispatchEvent({ type: "sessionend" });
    controller.session.dispatchEvent({ type: "end" });
  };
  xr.addEventListener("sessionend", controller.xrSessionEndHandler);
  controller.session.addEventListener("end", controller.sessionEndFallbackHandler);

  await Promise.all([controller.stop(), controller.stop()]);
  assert.equal(ended, 1);
  assert.equal(restored, 1);
  assert.equal(controller.mode, null);
});

test("raw XR session end still restores the studio when the renderer event is missed", async () => {
  let restored = 0;
  const { controller } = createController(() => {
    restored += 1;
  });
  controller.cleanupComplete = false;
  controller.mode = "surface";
  const ended = new Promise((resolve) => {
    controller.resolveSurfaceEnd = resolve;
  });
  controller.surfaceEndPromise = ended;
  controller.session = new THREE.EventDispatcher();
  controller.session.addEventListener("end", controller.sessionEndFallbackHandler);

  controller.session.dispatchEvent({ type: "end" });
  await ended;

  assert.equal(restored, 1);
  assert.equal(controller.mode, null);
});

test("environmental occlusion can pause and resume the WebXR depth mesh", () => {
  const updates = [];
  const { controller, renderer } = createController();
  const depthMesh = { visible: true };
  renderer.xr.hasDepthSensing = () => true;
  renderer.xr.getDepthSensingMesh = () => depthMesh;
  controller.mode = "surface";
  controller.onOcclusion = (status) => updates.push(status);

  controller.updateOcclusion();
  assert.equal(controller.occlusionAvailable, true);
  assert.equal(controller.occlusionStatus, "active");
  assert.equal(depthMesh.visible, true);

  assert.equal(controller.toggleOcclusion(), true);
  assert.equal(controller.occlusionStatus, "paused");
  assert.equal(depthMesh.visible, false);

  assert.equal(controller.toggleOcclusion(), true);
  assert.equal(controller.occlusionStatus, "active");
  assert.equal(depthMesh.visible, true);
  assert.deepEqual(
    updates.map(({ status }) => status),
    ["active", "paused", "active"],
  );
});
