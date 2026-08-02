import test from "node:test";
import assert from "node:assert/strict";

import {
  applyConversationRoute,
  classifyConversationFamily,
  identifyRoutingQuestion,
  prepareConversationRoute
} from "../conversation-routing.js";

const prompts = {
  toilet1: "What is the toilet actually doing — continuously running into the bowl, filling very slowly, not flushing properly, or leaking?",
  toilet2: "Is it a normal visible cistern, or a concealed/back-to-wall toilet with a flush plate?",
  tap1: "Where is the problem — dripping from the spout when off, leaking around the base/handle, or leaking from the pipework underneath?",
  tap2: "Is it a single-lever mixer or separate hot and cold handles?",
  drain1: "Which outlet is affected — kitchen sink, bathroom basin, shower/bath, or more than one fixture?",
  drain2: "Is it completely blocked, or does the water still drain away slowly?",
  leak1: "Where are you actually seeing the water — from a visible pipe or fitting, under a sink/bath, from a ceiling or wall, or somewhere else?",
  leak2: "Can you see the exact source of the leak, or does it need tracing to find where the water is coming from?",
  radiator1: "What is the main problem — radiator not heating, leaking, valve problem, or something else?",
  radiator2: "Is the issue on one radiator only, or are several radiators affected?"
};

function assistant(content) {
  return { role: "assistant", content };
}

function user(content) {
  return { role: "user", content };
}

function payload(reply, state = {}) {
  return {
    reply,
    state,
    quickReplies: [],
    estimate: null,
    showEstimateNow: false,
    topicLocked: false
  };
}

test("recognises every deterministic routing question and stage", () => {
  for (const [key, prompt] of Object.entries(prompts)) {
    const identified = identifyRoutingQuestion(prompt);
    assert.ok(identified, key);
    assert.equal(`${identified.family}${identified.stage}`, key);
  }
});

test("assistant wording is excluded from issue classification", () => {
  const history = [
    user("I have a leak"),
    assistant(prompts.leak1),
    user("Coming from the flat above")
  ];

  // The assistant's leak question contains “sink/bath”, but that must never make the
  // conversation a drain or blockage issue.
  assert.equal(classifyConversationFamily(history, "", {}), "leak");
});

test("the exact reported leak conversation cannot jump into blockage", () => {
  const firstRoute = prepareConversationRoute({
    message: "I have a leak",
    state: {},
    history: []
  });
  const first = applyConversationRoute(payload(prompts.leak1), firstRoute);
  assert.equal(first.state.conversationFamily, "leak");
  assert.equal(first.state.conversationStage, 1);

  const secondRoute = prepareConversationRoute({
    message: "Coming from the flat above",
    state: first.state,
    history: [
      user("I have a leak"),
      assistant(first.reply)
    ]
  });

  // Simulate the broken core fallback returning the drain question because its own
  // earlier assistant text included the words sink/bath.
  const second = applyConversationRoute(payload(prompts.drain2, {
    ...secondRoute.body.state,
    fallbackStep: 2
  }), secondRoute);

  assert.equal(second.reply, prompts.leak2);
  assert.equal(second.state.conversationFamily, "leak");
  assert.equal(second.state.conversationStage, 2);
  assert.equal(second.routeRepair, "prevented-cross-family-question");
  assert.doesNotMatch(second.reply, /blocked|drain away/i);

  const thirdRoute = prepareConversationRoute({
    message: "What",
    state: second.state,
    history: [
      user("I have a leak"),
      assistant(first.reply),
      user("Coming from the flat above"),
      assistant(second.reply)
    ]
  });
  const third = applyConversationRoute(payload("Thanks — I’ve got enough plumbing information to build the current estimate.", thirdRoute.body.state), thirdRoute);

  assert.equal(third.routeRepair, "clarified-current-question");
  assert.match(third.reply, /exact pipe or fitting|source needs tracing/i);
  assert.doesNotMatch(third.reply, /blocked|drain away/i);
  assert.equal(third.showEstimateNow, false);
});

test("an already polluted browser conversation recovers to its user-described family", () => {
  const history = [
    user("I have a leak"),
    assistant(prompts.leak1),
    user("Coming from the flat above"),
    assistant(prompts.drain2)
  ];

  const route = prepareConversationRoute({
    message: "Is what blocked?",
    state: { fallbackStep: 2, jobCode: "leak_trace" },
    history
  });

  assert.equal(route.family, "leak");
  assert.equal(route.stage, 1);
  assert.equal(route.crossFamilyHistory, true);

  const repaired = applyConversationRoute(payload("The £75 diagnosis option is shown below.", route.body.state), route);
  assert.equal(repaired.reply, prompts.leak2);
  assert.equal(repaired.routeRepair, "recovered-cross-family-history");
  assert.equal(repaired.state.conversationFamily, "leak");
  assert.equal(repaired.state.conversationStage, 2);
});

test("all plumbing families reject every other family's next question", () => {
  const families = ["toilet", "tap", "drain", "leak", "radiator"];

  for (const family of families) {
    const firstPrompt = prompts[`${family}1`];
    const correctSecond = prompts[`${family}2`];

    for (const wrongFamily of families) {
      if (wrongFamily === family) continue;

      const route = prepareConversationRoute({
        message: `Answer for ${family}`,
        state: {
          conversationFamily: family,
          conversationStage: 1,
          fallbackStep: 1,
          problemSummary: `${family} problem`
        },
        history: [assistant(firstPrompt)]
      });

      const repaired = applyConversationRoute(payload(prompts[`${wrongFamily}2`], route.body.state), route);
      assert.equal(repaired.reply, correctSecond, `${family} accepted ${wrongFamily} question`);
      assert.equal(repaired.state.conversationFamily, family);
      assert.equal(repaired.state.conversationStage, 2);
      assert.equal(repaired.routeRepair, "prevented-cross-family-question");
    }
  }
});

test("one thousand generated cross-family responses preserve their active issue", () => {
  const families = ["toilet", "tap", "drain", "leak", "radiator"];

  for (let index = 0; index < 1000; index += 1) {
    const family = families[index % families.length];
    const wrongFamily = families[(index + 1 + (index % 3)) % families.length];
    if (wrongFamily === family) continue;

    const route = prepareConversationRoute({
      message: `Generated answer ${index}`,
      state: {
        conversationFamily: family,
        conversationStage: 1,
        fallbackStep: 1,
        jobCode: family === "toilet" ? "wc_running" : "unknown_plumbing"
      },
      history: [assistant(prompts[`${family}1`])]
    });

    const result = applyConversationRoute(payload(prompts[`${wrongFamily}2`], route.body.state), route);
    const identified = identifyRoutingQuestion(result.reply);
    assert.equal(identified.family, family, `case ${index}`);
    assert.equal(identified.stage, 2, `case ${index}`);
    assert.equal(result.state.conversationFamily, family, `case ${index}`);
  }
});

test("a third deterministic question is stopped and handed to estimate handling", () => {
  const route = prepareConversationRoute({
    message: "Visible pipe",
    state: {
      conversationFamily: "leak",
      conversationStage: 2,
      fallbackStep: 2,
      problemSummary: "Visible leak"
    },
    history: [assistant(prompts.leak2)]
  });

  const result = applyConversationRoute(payload(prompts.drain1, route.body.state), route);
  assert.equal(result.state.conversationFamily, "leak");
  assert.equal(result.state.conversationStage, 3);
  assert.equal(result.routeRepair, "stopped-third-routing-question");
  assert.match(result.reply, /estimate|diagnosis option/i);
  assert.doesNotMatch(result.reply, /which outlet|blocked|drain away/i);
});
