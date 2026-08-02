import test from "node:test";
import assert from "node:assert/strict";

import { applyContextEstimatePriority } from "../estimate-context-priority.js";

function repairInfo(message = "It's got a flush at the top") {
  return {
    body: {
      message,
      state: {
        jobCode: "wc_inlet_valve",
        access: "easy",
        problemSummary: "Noisy toilet cistern, likely an inlet, fill-valve or internal mechanism fault"
      }
    },
    context: {
      family: "toilet",
      jobCode: "wc_inlet_valve",
      access: "easy",
      problemSummary: "Noisy toilet cistern, likely an inlet, fill-valve or internal mechanism fault"
    }
  };
}

function wrongBlockedEstimate() {
  return {
    reply: "Your current estimate is shown below.",
    state: { jobCode: "wc_blocked", estimateReady: true },
    estimate: {
      estimateId: "estimate_123",
      jobCode: "wc_blocked",
      jobName: "Blocked toilet",
      mode: "standard",
      min: 105,
      max: 225,
      confidence: "Medium",
      confidenceScore: 73,
      canBook: true,
      provisional: false,
      summary: "Noisy toilet cistern",
      showNow: true
    },
    showEstimateNow: true
  };
}

test("noisy toilet context overrides a blocked-toilet keyword match", () => {
  const corrected = applyContextEstimatePriority(wrongBlockedEstimate(), repairInfo());

  assert.equal(corrected.estimateCorrected, true);
  assert.deepEqual(corrected.estimateCorrection, {
    fromJobCode: "wc_blocked",
    toJobCode: "wc_inlet_valve"
  });
  assert.equal(corrected.estimate.estimateId, "estimate_123");
  assert.equal(corrected.estimate.jobCode, "wc_inlet_valve");
  assert.equal(corrected.estimate.jobName, "Noisy toilet / inlet or fill-valve fault");
  assert.equal(corrected.estimate.min, 105);
  assert.equal(corrected.estimate.max, 195);
  assert.equal(corrected.state.jobCode, "wc_inlet_valve");
  assert.equal(corrected.showEstimateNow, true);
  assert.match(corrected.reply, /noisy cistern mechanism/i);
});

test("What you on about re-shows the corrected estimate clearly", () => {
  const corrected = applyContextEstimatePriority(
    wrongBlockedEstimate(),
    repairInfo("What you on about")
  );

  assert.equal(corrected.estimate.jobCode, "wc_inlet_valve");
  assert.match(corrected.reply, /did not display correctly/i);
});

test("a matching core estimate is left untouched", () => {
  const payload = wrongBlockedEstimate();
  payload.state.jobCode = "wc_inlet_valve";
  payload.estimate.jobCode = "wc_inlet_valve";
  payload.estimate.jobName = "Replace toilet inlet / fill valve";
  payload.estimate.max = 195;

  const unchanged = applyContextEstimatePriority(payload, repairInfo());
  assert.equal(unchanged, payload);
  assert.equal(unchanged.estimateCorrected, undefined);
});
