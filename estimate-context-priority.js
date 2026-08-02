const CONTEXT_PRICES = {
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

function validObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function confusedFollowUp(message) {
  return /\b(?:what you on about|what do you mean|where(?:'s| is) (?:the )?estimate|no estimate|didn'?t show|nothing showed)\b/i
    .test(String(message || ""));
}

export function applyContextEstimatePriority(payload, repairInfo) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;

  const estimate = validObject(payload.estimate);
  const context = validObject(repairInfo?.context);
  const incomingState = validObject(repairInfo?.body?.state);
  const payloadState = validObject(payload.state);
  const contextualJobCode = context.jobCode || (
    incomingState.jobCode && incomingState.jobCode !== "unknown_plumbing"
      ? incomingState.jobCode
      : ""
  );
  const priced = CONTEXT_PRICES[contextualJobCode];

  if (!estimate.jobCode || !priced || estimate.jobCode === contextualJobCode) return payload;

  const correctedEstimate = {
    ...estimate,
    jobCode: contextualJobCode,
    jobName: priced.jobName,
    mode: "standard",
    fee: null,
    min: priced.min,
    max: priced.max,
    summary: context.problemSummary || estimate.summary || priced.jobName,
    showNow: true
  };

  const state = {
    ...incomingState,
    ...payloadState,
    jobCode: contextualJobCode,
    problemSummary: context.problemSummary || payloadState.problemSummary || correctedEstimate.summary,
    estimateReady: true,
    fallbackEstimate: {
      jobCode: correctedEstimate.jobCode,
      jobName: correctedEstimate.jobName,
      min: correctedEstimate.min,
      max: correctedEstimate.max,
      fee: correctedEstimate.fee,
      mode: correctedEstimate.mode
    }
  };

  let reply = payload.reply;
  if (confusedFollowUp(repairInfo?.body?.message)) {
    reply = "Sorry — the estimate did not display correctly before. I’ve shown the correct noisy-cistern estimate below now; the exact faulty part is confirmed on arrival.";
  } else if (contextualJobCode === "wc_inlet_valve") {
    reply = "That sounds like a noisy cistern mechanism, commonly the inlet or fill valve. Your current estimate is shown below; the exact faulty part is confirmed on arrival.";
  }

  return {
    ...payload,
    reply,
    state,
    estimate: correctedEstimate,
    showEstimateNow: true,
    topicLocked: false,
    estimateCorrected: true,
    estimateCorrection: {
      fromJobCode: estimate.jobCode,
      toJobCode: contextualJobCode
    }
  };
}
