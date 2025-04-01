import * as admin from "firebase-admin"

// Check if Firebase Admin SDK is already initialized
if (!admin.apps.length) {
  try {
    // Validate that all required environment variables are present
    if (!process.env.FIREBASE_PROJECT_ID) {
      throw new Error("FIREBASE_PROJECT_ID environment variable is missing")
    }

    if (!process.env.FIREBASE_CLIENT_EMAIL) {
      throw new Error("FIREBASE_CLIENT_EMAIL environment variable is missing")
    }

    if (!process.env.FIREBASE_PRIVATE_KEY) {
      throw new Error("FIREBASE_PRIVATE_KEY environment variable is missing")
    }

    // Initialize Firebase Admin SDK
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // The private key needs to be properly formatted - replace newline characters
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    })

    console.log("Firebase Admin SDK initialized successfully")
  } catch (error) {
    console.error("Error initializing Firebase Admin SDK:", error)
    // Re-throw the error to make it clear what went wrong during initialization
    throw error
  }
} else {
  console.log("Firebase Admin SDK already initialized")
}

export default admin

