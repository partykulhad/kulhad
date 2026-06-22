import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Delete audit log entries older than 7 days — runs every day at midnight UTC
crons.daily(
  "delete-expired-audit-logs",
  { hourUTC: 0, minuteUTC: 0 },
  internal.adminAuditLogs.deleteExpiredLogs
);

export default crons;
