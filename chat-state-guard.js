const LOCK_REPLY_FRAGMENT = "i only help with plumbing problems, live estimates and bookings";
const TERMINAL_FALLBACK_FRAGMENT = "got enough plumbing information to build the current estimate";

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

const FALLBACK_ESTIMATES = {
  wc_running: {
    jobName: "Running toilet / water continuously entering pan",
    min: 95,
    max: 190
  },
  wc_slow_fill: {
    jobName: "Toilet filling slowly",
    min: 95,
    max: 185
  },
  wc_not_flushing: {
    jobName: "Toilet will not flush",
    min: 95,
    max: 210
  },
  wc_cistern_leak: {
    jobName: "Leaking toilet cistern",
    min: 110,
    max: 250
  },
  wc_inlet_valve: {
    jobName: "Noisy toilet / inlet or fill-valve fault",
    min: 105,
    max: 195
  },
  tap_drip: {
    jobName: "Repair dripping tap",
    min: 95,
    max: 190
  },
  tap_base_leak: {
    jobName: "Tap leaking at base / body",
    min: 95,
    max: 210
  },
  tap_connection_leak: {
    jobName: "Tap connection leak below sink or basin",
    min: 95,
    max: 190
  },
  pipe_accessible: {
    jobName: "Repair accessible leaking pipe or fitting",
    min: 95,
    max: 195
  },
  leak_trace: {
    jobName: "Trace and diagnose an unidentified leak",
    min: 75,
    max: 195
  }
};

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

function isTerminalFallbackReply(text) {
  return normaliseText(text).includes(TERMINAL_FALLBACK_FRAGMENT);
}

function promptForText(text) {
  const normalised = normaliseText(text);
  return FALLBACK_PROMPTS.find((prompt) => normalised.includes(normaliseText(prompt.match))) || null;
}

function findActiveFallback(history) {
  if (!Array.isArray(history)) return null;

  // Walk backwards through the active conversation. Old lock replies and the broken
  // "enough information" reply are ignored so an affected chat can repair itself.
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const item = history[index];
    if (!item || item.role !== "assistant") continue;

    const prompt = promptForText(item.content);
    if (prompt) return { index, prompt, text: String(item.content || "") };
    if (isLockReply(item.content) || isTerminalFallbackReply(item.content)) continue;

    // A real different assistant response marks a newer conversation stage.
    return null;
  }

  return null;
}

