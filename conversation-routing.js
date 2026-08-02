const FAMILIES = ["toilet", "tap", "drain", "leak", "radiator", "generic"];

const QUESTIONS = {
  toilet: {
    1: {
      reply: "What is the toilet actually doing — continuously running into the bowl, filling very slowly, not flushing properly, or leaking?",
      quickReplies: ["Running into the bowl", "Slow to refill", "Not flushing properly", "Leaking"],
      match: /what is the toilet actually doing/i,
      clarify: "Which best describes the toilet fault: water running into the bowl, slow filling, not flushing, leaking, or another problem?"
    },
    2: {
      reply: "Is it a normal visible cistern, or a concealed/back-to-wall toilet with a flush plate?",
      quickReplies: ["Visible cistern", "Concealed with flush plate", "Not sure"],
      match: /is it a normal visible cistern/i,
      clarify: "Can you see the toilet cistern itself, or is it hidden behind a wall or panel with only a flush plate visible?"
    }
  },
  tap: {
    1: {
      reply: "Where is the problem — dripping from the spout when off, leaking around the base/handle, or leaking from the pipework underneath?",
      quickReplies: ["Dripping from spout", "Around base or handle", "Pipework underneath"],
      match: /where is the problem — dripping from the spout/i,
      clarify: "Is the water coming from the tap spout, around the tap body or handle, or from a connection underneath?"
    },
    2: {
      reply: "Is it a single-lever mixer or separate hot and cold handles?",
      quickReplies: ["Single-lever mixer", "Separate hot/cold handles", "Not sure"],
      match: /is it a single-lever mixer/i,
      clarify: "Does the tap have one lever controlling hot and cold, or two separate handles?"
    }
  },
  drain: {
    1: {
      reply: "Which outlet is affected — kitchen sink, bathroom basin, shower/bath, or more than one fixture?",
      quickReplies: ["Kitchen sink", "Bathroom basin", "Shower/bath", "More than one"],
      match: /which outlet is affected/i,
      clarify: "Which outlet is not draining properly: the kitchen sink, bathroom basin, shower or bath?"
    },
    2: {
      reply: "Is it completely blocked, or does the water still drain away slowly?",
      quickReplies: ["Completely blocked", "Draining slowly", "Comes back up"],
      match: /is it completely blocked, or does the water still drain away slowly/i,
      clarify: "Does the water stay there completely, drain away slowly, or come back up into the outlet?"
    }
  },
  leak: {
    1: {
      reply: "Where are you actually seeing the water — from a visible pipe or fitting, under a sink/bath, from a ceiling or wall, or somewhere else?",
      quickReplies: ["Visible pipe/fitting", "Under sink or bath", "Ceiling or wall", "Not sure"],
      match: /where are you actually seeing the water/i,
      clarify: "Where is the water appearing: from a visible pipe or fitting, below a sink or bath, through a ceiling or wall, or somewhere else?"
    },
    2: {
      reply: "Can you see the exact source of the leak, or does it need tracing to find where the water is coming from?",
      quickReplies: ["I can see the source", "Source needs tracing", "Not sure"],
      match: /can you see the exact source of the leak/i,
      clarify: "Can you see the exact pipe or fitting releasing water, or is water only appearing through the ceiling or wall so the source needs tracing?"
    }
  },
  radiator: {
    1: {
      reply: "What is the main problem — radiator not heating, leaking, valve problem, or something else?",
      quickReplies: ["Not heating", "Leaking", "Valve problem", "Something else"],
      match: /what is the main problem — radiator not heating/i,
      clarify: "Is the radiator cold, leaking water, or is there a problem with one of its valves?"
    },
    2: {
      reply: "Is the issue on one radiator only, or are several radiators affected?",
      quickReplies: ["One radiator", "Several radiators", "Not sure"],
      match: /is the issue on one radiator only/i,
      clarify: "Is this happening to just one radiator, or to more than one radiator in the property?"
    }
  },
  generic: {
    1: {
      reply: "Tell me where the problem is and exactly what the water or fitting is doing.",
      quickReplies: [],
      match: /tell me where the problem is and exactly what the water or fitting is doing/i,
      clarify: "Tell me which plumbing fitting is affected, where it is, and exactly what it is doing."
    },
    2: {
      reply: "Can you see and reach the affected fitting, or is the source hidden behind a wall, panel, floor or unit?",
      quickReplies: ["Visible and reachable", "Hidden or concealed", "Not sure"],
      match: /can you see and reach the affected fitting/i,
      clarify: "Is the affected pipe or fitting visible and reachable, or hidden behind a wall, panel, floor or unit?"
    }
  }
};

