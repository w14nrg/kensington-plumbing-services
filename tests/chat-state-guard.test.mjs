import test from "node:test";
import assert from "node:assert/strict";

import {
  applyRepeatedFallbackGuard,
  inferFallbackStepFromHistory,
  inferFallbackStepFromText,
  repairIncomingChatBody,
  repairOutgoingChatPayload,
  shouldForceDeterministicFallback
} from "../chat-state-guard.js";

const toiletFirstQuestion = "What is the toilet actually doing — continuously running into the bowl, filling very slowly, not flushing properly, or leaking?";
const toiletSecondQuestion = "Is it a normal visible cistern, or a concealed/back-to-wall toilet with a flush plate?";

test("detects first and second deterministic fallback steps", () => {
  assert.equal(inferFallbackStepFromText(toiletFirstQuestion), 1);
  assert.equal(inferFallbackStepFromText(toiletSecondQuestion), 2);
});

test("repairs a missing fallback step from conversation history", () => {
  const repaired = repairIncomingChatBody({
    message: "Slow to refill",
    state: { jobCode: "wc_slow_fill" },
    history: [
      { role: "assistant", content: toiletFirstQuestion },
      { role: "user", content: "Slow to refill" }
    ]
  });

  assert.equal(repaired.body.state.fallbackStep, 1);
  assert.equal(repaired.historyStep, 1);
});

test("preserves the furthest valid fallback step", () => {
  const repaired = repairIncomingChatBody({
    state: { fallbackStep: 2 },
    history: [{ role: "assistant", content: toiletFirstQuestion }]
  });

  assert.equal(repaired.body.state.fallbackStep, 2);
});

test("forces deterministic handling once the fallback conversation has begun", () => {
  const repaired = repairIncomingChatBody({
    state: {},
    history: [{ role: "assistant", content: toiletFirstQuestion }]
  });

  assert.equal(shouldForceDeterministicFallback(repaired), true);
});

test("does not force fallback once an estimate is ready", () => {
  const repaired = repairIncomingChatBody({
    state: { estimateReady: true },
    history: [{ role: "assistant", content: toiletFirstQuestion }]
  });

  assert.equal(shouldForceDeterministicFallback(repaired), false);
});

test("writes the fallback step back into the outgoing browser state", () => {
  const repairInfo = repairIncomingChatBody({ state: {}, history: [] });
  const payload = repairOutgoingChatPayload({
    reply: toiletFirstQuestion,
    state: { jobCode: "wc_slow_fill" }
  }, repairInfo);

  assert.equal(payload.state.fallbackStep, 1);
});

test("clears stale fallback progress when the core worker resets to a new issue", () => {
  const repairInfo = repairIncomingChatBody({
    state: { fallbackStep: 2 },
    history: [{ role: "assistant", content: toiletSecondQuestion }]
  });

  const payload = repairOutgoingChatPayload({
    reply: "Tell me a little more about the new plumbing issue.",
    state: { jobCode: "unknown_plumbing" },
    resetIssue: true
  }, repairInfo);

  assert.equal(Object.hasOwn(payload.state, "fallbackStep"), false);
});

test("prevents an identical first fallback question being shown twice", () => {
  const repairInfo = repairIncomingChatBody({
    state: {},
    history: [{ role: "assistant", content: toiletFirstQuestion }]
  });

  const guarded = applyRepeatedFallbackGuard({
    reply: toiletFirstQuestion,
    state: {},
    quickReplies: ["Running into the bowl", "Slow to refill", "Not flushing properly", "Leaking"]
  }, repairInfo);

  assert.equal(guarded.reply, toiletSecondQuestion);
  assert.deepEqual(guarded.quickReplies, ["Visible cistern", "Concealed with flush plate", "Not sure"]);
  assert.equal(guarded.state.fallbackStep, 2);
  assert.equal(guarded.loopPrevented, true);
});

test("recognises every current first-step fallback family", () => {
  const prompts = [
    "Where is the problem — dripping from the spout when off, leaking around the base/handle, or leaking from the pipework underneath?",
    "Which outlet is affected — kitchen sink, bathroom basin, shower/bath, or more than one fixture?",
    "Where are you actually seeing the water — from a visible pipe or fitting, under a sink/bath, from a ceiling or wall, or somewhere else?",
    "What is the main problem — radiator not heating, leaking, valve problem, or something else?",
    "Tell me where the problem is and exactly what the water or fitting is doing."
  ];

  for (const prompt of prompts) {
    assert.equal(inferFallbackStepFromHistory([{ role: "assistant", content: prompt }]), 1);
  }
});
