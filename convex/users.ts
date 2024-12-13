import {
  internalMutation,
  internalQuery,
  mutation,
  MutationCtx,
  query,
  QueryCtx,
} from "./_generated/server";

import {ConvexError, v} from "convex/values";
import {Doc} from "./_generated/dataModel";

/** Get user by Clerk use id (AKA "subject" on auth)  */
export const getUser = internalQuery({
  args: {subject: v.string()},
  async handler(ctx, args) {
    return await userQuery(ctx, args.subject);
  },
});

/** Create a new Clerk user or update existing Clerk user data. */
export const createUser = internalMutation({
  args: {
    userId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    profileImageUrl: v.optional(v.string()),
  },
  async handler(ctx, {userId, email, firstName, lastName, profileImageUrl}) {
    const userRecord = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (userRecord === null) {
      await ctx.db.insert("users", {
        userId,
        email,
        firstName,
        lastName,
        profileImageUrl,
      });
    }
  },
});

export const updateDisplayName = mutation({
  args: {firstName: v.string(), lastName: v.string()},
  async handler(ctx, {firstName, lastName}) {
    if (!firstName) throw new ConvexError("First Name is mandatory!");

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not Authrized to update display name");
    }

    const userRecord = await userQuery(ctx, identity.subject);

    if (!userRecord) throw new ConvexError("No User found to update display name");
    console.log({firstName, lastName});
    await ctx.db.patch(userRecord?._id, {firstName, lastName});
  },
});

// Helpers
export async function userQuery(ctx: QueryCtx, clerkUserId: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("userId", clerkUserId))
    .unique();
}

/** The current user, containing user preferences and Clerk user info. */
export const currentUser = query((ctx: QueryCtx) => getCurrentUser(ctx));

async function getCurrentUser(ctx: QueryCtx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    return null;
  }
  return await userQuery(ctx, identity.subject);
}
