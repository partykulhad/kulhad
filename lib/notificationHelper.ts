import admin from "./firebaseAdmin"

interface NotificationDetails {
  type: string
  title: string
  message: string
}

const notificationTypes: { [key: string]: NotificationDetails } = {
  Pending: {
    type: "notify_new_request",
    title: "New Request",
    message: "New Request Assigned",
  },
  OrderReady: {
    type: "notify_new_order",
    title: "New Order",
    message: "New Order Assigned",
  },
  Assigned: {
    type: "notify_request_assigned",
    title: "Request Assigned",
    message: "Request Assigned to Refiller",
  },
  PickedUp: {
    type: "notify_request_pickedup",
    title: "Request PickedUp",
    message: "Request Pickedup by Refiller",
  },
  Ongoing: {
    type: "notify_request_ongoing",
    title: "Request Ongoing",
    message: "Request Ongoing by Refiller",
  },
  Refilled: {
    type: "notify_request_refilled",
    title: "Refilled by Refiller",
    message: "Request Refilled by Refiller",
  },
  Submitted: {
    type: "notify_request_submitted",
    title: "Submitted by Kitchen",
    message: "Request Submitted by Kitchen",
  },
  NotSubmitted: {
    type: "notify_request_notSubmitted",
    title: "NotSubmitted by Kitchen",
    message: "Request NotSubmitted by Kitchen",
  },
  Cancelled: {
    type: "notify_order_canceled",
    title: "Order Canceled",
    message: "Order Canceled by Kitchen",
  },
  Completed: {
    type: "notify_order_completed",
    title: "Order Completed",
    message: "Order Completed by Kitchen",
  },
}

export async function sendStatusNotification(fcmToken: string, requestId: string, status: string, isRefiller = false) {
  // Validate inputs
  if (!fcmToken || !fcmToken.trim()) {
    console.error(`Invalid FCM token for request ${requestId}`)
    return { success: false, message: "Invalid or empty FCM token" }
  }

  if (!requestId || !requestId.trim()) {
    console.error(`Invalid request ID: ${requestId}`)
    return { success: false, message: "Invalid request ID" }
  }

  const notificationDetails = notificationTypes[status]

  if (!notificationDetails) {
    console.error(`Unknown status: ${status}`)
    return { success: false, message: `Unknown status: ${status}` }
  }

  // Create a copy to avoid modifying the original object
  const notificationData = { ...notificationDetails }

  // Special case for Completed status
  if (status === "Completed" && isRefiller) {
    notificationData.type = "notify_request_completed"
    notificationData.title = "Request Completed"
    notificationData.message = "Request Completed by Refiller"
  }

  return sendNotification(fcmToken, notificationData.title, notificationData.message, {
    type: notificationData.type,
    requestId,
    status,
  })
}

async function sendNotification(token: string, title: string, body: string, data: any) {
  try {
    // Validate token format (basic validation)
    if (!token || typeof token !== "string" || token.length < 10) {
      console.error("Invalid FCM token format:", token)
      return { success: false, message: "Invalid FCM token format" }
    }

    // Convert all data values to strings (FCM requirement)
    const stringifiedData: { [key: string]: string } = {}
    for (const [key, value] of Object.entries(data)) {
      stringifiedData[key] = String(value)
    }

    const message = {
      notification: {
        title,
        body,
      },
      data: stringifiedData,
      token,
    }

    console.log("Attempting to send notification to token:", token.substring(0, 20) + "...")
    console.log("Notification content:", { title, body, data: stringifiedData })

    const response = await admin.messaging().send(message)

    console.log("Successfully sent message with ID:", response)
    return { success: true, message: "Notification sent successfully", messageId: response }
  } catch (error: any) {
    console.error("Error sending notification:", error)

    // Handle specific Firebase errors
    if (error.code) {
      switch (error.code) {
        case "messaging/registration-token-not-registered":
          console.error("FCM token is not registered or has been unregistered")
          return {
            success: false,
            message: "FCM token not registered",
            shouldRemoveToken: true,
          }

        case "messaging/invalid-registration-token":
          console.error("FCM token is invalid")
          return {
            success: false,
            message: "Invalid FCM token",
            shouldRemoveToken: true,
          }

        case "messaging/mismatched-credential":
          console.error("FCM credentials mismatch")
          return { success: false, message: "FCM credentials mismatch" }

        case "messaging/authentication-error":
          console.error("FCM authentication error")
          return { success: false, message: "FCM authentication error" }

        case "messaging/server-unavailable":
          console.error("FCM server unavailable")
          return { success: false, message: "FCM server unavailable, retry later" }

        default:
          console.error("Unknown FCM error code:", error.code)
          return { success: false, message: `FCM error: ${error.code}` }
      }
    }

    return {
      success: false,
      message: error.message || "Failed to send notification",
    }
  }
}

// Helper function to validate FCM token format
export function isValidFCMToken(token: string): boolean {
  if (!token || typeof token !== "string") {
    return false
  }

  // Basic FCM token validation
  // FCM tokens are typically 152+ characters long and contain alphanumeric characters, hyphens, and underscores
  const fcmTokenRegex = /^[a-zA-Z0-9_-]{140,}$/
  return fcmTokenRegex.test(token)
}
