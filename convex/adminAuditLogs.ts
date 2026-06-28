import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// ─── Audit Log TTL: 7 days in milliseconds ───────────────────────────────────
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Log an admin action to the audit trail.
 * Called from the frontend whenever a significant action is taken.
 */
export const logAction = mutation({
  args: {
    action: v.string(),       // e.g. "machine_edit", "machine_offline", "machine_online"
    targetId: v.string(),     // machine ID, agent ID, etc.
    targetType: v.string(),   // e.g. "machine", "kitchen", "agent"
    details: v.optional(v.string()), // Human-readable description of what changed
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.insert("adminAuditLogs", {
      actorEmail: identity.email ?? "unknown",
      actorName: identity.name ?? identity.email ?? "Unknown User",
      action: args.action,
      targetId: args.targetId,
      targetType: args.targetType,
      details: args.details,
      timestamp: Date.now(),
    });
  },
});

/** List the most recent 200 audit log entries, newest first. */
export const list = query({
  args: {
    targetId: v.optional(v.string()), // optional filter by machine/entity
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("adminAuditLogs")
      .withIndex("by_timestamp")
      .order("desc")
      .take(200);
    if (args.targetId) {
      return results.filter((r) => r.targetId === args.targetId);
    }
    return results;
  },
});

/**
 * Delete audit log entries older than 7 days.
 * Called by the daily cron job in crons.ts.
 */
export const deleteExpiredLogs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - SEVEN_DAYS_MS;
    const expired = await ctx.db
      .query("adminAuditLogs")
      .withIndex("by_timestamp", (q) => q.lt("timestamp", cutoff))
      .collect();
    await Promise.all(expired.map((doc) => ctx.db.delete(doc._id)));
    console.log(`[AuditLog] Deleted ${expired.length} expired log entries (older than 7 days).`);
  },
});

// ─── Admin Email Allowlist ────────────────────────────────────────────────────

/**
 * Get the current allowlist config.
 * Returns null if not yet created (first-run). In that case all emails are allowed.
 */
export const getAllowedEmails = query({
  args: {},
  handler: async (ctx) => {
    const configs = await ctx.db.query("adminConfig").collect();
    if (configs.length === 0) return null;
    return configs.flatMap((c) => c.allowedEmails);
  },
});

/**
 * Check whether a specific email is in the allowlist.
 * Returns true if no config exists (allow-all fallback) or the email is found.
 */
export const isEmailAllowed = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const configs = await ctx.db.query("adminConfig").collect();
    if (configs.length === 0) return true; // no restriction set
    
    const allAllowedEmails = configs.flatMap((c) => c.allowedEmails);
    if (allAllowedEmails.length === 0) return true;

    const normalizedTarget = args.email.toLowerCase().trim();
    return allAllowedEmails.some((e) => e.toLowerCase().trim() === normalizedTarget);
  },
});

/**
 * Update the full allowed emails list.
 * Tip: You can also edit the adminConfig table directly in the Convex Dashboard → Data tab.
 */
export const setAllowedEmails = mutation({
  args: { emails: v.array(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const normalised = args.emails.map((e) => e.toLowerCase().trim()).filter(Boolean);
    const existing = await ctx.db.query("adminConfig").first();
    if (existing) {
      await ctx.db.patch(existing._id, { allowedEmails: normalised });
    } else {
      await ctx.db.insert("adminConfig", { allowedEmails: normalised });
    }
  },
});
