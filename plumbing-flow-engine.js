const CONFUSION = /^\s*(?:what|what\?|what do you mean\??|what are you asking\??|which pipe\??|which bit\??|huh\??|sorry\??)\s*$/i;

const TOILET_LEAK_SOURCE_QUESTION = "Where is the toilet leaking from — the cistern/tank, a small water pipe, the pipe between the cistern and toilet, or the large waste connection at the back/base?";
const TOILET_BACK_PIPE_QUESTION = "At the back of the toilet, is it the small water-supply pipe or the much larger waste connector near the floor or wall?";
const TOILET_BACK_PIPE_CLARIFY = "Is the leaking pipe thin, roughly like a tap connection, or is it the large toilet outlet pipe where the toilet joins the wall or floor?";

const PRICE_BOOK = {
  wc_cistern_leak: {
    jobName: "Leaking toilet cistern",
    min: 110,
    max: 250,
    summary: "Leak from the toilet cistern or its internal seals/connections"
  },
  wc_supply_pipe_leak: {
    jobName: "Repair accessible toilet water-supply pipe or connection",
    min: 95,
    max: 195,
    summary: "Leak from the small water-supply pipe or connection behind the toilet"
  },
  wc_flush_pipe: {
    jobName: "Leaking toilet flush pipe",
    min: 110,
    max: 225,
    summary: "Leak from the flush pipe between the cistern and toilet pan"
  },
  wc_pan_connector: {
    jobName: "Leaking toilet pan connector / waste connection",
    min: 145,
    max: 320,
    summary: "Leak from the large waste connection at the back or base of the toilet"
  }
};

function validObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function userMessages(history, currentMessage = "") {
  const messages = [];
  if (Array.isArray(history)) {
    for (const item of history) {
      if (item?.role === "user") messages.push(String(item.content || ""));
    }
  }
  messages.push(String(currentMessage || ""));
  return messages.filter(Boolean);
}

function clearEstimateState(state) {
  const next = { ...state };
  delete next.lastEstimate;
  delete next.lockedJobCode;
  delete next.estimateReady;
  delete next.fallbackEstimate;
  delete next.estimateId;
  return next;
}

function questionResult(payload, state, reply, pendingQuestion, quickReplies = []) {
  const nextState = clearEstimateState(state);
  nextState.conversationFamily = "toilet";
  nextState.pendingQuestion = pendingQuestion;
  nextState.problemSummary = nextState.problemSummary || "Toilet leak";
  nextState.jobCode = "wc_cistern_leak";

  return {
    ...payload,
    reply,
    quickReplies,
    state: nextState,
    estimate: null,
    showEstimateNow: false,
    topicLocked: false,
    flowVersion: "slot-engine-v1",
    flowRepair: "requested-missing-toilet-leak-detail"
  };
}

function estimateResult(payload, state, jobCode) {
  const priced = PRICE_BOOK[jobCode];
  if (!priced) return payload;

  const existing = validObject(payload.estimate);
  const estimate = {
    ...existing,
    estimateId: existing.estimateId || null,
    jobCode,
    jobName: priced.jobName,
    mode: "standard",
    fee: null,
    min: priced.min,
    max: priced.max,
    confidence: existing.confidence || "Building",
    confidenceScore: Number.isFinite(Number(existing.confidenceScore)) ? Number(existing.confidenceScore) : 55,
    canBook: existing.canBook !== false,
    provisional: true,
    summary: priced.summary,
    showNow: true
  };

  const nextState = {
    ...state,
    conversationFamily: "toilet",
    conversationStage: 3,
    pendingQuestion: null,
    jobCode,
    problemSummary: priced.summary,
    estimateReady: true,
    lockedJobCode: jobCode,
    lastEstimate: { ...estimate }
  };

  return {
    ...payload,
    reply: `That points to ${priced.jobName.toLowerCase()}. Your current estimate is £${priced.min}–£${priced.max}; the exact fitting and any hidden damage are confirmed on arrival.`,
    quickReplies: [],
    state: nextState,
    estimate,
    showEstimateNow: true,
    topicLocked: false,
    estimateCorrected: Boolean(existing.jobCode && existing.jobCode !== jobCode),
    estimateCorrection: existing.jobCode && existing.jobCode !== jobCode
      ? { fromJobCode: existing.jobCode, toJobCode: jobCode, reason: "slot-engine-toilet-leak" }
      : payload.estimateCorrection || null,
    flowVersion: "slot-engine-v1",
    flowRepair: "priced-specific-toilet-leak"
  };
}

