/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_generatePreset from "../actions/generatePreset.js";
import type * as actions_lib_renderDispatch from "../actions/lib/renderDispatch.js";
import type * as actions_renderWithLambda from "../actions/renderWithLambda.js";
import type * as actions_renderWithWorker from "../actions/renderWithWorker.js";
import type * as actions_retryMotionkitRenders from "../actions/retryMotionkitRenders.js";
import type * as actions_seedMarketplacePreviews from "../actions/seedMarketplacePreviews.js";
import type * as actions_validateAndTestRender from "../actions/validateAndTestRender.js";
import type * as admin from "../admin.js";
import type * as aiGeneration from "../aiGeneration.js";
import type * as aiGenerationStraico from "../aiGenerationStraico.js";
import type * as aiGenerationStraicoQuota from "../aiGenerationStraicoQuota.js";
import type * as analytics from "../analytics.js";
import type * as auth from "../auth.js";
import type * as billing from "../billing.js";
import type * as collections from "../collections.js";
import type * as crons from "../crons.js";
import type * as geminiSeed from "../geminiSeed.js";
import type * as http from "../http.js";
import type * as lib_ai_providers_claude from "../lib/ai_providers/claude.js";
import type * as lib_ai_providers_gemini from "../lib/ai_providers/gemini.js";
import type * as lib_ai_providers_openrouter from "../lib/ai_providers/openrouter.js";
import type * as lib_ai_providers_straico from "../lib/ai_providers/straico.js";
import type * as lib_ai_providers_types from "../lib/ai_providers/types.js";
import type * as lib_ai_skills_base from "../lib/ai_skills/base.js";
import type * as lib_ai_skills_chart from "../lib/ai_skills/chart.js";
import type * as lib_ai_skills_cta from "../lib/ai_skills/cta.js";
import type * as lib_ai_skills_index from "../lib/ai_skills/index.js";
import type * as lib_ai_skills_map from "../lib/ai_skills/map.js";
import type * as lib_ai_skills_motion_graphics from "../lib/ai_skills/motion_graphics.js";
import type * as lib_ai_skills_transition from "../lib/ai_skills/transition.js";
import type * as lib_authz from "../lib/authz.js";
import type * as lib_compile from "../lib/compile.js";
import type * as lib_encryption from "../lib/encryption.js";
import type * as lib_keyStorage from "../lib/keyStorage.js";
import type * as lib_moderation from "../lib/moderation.js";
import type * as lib_renderableCompositions from "../lib/renderableCompositions.js";
import type * as lib_signing from "../lib/signing.js";
import type * as lib_validators from "../lib/validators.js";
import type * as licenses from "../licenses.js";
import type * as motionkitSeed from "../motionkitSeed.js";
import type * as platformUser from "../platformUser.js";
import type * as presetEvents from "../presetEvents.js";
import type * as presetReview from "../presetReview.js";
import type * as presets from "../presets.js";
import type * as projects from "../projects.js";
import type * as renderJobs from "../renderJobs.js";
import type * as savedPresets from "../savedPresets.js";
import type * as seedPresets from "../seedPresets.js";
import type * as users from "../users.js";
import type * as votes from "../votes.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/generatePreset": typeof actions_generatePreset;
  "actions/lib/renderDispatch": typeof actions_lib_renderDispatch;
  "actions/renderWithLambda": typeof actions_renderWithLambda;
  "actions/renderWithWorker": typeof actions_renderWithWorker;
  "actions/retryMotionkitRenders": typeof actions_retryMotionkitRenders;
  "actions/seedMarketplacePreviews": typeof actions_seedMarketplacePreviews;
  "actions/validateAndTestRender": typeof actions_validateAndTestRender;
  admin: typeof admin;
  aiGeneration: typeof aiGeneration;
  aiGenerationStraico: typeof aiGenerationStraico;
  aiGenerationStraicoQuota: typeof aiGenerationStraicoQuota;
  analytics: typeof analytics;
  auth: typeof auth;
  billing: typeof billing;
  collections: typeof collections;
  crons: typeof crons;
  geminiSeed: typeof geminiSeed;
  http: typeof http;
  "lib/ai_providers/claude": typeof lib_ai_providers_claude;
  "lib/ai_providers/gemini": typeof lib_ai_providers_gemini;
  "lib/ai_providers/openrouter": typeof lib_ai_providers_openrouter;
  "lib/ai_providers/straico": typeof lib_ai_providers_straico;
  "lib/ai_providers/types": typeof lib_ai_providers_types;
  "lib/ai_skills/base": typeof lib_ai_skills_base;
  "lib/ai_skills/chart": typeof lib_ai_skills_chart;
  "lib/ai_skills/cta": typeof lib_ai_skills_cta;
  "lib/ai_skills/index": typeof lib_ai_skills_index;
  "lib/ai_skills/map": typeof lib_ai_skills_map;
  "lib/ai_skills/motion_graphics": typeof lib_ai_skills_motion_graphics;
  "lib/ai_skills/transition": typeof lib_ai_skills_transition;
  "lib/authz": typeof lib_authz;
  "lib/compile": typeof lib_compile;
  "lib/encryption": typeof lib_encryption;
  "lib/keyStorage": typeof lib_keyStorage;
  "lib/moderation": typeof lib_moderation;
  "lib/renderableCompositions": typeof lib_renderableCompositions;
  "lib/signing": typeof lib_signing;
  "lib/validators": typeof lib_validators;
  licenses: typeof licenses;
  motionkitSeed: typeof motionkitSeed;
  platformUser: typeof platformUser;
  presetEvents: typeof presetEvents;
  presetReview: typeof presetReview;
  presets: typeof presets;
  projects: typeof projects;
  renderJobs: typeof renderJobs;
  savedPresets: typeof savedPresets;
  seedPresets: typeof seedPresets;
  users: typeof users;
  votes: typeof votes;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
