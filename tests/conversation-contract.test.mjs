import test from "node:test";
import assert from "node:assert/strict";

import { applyUniversalConversationContract } from "../conversation-contract.js";

function requestBody(message, state = {}, previousAssistant = "") {
  return {
    message,
    state,
    history: previousAssistant
      ? [{ role: "assistant", content: previousAssistant }]
      : []
  };
}

test("250 different priced jobs always return a visible estimate and price text", () => {
  for (let index = 1; index <= 250; index += 1) {
    const min = 75 + index;
    const max = min + 100;
    const jobCode = `generated_job_${index}`;

    const result = applyUniversalConversationContract({
      reply: "Thanks, I have enough information.",
      state: { jobCode },
      estimate: {
        estimateId: `est_${index}`,
        jobCode,
        jobName: `Generated plumbing job ${index}`,
        min,
        max,
        confidence: "Building",
        canBook: true
      },
      showEstimateNow: false
    }, requestBody(`Description ${index}`));

    assert.equal(result.showEstimateNow, true, `estimate ${index} was hidden`);
    assert.equal(result.state.estimateReady, true);
    assert.equal(result.state.lockedJobCode, jobCode);
    assert.equal(result.state.lastEstimate.jobCode, jobCode);
    assert.equal(result.estimate.min, min);
    assert.equal(result.estimate.max, max);
    assert.match(result.reply, new RegExp(`£${min}`));
    assert.match(result.reply, new RegExp(`£${max}`));
    assert.equal(result.contractVersion, "universal-v1");
  }
});

test("120 false estimate-ready replies become a real £75 diagnosis option", () => {
  const claims = [
    "Your estimate is ready below.",
    "The price range is built and ready.",
    "Thanks — I’ve got enough plumbing information to build the current estimate.",
    "The current estimate is shown below."
  ];

  for (let index = 0; index < 120; index += 1) {
    const reply = claims[index % claims.length];
    const result = applyUniversalConversationContract({
      reply,
      state: {
        jobCode: "unknown_plumbing",
        problemSummary: `Unclear plumbing issue ${index}`
      },
      estimate: null,
      showEstimateNow: index % 2 === 0
    }, requestBody(`Customer description ${index}`));

    assert.equal(result.showEstimateNow, true);
    assert.equal(result.estimate.min, 75);
    assert.equal(result.estimate.max, 75);
    assert.equal(result.estimate.mode, "diagnosis");
    assert.match(result.reply, /£75/);
    assert.doesNotMatch(result.reply, /got enough plumbing information/i);
    assert.ok(result.contractRepairs.includes("replaced-false-estimate-claim"));
  }
});

test("120 repeated assistant replies are never returned word-for-word", () => {
  const repeated = "Where can you see or hear the problem, and is any water escaping?";

  for (let index = 0; index < 120; index += 1) {
    const result = applyUniversalConversationContract({
      reply: repeated,
      state: {
        jobCode: "unknown_plumbing",
        problemSummary: `Active fault ${index}`,
        symptomDetail: index % 2 ? "making a noise" : "leaking"
      },
      estimate: null
    }, requestBody(`Answer ${index}`, {}, repeated));

    assert.notEqual(result.reply.trim().toLowerCase(), repeated.toLowerCase());
    assert.equal(result.topicLocked, false);
    assert.ok(
      result.reply.endsWith("?") || result.showEstimateNow,
      `repeat ${index} neither asked a question nor showed an estimate`
    );
  }
});

