const LOCK_REPLY_FRAGMENT = "i only help with plumbing problems, live estimates and bookings";

const FALLBACK_PROMPTS = [
  {
    family: "toilet",
    step: 1,
    match: "what is the toilet actually doing",
    nextReply: "Is it a normal visible cistern, or a concealed/back-to-wall toilet with a flush plate?",
    nextQuickReplies: ["Visible cistern", "Concealed with flush plate", "Not sure"]
  },
  {
    family: "toilet",
    step: 2,
    match: "is it a normal visible cistern"
  },
  {
    family: "tap",
    step: 1,
    match: "where is the problem — dripping from the spout",
    nextReply: "Is it a single-lever mixer or separate hot and cold handles?",
    nextQuickReplies: ["Single-lever mixer", "Separate hot/cold handles", "Not sure"]
  },
  {
    family: "tap",
    step: 2,
    match: "is it a single-lever mixer"
  },
  {
    family: "drain",
    step: 1,
    match: "which outlet is affected",
    nextReply: "Is it completely blocked, or does the water still drain away slowly?",
    nextQuickReplies: ["Completely blocked", "Draining slowly", "Comes back up"]
  },
  {
    family: "drain",
    step: 2,
    match: "is it completely blocked"
  },
  {
    family: "leak",
    step: 1,
    match: "where are you actually seeing the water",
    nextReply: "Can you see the exact source of the leak, or does it need tracing to find where the water is coming from?",
    nextQuickReplies: ["I can see the source", "Source needs tracing", "Not sure"]
  },
  {
    family: "leak",
    step: 2,
    match: "can you see the exact source of the leak"
  },
  {
    family: "radiator",
    step: 1,
    match: "what is the main problem — radiator not heating",
    nextReply: "Is the issue on one radiator only, or are several radiators affected?",
    nextQuickReplies: ["One radiator", "Several radiators", "Not sure"]
  },
  {
    family: "radiator",
    step: 2,
    match: "is the issue on one radiator only"
  },
  {
    family: "generic",
    step: 1,
    match: "tell me where the problem is and exactly what the water or fitting is doing"
  }
];

function normaliseText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\u2013\u2014]/g, "—")
    .replace(/\s+/g, " ")
    .trim();
}

function validState(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function numericStep(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

function isLockReply(text) {
  return normaliseText(text).includes(LOCK_REPLY_FRAGMENT);
}

function promptForText(text) {
  const normalised = normaliseText(text);
  return FALLBACK_PROMPTS.find((prompt) => normalised.includes(normaliseText(prompt.match))) || null;
}

function findActiveFallback(history) {
  if (!Array.isArray(history)) return null;

  // Walk backwards through the current conversation. Lock replies are ignored so a
  // conversation already affected by the old bug can recover without being restarted.
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const item = history[index];
    if (!item || item.role !== "assistant") continue;

    const prompt = promptForText(item.content);
    if (prompt) return { index, prompt, text: String(item.content || "") };
    if (isLockReply(item.content)) continue;

    // A different assistant response marks a newer conversation stage. Do not revive
    // an old fallback prompt from a previous plumbing issue.
    return null;
  }

  return null;
}

function userTextSince(history, startIndex, currentMessage) {
  const parts = [];
  if (Array.isArray(history)) {
    for (let index = Math.max(0, startIndex + 1); index < history.length; index += 1) {
      const item = history[index];
      if (item && item.role === "user") parts.push(String(item.content || ""));
    }
  }
  parts.push(String(currentMessage || ""));
  return normaliseText(parts.join(" "));
}

function latestUsefulUserText(history, startIndex, currentMessage) {
  const current = String(currentMessage || "").trim();
  if (current) return current;

  if (!Array.isArray(history)) return "";
  for (let index = history.length - 1; index > startIndex; index -= 1) {
    const item = history[index];
    if (item && item.role === "user" && String(item.content || "").trim()) {
      return String(item.content).trim();
    }
  }
  return "";
}

export function inferFallbackStepFromText(text) {
  return promptForText(text)?.step || 0;
}

export function lastAssistantText(history) {
  if (!Array.isArray(history)) return "";
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const item = history[index];
    if (item && item.role === "assistant") return String(item.content || "");
  }
  return "";
}

export function inferFallbackStepFromHistory(history) {
  return findActiveFallback(history)?.prompt.step || 0;
}

