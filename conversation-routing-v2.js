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
  const prepared = prepareBaseConversationRoute(body);
  const state = validObject(prepared.body?.state);
  const history = Array.isArray(prepared.body?.history) ? prepared.body.history : [];
  const message = String(prepared.message || prepared.body?.message || "");
  const persistedFamily = FAMILIES.has(state.conversationFamily) ? state.conversationFamily : "";
  const jobFamily = familyFromJobCode(state.jobCode);

  // Once Ken has already polluted a conversation with the wrong-family question, words
  // such as “blocked” in the customer's confused response are not a new plumbing issue.
  // Persisted state/job context wins until the customer clearly starts another problem.
  if (CONFUSION.test(message) && (persistedFamily || jobFamily)) {
    const family = persistedFamily || jobFamily;
    const latestAnyQuestion = latestQuestion(history);
    const latestFamilyQuestion = latestQuestion(history, family);
    const stage = Number(state.conversationStage) > 0
      ? Number(state.conversationStage)
      : Number(latestFamilyQuestion?.stage || 0);

    state.conversationFamily = family;
    state.conversationStage = stage;

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
