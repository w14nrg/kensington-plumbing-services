import test from "node:test";
import assert from "node:assert/strict";

import { applyPlumbingFlowEngine } from "../plumbing-flow-engine.js";

function request(message, state = {}, history = []) {
  return { message, state, history };
}

function payload(reply, state = {}, estimate = null) {
  return {
    reply,
    state,
    estimate,
    showEstimateNow: Boolean(estimate),
    topicLocked: false,
    quickReplies: []
  };
}

function user(content) {
  return { role: "user", content };
}

function assistant(content) {
  return { role: "assistant", content };
}

test("toilet leak asks for the actual source rather than cistern type", () => {
  const body = request("My toilet is leaking", {
    conversationFamily: "toilet",
    conversationStage: 1,
    jobCode: "wc_cistern_leak"
  });

  const result = applyPlumbingFlowEngine(
    payload("Is it a normal visible cistern, or a concealed/back-to-wall toilet with a flush plate?", body.state),
    body
  );

  assert.match(result.reply, /where is the toilet leaking from/i);
  assert.match(result.reply, /small water pipe/i);
  assert.match(result.reply, /large waste connection/i);
  assert.equal(result.showEstimateNow, false);
  assert.equal(result.estimate, null);
  assert.equal(result.state.pendingQuestion, "toilet_leak_source");
});

test("the exact screenshot conversation does not jump to £75", () => {
  const history = [
    user("My toilet is leaking"),
    assistant("Is it a normal visible cistern, or a concealed/back-to-wall toilet with a flush plate?")
  ];
  const body = request("It's coming from the pipe at the back", {
    conversationFamily: "toilet",
    conversationStage: 2,
    jobCode: "wc_cistern_leak",
    estimateReady: true,
    lastEstimate: {
      jobCode: "unknown_plumbing",
      jobName: "Visit and plumbing diagnosis",
      min: 75,
      max: 75
    }
  }, history);

  const result = applyPlumbingFlowEngine(
    payload(
      "The next step is the £75 visit and diagnosis.",
      body.state,
      {
        jobCode: "unknown_plumbing",
        jobName: "Visit and plumbing diagnosis",
        min: 75,
        max: 75
      }
    ),
    body
  );

  assert.match(result.reply, /small water-supply pipe/i);
  assert.match(result.reply, /larger waste connector/i);
  assert.doesNotMatch(result.reply, /£75/);
  assert.equal(result.estimate, null);
  assert.equal(result.showEstimateNow, false);
  assert.equal(result.state.pendingQuestion, "toilet_back_pipe_type");
  assert.equal(result.state.estimateReady, undefined);
  assert.equal(result.state.lastEstimate, undefined);
});

test("What rephrases the current pipe question instead of repeating diagnosis", () => {
  const body = request("What", {
    conversationFamily: "toilet",
    pendingQuestion: "toilet_back_pipe_type",
    jobCode: "wc_cistern_leak"
  }, [
    user("My toilet is leaking"),
    assistant("Where is it leaking from?"),
    user("It's coming from the pipe at the back"),
    assistant("At the back of the toilet, is it the small water-supply pipe or the much larger waste connector near the floor or wall?")
  ]);

  const result = applyPlumbingFlowEngine(
    payload("The current booking option is still the £75 visit and diagnosis.", body.state, {
      jobCode: "unknown_plumbing",
      min: 75,
      max: 75
    }),
    body
  );

  assert.match(result.reply, /thin/i);
  assert.match(result.reply, /large toilet outlet pipe/i);
  assert.doesNotMatch(result.reply, /£75/);
  assert.equal(result.estimate, null);
  assert.equal(result.showEstimateNow, false);
});

test("small pipe produces a specific repair estimate", () => {
  const body = request("It's the small thin pipe", {
    conversationFamily: "toilet",
    pendingQuestion: "toilet_back_pipe_type",
    jobCode: "wc_cistern_leak"
  }, [
    user("My toilet is leaking"),
    user("It's coming from the pipe at the back")
  ]);

  const result = applyPlumbingFlowEngine(payload("Thanks.", body.state), body);
  assert.equal(result.showEstimateNow, true);
  assert.equal(result.estimate.jobCode, "wc_supply_pipe_leak");
  assert.equal(result.estimate.min, 95);
  assert.equal(result.estimate.max, 195);
  assert.match(result.reply, /£95/);
  assert.match(result.reply, /£195/);
});

test("large pipe produces pan connector estimate", () => {
  const body = request("It's the large pipe where it joins the wall", {
    conversationFamily: "toilet",
    pendingQuestion: "toilet_back_pipe_type",
    jobCode: "wc_cistern_leak"
  });

  const result = applyPlumbingFlowEngine(payload("Thanks.", body.state), body);
  assert.equal(result.estimate.jobCode, "wc_pan_connector");
  assert.equal(result.estimate.min, 145);
  assert.equal(result.estimate.max, 320);
  assert.match(result.reply, /£145/);
  assert.match(result.reply, /£320/);
});

test("diagnosis is only offered after a targeted question is answered Not sure", () => {
  const body = request("Not sure", {
    conversationFamily: "toilet",
    pendingQuestion: "toilet_back_pipe_type",
    jobCode: "wc_cistern_leak"
  });

  const result = applyPlumbingFlowEngine(payload("Thanks.", body.state), body);
  assert.equal(result.showEstimateNow, true);
  assert.equal(result.estimate.mode, "diagnosis");
  assert.equal(result.estimate.min, 75);
  assert.equal(result.estimate.max, 75);
  assert.match(result.reply, /£75/);
  assert.equal(result.flowRepair, "diagnosis-after-targeted-clarifier");
});

test("500 ambiguous toilet pipe descriptions never produce premature diagnosis", () => {
  for (let index = 0; index < 500; index += 1) {
    const body = request(`There is water from a pipe behind the toilet ${index}`, {
      conversationFamily: "toilet",
      conversationStage: 2,
      jobCode: "wc_cistern_leak"
    });
    const result = applyPlumbingFlowEngine(
      payload("The £75 diagnosis option is shown below.", body.state, {
        jobCode: "unknown_plumbing",
        min: 75,
        max: 75
      }),
      body
    );

    assert.equal(result.estimate, null, `case ${index}`);
    assert.equal(result.showEstimateNow, false, `case ${index}`);
    assert.match(result.reply, /small water-supply pipe|large.*waste connector/i, `case ${index}`);
    assert.doesNotMatch(result.reply, /£75/, `case ${index}`);
  }
});
