const ESTIMATE_CLAIM = /\b(?:estimate|price|range)\b[\s\S]{0,70}\b(?:ready|shown|below|built|available|current)\b/i;
const DEAD_END_REPLY = /\bgot enough plumbing information to build the current estimate\b/i;
const LOCK_REPLY = /\bi only help with plumbing problems, live estimates and bookings\b/i;
const CONFUSED_REPLY = /\b(?:what you on about|what do you mean|where(?:'s| is) (?:the )?estimate|no estimate|didn'?t show|nothing showed|what price|how much)\b/i;
const SAFETY_REPLY = /\b(?:gas emergency|0800 111 999|leave the area|turn (?:the )?water off|isolate (?:the )?water)\b/i;
const OFF_TOPIC = /\b(?:football|weather|politics|owner|companies house|source code|api key|backend|hosting|programming|website admin)\b/i;

function validObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalise(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function finiteMoney(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
}

function lastAssistantText(history) {
  if (!Array.isArray(history)) return "";
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const item = history[index];
    if (item?.role === "assistant") return String(item.content || "");
  }
  return "";
}

function hasActiveContext(state) {
  return Boolean(
    (state.jobCode && state.jobCode !== "unknown_plumbing") ||
    state.problemSummary ||
    state.symptomDetail ||
    state.fixtureDetail ||
    state.locationDetail ||
    state.estimateReady ||
    state.lastEstimate
  );
}

function contextualShortReply(message) {
  const text = String(message || "").trim();
  if (!text || text.length > 120 || OFF_TOPIC.test(text)) return false;
  return true;
}

function compactEstimate(estimate) {
  const source = validObject(estimate);
  const min = finiteMoney(source.min ?? source.fee);
  const max = finiteMoney(source.max ?? source.fee ?? source.min);
  if (min === null || max === null) return null;

  return {
    estimateId: source.estimateId || null,
    jobCode: source.jobCode || "unknown_plumbing",
    jobName: source.jobName || "Plumbing fault diagnosis",
    mode: source.mode || (min === max ? "diagnosis" : "standard"),
    fee: finiteMoney(source.fee),
    min,
    max: Math.max(min, max),
    confidence: source.confidence || "Building",
    confidenceScore: Number.isFinite(Number(source.confidenceScore)) ? Number(source.confidenceScore) : 45,
    canBook: source.canBook !== false,
    provisional: Boolean(source.provisional),
    summary: source.summary || source.jobName || "Plumbing work requiring assessment",
    showNow: true
  };
}

function diagnosisEstimate(state) {
  return {
    estimateId: state.estimateId || null,
    jobCode: state.jobCode && state.jobCode !== "unknown_plumbing" ? state.jobCode : "unknown_plumbing",
    jobName: "Visit and plumbing diagnosis",
    mode: "diagnosis",
    fee: 75,
    min: 75,
    max: 75,
    confidence: "Low",
    confidenceScore: Math.max(30, Number(state.confidenceScore) || 0),
    canBook: true,
    provisional: false,
    summary: state.problemSummary || state.symptomDetail || "Plumbing fault requiring diagnosis",
    showNow: true
  };
}

function estimateSentence(estimate, restored = false) {
  if (estimate.min === estimate.max) {
    return `${restored ? "The current booking option is still" : "The next step is"} the £${estimate.min} visit and diagnosis. Any repair beyond that is agreed after the fault is identified.`;
  }
  return `${restored ? "Your current estimate remains" : "Your current estimate is"} £${estimate.min}–£${estimate.max}. The exact fault, access and required parts are confirmed on arrival.`;
}

function replyContainsPrice(reply, estimate) {
  const text = String(reply || "");
  if (estimate.min === estimate.max) return text.includes(`£${estimate.min}`);
  return text.includes(`£${estimate.min}`) && text.includes(`£${estimate.max}`);
}

function nextUsefulQuestion(state, previousReply) {
  const options = [];
  if (!String(state.symptomDetail || "").trim()) {
    options.push("What exactly is the fitting doing — leaking, making a noise, filling slowly, not working, or something else?");
  }
  if (!String(state.locationDetail || "").trim()) {
    options.push("Where can you see or hear the problem, and is any water escaping?");
  }
  if (!String(state.fixtureDetail || "").trim()) {
    options.push("Which fitting is affected, and what type of fitting is it?");
  }
  if (!state.access || state.access === "unknown") {
    options.push("Can you see and reach the faulty fitting, or is it concealed behind a panel, wall or unit?");
  }
  options.push("Tell me one more useful detail about what happens when you use the fitting, or choose the £75 visit and diagnosis option.");

  const previous = normalise(previousReply);
  return options.find((question) => normalise(question) !== previous) || options[options.length - 1];
}

export function applyUniversalConversationContract(payload, requestBody = {}) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;

  const incomingState = validObject(requestBody.state);
  const payloadState = validObject(payload.state);
  const state = { ...incomingState, ...payloadState };
  const message = String(requestBody.message || "");
  const previousReply = lastAssistantText(requestBody.history);
  const resetIssue = payload.resetIssue === true;
  const repairs = [];

  if (resetIssue) {
    delete state.lastEstimate;
    delete state.lockedJobCode;
    delete state.estimateReady;
  }

  let estimate = compactEstimate(payload.estimate);
  let lastEstimate = compactEstimate(state.lastEstimate || incomingState.lastEstimate);
  let reply = String(payload.reply || "").trim();
  let showEstimateNow = Boolean(payload.showEstimateNow);
  let topicLocked = payload.topicLocked === true;
  let estimateCorrected = Boolean(payload.estimateCorrected);
  let estimateCorrection = payload.estimateCorrection || null;

  // Once a price has been shown, keep that job stable until the core explicitly resets
  // to a new plumbing issue. This applies to every job code, not selected transcripts.
  if (!resetIssue && estimate && state.lockedJobCode && estimate.jobCode !== state.lockedJobCode && lastEstimate?.jobCode === state.lockedJobCode) {
    estimateCorrection = {
      fromJobCode: estimate.jobCode,
      toJobCode: state.lockedJobCode,
      reason: "locked-estimate-context"
    };
    estimate = {
      ...lastEstimate,
      estimateId: estimate.estimateId || lastEstimate.estimateId || null,
      showNow: true
    };
    estimateCorrected = true;
    repairs.push("prevented-job-drift");
  }

  if (estimate) {
    state.lockedJobCode = estimate.jobCode;
    state.jobCode = estimate.jobCode;
    state.lastEstimate = compactEstimate(estimate);
    state.estimateReady = true;
    showEstimateNow = true;
    lastEstimate = state.lastEstimate;
  }

  const activeContext = hasActiveContext(state);
  const repeatedReply = Boolean(reply && previousReply && normalise(reply) === normalise(previousReply));
  const claimsEstimate = ESTIMATE_CLAIM.test(reply) || DEAD_END_REPLY.test(reply);
  const confused = CONFUSED_REPLY.test(message);

  // A short answer to Ken's current plumbing question must never be rejected as a new
  // off-topic conversation. Genuine unrelated questions remain locked.
  if (topicLocked && activeContext && contextualShortReply(message)) {
    topicLocked = false;
    repairs.push("recovered-contextual-reply");

    if (lastEstimate) {
      estimate = lastEstimate;
      showEstimateNow = true;
      reply = estimateSentence(estimate, true);
    } else {
      reply = nextUsefulQuestion(state, previousReply);
    }
  }

  // If a previous estimate exists, normal follow-up questions must keep it visible.
  if (!estimate && !resetIssue && lastEstimate && state.estimateReady && (confused || repeatedReply || showEstimateNow || claimsEstimate)) {
    estimate = lastEstimate;
    showEstimateNow = true;
    topicLocked = false;
    reply = estimateSentence(estimate, true);
    repairs.push("restored-last-estimate");
  }

  // Never claim that an estimate is ready while returning no estimate object. The safe
  // universal fallback is the advertised £75 visit and diagnosis, not invented repairs.
  if (!estimate && (claimsEstimate || showEstimateNow || state.estimateReady)) {
    estimate = diagnosisEstimate(state);
    state.lastEstimate = compactEstimate(estimate);
    state.lockedJobCode = estimate.jobCode;
    state.estimateReady = true;
    showEstimateNow = true;
    topicLocked = false;
    reply = estimateSentence(estimate);
    repairs.push("replaced-false-estimate-claim");
  }

  // No assistant reply may repeat word-for-word. Either re-display the existing price
  // or ask a different useful question; if there is no missing slot, offer diagnosis.
  if (reply && previousReply && normalise(reply) === normalise(previousReply)) {
    if (estimate || lastEstimate) {
      estimate = estimate || lastEstimate;
      showEstimateNow = true;
      topicLocked = false;
      reply = estimateSentence(estimate, true);
      repairs.push("replaced-repeated-reply-with-estimate");
    } else if (activeContext) {
      const question = nextUsefulQuestion(state, previousReply);
      if (normalise(question) === normalise(previousReply)) {
        estimate = diagnosisEstimate(state);
        state.lastEstimate = compactEstimate(estimate);
        state.lockedJobCode = estimate.jobCode;
        state.estimateReady = true;
        showEstimateNow = true;
        reply = estimateSentence(estimate);
        repairs.push("replaced-repeat-with-diagnosis");
      } else {
        reply = question;
        repairs.push("replaced-repeated-question");
      }
      topicLocked = false;
    }
  }

  if (estimate) {
    estimate = compactEstimate(estimate) || diagnosisEstimate(state);
    state.lastEstimate = compactEstimate(estimate);
    state.lockedJobCode = estimate.jobCode;
    state.jobCode = estimate.jobCode;
    state.estimateReady = true;
    showEstimateNow = true;

    // Put the number in the text as well as the card, so a front-end rendering fault
    // cannot leave a customer being told an invisible estimate exists.
    if (!replyContainsPrice(reply, estimate) || DEAD_END_REPLY.test(reply) || LOCK_REPLY.test(reply) || confused) {
      const lead = reply && !DEAD_END_REPLY.test(reply) && !LOCK_REPLY.test(reply) && !ESTIMATE_CLAIM.test(reply)
        ? `${reply.replace(/[.!?]+$/, "")} `
        : "";
      reply = `${lead}${estimateSentence(estimate, Boolean(confused || repeatedReply))}`.trim();
      repairs.push("put-price-in-reply");
    }
  } else if (!reply && activeContext) {
    reply = nextUsefulQuestion(state, previousReply);
    topicLocked = false;
    repairs.push("repaired-empty-reply");
  }

  if (!reply) reply = "Tell me what plumbing fitting is affected and exactly what it is doing.";

  // Preserve genuine safety instructions even when a price is not appropriate.
  if (SAFETY_REPLY.test(String(payload.reply || "")) && !estimate) reply = String(payload.reply);

  return {
    ...payload,
    reply,
    state,
    estimate: estimate || null,
    showEstimateNow: Boolean(estimate && showEstimateNow),
    topicLocked,
    estimateCorrected,
    estimateCorrection,
    contractVersion: "universal-v1",
    contractRepairs: [...new Set([...(Array.isArray(payload.contractRepairs) ? payload.contractRepairs : []), ...repairs])]
  };
}