const TERMINAL_ESTIMATE_CLAIM = /(?:enough plumbing information|estimate|price|range).{0,80}(?:ready|shown|below|build|available)/i;
const SAFETY_REPLY = /(?:gas emergency|0800 111 999|leave the area|turn (?:the )?water off|isolate (?:the )?water)/i;
const CONFUSION = /^\s*(?:what|what\?|what do you mean\??|what are you asking\??|is what blocked\??|which bit\??|huh\??|sorry\??)\s*$/i;

function validObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function validFamily(value) {
  return FAMILIES.includes(value) ? value : "";
}

function numericStage(value) {
  const stage = Number(value);
  return Number.isFinite(stage) && stage >= 0 ? Math.min(3, Math.floor(stage)) : 0;
}

function userHistoryText(history, currentMessage = "") {
  const parts = [];
  if (Array.isArray(history)) {
    for (const item of history) {
      if (item?.role === "user") parts.push(String(item.content || ""));
    }
  }
  parts.push(String(currentMessage || ""));
  return parts.join(" ").toLowerCase();
}

export function identifyRoutingQuestion(text) {
  const value = String(text || "");
  for (const family of FAMILIES) {
    for (const stage of [1, 2]) {
      const definition = QUESTIONS[family]?.[stage];
      if (definition?.match.test(value)) return { family, stage, ...definition };
    }
  }
  return null;
}

function latestAssistantQuestion(history, family = "") {
  if (!Array.isArray(history)) return null;
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const item = history[index];
    if (item?.role !== "assistant") continue;
    const question = identifyRoutingQuestion(item.content);
    if (!question) continue;
    if (!family || question.family === family) return { ...question, index };
  }
  return null;
}

function familyFromJobCode(jobCode) {
  const code = String(jobCode || "").toLowerCase();
  if (!code || code === "unknown_plumbing") return "";
  if (/^(?:wc_|toilet)/.test(code)) return "toilet";
  if (/^(?:tap_|kitchen_tap|basin_mixer|basin_pair|bath_taps|bath_shower_mixer|wall_mounted_tap|boiling_tap)/.test(code)) return "tap";
  if (/(?:blocked|blockage|slow_drain|waste_block)/.test(code) && !/^wc_/.test(code)) return "drain";
  if (/^(?:radiator|trv_|lockshield|heating_valve)/.test(code)) return "radiator";
  if (/^(?:leak|pipe_|burst_pipe|pinhole_pipe|flexi_hose|isolation_valve|stopcock|water_meter|mains_pipe|underground_supply)/.test(code)) return "leak";
  return "";
}