test("100 follow-ups preserve the estimate already shown", () => {
  for (let index = 0; index < 100; index += 1) {
    const min = 100 + index;
    const max = min + 80;
    const lastEstimate = {
      estimateId: `saved_${index}`,
      jobCode: `saved_job_${index}`,
      jobName: `Saved plumbing job ${index}`,
      min,
      max,
      confidence: "Good",
      canBook: true,
      showNow: true
    };

    const state = {
      jobCode: lastEstimate.jobCode,
      lockedJobCode: lastEstimate.jobCode,
      estimateReady: true,
      lastEstimate,
      problemSummary: `Saved issue ${index}`
    };

    const result = applyUniversalConversationContract({
      reply: "Thanks — I’ve got enough plumbing information to build the current estimate.",
      state,
      estimate: null,
      showEstimateNow: false
    }, requestBody(index % 2 ? "What you on about" : "Where is the estimate?", state));

    assert.equal(result.showEstimateNow, true);
    assert.equal(result.estimate.jobCode, lastEstimate.jobCode);
    assert.equal(result.estimate.min, min);
    assert.equal(result.estimate.max, max);
    assert.match(result.reply, new RegExp(`£${min}`));
    assert.match(result.reply, new RegExp(`£${max}`));
    assert.ok(result.contractRepairs.includes("restored-last-estimate"));
  }
});

test("100 jobs cannot silently change after their estimate is locked", () => {
  for (let index = 0; index < 100; index += 1) {
    const lockedCode = `locked_job_${index}`;
    const wrongCode = `wrong_job_${index}`;
    const lastEstimate = {
      estimateId: `locked_est_${index}`,
      jobCode: lockedCode,
      jobName: `Locked job ${index}`,
      min: 125,
      max: 225,
      confidence: "Good",
      canBook: true,
      showNow: true
    };
    const state = {
      jobCode: lockedCode,
      lockedJobCode: lockedCode,
      estimateReady: true,
      lastEstimate
    };

    const result = applyUniversalConversationContract({
      reply: "Updated estimate.",
      state: { ...state, jobCode: wrongCode },
      estimate: {
        estimateId: lastEstimate.estimateId,
        jobCode: wrongCode,
        jobName: `Wrong job ${index}`,
        min: 400,
        max: 600,
        confidence: "Good",
        canBook: true
      },
      showEstimateNow: true
    }, requestBody("One more detail", state));

    assert.equal(result.estimate.jobCode, lockedCode);
    assert.equal(result.estimate.min, 125);
    assert.equal(result.estimate.max, 225);
    assert.equal(result.estimateCorrected, true);
    assert.deepEqual(result.estimateCorrection, {
      fromJobCode: wrongCode,
      toJobCode: lockedCode,
      reason: "locked-estimate-context"
    });
  }
});

test("short contextual answers remain inside an active plumbing conversation", () => {
  const answers = [
    "Not sure",
    "Behind it",
    "At the top",
    "Only when it flushes",
    "It started yesterday",
    "Yes",
    "No",
    "What do you mean?"
  ];

  for (const answer of answers) {
    const result = applyUniversalConversationContract({
      reply: "I only help with plumbing problems, live estimates and bookings.",
      state: {
        problemSummary: "Active toilet fault",
        symptomDetail: "making a noise"
      },
      estimate: null,
      topicLocked: true
    }, requestBody(answer, {
      problemSummary: "Active toilet fault",
      symptomDetail: "making a noise"
    }));

    assert.equal(result.topicLocked, false, answer);
    assert.doesNotMatch(result.reply, /i only help with plumbing problems/i);
  }
});

test("genuine unrelated questions are still kept out of the plumbing estimator", () => {
  const result = applyUniversalConversationContract({
    reply: "I only help with plumbing problems, live estimates and bookings.",
    state: { problemSummary: "Active toilet fault" },
    estimate: null,
    topicLocked: true
  }, requestBody("Who owns the website and what football team do they support?", {
    problemSummary: "Active toilet fault"
  }));

  assert.equal(result.topicLocked, true);
  assert.match(result.reply, /only help with plumbing problems/i);
});

test("safety instructions are not replaced with a price", () => {
  const safety = "Leave the area, avoid electrical switches and call the National Gas Emergency Service on 0800 111 999.";
  const result = applyUniversalConversationContract({
    reply: safety,
    state: { safety: "gas" },
    estimate: null,
    showEstimateNow: false
  }, requestBody("I can smell gas"));

  assert.equal(result.estimate, null);
  assert.equal(result.showEstimateNow, false);
  assert.equal(result.reply, safety);
});