export function inferFallbackContext(history, currentMessage) {
  const active = findActiveFallback(history);
  if (!active) return null;

  const userText = userTextSince(history, active.index, currentMessage);
  const symptomDetail = latestUsefulUserText(history, active.index, currentMessage);
  const context = {
    family: active.prompt.family,
    problemSummary: "Plumbing problem under diagnosis",
    symptomDetail,
    jobCode: ""
  };

  if (active.prompt.family === "toilet") {
    context.problemSummary = "Toilet fault under diagnosis";
    if (/running into the bowl|continuously running|keeps running/.test(userText)) {
      context.jobCode = "wc_running";
      context.problemSummary = "Toilet continuously running into the bowl";
    } else if (/slow to refill|filling slowly|fills slowly/.test(userText)) {
      context.jobCode = "wc_slow_fill";
      context.problemSummary = "Toilet cistern filling slowly";
    } else if (/not flushing properly|not flushing|won'?t flush|will not flush/.test(userText)) {
      context.jobCode = "wc_not_flushing";
      context.problemSummary = "Toilet not flushing properly";
    } else if (/leak|leaking/.test(userText)) {
      context.jobCode = "wc_cistern_leak";
      context.problemSummary = "Leaking toilet requiring diagnosis";
    }
  } else if (active.prompt.family === "tap") {
    context.problemSummary = "Tap fault under diagnosis";
    if (/dripping from (?:the )?spout|spout/.test(userText)) context.jobCode = "tap_drip";
    else if (/base|handle/.test(userText)) context.jobCode = "tap_base_leak";
    else if (/underneath|pipework|connection/.test(userText)) context.jobCode = "tap_connection_leak";
  } else if (active.prompt.family === "drain") {
    context.problemSummary = "Blocked or slow-draining plumbing outlet under diagnosis";
  } else if (active.prompt.family === "leak") {
    context.problemSummary = "Water leak under diagnosis";
    if (/visible pipe|visible fitting|i can see the source/.test(userText)) context.jobCode = "pipe_accessible";
    else if (/source needs tracing|ceiling|wall|not sure/.test(userText)) context.jobCode = "leak_trace";
  } else if (active.prompt.family === "radiator") {
    context.problemSummary = "Radiator or heating valve fault under diagnosis";
  }

  return context;
}

export function repairIncomingChatBody(body) {
  const safeBody = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  const incomingState = validState(safeBody.state);
  const historyStep = inferFallbackStepFromHistory(safeBody.history);
  const currentStep = numericStep(incomingState.fallbackStep);
  const repairedStep = Math.max(historyStep, currentStep);
  const state = { ...incomingState };
  const context = historyStep > 0 ? inferFallbackContext(safeBody.history, safeBody.message) : null;

  if (repairedStep > 0) state.fallbackStep = repairedStep;

  // The core Worker's topic guard treats very short replies such as "Not sure" as
  // unrelated unless the state already contains an active plumbing problem. Preserve
  // that context explicitly while a deterministic plumbing question is in progress.
  if (context) {
    if (!state.problemSummary) state.problemSummary = context.problemSummary;
    if (!state.symptomDetail && context.symptomDetail) state.symptomDetail = context.symptomDetail;
    if ((!state.jobCode || state.jobCode === "unknown_plumbing") && context.jobCode) {
      state.jobCode = context.jobCode;
    }
  }

  return {
    body: { ...safeBody, state },
    historyStep,
    currentStep,
    repairedStep,
    context,
    previousAssistant: lastAssistantText(safeBody.history)
  };
}

export function shouldForceDeterministicFallback(repairInfo) {
  if (!repairInfo || typeof repairInfo !== "object") return false;
  const state = validState(repairInfo.body?.state);
  return repairInfo.historyStep > 0 && !state.estimateReady;
}

export function repairOutgoingChatPayload(payload, repairInfo) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;

  const currentState = validState(payload.state);
  const replyStep = inferFallbackStepFromText(payload.reply);
  const incomingState = validState(repairInfo?.body?.state);
  const incomingStep = numericStep(incomingState.fallbackStep);
  const nextState = { ...incomingState, ...currentState };

  let repairedStep = Math.max(replyStep, incomingStep, numericStep(currentState.fallbackStep));
  if (payload.resetIssue && replyStep === 0) repairedStep = 0;

  if (repairedStep > 0) nextState.fallbackStep = repairedStep;
  else delete nextState.fallbackStep;

  return { ...payload, state: nextState };
}

export function applyRepeatedFallbackGuard(payload, repairInfo) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;

  const previous = normaliseText(repairInfo?.previousAssistant);
  const current = normaliseText(payload.reply);
  if (!previous || !current || previous !== current) return payload;

  const prompt = promptForText(current);
  if (!prompt) return payload;

  const state = { ...validState(repairInfo?.body?.state), ...validState(payload.state) };

  if (prompt.nextReply) {
    state.fallbackStep = 2;
    return {
      ...payload,
      reply: prompt.nextReply,
      quickReplies: [...prompt.nextQuickReplies],
      state,
      loopPrevented: true
    };
  }

  state.fallbackStep = Math.max(2, numericStep(state.fallbackStep));
  return {
    ...payload,
    reply: "Thanks — I’ve recorded that. Please add one more useful detail about the problem so I can finish the estimate.",
    quickReplies: [],
    state,
    loopPrevented: true
  };
}