import {httpRouter} from "convex/server";
import {httpAction} from "./_generated/server";
import {internal} from "./_generated/api";
import type {WebhookEvent} from "@clerk/backend";
import {Webhook} from "svix";

export const ensureEnvironmentVariable = (name: string): string => {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error(`missing environment variable ${name}`);
  }
  return value;
};

const handleClerkWebhook = httpAction(async (ctx, request) => {
  const event = await validateRequest(request);
  if (!event) {
    return new Response("Error occured", {
      status: 400,
    });
  }
  switch (event.type) {
    case "user.created": {
      console.log(event);
      await ctx.runMutation(internal.users.createUser, {
        userId: event.data.id,
        email: event.data.email_addresses[0]?.email_address,
        firstName: event.data?.first_name ?? "",
        lastName: event.data?.last_name ?? "",
        profileImageUrl: event.data?.has_image ? event.data?.image_url : undefined,
      });
      break;
    }
    default: {
      console.log("ignored Clerk webhook event", event.type);
    }
  }
  return new Response(null, {
    status: 200,
  });
});

const http = httpRouter();
http.route({
  path: "/clerk-users-webhook",
  method: "POST",
  handler: handleClerkWebhook,
});

async function validateRequest(req: Request): Promise<WebhookEvent | undefined> {
  const payloadString = await req.text();

  const svixHeaders = {
    "svix-id": req.headers.get("svix-id")!,
    "svix-timestamp": req.headers.get("svix-timestamp")!,
    "svix-signature": req.headers.get("svix-signature")!,
  };
  const clerkWebhookSecret = ensureEnvironmentVariable("CLERK_WEBHOOK_SECRET");

  const wh = new Webhook(clerkWebhookSecret);
  let evt: Event | null = null;
  try {
    evt = wh.verify(payloadString, svixHeaders) as Event;
  } catch (_) {
    console.log("error verifying");
    return;
  }

  return evt as unknown as WebhookEvent;
}

export default http;
