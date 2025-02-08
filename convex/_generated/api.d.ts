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
import type * as appUsers from "../appUsers.js";
import type * as canister from "../canister.js";
import type * as canisterCheck from "../canisterCheck.js";
import type * as deliveryAgents from "../deliveryAgents.js";
import type * as http from "../http.js";
import type * as index from "../index.js";
import type * as iot from "../iot.js";
import type * as kitchens from "../kitchens.js";
import type * as machines from "../machines.js";
import type * as migrateAppUsers from "../migrateAppUsers.js";
import type * as requests from "../requests.js";
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
  appUsers: typeof appUsers;
  canister: typeof canister;
  canisterCheck: typeof canisterCheck;
  deliveryAgents: typeof deliveryAgents;
  http: typeof http;
  index: typeof index;
  iot: typeof iot;
  kitchens: typeof kitchens;
  machines: typeof machines;
  migrateAppUsers: typeof migrateAppUsers;
  requests: typeof requests;
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