function inferToiletLeakSource(text) {
  if (/\b(?:large|big|thick)\b.{0,30}\b(?:pipe|connector|outlet|waste)\b|\b(?:pan connector|waste connector|soil pipe|at the base|around the base|bottom of the toilet|joins? the wall|joins? the floor)\b/i.test(text)) {
    return "wc_pan_connector";
  }
  if (/\b(?:flush pipe|pipe between (?:the )?cistern and (?:the )?toilet|from cistern to pan)\b/i.test(text)) {
    return "wc_flush_pipe";
  }
  if (/\b(?:small|thin|water supply|supply pipe|flexi|braided|inlet pipe|isolation valve|feed pipe)\b/i.test(text)) {
    return "wc_supply_pipe_leak";
  }
  if (/\b(?:cistern|tank|from the top|inside the cistern|cistern bolts?|under the cistern)\b/i.test(text)) {
    return "wc_cistern_leak";
  }
  return "";
}

function isAmbiguousBackPipe(text) {
  return /\b(?:pipe|connection)\b.{0,25}\b(?:back|behind)\b|\b(?:back|behind)\b.{0,25}\b(?:pipe|connection)\b/i.test(text) && !inferToiletLeakSource(text);
}

function isToiletLeak(messages, state) {
  const text = messages.join(" ");
  return state.conversationFamily === "toilet" && /\b(?:leak|leaking|water coming|water dripping|wet)\b/i.test(text);
}

export function applyPlumbingFlowEngine(payload, requestBody = {}) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;

  const incomingState = validObject(requestBody.state);
  const payloadState = validObject(payload.state);
  const state = { ...incomingState, ...payloadState };
  const message = String(requestBody.message || "");
  const messages = userMessages(requestBody.history, message);
  const allText = messages.join(" ");

  if (!isToiletLeak(messages, state)) return payload;

  const pending = String(state.pendingQuestion || "");
  const directSource = inferToiletLeakSource(message) || inferToiletLeakSource(allText);

  if (pending === "toilet_back_pipe_type") {
    if (CONFUSION.test(message)) {
      return questionResult(
        payload,
        state,
        TOILET_BACK_PIPE_CLARIFY,
        "toilet_back_pipe_type",
        ["Small thin water pipe", "Large waste pipe", "Not sure"]
      );
    }

    if (directSource) return estimateResult(payload, state, directSource);

    if (/\bnot sure|don'?t know|cannot tell|can'?t tell\b/i.test(message)) {
      const nextState = {
        ...state,
        pendingQuestion: null,
        jobCode: "leak_trace",
        problemSummary: "Toilet leak from an unidentified connection behind the toilet"
      };
      return {
        ...payload,
        reply: "The exact connection cannot be identified from the description, so the £75 visit and diagnosis option is shown below. Any repair is agreed after the source is confirmed.",
        state: nextState,
        estimate: {
          estimateId: validObject(payload.estimate).estimateId || null,
          jobCode: "leak_trace",
          jobName: "Visit and plumbing diagnosis",
          mode: "diagnosis",
          fee: 75,
          min: 75,
          max: 75,
          confidence: "Low",
          confidenceScore: 35,
          canBook: true,
          provisional: false,
          summary: nextState.problemSummary,
          showNow: true
        },
        showEstimateNow: true,
        topicLocked: false,
        flowVersion: "slot-engine-v1",
        flowRepair: "diagnosis-after-targeted-clarifier"
      };
    }

    return questionResult(
      payload,
      state,
      TOILET_BACK_PIPE_QUESTION,
      "toilet_back_pipe_type",
      ["Small water pipe", "Large waste connector", "Not sure"]
    );
  }

  if (directSource) return estimateResult(payload, state, directSource);

  if (isAmbiguousBackPipe(message) || isAmbiguousBackPipe(allText)) {
    return questionResult(
      payload,
      state,
      CONFUSION.test(message) ? TOILET_BACK_PIPE_CLARIFY : TOILET_BACK_PIPE_QUESTION,
      "toilet_back_pipe_type",
      ["Small water pipe", "Large waste connector", "Not sure"]
    );
  }

  // A generic toilet-type/access question does not identify the leak source. Replace it
  // with the missing slot rather than counting it as one of a fixed number of questions.
  if (!directSource && !/\bnot sure|don'?t know|cannot tell|can'?t tell\b/i.test(message)) {
    return questionResult(
      payload,
      state,
      TOILET_LEAK_SOURCE_QUESTION,
      "toilet_leak_source",
      ["Cistern/tank", "Small water pipe", "Flush pipe", "Large waste connector", "Not sure"]
    );
  }

  return payload;
}
