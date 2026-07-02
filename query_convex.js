const { ConvexHttpClient } = require("convex/browser");
const client = new ConvexHttpClient("https://silent-sockeye-142.convex.cloud");

async function check() {
  const config = await client.query("adminAuditLogs:getAllowedEmails");
  console.log("Allowed Emails in DB:", config);
}
check();
