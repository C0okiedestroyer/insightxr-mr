import test from "node:test";
import assert from "node:assert/strict";
import {
  assemblyProgress,
  assemblyScore,
  buildAssemblySequence,
  currentAssemblyPart,
  formatAssemblyTime,
} from "../src/assembly.js";

test("assembly sequence rebuilds from internal parts toward the enclosure", () => {
  const components = [
    { id: "cover", index: "01", order: 1 },
    { id: "motor", index: "03", order: 4 },
    { id: "filter", index: "02", order: 2 },
  ];
  assert.deepEqual(buildAssemblySequence(components), ["motor", "filter", "cover"]);
});

test("assembly progress and current part are bounded", () => {
  const sequence = ["motor", "filter", "cover"];
  assert.equal(currentAssemblyPart(sequence, 1), "filter");
  assert.equal(currentAssemblyPart(sequence, 9), null);
  assert.equal(assemblyProgress(2, sequence.length), 2 / 3);
  assert.equal(assemblyProgress(8, sequence.length), 1);
});

test("assembly score rewards accuracy and speed", () => {
  const perfect = assemblyScore({ total: 10, elapsedMs: 30_000 });
  const penalized = assemblyScore({
    total: 10,
    elapsedMs: 30_000,
    mistakes: 2,
    hints: 1,
  });
  assert.ok(perfect > penalized);
  assert.equal(formatAssemblyTime(65_000), "01:05");
});
