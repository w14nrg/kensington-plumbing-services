import coreWorker from "./_worker.js";
import {
  applyRepeatedFallbackGuard,
  repairFallbackCompletion,
  repairIncomingChatBody,
  repairOutgoingChatPayload,
  shouldForceDeterministicFallback
} from "./chat-state-guard.js";
import { applyContextEstimatePriority } from "./estimate-context-priority.js";
import { applyUniversalConversationContract } from "./conversation-contract.js";
import { applyConversationRoute, prepareConversationRoute } from "./conversation-routing-v2.js";
import { applyPlumbingFlowEngine } from "./plumbing-flow-engine.js";

const RELEASE = "ken-chat-slot-routing-2026-08-02-v7";

function addReleaseHeaders(response, mode = "normal") {
  const headers = new Headers(response.headers);
  headers.set("x-ken-entry", RELEASE);
  headers.set("x-ken-mode", mode);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function buildJsonRequest(request, body) {
  const headers = new Headers(request.headers);
  headers.delete("content-length");
  headers.set("content-type", "application/json");

  return new Request(request.url, {
    method: request.method,
    headers,
    body: JSON.stringify(body),
    redirect: request.redirect
  });
}

function hideBindings(env, hiddenBindings) {
  const hidden = new Set(hiddenBindings);
  return new Proxy(env, {
    get(target, property, receiver) {
      if (hidden.has(property)) return undefined;
      return Reflect.get(target, property, receiver);
    }
  });
}

function withoutOpenAI(env) {
  return new Proxy(env, {
    get(target, property, receiver) {
      if (property === "OPENAI_API_KEY") return "";
      return Reflect.get(target, property, receiver);
    }
  });
}

async function persistCorrectedEstimate(payload, env) {
  const estimate = payload?.estimate;
  const state = payload?.state || {};
  if (!payload?.estimateCorrected || !estimate?.estimateId || !env?.DB) return payload;

  try {
    await env.DB.prepare(`
      UPDATE estimates
      SET issue_text=?, job_code=?, job_name=?, estimate_min=?, estimate_max=?, confidence=?,
          access_level=?, postcode=?
      WHERE id=?
    `).bind(
      estimate.summary || state.problemSummary || estimate.jobName,
      estimate.jobCode,
      estimate.jobName,
      estimate.min,
      estimate.max,
      estimate.confidence,
      state.access || null,
      state.postcode || null,
      estimate.estimateId
    ).run();
    payload.estimateCorrectionPersisted = true;
  } catch (error) {
    console.error("Ken corrected estimate persistence error", error);
    payload.estimateCorrectionPersisted = false;
  }

  return payload;
}

async function handleGuardedKenRequest(request, env, context) {
  const originalBody = await request.clone().json().catch(() => null);
  if (!originalBody || typeof originalBody !== "object" || Array.isArray(originalBody)) {
    const response = await coreWorker.fetch(request, env, context);
    return addReleaseHeaders(response, "unparsed");
  }

  const repairInfo = repairIncomingChatBody(originalBody);
  const routeInfo = prepareConversationRoute(repairInfo.body);
  const recoveryContext = shouldForceDeterministicFallback(repairInfo);
  const smokeTest = request.headers.get("x-ken-smoke-test") === "1";
  const forwardedRequest = buildJsonRequest(request, routeInfo.body);

  let forwardedEnv = env;
  if (smokeTest) {
    forwardedEnv = withoutOpenAI(forwardedEnv);
    forwardedEnv = hideBindings(forwardedEnv, ["DB"]);
  }

  const response = await coreWorker.fetch(forwardedRequest, forwardedEnv, context);

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return addReleaseHeaders(response, smokeTest ? "smoke" : recoveryContext ? "recovery" : "normal");
  }

  const raw = await response.text();
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    const headers = new Headers(response.headers);
    headers.set("x-ken-entry", RELEASE);
    headers.set("x-ken-mode", "invalid-json");
    return new Response(raw, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }

  payload = repairOutgoingChatPayload(payload, repairInfo);
  payload = applyConversationRoute(payload, routeInfo);
  payload = applyRepeatedFallbackGuard(payload, repairInfo);
  payload = repairFallbackCompletion(payload, repairInfo);
  payload = applyContextEstimatePriority(payload, repairInfo);

  // Domain slot handling runs after compatibility repairs so it can remove a premature
  // generic diagnosis and ask for the actual missing plumbing detail instead.
  payload = applyPlumbingFlowEngine(payload, routeInfo.body);
  payload = applyUniversalConversationContract(payload, routeInfo.body);
  payload = await persistCorrectedEstimate(payload, env);

  const headers = new Headers(response.headers);
  headers.set("content-type", "application/json; charset=UTF-8");
  headers.set("cache-control", "no-store");
  headers.set("x-ken-entry", RELEASE);
  headers.set("x-ken-mode", smokeTest ? "smoke" : recoveryContext ? "recovery" : "normal");
  headers.set("x-ken-contract", payload.contractVersion || "unknown");
  headers.set("x-ken-route", payload.routeVersion || "unknown");
  headers.set("x-ken-flow", payload.flowVersion || "unknown");

  return new Response(JSON.stringify(payload), {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function healthResponse(env) {
  return new Response(JSON.stringify({
    ok: true,
    service: "ken-chat",
    release: RELEASE,
    stateGuard: true,
    contextualReplies: true,
    estimateCompletionGuard: true,
    contextEstimatePriority: true,
    universalConversationContract: true,
    explicitConversationRouting: true,
    assistantTextExcludedFromRouting: true,
    slotBasedQuestioning: true,
    prematureDiagnosisRecovery: true,
    realUsersKeepAIRoute: true,
    smokeTestMode: true,
    paidBookingNotifications: Boolean(env.RESEND_API_KEY && env.OWNER_EMAIL),
  }), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": "no-store",
      "x-ken-entry": RELEASE,
      "x-ken-contract": "universal-v1",
      "x-ken-route": "explicit-family-v1",
      "x-ken-flow": "slot-engine-v1"
    }
  });
}

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/api/health") {
      return healthResponse(env);
    }

    if (request.method === "POST" && url.pathname === "/api/ken") {
      try {
        return await handleGuardedKenRequest(request, env, context);
      } catch (error) {
        console.error("Ken slot routing error", error);
        const response = await coreWorker.fetch(request, env, context);
        return addReleaseHeaders(response, "guard-error");
      }
    }

    const response = await coreWorker.fetch(request, env, context);
    return addReleaseHeaders(response);
  }
};
