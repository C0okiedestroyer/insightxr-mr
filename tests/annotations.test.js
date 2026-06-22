import test from "node:test";
import assert from "node:assert/strict";
import {
  annotationSummary,
  annotationTone,
  computeAnnotationLayout,
} from "../src/annotations.js";

test("annotation risk tones distinguish safe, caution, and dangerous handling", () => {
  assert.equal(annotationTone("Low"), "safe");
  assert.equal(annotationTone("ESD sensitive"), "caution");
  assert.equal(annotationTone("Stored energy"), "danger");
});

test("annotation summary exposes the educational fields", () => {
  const summary = annotationSummary({
    id: "motor",
    index: "07",
    name: "Motor",
    category: "Power",
    color: "#ff9900",
    role: "Creates torque.",
    metric: "18 W",
    risk: "Electrical",
    service: "Disconnect power.",
  });
  assert.equal(summary.name, "Motor");
  assert.equal(summary.tone, "danger");
  assert.equal(summary.service, "Disconnect power.");
});

test("annotation layout remains inside its available viewport", () => {
  const layout = computeAnnotationLayout({
    targetX: 495,
    targetY: 20,
    left: 0,
    top: 0,
    right: 500,
    bottom: 300,
    cardWidth: 210,
    cardHeight: 120,
  });
  assert.ok(layout.cardX >= 12);
  assert.ok(layout.cardX + 210 <= 488);
  assert.ok(layout.cardY >= 12);
  assert.ok(layout.cardY + 120 <= 288);
  assert.equal(layout.side, "left");
});
