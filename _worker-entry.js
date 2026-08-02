import coreWorker from "./_worker.js";
import {
  applyRepeatedFallbackGuard,
  repairFallbackCompletion,
  repairIncomingChatBody,
  repairOutgoingChatPayload,
  shouldForceDeterministicFallback
} from "./chat-state-guard.js";

const RELEASE = "ken-chat-estimate-guard-2026-08-02-v3";

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

async function handleGuardedKenRequest(request, env, context) {
  const originalBody = await request.clone().json().catch(() => null);
  if (!originalBody || typeof originalBody !== "object" || Array.isArray(originalBody)) {
    const response = await coreWorker.fetch(request, env, context);
    return addReleaseHeaders(response, "unparsed");
  }

  const repairInfo = repairIncomingChatBody(originalBody);
  const forceFallback = shouldForceDeterministicFallback(repairInfo);
  const smokeTest = request.headers.get("x-ken-smoke-test") === "1";
  const forwardedRequest = buildJsonRequest(request, repairInfo.body);

  let forwardedEnv = env;
  if (forceFallback || smokeTest) forwardedEnv = withoutOpenAI(forwardedEnv);
  if (smokeTest) forwardedEnv = hideBindings(forwardedEnv, ["DB"]);

  const response = await coreWorker.fetch(forwardedRequest, forwardedEnv, context);

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return addReleaseHeaders(response, smokeTest ? "smoke" : forceFallback ? "fallback" : "normal");
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
  payload = applyRepeatedFallbackGuard(payload, repairInfo);
  payload = repairFallbackCompletion(payload, repairInfo);

  const headers = new Headers(response.headers);
  headers.set("content-type", "application/json; charset=UTF-8");
  headers.set("cache-control", "no-store");
  headers.set("x-ken-entry", RELEASE);
  headers.set("x-ken-mode", smokeTest ? "smoke" : forceFallback ? "fallback" : "normal");

  return new Response(JSON.stringify(payload), {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function healthResponse() {
  return new Response(JSON.stringify({
    ok: true,
    service: "ken-chat",
    release: RELEASE,
    stateGuard: true,
    contextualReplies: true,
    estimateCompletionGuard: true,
    smokeTestMode: true
  }), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": "no-store",
      "x-ken-entry": RELEASE
    }
  });
}

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/api/health") {
      return healthResponse();
    }

    if (request.method === "POST" && url.pathname === "/api/ken") {
      try {
        return await handleGuardedKenRequest(request, env, context);
      } catch (error) {
        console.error("Ken state guard error", error);
        const response = await coreWorker.fetch(request, env, context);
        return addReleaseHeaders(response, "guard-error");
      }
    }

    const response = await coreWorker.fetch(request, env, context);
    return addReleaseHeaders(response);
  }
};