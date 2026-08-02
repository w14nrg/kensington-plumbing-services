import {
  applyConversationRoute as applyBaseConversationRoute,
  identifyRoutingQuestion,
  prepareConversationRoute as prepareBaseConversationRoute
} from "./conversation-routing.js";

const FAMILIES = new Set(["toilet", "tap", "drain", "leak", "radiator", "generic"]);
const CONFUSION = /^\s*(?:what|what\?|what do you mean\??|what are you asking\??|is what blocked\??|which bit\??|huh\??|sorry\??)\s*$/i;

function validObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
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

function latestQuestion(history, family = "") {
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

export function prepareConversationRoute(body) {
  const originalState = validObject(body?.state);
  const originalPersistedFamily = FAMILIES.has(originalState.conversationFamily)
    ? originalState.conversationFamily
    : "";
  const originalJobFamily = familyFromJobCode(originalState.jobCode);

  const prepared = prepareBaseConversationRoute(body);
  const state = validObject(prepared.body?.state);
  const history = Array.isArray(prepared.body?.history) ? prepared.body.history : [];
  const message = String(prepared.message || prepared.body?.message || "");

  // The base fallback can itself overwrite the family after reading a polluted history.
  // During a confused follow-up, use the state that arrived from the browser before that
  // mutation. A visitor saying “Is what blocked?” is not starting a drain problem.
  if (CONFUSION.test(message) && (originalPersistedFamily || originalJobFamily)) {
    const family = originalPersistedFamily || originalJobFamily;
    const latestAnyQuestion = latestQuestion(history);
    const latestFamilyQuestion = latestQuestion(history, family);
    const stage = Number(originalState.conversationStage) > 0
      ? Number(originalState.conversationStage)
      : Number(latestFamilyQuestion?.stage || 0);

    state.conversationFamily = family;
    state.conversationStage = stage;
    if (originalState.jobCode) state.jobCode = originalState.jobCode;

    return {
      ...prepared,
      body: { ...prepared.body, state },
      family,
      stage,
      latestAnyQuestion,
      latestFamilyQuestion,
      crossFamilyHistory: Boolean(latestAnyQuestion && latestAnyQuestion.family !== family)
    };
  }

  return prepared;
}

export function applyConversationRoute(payload, routeInfo) {
  return applyBaseConversationRoute(payload, routeInfo);
}
