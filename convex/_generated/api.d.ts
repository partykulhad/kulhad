/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as adminrequests from "../adminrequests.js";
import type * as agentLocations from "../agentLocations.js";
import type * as appUsers from "../appUsers.js";
import type * as canister from "../canister.js";
import type * as canisterCheck from "../canisterCheck.js";
import type * as canisters from "../canisters.js";
import type * as deliveryAgents from "../deliveryAgents.js";
import type * as http from "../http.js";
import type * as index from "../index.js";
import type * as iot from "../iot.js";
import type * as kitchens from "../kitchens.js";
import type * as machineVideos from "../machineVideos.js";
import type * as machines from "../machines.js";
import type * as migrateAppUsers from "../migrateAppUsers.js";
import type * as requestStatusUpdates from "../requestStatusUpdates.js";
import type * as requests from "../requests.js";
import type * as transactions from "../transactions.js";
import type * as users from "../users.js";
import type * as vendors from "../vendors.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  adminrequests: typeof adminrequests;
  agentLocations: typeof agentLocations;
  appUsers: typeof appUsers;
  canister: typeof canister;
  canisterCheck: typeof canisterCheck;
  canisters: typeof canisters;
  deliveryAgents: typeof deliveryAgents;
  http: typeof http;
  index: typeof index;
  iot: typeof iot;
  kitchens: typeof kitchens;
  machineVideos: typeof machineVideos;
  machines: typeof machines;
  migrateAppUsers: typeof migrateAppUsers;
  requestStatusUpdates: typeof requestStatusUpdates;
  requests: typeof requests;
  transactions: typeof transactions;
  users: typeof users;
  vendors: typeof vendors;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
