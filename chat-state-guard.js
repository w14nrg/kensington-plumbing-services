const FALLBACK_PROMPTS = [
  {
    step: 1,
    match: "what is the toilet actually doing",
    nextReply: "Is it a normal visible cistern, or a concealed/back-to-wall toilet with a flush plate?",
    nextQuickReplies: ["Visible cistern", "Concealed with flush plate", "Not sure"]
  },
  {
    step: 2,
    match: "is it a normal visible cistern"
  },
  {
    step: 1,
    match: "where is the problem — dripping from the spout",
    nextReply: "Is it a single-lever mixer or separate hot and cold handles?",
    nextQuickReplies: ["Single-lever mixer", "Separate hot/cold handles", "Not sure"]
  },
  {
    step: 2,
    match: "is it a single-lever mixer"
  },
  {
    step: 1,
    match: "which outlet is affected",
    nextReply: "Is it completely blocked, or does the water still drain away slowly?",
    nextQuickReplies: ["Completely blocked", "Draining slowly", "Comes back up"]
  },
  {
    step: 2,
    match: "is it completely blocked"
  },
  {
    step: 1,
    match: "where are you actually seeing the water",
    nextReply: "Can you see the exact source of the leak, or does it need tracing to find where the water is coming from?",
    nextQuickReplies: ["I can see the source", "Source needs tracing", "Not sure"]
  },
  {
    step: 2,
    match: "can you see the exact source of the leak"
  },
  {
    step: 1,
    match: "what is the main problem — radiator not heating",
    nextReply: "Is the issue on one radiator only, or are several radiators affected?",
    nextQuickReplies: ["One radiator", "Several radiators", "Not sure"]
  },
  {
    step: 2,
    match: "is the issue on one radiator only"
  },
  {
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

export function inferFallbackStepFromText(text) {
  const normalised = normaliseText(text);
  let step = 0;
  for (const prompt of FALLBACK_PROMPTS) {
    if (normalised.includes(normaliseText(prompt.match))) {
      step = Math.max(step, prompt.step);
    }
  }
  return step;
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
  return inferFallbackStepFromText(lastAssistantText(history));
}

export function repairIncomingChatBody(body) {
  const safeBody = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  const incomingState = validState(safeBody.state);
  const historyStep = inferFallbackStepFromHistory(safeBody.history);
  const currentStep = numericStep(incomingState.fallbackStep);
  const repairedStep = Math.max(historyStep, currentStep);
  const state = { ...incomingState };

  if (repairedStep > 0) state.fallbackStep = repairedStep;

  return {
    body: { ...safeBody, state },
    historyStep,
    currentStep,
    repairedStep,
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
  const incomingStep = numericStep(repairInfo?.body?.state?.fallbackStep);
  const nextState = { ...currentState };

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

  const prompt = FALLBACK_PROMPTS.find((item) => current.includes(normaliseText(item.match)));
  if (!prompt) return payload;

  const state = { ...validState(payload.state) };

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
