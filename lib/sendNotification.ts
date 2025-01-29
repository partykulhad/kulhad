import admin from "firebase-admin"

// Initialize Firebase Admin SDK (as before)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    }),
  })
}

interface NotificationData {
  type: string
  requestId: string
  status: string
}

export async function sendNotification(fcmToken: string, title: string, message: string, data: NotificationData) {
  try {
    const notificationMessage = {
      notification: {
        title,
        body: message,
      },
      data: {
        type: data.type,
        requestId: data.requestId,
        status: data.status,
      },
      token: fcmToken,
    }

    const response = await admin.messaging().send(notificationMessage)
    console.log("Successfully sent message:", response)
    return { success: true, message: "Notification sent successfully" }
  } catch (error) {
    console.error("Error sending message:", error)
    return { success: false, message: "Failed to send notification" }
  }
}

