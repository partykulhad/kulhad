import { sendNotification } from "./sendNotification"

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
  Accepted: {
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
  const notificationDetails = notificationTypes[status]

  if (!notificationDetails) {
    console.error(`Unknown status: ${status}`)
    return { success: false, message: "Unknown status" }
  }

  // Special case for Completed status
  if (status === "Completed" && isRefiller) {
    notificationDetails.type = "notify_request_completed"
    notificationDetails.title = "Request Completed"
    notificationDetails.message = "Request Completed by Refiller"
  }

  return sendNotification(fcmToken, notificationDetails.title, notificationDetails.message, {
    type: notificationDetails.type,
    requestId,
    status,
  })
}

