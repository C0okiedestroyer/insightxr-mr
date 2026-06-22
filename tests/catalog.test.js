import test from "node:test";
import assert from "node:assert/strict";
import { MODEL_LIBRARY, MODEL_IDS } from "../src/data.js";

test("catalog exposes three complete learning models", () => {
  assert.equal(MODEL_IDS.length, 3);
  assert.deepEqual(MODEL_IDS, ["aerocore", "skyscout", "vectordrive"]);
});

for (const modelId of MODEL_IDS) {
  test(`${modelId} has valid component and guide references`, () => {
    const model = MODEL_LIBRARY[modelId];
    const ids = model.components.map((component) => component.id);
    const idSet = new Set(ids);

    assert.equal(idSet.size, ids.length);
    assert.ok(model.components.length >= 8);
    assert.ok(model.guideSteps.length >= 5);
    assert.ok(model.arSurfaceScale > 0);
    assert.ok(model.arMarkerScale > 0);

    model.components.forEach((component) => {
      assert.ok(component.order >= 1);
      assert.ok(component.color.startsWith("#"));
    });

    model.guideSteps.forEach((step) => {
      assert.ok(step.explosion >= 0 && step.explosion <= 1);
      if (step.partId) assert.ok(idSet.has(step.partId));
    });

    model.serviceSequence.forEach((partId) => {
      assert.ok(idSet.has(partId));
    });
  });
}