function fallbackFamilyStartIndex(history, active) {
  if (!Array.isArray(history) || !active) return active?.index ?? -1;

  let startIndex = active.index;
  for (let index = active.index - 1; index >= 0; index -= 1) {
    const item = history[index];
    if (!item || item.role !== "assistant") continue;

    const prompt = promptForText(item.content);
    if (prompt?.family === active.prompt.family) {
      startIndex = index;
      continue;
    }
    if (isLockReply(item.content) || isTerminalFallbackReply(item.content)) continue;

    // A different assistant response or fallback family marks the boundary.
    break;
  }

  return startIndex;
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

function isConfusedFollowUp(message) {
  return /\b(?:what (?:are|you|do)|what'?s that|what you on about|what do you mean|where(?:'s| is) (?:the )?estimate|no estimate|didn'?t show|nothing showed)\b/i
    .test(String(message || ""));
}

function buildFallbackEstimate(state, context) {
  const safeState = validState(state);
  const jobCode = (
    (safeState.jobCode && safeState.jobCode !== "unknown_plumbing" && safeState.jobCode) ||
    context?.jobCode ||
    ""
  );
  const priced = FALLBACK_ESTIMATES[jobCode];

  if (priced) {
    const confidenceScore = Math.max(55, Number(safeState.confidenceScore) || 0);
    return {
      estimateId: safeState.estimateId || null,
      jobCode,
      jobName: priced.jobName,
      mode: "standard",
      fee: null,
      min: priced.min,
      max: priced.max,
      confidence: confidenceScore >= 70 ? "Good" : "Building",
      confidenceScore,
      canBook: true,
      provisional: false,
      summary: context?.problemSummary || safeState.problemSummary || priced.jobName,
      showNow: true
    };
  }

  // Never claim that an estimate is ready and then show nothing. Where the exact
  // repair is still unclear, show the advertised attendance and diagnosis fee.
  return {
    estimateId: safeState.estimateId || null,
    jobCode: "unknown_plumbing",
    jobName: "Plumbing fault diagnosis",
    mode: "diagnosis",
    fee: 75,
    min: 75,
    max: 75,
    confidence: "Low",
    confidenceScore: Math.max(35, Number(safeState.confidenceScore) || 0),
    canBook: true,
    provisional: false,
    summary: context?.problemSummary || safeState.problemSummary || "Plumbing fault requiring diagnosis",
    showNow: true
  };
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

  const familyStartIndex = fallbackFamilyStartIndex(history, active);
  const userText = userTextSince(history, familyStartIndex, currentMessage);
  const symptomDetail = latestUsefulUserText(history, familyStartIndex, currentMessage);
  const context = {
    family: active.prompt.family,
    problemSummary: "Plumbing problem under diagnosis",
    symptomDetail,
    jobCode: "",
    access: "unknown",
    matchConfidence: "low"
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
    } else if (/\b(?:noise|noisy|making noise|humming|buzzing|whistling|vibrating|rattling|banging)\b/.test(userText)) {
      context.jobCode = "wc_inlet_valve";
      context.problemSummary = "Noisy toilet cistern, likely an inlet, fill-valve or internal mechanism fault";
    }

    if (/concealed|back[- ]to[- ]wall|flush plate|button on (?:the )?wall|hidden cistern/.test(userText)) {
      context.access = "concealed";
    } else if (/visible cistern|normal cistern|flush (?:button )?(?:at|on) the top|button (?:at|on) (?:the )?top|top[- ]mounted flush/.test(userText)) {
      context.access = "easy";
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

  if (context.jobCode) context.matchConfidence = "medium";
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

  // Short answers are valid while Ken is asking a plumbing question. Preserve enough
  // job context for the core Worker to calculate and display an estimate.
  if (context) {
    if (!state.problemSummary || state.jobCode === "unknown_plumbing") {
      state.problemSummary = context.problemSummary;
    }
    if (context.symptomDetail) state.symptomDetail = context.symptomDetail;
    if ((!state.jobCode || state.jobCode === "unknown_plumbing") && context.jobCode) {
      state.jobCode = context.jobCode;
    }
    if ((!state.access || state.access === "unknown") && context.access !== "unknown") {
      state.access = context.access;
    }
    if (context.matchConfidence === "medium" && state.matchConfidence !== "high") {
      state.matchConfidence = "medium";
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

export function repairFallbackCompletion(payload, repairInfo) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
  if (!isTerminalFallbackReply(payload.reply)) return payload;

  const incomingState = validState(repairInfo?.body?.state);
  const payloadState = validState(payload.state);
  const state = { ...incomingState, ...payloadState };
  const context = repairInfo?.context || inferFallbackContext(
    repairInfo?.body?.history,
    repairInfo?.body?.message
  );

  // Prefer the core Worker's estimate because it has the database estimate ID. The
  // safety estimate is only used if the core still claims readiness without displaying one.
  const estimate = payload.estimate || buildFallbackEstimate(state, context);
  const jobCode = estimate.jobCode || context?.jobCode || state.jobCode || "unknown_plumbing";
  const confidenceScore = Number(estimate.confidenceScore) || Number(state.confidenceScore) || 35;

  state.jobCode = jobCode;
  state.problemSummary = context?.problemSummary || state.problemSummary || estimate.summary;
  if (context?.symptomDetail) state.symptomDetail = context.symptomDetail;
  if (context?.access && context.access !== "unknown") state.access = context.access;
  state.matchConfidence = state.matchConfidence === "high" ? "high" : (context?.jobCode ? "medium" : "low");
  state.confidenceScore = confidenceScore;
  state.estimateReady = true;
  state.fallbackStep = Math.max(3, numericStep(state.fallbackStep));
  state.fallbackEstimate = {
    jobCode: estimate.jobCode,
    jobName: estimate.jobName,
    min: estimate.min,
    max: estimate.max,
    fee: estimate.fee || null,
    mode: estimate.mode
  };

  let reply;
  if (isConfusedFollowUp(repairInfo?.body?.message)) {
    reply = "Sorry — the estimate did not display properly. I’ve shown it below now. The exact fault is confirmed on arrival before any additional work is agreed.";
  } else if (estimate.mode === "diagnosis") {
    reply = "I can’t price the exact repair responsibly from that description alone, so the £75 attendance and diagnosis is shown below. Any repair would be agreed with you before work starts.";
  } else if (estimate.jobCode === "wc_inlet_valve") {
    reply = "That sounds like a noisy cistern mechanism, commonly the inlet or fill valve. Your current estimate is shown below; the exact faulty part is confirmed on arrival.";
  } else {
    reply = "Your current estimate is shown below. The exact fault and final price are confirmed on arrival before any additional work is agreed.";
  }

  estimate.showNow = true;
  return {
    ...payload,
    reply,
    state,
    estimate,
    showEstimateNow: true,
    progress: Math.max(Number(payload.progress) || 0, confidenceScore),
    quickReplies: [],
    topicLocked: false,
    estimateCompletionRepaired: true
  };
}