export function classifyConversationFamily(history, currentMessage = "", state = {}) {
  const text = userHistoryText(history, currentMessage);
  const safeState = validObject(state);

  // Specific fixtures take priority over generic words such as "leak".
  if (/\b(?:toilet|cistern|\bwc\b|flush plate|flush button)\b/.test(text)) return "toilet";
  if (/\b(?:tap|mixer tap|faucet)\b/.test(text)) return "tap";
  if (/\b(?:radiator|\btrv\b|heating valve|lockshield)\b/.test(text)) return "radiator";

  // Drainage requires an actual drainage symptom. Merely mentioning a sink or bath as
  // the place where a leak is visible must never switch the conversation to blockage.
  if (/\b(?:blocked|blockage|not draining|won'?t drain|will not drain|draining slowly|slow to drain|backs? up|coming back up|gurgling drain)\b/.test(text)) return "drain";

  if (/\b(?:leak|leaking|water (?:coming|dripping|running|pouring|appearing)|ceiling|wall|flat above|upstairs flat|damp patch|water stain|wet patch|pipe burst)\b/.test(text)) return "leak";

  return familyFromJobCode(safeState.jobCode) || "";
}

function explicitNewIssue(message) {
  return /\b(?:new|another|different|separate|also have|second)\b.{0,40}\b(?:problem|issue|leak|tap|toilet|radiator|drain|sink|pipe)\b/i.test(String(message || ""));
}

export function prepareConversationRoute(body) {
  const safeBody = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  const state = { ...validObject(safeBody.state) };
  const history = Array.isArray(safeBody.history) ? safeBody.history : [];
  const message = String(safeBody.message || "");
  const previousFamily = validFamily(state.conversationFamily);
  const userFamily = classifyConversationFamily(history, message, state);
  const jobFamily = familyFromJobCode(state.jobCode);
  const latestAnyQuestion = latestAssistantQuestion(history);

  let family = previousFamily || userFamily || jobFamily || latestAnyQuestion?.family || "";

  if (previousFamily && userFamily && userFamily !== previousFamily && state.estimateReady && explicitNewIssue(message)) {
    family = userFamily;
    state.conversationStage = 0;
    delete state.lastEstimate;
    delete state.lockedJobCode;
    delete state.estimateReady;
  }

  const latestFamilyQuestion = family ? latestAssistantQuestion(history, family) : null;
  let stage = numericStage(state.conversationStage);
  if (!stage && latestFamilyQuestion) stage = latestFamilyQuestion.stage;

  if (family) {
    state.conversationFamily = family;
    state.conversationStage = stage;
  }

  return {
    body: { ...safeBody, state },
    family,
    stage,
    message,
    latestAnyQuestion,
    latestFamilyQuestion,
    crossFamilyHistory: Boolean(latestAnyQuestion && family && latestAnyQuestion.family !== family)
  };
}

function questionPayload(family, stage, state, payload, reason) {
  const definition = QUESTIONS[family]?.[stage] || QUESTIONS.generic[stage] || QUESTIONS.generic[1];
  const nextState = {
    ...state,
    conversationFamily: family,
    conversationStage: stage,
    fallbackStep: stage
  };

  return {
    ...payload,
    reply: definition.reply,
    quickReplies: [...definition.quickReplies],
    state: nextState,
    estimate: null,
    showEstimateNow: false,
    topicLocked: false,
    routeVersion: "explicit-family-v1",
    routeRepair: reason
  };
}

function clarificationPayload(family, stage, state, payload) {
  const definition = QUESTIONS[family]?.[stage] || QUESTIONS.generic[Math.min(2, Math.max(1, stage))];
  return {
    ...payload,
    reply: definition.clarify,
    quickReplies: [...definition.quickReplies],
    state: {
      ...state,
      conversationFamily: family,
      conversationStage: stage,
      fallbackStep: stage
    },
    estimate: null,
    showEstimateNow: false,
    topicLocked: false,
    routeVersion: "explicit-family-v1",
    routeRepair: "clarified-current-question"
  };
}

export function applyConversationRoute(payload, routeInfo) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;

  const incomingState = validObject(routeInfo?.body?.state);
  const payloadState = validObject(payload.state);
  const state = { ...incomingState, ...payloadState };
  const reply = String(payload.reply || "");

  if (payload.safety || SAFETY_REPLY.test(reply)) {
    return { ...payload, state, routeVersion: "explicit-family-v1" };
  }

  if (payload.resetIssue === true) {
    delete state.conversationFamily;
    delete state.conversationStage;
    delete state.fallbackStep;
  }

  const emittedQuestion = identifyRoutingQuestion(reply);
  const family = validFamily(routeInfo?.family) || emittedQuestion?.family || "";
  const currentStage = numericStage(routeInfo?.stage);

  if (!family) return { ...payload, state, routeVersion: "explicit-family-v1" };

  // If an older broken reply from another family is already in browser history, resume
  // from the last question belonging to the real user-described issue.
  if (routeInfo?.crossFamilyHistory) {
    const expectedStage = currentStage <= 0 ? 1 : Math.min(2, currentStage + 1);
    return questionPayload(family, expectedStage, state, payload, "recovered-cross-family-history");
  }

  // A user asking for clarification should get the same issue-specific question in
  // plainer language, not an unrelated question or an immediate diagnosis charge.
  if (CONFUSION.test(String(routeInfo?.message || "")) && currentStage > 0 && currentStage <= 2) {
    return clarificationPayload(family, currentStage, state, payload);
  }

  if (emittedQuestion) {
    const expectedStage = currentStage <= 0 ? 1 : currentStage === 1 ? 2 : 3;

    if (expectedStage <= 2 && (emittedQuestion.family !== family || emittedQuestion.stage !== expectedStage)) {
      return questionPayload(family, expectedStage, state, payload, "prevented-cross-family-question");
    }

    if (expectedStage === 3) {
      return {
        ...payload,
        reply: "I have enough information to show the current estimate or, where the exact source is still unclear, the visit and diagnosis option.",
        quickReplies: [],
        state: {
          ...state,
          conversationFamily: family,
          conversationStage: 3,
          fallbackStep: 2
        },
        estimate: payload.estimate || null,
        topicLocked: false,
        routeVersion: "explicit-family-v1",
        routeRepair: "stopped-third-routing-question"
      };
    }

    state.conversationFamily = family;
    state.conversationStage = emittedQuestion.stage;
    state.fallbackStep = emittedQuestion.stage;
    return { ...payload, state, routeVersion: "explicit-family-v1" };
  }

  state.conversationFamily = family;
  state.conversationStage = payload.estimate || payload.showEstimateNow || state.estimateReady || TERMINAL_ESTIMATE_CLAIM.test(reply)
    ? 3
    : currentStage;

  return { ...payload, state, routeVersion: "explicit-family-v1" };
}
